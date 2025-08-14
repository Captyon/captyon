import type { Project } from '../types';

const DB_NAME = 'CaptionAppDB';
const DB_VER = 1;
const STORE = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function putProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    try {
      // Build a plain, serializable copy to avoid Vue proxy/other non-cloneable fields.
      const toPut = {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        cursor: (project as any).cursor,
        items: (project.items || []).map((it: any) => ({
          id: it.id,
          filename: it.filename,
          base: it.base,
          caption: it.caption,
          originalCaption: it.originalCaption,
          img: it.img,
          tags: Array.isArray(it.tags) ? it.tags.slice() : [],
          selected: !!it.selected,
          // Persist measured average brightness so auto-dimming still works after reload
          avgBrightness: (typeof it.avgBrightness === 'number') ? it.avgBrightness : undefined,
          // Persist media metadata so mediaType/size are available after reload
          mediaType: it.mediaType,
          size: it.size || 0,
          curationStatus: it.curationStatus,
          width: it.width || 0,
          height: it.height || 0,
          // Persist crop regions (only canonical fields)
          regions: Array.isArray(it.regions)
            ? it.regions.map((r: any) => ({
                id: r.id,
                name: r.name,
                caption: r.caption,
                x: r.x,
                y: r.y,
                w: r.w,
                h: r.h,
                aspect: r.aspect,
                size: Array.isArray(r.size) ? [r.size[0], r.size[1]] : undefined,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
              }))
            : undefined
        }))
      };
      tx.objectStore(STORE).put(toPut);
    } catch (e) {
      // Fallbacks: attempt JSON clone, then last resort put original (may still error and reject)
      try {
        tx.objectStore(STORE).put(JSON.parse(JSON.stringify(project)));
      } catch (err) {
        tx.objectStore(STORE).put(project);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    try {
      tx.objectStore(STORE).delete(id);
    } catch (err) {
      tx.onerror = () => reject(tx.error || err);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllMeta(): Promise<Array<{ id: string; name: string; count: number; updatedAt: number }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      const meta: Array<{ id: string; name: string; count: number; updatedAt: number }> = all.map((r: any) => ({
        id: r.id,
        name: r.name,
        count: (r.items || []).length,
        updatedAt: r.updatedAt || 0
      }));
      resolve(meta);
    };
    req.onerror = () => reject(req.error);
  });
}
