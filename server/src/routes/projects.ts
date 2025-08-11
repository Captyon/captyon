import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import sharp from 'sharp';
import Project from '../models/project';

const router = Router();

// Max video size (MB) - configurable via server .env (default 5)
const VIDEO_MAX_SIZE_MB = process.env.VIDEO_MAX_SIZE_MB ? parseInt(process.env.VIDEO_MAX_SIZE_MB, 10) : 5;

/**
 * GET /projects/meta
 * Returns array of { id, name, count, updatedAt }
 */
router.get('/meta', async (req: Request, res: Response) => {
  try {
    const docs = await Project.find({}, { id: 1, name: 1, items: 1, updatedAt: 1 }).lean();
    const meta = docs.map(d => ({
      id: d.id,
      name: d.name || d.id,
      count: Array.isArray(d.items) ? d.items.length : 0,
      updatedAt: d.updatedAt || Date.now()
    }));
    res.json(meta);
  } catch (err) {
    console.error('GET /projects/meta error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /projects/:id
 *
 * Returns the project document. If items reference GridFS files via imgId but
 * have no inline img data, try to generate small thumbnails from GridFS and
 * embed them in the response so the client UI can render thumbnails and the
 * canvas without making separate file requests.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await Project.findOne({ id: req.params.id }).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Attempt to hydrate thumbnail previews from GridFS for items that only have imgId
    try {
      const db = mongoose.connection.db;
      if (db && Array.isArray(doc.items) && doc.items.length > 0) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'projectFiles' });
        const filesColl = db.collection('projectFiles.files');

        await Promise.all(doc.items.map(async (item: any) => {
          if ((!item.img || item.img === '') && item.imgId) {
            try {
              const oid = new mongoose.Types.ObjectId(item.imgId);
              // Read the file into a buffer
              const chunks: Buffer[] = [];
              const downloadStream = bucket.openDownloadStream(oid);
              await new Promise<void>((resolve, reject) => {
                downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk));
                downloadStream.on('error', (err: any) => reject(err));
                downloadStream.on('end', () => resolve());
              });
              const fileBuf = Buffer.concat(chunks);

              // Preserve original image (do not downscale)
              // Use the original buffer so the client receives the full-size image.
              const thumbBuf = fileBuf;

              // Try to read contentType from files collection; prefer metadata.contentType, fall back to top-level contentType, then to image/png
              const fileDoc = await filesColl.findOne({ _id: oid });
              const mime = (fileDoc && (fileDoc as any).metadata && (fileDoc as any).metadata.contentType)
                ? (fileDoc as any).metadata.contentType
                : (fileDoc && (fileDoc as any).contentType)
                  ? (fileDoc as any).contentType
                  : 'image/png';

              item.img = `data:${mime};base64,${thumbBuf.toString('base64')}`;
            } catch (e) {
              console.error('Failed to hydrate item image from GridFS', e);
              // leave item as-is (client may attempt to fetch /projects/files/:id)
            }
          }
        }));
      }
    } catch (e) {
      console.error('Thumbnail hydration error', e);
    }

    res.json(doc);
  } catch (err) {
    console.error('GET /projects/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /projects/:id
 * Upsert project (client sends full project object)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const payload = req.body as any;
    if (!payload || payload.id !== req.params.id) {
      return res.status(400).json({ error: 'Payload id mismatch' });
    }

    // Store large base64 blobs in GridFS and replace with imgId to avoid BSON/document size limits
    try {
      const db = mongoose.connection.db;
      if (!db) {
        console.error('No MongoDB DB instance available for GridFS; skipping GridFS processing');
      } else {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'projectFiles' });

        if (Array.isArray(payload.items)) {

          // Server-side pre-check: reject any inline video blobs that exceed the configured limit.
          // This prevents very large video data from being stored or processed.
          try {
            for (const it of payload.items) {
              if (!it || !it.img || typeof it.img !== 'string') continue;
              const matchPreview = String(it.img).match(/^data:(.+);base64,(.*)$/);
              if (!matchPreview) continue;
              const mimePreview = matchPreview[1] || '';
              const b64 = matchPreview[2] || '';
              if (mimePreview.startsWith('video/')) {
                const bufLen = Buffer.from(b64, 'base64').length;
                if (bufLen > VIDEO_MAX_SIZE_MB * 1024 * 1024) {
                  return res.status(400).json({ error: `Video ${it.filename || it.id || ''} exceeds limit of ${VIDEO_MAX_SIZE_MB} MB` });
                }
              }
            }
          } catch (preCheckErr) {
            console.warn('Video pre-check failed', preCheckErr);
          }

          for (const item of payload.items) {
            if (!item || !item.img || typeof item.img !== 'string') continue;

            // If DB is available we'll attempt to move full base64 images into GridFS and keep only a small thumbnail inline.
            // If DB isn't available, fall back to truncating very large inline blobs so we don't exceed BSON/document limits.
            try {
              const isDataUrl = /^data:/.test(item.img);

              if (db) {
                // Support data URLs (data:<mime>;base64,<data>) or raw base64 strings
                const match = item.img.match(/^data:(.+);base64,(.*)$/);
                const base64Data = match ? match[2] : item.img;

                // Only upload / process when the inline data is large enough to be a problem.
                // Small inline thumbnails can be kept as-is.
                if (base64Data.length > 8192 || !isDataUrl) {
                  const buffer = Buffer.from(base64Data, 'base64');
                  const filename = item.filename || item.id || `${payload.id}_${Date.now()}`;

                  // Attempt to generate a thumbnail for images; for non-image media (videos) use a small placeholder.
                  let thumbDataUrl: string | null = null;
                  try {
                    const mime = match ? match[1] : 'image/png';
                    if (mime.startsWith('image/')) {
                      const thumbBuf = await sharp(buffer).resize({ width: 600, withoutEnlargement: true }).toBuffer();
                      thumbDataUrl = `data:${mime};base64,${thumbBuf.toString('base64')}`;
                    } else {
                      // Non-image media (video) - use a minimal placeholder thumbnail
                      const placeholder = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                      thumbDataUrl = `data:image/png;base64,${placeholder}`;
                    }
                  } catch (thumbErr) {
                    console.error('Thumbnail generation failed or unsupported media type, using placeholder', thumbErr);
                    // Minimal transparent PNG 1x1 (base64)
                    const placeholder = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                    thumbDataUrl = `data:image/png;base64,${placeholder}`;
                  }

                    // Upload full buffer to GridFS and await completion using stream events
                    try {
                      const gridContentType = match ? match[1] : 'application/octet-stream';
                      const uploadStream = bucket.openUploadStream(filename, { contentType: gridContentType, metadata: { contentType: gridContentType } });
                      await new Promise<void>((resolve, reject) => {
                        uploadStream.on('error', (err) => {
                          console.error('GridFS upload stream error for', filename, err);
                          reject(err);
                        });
                        uploadStream.on('finish', () => {
                          resolve();
                        });
                        uploadStream.end(buffer);
                      });

                    item.imgId = (uploadStream.id as any).toString();

                    // Verify GridFS file doc exists (helpful when GridFS collections are missing)
                    try {
                      const filesColl = db.collection('projectFiles.files');
                      const fileDoc = await filesColl.findOne({ _id: uploadStream.id });
                      if (!fileDoc) {
                      }
                    } catch (verifyErr) {
                    }

                    // Full image stored in GridFS; remove inline image from payload. GET will re-hydrate thumbnails.
                    delete item.img;
                  } catch (uploadErr) {
                    console.error('Failed to store item image to GridFS', uploadErr);
                    // If upload fails, truncate the inline blob so we don't blow the BSON size on save
                    if (item.img && item.img.length > 10240) {
                      item.img = item.img.slice(0, 10240);
                    }
                  }
                } else {
                  // small inline image or already a thumbnail -> keep as-is
                }
              } else {
                // No DB available: ensure we don't persist huge inline blobs (truncate to a safe size)
                if (item.img.length > 10240) {
                  item.img = item.img.slice(0, 10240);
                }
              }
            } catch (e) {
              console.error('Failed to process item image', e);
              if (item.img && item.img.length > 10240) {
                item.img = item.img.slice(0, 10240);
              }
            }
          }
        }
      }
    } catch (e) {
      // If GridFS/storage isn't available, log and continue (we'll still attempt to save the document)
      console.error('GridFS processing error', e);
    }

    // Read existing project so we can remove any GridFS files that are no longer referenced
    const existingProject = await Project.findOne({ id: req.params.id }).lean();

    const up = await Project.findOneAndUpdate(
      { id: req.params.id },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Cleanup: delete GridFS files that existed previously but are not referenced by the new payload
    try {
      const db = mongoose.connection.db;
      if (db && existingProject && Array.isArray(existingProject.items)) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'projectFiles' });
        const existingIds = new Set((existingProject.items || []).map((i: any) => i && i.imgId).filter(Boolean));
        const newIds = new Set((payload.items || []).map((i: any) => i && i.imgId).filter(Boolean));
        for (const id of existingIds) {
          if (!newIds.has(id)) {
            try {
              await bucket.delete(new mongoose.Types.ObjectId(id));
            } catch (delErr) {
              // Log and continue - deletion failures should not block the response
              console.warn('Failed to delete old GridFS file', id, delErr);
            }
          }
        }
      }
    } catch (cleanupErr) {
      console.error('GridFS cleanup error (PUT)', cleanupErr);
    }

    res.json({ ok: true, id: up.id });
  } catch (err) {
    console.error('PUT /projects/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /projects/files/:id
 * Streams a file stored in GridFS by file id
 */
router.get('/files/:id', async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: 'DB not available' });
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'projectFiles' });
    const fileId = req.params.id;
    let oid;
    try {
      oid = new mongoose.Types.ObjectId(fileId);
    } catch {
      return res.status(400).json({ error: 'Invalid file id' });
    }

    // Find file metadata to set headers if possible
    const filesColl = db.collection('projectFiles.files');
    const fileDoc = await filesColl.findOne({ _id: oid });
    if (!fileDoc) return res.status(404).json({ error: 'Not found' });

    const contentType = (fileDoc && (fileDoc as any).metadata && (fileDoc as any).metadata.contentType)
      ? (fileDoc as any).metadata.contentType
      : (fileDoc && (fileDoc as any).contentType)
        ? (fileDoc as any).contentType
        : 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    if (fileDoc.filename) {
      res.setHeader('Content-Disposition', `inline; filename="${fileDoc.filename}"`);
    }

    const downloadStream = bucket.openDownloadStream(oid);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to read file' });
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('GET /projects/files/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /projects/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Fetch project to collect any GridFS file references
    const doc = await Project.findOne({ id: req.params.id }).lean();

    // Attempt to delete associated GridFS files first
    try {
      const db = mongoose.connection.db;
      if (db && doc && Array.isArray(doc.items)) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'projectFiles' });
        const ids = (doc.items || []).map((i: any) => i && i.imgId).filter(Boolean);
        for (const id of ids) {
          try {
            await bucket.delete(new mongoose.Types.ObjectId(id));
          } catch (delErr) {
            console.warn('Failed to delete GridFS file during project DELETE', id, delErr);
          }
        }
      }
    } catch (gridErr) {
      console.error('GridFS cleanup error (DELETE)', gridErr);
      // continue to delete the project document even if file cleanup fails
    }

    await Project.deleteOne({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /projects/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
