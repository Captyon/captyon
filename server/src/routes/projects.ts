import { Router, Request, Response } from 'express';
import Project from '../models/project';

const router = Router();

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
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await Project.findOne({ id: req.params.id }).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
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
    const up = await Project.findOneAndUpdate(
      { id: req.params.id },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, id: up.id });
  } catch (err) {
    console.error('PUT /projects/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /projects/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Project.deleteOne({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /projects/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
