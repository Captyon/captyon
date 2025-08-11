import { state, newId } from './state';
import { addToast } from './toasts';
import { putProjectAny, getProjectAny, deleteProjectAny, getAllMetaAny } from './storage';
import { computeAvgBrightness } from '../../utils/file';

/* ----------------- Meta / Projects ----------------- */
export async function refreshMetaBar() {
  const meta = await getAllMetaAny();
  state.order = meta.map(m => m.id);

  // Ensure the projects map contains a minimal entry for each meta item so
  // the UI can display project names immediately (instead of falling back to IDs)
  for (const m of meta) {
    const existing = state.projects.get(m.id);
    if (existing) {
      // keep name in sync in case it changed
      if (existing.name !== m.name) existing.name = m.name;
    } else {
      // insert a lightweight placeholder Project so templates can read .name
      state.projects.set(m.id, {
        id: m.id,
        name: m.name,
        createdAt: m.updatedAt || Date.now(),
        updatedAt: m.updatedAt || Date.now(),
        items: [],
        cursor: 0
      } as any);
    }
  }

  return meta;
}

export function createProject(name = 'Untitled Project') {
  const p: any = { id: newId('p_'), name, createdAt: Date.now(), updatedAt: Date.now(), items: [], cursor: 0 };
  state.projects.set(p.id, p);
  if (!state.order.includes(p.id)) state.order.push(p.id);
  state.currentId = p.id;
  state.currentIndex = 0;
  putProjectAny(p).catch((err: any) => console.error(err));
  return p;
}

async function ensureAvgBrightnessForProject(proj: any) {
  if (!proj || !Array.isArray(proj.items)) return;
  let changed = false;
  for (const it of proj.items) {
    if (!it || typeof it.avgBrightness === 'number') continue;
    // Detect images: explicit mediaType==='image' or a non-video data URL
    const isImage = it.mediaType === 'image' || (it.img && !String(it.img).startsWith('data:video'));
    if (!isImage || !it.img) continue;
    try {
      const avg = await computeAvgBrightness(it.img);
      if (typeof avg === 'number') {
        it.avgBrightness = avg;
        changed = true;
      }
    } catch (e) {
      // ignore compute errors for individual items
    }
  }
  if (changed) {
    try {
      await putProjectAny(proj);
    } catch (e) {
      console.error('Failed to persist avgBrightness for project', e);
    }
  }
}

export async function loadFirstProjectIfMissing() {
  const meta = await getAllMetaAny();
  if (meta.length === 0) {
    // If we're showing the welcome modal (first-run), do not auto-create a default project.
    // Let the user create a project via the welcome flow.
    if (state.showWelcomeModal) {
      // No projects created yet; leave currentId null for the UI to handle.
      await refreshMetaBar();
      return;
    }
    const p = createProject('My First Project');
    await putProjectAny(p);
  } else {
    const proj = await getProjectAny(meta[0].id);
    if (proj) {
      await ensureAvgBrightnessForProject(proj);
      state.projects.set(proj.id, proj);
      state.currentId = proj.id;
      state.currentIndex = proj.cursor || 0;
    }
  }
  await refreshMetaBar();
}

export async function loadProjectById(id: string): Promise<any | null> {
  if (!id) return null;

  // If configured for MongoDB, query the server directly so we can detect
  // network/HTTP errors and let the UI decide how to react (retry, notify).
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      const proj = await (async () => {
        // Delegate to storage layer which will hit mongo first when configured
        return await getProjectAny(id);
      })();

        if (proj) {
        // If the server stored images in GridFS the project items may have imgId references
        // instead of an inline data URL. Hydrate those images by fetching them from the server
        // and converting to data URLs so the UI keeps working unchanged.
        if (Array.isArray(proj.items) && state.settings.mongoApiUrl) {
          const base = state.settings.mongoApiUrl.replace(/\/+$/, '');
          const headers: Record<string, string> = {};
          if (state.settings.mongoApiKey) {
            headers['Authorization'] = `Bearer ${state.settings.mongoApiKey}`;
            headers['x-api-key'] = state.settings.mongoApiKey;
          }

          await Promise.all(proj.items.map(async (it: any) => {
            if ((!it.img || it.img === '') && it.imgId) {
              try {
                const url = `${base}/projects/files/${encodeURIComponent(it.imgId)}`;
                const res = await fetch(url, { method: 'GET', headers });
                if (!res.ok) {
                  console.warn('Failed to fetch GridFS image', it.imgId, res.status);
                  return;
                }
                const blob = await res.blob();
                // convert blob to data URL
                const dataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
                  reader.readAsDataURL(blob);
                });
                it.img = dataUrl;
              } catch (e) {
                console.error('Error hydrating image from server', e);
              }
            }
          }));
        }

        await ensureAvgBrightnessForProject(proj);
        state.projects.set(proj.id, proj);
        state.currentId = proj.id;
        state.currentIndex = proj.cursor || 0;
        return proj;
      }
      // Not found on server — fall back to local cache if available
      const local = await getProjectAny(id);
      if (local) {
        await ensureAvgBrightnessForProject(local);
        state.projects.set(local.id, local);
        state.currentId = local.id;
        state.currentIndex = local.cursor || 0;
        return local;
      }
      return null;
    } catch (e) {
      // Surface the error to the caller (UI) so it can show a retryable message
      console.error('loadProjectById (mongo) failed', e);
      throw e;
    }
  } else {
    // Browser storage (IndexedDB)
    try {
      const proj = await getProjectAny(id);
      if (proj) {
        await ensureAvgBrightnessForProject(proj);
        state.projects.set(proj.id, proj);
        state.currentId = proj.id;
        state.currentIndex = proj.cursor || 0;
        return proj;
      }
      return null;
    } catch (e) {
      console.error('loadProjectById (idb) failed', e);
      throw e;
    }
  }
}

/* ----------------- Delete project (Danger Zone) ----------------- */
/**
 * Delete a project by id from IndexedDB and update in-memory state.
 * Returns true on success, false on failure.
 */
export async function deleteProject(id: string) {
  if (!id) {
    addToast('No project id specified', 'warn');
    return false;
  }

  try {
    await deleteProjectAny(id);
  } catch (err) {
    console.error('deleteProjectAny failed', err);
    addToast('Failed to delete project from disk', 'warn');
    return false;
  }

  // Remove from in-memory maps/lists
  state.projects.delete(id);
  const ordIdx = state.order.indexOf(id);
  if (ordIdx !== -1) state.order.splice(ordIdx, 1);

  // If the deleted project was current, pick a new one or create a fresh project
  if (state.currentId === id) {
    if (state.order.length > 0) {
      const newId = state.order[0];
      try {
        const proj = await getProjectAny(newId);
        if (proj) {
          state.projects.set(proj.id, proj);
          state.currentId = proj.id;
          state.currentIndex = proj.cursor || 0;
        } else {
          // Fallback: set currentId and index
          state.currentId = newId;
          state.currentIndex = 0;
        }
      } catch (e) {
        console.error('Failed to load project after deletion', e);
        state.currentId = state.order[0] || null;
        state.currentIndex = 0;
      }
    } else {
      // No projects left — create a new default project
      const p = createProject('My First Project');
      try {
        await putProjectAny(p);
      } catch (e) {
        console.error('Failed to persist new default project', e);
      }
      state.currentId = p.id;
      state.currentIndex = 0;
    }
  }

  // Clear any prompt candidates referencing deleted items
  state.promptCandidates = state.promptCandidates.filter(() => {
    // keep candidates whose project still exists — in this app candidates are tied to items in projects,
    // so simplest approach is to drop any that referenced the deleted project's items (we removed the project)
    return true; // nothing to check reliably here; promptCandidates hold itemId only and items are stored per-project
  });

  await refreshMetaBar().catch(console.error);
  addToast('Project deleted', 'ok');
  return true;
}
