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
          width: it.width || 0,
          height: it.height || 0
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

export async function getAllMeta(): Promise<Array<{ id: string; name: string; count: number; updatedAt: number }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = async () => {
      const keys = (req.result || []) as string[];
      const meta: Array<{ id: string; name: string; count: number; updatedAt: number }> = [];
      try {
        for (const id of keys) {
          const r2 = await new Promise<Project | null>((res, rej) => {
            const r = tx.objectStore(STORE).get(id);
            r.onsuccess = () => res(r.result || null);
            r.onerror = () => rej(r.error);
          });
          if (r2) meta.push({ id: r2.id, name: r2.name, count: r2.items.length, updatedAt: r2.updatedAt });
        }
        resolve(meta);
      } catch (err) {
        reject(err);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
