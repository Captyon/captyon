import { reactive } from 'vue';
import type { Project, Item, Settings } from '../types';
import type { ToastItem } from '../types';
import * as idb from '../services/db';
import * as mongoDb from '../services/db.mongo';
import { readAsDataURL, readAsText, imgDims, isImg, isTxt, isVideo, mediaTypeOf, base as fileBase, sleep, slug, extractSdPrompt } from '../utils/file';
import { captionImage, testOllama } from '../services/ollama';

function newId(prefix = 'p_') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

type Progress = { cur: number; total: number };

type State = {
  projects: Map<string, Project>;
  order: string[];
  currentId: string | null;
  currentIndex: number;
  zoom: number;
  rotation: number;
  filter: { text: string; onlyMissing: boolean; onlySelected: boolean };
  settings: Settings;
  selection: Set<string>;
  status: string;
  progress: Progress;
  toasts: ToastItem[];
  // Prompt candidates extracted from images (but not yet applied)
  promptCandidates: Array<{ itemId: string; filename: string; img: string; prompt: string }>;
  // Local UI flag to show the welcome dialog on first-run
  showWelcomeModal: boolean;
  // Show confirmation modal when promptCandidates is non-empty and user opted-in
  showPromptModal: boolean;
  // Whether curation (tinder-like) mode is active
  curationMode?: boolean;
};

const state = reactive<State>({
  projects: new Map(),
  order: [],
  currentId: null,
  currentIndex: -1,
  zoom: 100,
  rotation: 0,
  filter: { text: '', onlyMissing: false, onlySelected: false },
  settings: {
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2-vision',
    promptTpl:
      'Describe this image as a short, high quality caption. Focus on the main subject, action, style, lighting and mood. Keep it concise.',
    stream: false,
    usePromptMetadata: true,
    confirmPromptOnImport: true,
    confirmDeleteOnRemove: true,
    // Show the welcome modal on first run (only shown when there are no projects)
    showWelcomeOnStart: true,
    // Storage settings (default to browser)
    autoSyncOnStart: false,
    storage: 'browser',
    mongoApiUrl: '',
    mongoApiKey: ''
  },
  selection: new Set(),
  status: 'Idle',
  progress: { cur: 0, total: 0 },
  toasts: [],
  promptCandidates: [],
  showWelcomeModal: false,
  showPromptModal: false,
  // Curation mode off by default
  curationMode: false
});

/* ----------------- Toasts ----------------- */
function addToast(message: string, kind: ToastItem['kind'] = '') {
  const t: ToastItem = { id: newId('t_'), message, kind };
  state.toasts.push(t);
  setTimeout(() => {
    const idx = state.toasts.findIndex(x => x.id === t.id);
    if (idx !== -1) state.toasts.splice(idx, 1);
  }, 7000);
}

function dismissToast(id: string) {
  const idx = state.toasts.findIndex(x => x.id === id);
  if (idx !== -1) state.toasts.splice(idx, 1);
}

// Storage abstraction helpers: choose between IndexedDB (idb) and Mongo API (mongoDb)
async function putProjectAny(project: Project): Promise<void> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      await mongoDb.putProject(project, { baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return;
    } catch (e) {
      addToast('Failed to save to MongoDB; using browser storage', 'warn');
      console.error('mongo putProject failed', e);
      // fall back to IndexedDB
    }
  }
  return idb.putProject(project);
}

async function getProjectAny(id: string): Promise<Project | null> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      const p = await mongoDb.getProject(id, { baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return p;
    } catch (e) {
      addToast('Failed to read from MongoDB; using browser storage', 'warn');
      console.error('mongo getProject failed', e);
    }
  }
  return idb.getProject(id);
}

async function deleteProjectAny(id: string): Promise<void> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      await mongoDb.deleteProject(id, { baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return;
    } catch (e) {
      addToast('Failed to delete from MongoDB; using browser storage', 'warn');
      console.error('mongo deleteProject failed', e);
    }
  }
  return idb.deleteProject(id);
}

async function getAllMetaAny(): Promise<Array<{ id: string; name: string; count: number; updatedAt: number }>> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      const m = await mongoDb.getAllMeta({ baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return m;
    } catch (e) {
      addToast('Failed to read project list from MongoDB; using browser storage', 'warn');
      console.error('mongo getAllMeta failed', e);
    }
  }
  return idb.getAllMeta();
}

// Test connection and auto-sync helpers
async function testMongoConnection(): Promise<boolean> {
  if (!state.settings.mongoApiUrl) return false;
  try {
    const ok = await mongoDb.testConnection({ baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
    return ok;
  } catch (e) {
    console.error('testMongoConnection error', e);
    return false;
  }
}

async function syncLocalToMongo(): Promise<void> {
  try {
    const localMeta = await idb.getAllMeta();
    const opts = { baseUrl: state.settings.mongoApiUrl!, apiKey: state.settings.mongoApiKey || null };

    // Try to fetch remote meta so we can avoid uploading unchanged projects.
    let remoteMap = new Map<string, number>();
    try {
      const remoteMeta = await mongoDb.getAllMeta(opts);
      for (const r of remoteMeta) {
        remoteMap.set(r.id, r.updatedAt || 0);
      }
    } catch (e) {
      // If fetching remote meta fails, fall back to uploading all local projects.
      console.error('syncLocalToMongo: failed to fetch remote meta', e);
    }

    let uploaded = 0;
    for (const m of localMeta) {
      try {
        const proj = await idb.getProject(m.id);
        if (!proj) continue;
        const remoteUpdated = remoteMap.get(m.id);
        // If remote exists and is newer or equal, skip upload.
        if (remoteUpdated !== undefined && proj.updatedAt <= remoteUpdated) {
          continue;
        }
        await mongoDb.putProject(proj, opts);
        uploaded++;
      } catch (e) {
        console.error('syncLocalToMongo: failed project', m.id, e);
      }
    }

    if (uploaded > 0) {
      addToast(`Synced ${uploaded} project(s) to MongoDB`, 'ok');
    } else {
      addToast('No local changes to sync to MongoDB', 'ok');
    }
  } catch (e) {
    console.error('syncLocalToMongo failed', e);
  }
}

/* ----------------- Meta / Projects ----------------- */
async function refreshMetaBar() {
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
      });
    }
  }

  return meta;
}

function createProject(name = 'Untitled Project') {
  const p: Project = { id: newId('p_'), name, createdAt: Date.now(), updatedAt: Date.now(), items: [], cursor: 0 };
  state.projects.set(p.id, p);
  if (!state.order.includes(p.id)) state.order.push(p.id);
  state.currentId = p.id;
  state.currentIndex = 0;
  putProjectAny(p).catch((err: any) => console.error(err));
  return p;
}

async function loadFirstProjectIfMissing() {
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
      state.projects.set(proj.id, proj);
      state.currentId = proj.id;
      state.currentIndex = proj.cursor || 0;
    }
  }
  await refreshMetaBar();
}

async function loadProjectById(id: string): Promise<Project | null> {
  if (!id) return null;

  // If configured for MongoDB, query the server directly so we can detect
  // network/HTTP errors and let the UI decide how to react (retry, notify).
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      const proj = await mongoDb.getProject(id, { baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
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

        state.projects.set(proj.id, proj);
        state.currentId = proj.id;
        state.currentIndex = proj.cursor || 0;
        return proj;
      }
      // Not found on server — fall back to local cache if available
      const local = await idb.getProject(id);
      if (local) {
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
      const proj = await idb.getProject(id);
      if (proj) {
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

/* ----------------- Accessors ----------------- */
function getCurrentProject(): Project | null {
  if (!state.currentId) return null;
  return state.projects.get(state.currentId) || null;
}

function currentItem(): Item | null {
  const proj = getCurrentProject();
  if (!proj) return null;
  return proj.items[state.currentIndex] || null;
}

function filteredItems(): Item[] {
  const proj = getCurrentProject();
  if (!proj) return [];
  const q = state.filter.text.trim().toLowerCase();
  return proj.items.filter(it => {
    if (state.filter.onlyMissing && it.caption) return false;
    if (state.filter.onlySelected && !it.selected) return false;
    if (!q) return true;
    return it.filename.toLowerCase().includes(q) || (it.caption || '').toLowerCase().includes(q);
  });
}

function getAbsoluteIndex(filteredIdx: number) {
  const proj = getCurrentProject();
  const list = filteredItems();
  const target = list[filteredIdx];
  if (!proj || !target) return -1;
  return proj.items.indexOf(target);
}

/* ----------------- File ingestion ----------------- */
async function ingestFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList as any) as File[];
  const images = files.filter(isImg);
  const videos = files.filter(isVideo);
  const texts = files.filter(isTxt);
  if (images.length === 0 && videos.length === 0 && texts.length === 0) {
    addToast('No supported files found', '');
    return;
  }

  const txtByBase = new Map<string, File>();
  for (const t of texts) {
    txtByBase.set(fileBase(t), t);
  }

  const proj = getCurrentProject();
  if (!proj) {
    addToast('No project selected', 'warn');
    return;
  }

  state.status = 'Reading files';
  let added = 0;

  // Build sets to avoid duplicates: files already in project and duplicates within this import
  const existingBases = new Set(proj.items.map(it => it.base || it.filename));
  const seenBases = new Set<string>();
  const uniqueMedia: File[] = [];

  // Combine images and videos to a single import list while preserving order
  const mediaCandidates = [...images, ...videos];
  for (const f of mediaCandidates) {
    const b = fileBase(f);
    if (existingBases.has(b) || seenBases.has(b)) continue;
    seenBases.add(b);
    uniqueMedia.push(f);
  }

  // Client-side video size limit (MB) from Vite env or fallback to 5
  const CLIENT_VIDEO_MAX_MB = Number(import.meta.env.VITE_VIDEO_MAX_SIZE_MB) || 5;
  // Filter out oversized videos with a friendly toast
  const filteredMedia: File[] = [];
  for (const f of uniqueMedia) {
    if (isVideo(f) && typeof (f as any).size === 'number' && (f as any).size > CLIENT_VIDEO_MAX_MB * 1024 * 1024) {
      addToast(`${f.name} skipped — video exceeds ${CLIENT_VIDEO_MAX_MB} MB limit`, 'warn');
      continue;
    }
    filteredMedia.push(f);
  }

  state.progress.total = filteredMedia.length;
  state.progress.cur = 0;

  for (const fileItem of filteredMedia) {
    const b = fileBase(fileItem);
    const txtFile = txtByBase.get(b) || null;
    try {
      const [dataUrl, txt] = await Promise.all([readAsDataURL(fileItem), txtFile ? readAsText(txtFile) : Promise.resolve('')]);
      const mType = mediaTypeOf(fileItem);
      const item: Item = {
        id: newId('i_'),
        filename: fileItem.name,
        base: b,
        caption: (txt || '').trim(),
        originalCaption: (txt || '').trim(),
        img: dataUrl,
        tags: [],
        selected: false,
        width: 0,
        height: 0
      } as any;

      // For videos add metadata and avoid image-only processing
      if (mType === 'video') {
        (item as any).mediaType = 'video';
        (item as any).size = (fileItem as any).size || 0;
      } else {
        (item as any).mediaType = 'image';
        try {
          const d = await imgDims(dataUrl);
          item.width = d.w;
          item.height = d.h;
        } catch {}
      }

      // If user enabled prompt metadata scanning and there's no .txt original caption,
      // attempt to extract embedded Stable Diffusion prompt metadata (images only).
      if (mType === 'image' && state.settings.usePromptMetadata && !(item.originalCaption && item.originalCaption.trim())) {
        try {
          const extracted = await extractSdPrompt(fileItem);
          if (extracted) {
            // push candidate (do not apply yet)
            state.promptCandidates.push({
              itemId: item.id,
              filename: item.filename,
              img: dataUrl,
              prompt: extracted
            });
          }
        } catch (e) {
          // ignore extraction errors
        }
      }

      proj.items.push(item);
      added++;
      state.progress.cur = added;
    } catch (err) {
      console.error('Failed to read file', fileItem.name, err);
    }
  }

  proj.updatedAt = Date.now();
  const duplicateSkipped = mediaCandidates.length - uniqueMedia.length;
  addToast(`Loaded ${added} media${texts.length ? ` with ${texts.length} text file(s)` : ''}${duplicateSkipped ? ` • ${duplicateSkipped} duplicate(s) skipped` : ''}.`, 'ok');

  // If there are extracted prompt candidates, either show the modal for confirmation
  // or auto-apply depending on settings
  if (state.promptCandidates.length > 0) {
    if (state.settings.confirmPromptOnImport) {
      state.showPromptModal = true;
      // Keep state.status Idle so UI remains responsive
      state.status = 'Idle';
      await putProjectAny(proj);
      return;
    } else {
      // Auto-apply all candidates (but still do not overwrite if originalCaption exists)
      let applied = 0;
      for (const c of state.promptCandidates) {
        const it = proj.items.find(x => x.id === c.itemId);
        if (it && !(it.originalCaption && it.originalCaption.trim())) {
          it.caption = c.prompt;
          it.originalCaption = c.prompt;
          applied++;
        }
      }
      state.promptCandidates.length = 0;
      addToast(`Applied ${applied} embedded prompts as captions`, 'ok');
    }
  }

  state.status = 'Idle';
  await putProjectAny(proj);
}

/* ----------------- Project save/export/import ----------------- */
async function saveCurrentProject() {
  const proj = getCurrentProject();
  if (!proj) return;
  proj.updatedAt = Date.now();
  await putProjectAny(proj);
  addToast('Project saved', 'ok');
  await refreshMetaBar();
}

function exportProject() {
  const proj = getCurrentProject();
  if (!proj) {
    addToast('No project', 'warn');
    return;
  }
  const data = { schema: 'caption-studio-v1', project: proj };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = slug(proj.name) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Export project as a ZIP containing numbered image + text pairs.
 * Filenames start at 0001 and are zero-padded to at least 4 digits (or larger if needed).
 * Uses dynamic import of fflate for efficient zipping.
 */
async function exportProjectZip() {
  const proj = getCurrentProject();
  if (!proj) {
    addToast('No project', 'warn');
    return;
  }

  try {
    state.status = 'Preparing export';
    const items = proj.items || [];
    if (items.length === 0) {
      addToast('No items to export', 'warn');
      state.status = 'Idle';
      return;
    }

    // Use JSZip (dynamic import) to build the archive. This avoids the recursion issue observed with fflate
    // and provides a simple progress hook via generateAsync's onUpdate callback.
    const JSZipModule = await import('jszip');
    const JSZip = (JSZipModule && (JSZipModule as any).default) || JSZipModule;
    const zipObj = new JSZip();

    const count = items.length;
    const pad = Math.max(4, String(count).length);
    const padded = (i: number) => String(i + 1).padStart(pad, '0');

    // helper: convert dataURL to Uint8Array
    const dataUrlToU8 = (dataUrl: string) => {
      const comma = dataUrl.indexOf(',');
      const meta = dataUrl.slice(0, comma);
      const b64 = dataUrl.slice(comma + 1);
      const binStr = atob(b64);
      const len = binStr.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
      const mimeMatch = meta.match(/data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      return { u8, mime };
    };

    state.progress.cur = 0;
    // We'll use a 0-100 progress scale for generation phase
    state.progress.total = 100;

    const manifest: Record<string, { original: string; name: string }> = {};
    let skipped = 0;

    // Add files to JSZip instance one at a time
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const idx = padded(i);

      if (!it.img) {
        skipped++;
        // Map file processing progress to 0-30% range
        state.progress.cur = Math.floor(((i + 1) / items.length) * 30);
        continue;
      }

      // determine extension from original filename or mime
      let ext = 'jpg';
      const m = (it.filename || '').match(/\.([^.]+)$/);
      if (m && m[1]) ext = m[1].toLowerCase();
      if (!m) {
        try {
          const mimeTry = it.img.slice(5, it.img.indexOf(';'));
          if (mimeTry) {
            if (mimeTry === 'image/jpeg') ext = 'jpg';
            else if (mimeTry === 'image/png') ext = 'png';
            else if (mimeTry === 'image/webp') ext = 'webp';
            else if (mimeTry === 'image/gif') ext = 'gif';
            else if (mimeTry === 'image/bmp') ext = 'bmp';
            else {
              const parts = mimeTry.split('/');
              if (parts[1]) ext = parts[1];
            }
          }
        } catch {}
      }

      const imgName = `${idx}.${ext}`;
      const txtName = `${idx}.txt`;

      try {
        const { u8 } = dataUrlToU8(it.img);
        // JSZip accepts Uint8Array directly for binary content
        zipObj.file(imgName, u8);
      } catch (e) {
        console.error('Failed to convert image to binary for', it.filename, e);
        skipped++;
        state.progress.cur = Math.floor(((i + 1) / items.length) * 30);
        continue;
      }

      // caption as UTF-8 text
      zipObj.file(txtName, it.caption || '');

      manifest[imgName] = { original: it.filename || '', name: imgName };

      // update processing progress mapped to 0-30%
      state.progress.cur = Math.floor(((i + 1) / items.length) * 30);
    }

    // include manifest.json for mapping back to original filenames
    zipObj.file('manifest.json', JSON.stringify({
      projectName: proj.name,
      count: items.length,
      skipped,
      mapping: manifest
    }, null, 2));

    state.status = 'Generating zip';

    // Generate blob with progress callback; map generation percent (0-100) to 30-100 overall progress
    const blob = await zipObj.generateAsync(
      { type: 'blob', compression: 'DEFLATE' },
      (metadata: any) => {
        // metadata.percent is 0-100 for generation stage
        const genPercent = Math.round(metadata.percent || 0);
        // Map generation to 30-100 range
        state.progress.cur = Math.min(100, Math.floor(30 + (genPercent * 0.7)));
      }
    );

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug(proj.name) + '.zip';
    a.click();
    URL.revokeObjectURL(a.href);

    addToast(`Export complete${skipped ? ` • skipped ${skipped} item(s)` : ''}`, 'ok');
  } catch (err) {
    console.error('exportProjectZip failed', err);
    addToast('Export failed', 'warn');
  } finally {
    state.status = 'Idle';
    state.progress = { cur: 0, total: 0 };
  }
}

function importProjectFromJSON(obj: any) {
  if (obj && obj.schema === 'caption-studio-v1' && obj.project) {
    const p: Project = obj.project;
    p.updatedAt = Date.now();
    state.projects.set(p.id, p);
    if (!state.order.includes(p.id)) state.order.push(p.id);
    state.currentId = p.id;
    state.currentIndex = p.cursor || 0;
    addToast('Project imported', 'ok');
    refreshMetaBar().catch(console.error);
  } else {
    addToast('Invalid JSON schema', 'warn');
  }
}

/* ----------------- Delete project (Danger Zone) ----------------- */
/**
 * Delete a project by id from IndexedDB and update in-memory state.
 * Returns true on success, false on failure.
 */
async function deleteProject(id: string) {
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

/* ----------------- Editing & navigation ----------------- */
function applyEdits(caption: string, tagsRaw: string) {
  const it = currentItem();
  if (!it) return;
  it.caption = caption.trim();
  it.tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);
  addToast('Caption saved', 'ok');
}

function copyFromFile() {
  const it = currentItem();
  if (!it) return;
  if (it.originalCaption) {
    // caller will set caption text box
    addToast('Copied original caption', 'ok');
    return it.originalCaption;
  } else {
    addToast('No original .txt caption found', 'warn');
    return '';
  }
}

function clearCaption() {
  const it = currentItem();
  if (!it) return;
  it.caption = '';
}

/* ----------------- Bulk tools ----------------- */
function bulkApply(prefix = '', suffix = '', find = '', replaceStr = '') {
  const proj = getCurrentProject();
  if (!proj) return;
  const targets = proj.items.filter(it => (state.filter.onlySelected ? it.selected : true));
  const rx = find ? new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : null;
  for (const it of targets) {
    let t = it.caption || '';
    if (rx) t = t.replace(rx, replaceStr);
    if (prefix) t = prefix + t;
    if (suffix) t = t + suffix;
    it.caption = t.trim();
  }
  addToast('Bulk edit applied', 'ok');
}

/* ----------------- Prompt candidates (embedded metadata) ----------------- */
function acceptPromptCandidate(itemId: string) {
  const proj = getCurrentProject();
  if (!proj) return;
  const idx = proj.items.findIndex(i => i.id === itemId);
  if (idx === -1) return;
  const candIdx = state.promptCandidates.findIndex(c => c.itemId === itemId);
  if (candIdx === -1) return;
  const c = state.promptCandidates[candIdx];
  const it = proj.items[idx];
  if (!(it.originalCaption && it.originalCaption.trim())) {
    // replace the item object so Vue reactivity picks up the change
    const newIt = { ...it, caption: c.prompt, originalCaption: c.prompt };
    proj.items[idx] = newIt;
    addToast(`Applied prompt for ${it.filename}`, 'ok');
  } else {
    addToast(`Skipped ${it.filename} (already has original caption)`, 'warn');
  }
  state.promptCandidates.splice(candIdx, 1);
  if (state.promptCandidates.length === 0) state.showPromptModal = false;
  putProjectAny(proj).catch(console.error);
}

function rejectPromptCandidate(itemId: string) {
  const idx = state.promptCandidates.findIndex(c => c.itemId === itemId);
  if (idx === -1) return;
  state.promptCandidates.splice(idx, 1);
  if (state.promptCandidates.length === 0) state.showPromptModal = false;
}

function acceptAllPromptCandidates() {
  const proj = getCurrentProject();
  if (!proj) return;
  let applied = 0;
  for (const c of state.promptCandidates) {
    const idx = proj.items.findIndex(x => x.id === c.itemId);
    if (idx !== -1) {
      const it = proj.items[idx];
      if (!(it.originalCaption && it.originalCaption.trim())) {
        // replace the item so Vue sees the change
        const newIt = { ...it, caption: c.prompt, originalCaption: c.prompt };
        proj.items[idx] = newIt;
        applied++;
      }
    }
  }
  state.promptCandidates.length = 0;
  state.showPromptModal = false;
  addToast(`Applied ${applied} embedded prompts`, 'ok');
  putProjectAny(proj).catch(console.error);
}

function rejectAllPromptCandidates() {
  state.promptCandidates.length = 0;
  state.showPromptModal = false;
}

/* ----------------- End prompt candidates ----------------- */

/* ----------------- Curation ----------------- */
/**
 * Return items to include in the curation queue.
 * By default only return items without a curationStatus (uncurated).
 */
function getCurationQueue(includeCurated = false) {
  const proj = getCurrentProject();
  if (!proj) return [];
  return proj.items.filter(it => includeCurated ? true : !(it.curationStatus));
}

/**
 * Set an item's curation status ('accepted' | 'rejected'), persist the project,
 * and advance to the next un-curated item. When accepted, also mark selected.
 */
function setCurationStatus(itemId: string, status: 'accepted' | 'rejected') {
  const proj = getCurrentProject();
  if (!proj) return;
  const idx = proj.items.findIndex(i => i.id === itemId);
  if (idx === -1) return;
  const it = proj.items[idx];
  // update item
  it.curationStatus = status;
  if (status === 'accepted') it.selected = true;
  proj.updatedAt = Date.now();
  // persist change
  putProjectAny(proj).catch(console.error);
  addToast(`${status === 'accepted' ? 'Accepted' : 'Rejected'}: ${it.filename}`, status === 'accepted' ? 'ok' : 'warn');

  // Advance to the next un-curated item in the project
  const remaining = proj.items.findIndex((x, i) => !x.curationStatus && i > idx);
  if (remaining !== -1) {
    state.currentIndex = remaining;
    proj.cursor = state.currentIndex;
  } else {
    // If none to the right, try from start
    const first = proj.items.findIndex(x => !x.curationStatus);
    if (first !== -1) {
      state.currentIndex = first;
      proj.cursor = state.currentIndex;
    } else {
      // No more items to curate — exit curation mode
      state.curationMode = false;
      addToast('Curation complete', 'ok');
    }
  }
}

/**
 * Remove all rejected items from the current project and persist.
 * Returns the number removed.
 */
function removeRejectedFromProject() {
  const proj = getCurrentProject();
  if (!proj) return 0;
  const before = proj.items.length;
  proj.items = proj.items.filter(i => i.curationStatus !== 'rejected');
  const removed = before - proj.items.length;
  // clamp currentIndex
  state.currentIndex = Math.min(state.currentIndex, Math.max(0, proj.items.length - 1));
  proj.cursor = state.currentIndex;
  proj.updatedAt = Date.now();
  putProjectAny(proj).catch(console.error);
  addToast(`Removed ${removed} rejected item${removed === 1 ? '' : 's'}`, removed ? 'ok' : '');
  return removed;
}

/**
 * Start/stop helpers for curation mode.
 */
function startCuration(includeCurated = false) {
  const proj = getCurrentProject();
  if (!proj) {
    addToast('No project selected', 'warn');
    return;
  }
  state.curationMode = true;
  // Position cursor to first relevant item
  if (!includeCurated) {
    const idx = proj.items.findIndex(i => !i.curationStatus);
    state.currentIndex = idx !== -1 ? idx : 0;
  } else {
    state.currentIndex = proj.cursor || 0;
  }
  proj.cursor = state.currentIndex;
}

function stopCuration() {
  state.curationMode = false;
}

 /* ----------------- Auto caption (Ollama) ----------------- */
async function autoCaptionCurrent() {
  const it = currentItem();
  if (!it) {
    addToast('No media selected', 'warn');
    return;
  }

  // Block videos from AI captioning
  if ((it as any).mediaType === 'video' || (it.filename && /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(it.filename))) {
    addToast('AI captioning not supported for videos', 'warn');
    return;
  }

  try {
    state.status = 'Contacting Ollama';
    const img64 = it.img.split(',')[1] || '';
    const text = await captionImage(state.settings, img64, chunk => {
      // progressive streaming handled by caller (component) via store subscription to item changes
      it.caption = (it.caption || '') + chunk;
    });
    if (text) {
      it.caption = text;
      addToast('AI caption generated', 'ok');
      // Auto-save after AI caption completes
      try {
        await saveCurrentProject();
      } catch (e) {
        console.error('Auto-save after AI caption failed', e);
      }
    } else {
      addToast('Empty response from model', 'warn');
    }
  } catch (err) {
    console.error(err);
    addToast('AI request failed. Check settings. Browser to localhost can be blocked.', 'warn');
  } finally {
    state.status = 'Idle';
  }
}

async function autoCaptionBulk() {
  const proj = getCurrentProject();
  if (!proj) return;
  // Exclude videos from targets
  const targets = proj.items.filter(it => (state.filter.onlySelected ? it.selected : !it.caption))
    .filter(it => !((it as any).mediaType === 'video' || (it.filename && /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(it.filename))));
  if (targets.length === 0) {
    addToast('Nothing to caption', 'warn');
    return;
  }
  state.status = 'Auto captioning...';
  for (let i = 0; i < targets.length; i++) {
    const it = targets[i];
    state.currentIndex = proj.items.indexOf(it);
    try {
      const img64 = it.img.split(',')[1] || '';
      const text = await captionImage(state.settings, img64, chunk => {
        it.caption = (it.caption || '') + chunk;
      });
      if (text) {
        it.caption = text;
        // Auto-save after each generated caption to persist progress
        try {
          await saveCurrentProject();
        } catch (e) {
          console.error('Auto-save during bulk caption failed', e);
        }
      }
    } catch (e) {
      addToast('Failed on ' + it.filename, 'warn');
      break;
    }
    state.progress.cur = i + 1;
    await sleep(150);
  }
  state.status = 'Idle';
  addToast('Bulk auto caption complete', 'ok');
}

/* ----------------- Navigation ----------------- */
function prev() {
  const proj = getCurrentProject();
  if (!proj) return;
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  proj.cursor = state.currentIndex;
}

function next() {
  const proj = getCurrentProject();
  if (!proj) return;
  state.currentIndex = Math.min(proj.items.length - 1, state.currentIndex + 1);
  proj.cursor = state.currentIndex;
}

/* ----------------- Selection / filters ----------------- */
function toggleSelect(itemId: string) {
  const proj = getCurrentProject();
  if (!proj) return;
  const it = proj.items.find(i => i.id === itemId);
  if (!it) return;
  it.selected = !it.selected;
}

function clearList() {
  const proj = getCurrentProject();
  if (!proj) return;
  proj.items.length = 0;
  state.currentIndex = 0;
}

function removeCurrentItem() {
  const proj = getCurrentProject();
  if (!proj) return;
  const idx = state.currentIndex;
  if (idx < 0 || idx >= proj.items.length) return;
  const removed = proj.items.splice(idx, 1)[0];
  // clamp currentIndex to valid range
  if (proj.items.length === 0) {
    state.currentIndex = 0;
  } else {
    state.currentIndex = Math.min(idx, proj.items.length - 1);
  }
  proj.cursor = state.currentIndex;
  putProjectAny(proj).catch(console.error);
  addToast(`Removed image: ${removed.filename}`, 'ok');

  // If there are any pending promptCandidates for this item, drop them
  const candIdx = state.promptCandidates.findIndex(c => c.itemId === removed.id);
  if (candIdx !== -1) {
    state.promptCandidates.splice(candIdx, 1);
    if (state.promptCandidates.length === 0) state.showPromptModal = false;
  }
}

/* ----------------- Settings ----------------- */
async function saveSettings(newSettings: Partial<Settings>) {
  const prevStorage = state.settings.storage;
  Object.assign(state.settings, newSettings);
  localStorage.setItem('captionSettings', JSON.stringify(state.settings));
  addToast('Settings saved', 'ok');

  // If storage switched to mongodb and an api url is configured, test and auto-sync
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl && prevStorage !== 'mongodb') {
    const ok = await testMongoConnection();
    if (ok) {
      addToast('Connected to MongoDB — syncing local projects', 'ok');
      await syncLocalToMongo();
    } else {
      addToast('MongoDB unreachable. Using browser storage. You can retry in Settings.', 'warn');
    }
  }
}

function loadSettingsFromLocal() {
  try {
    const s = JSON.parse(localStorage.getItem('captionSettings') || '{}');
    Object.assign(state.settings, s);
  } catch {}
}

/* ----------------- Init helper ----------------- */
async function initStore() {
  // Load persisted settings first so we can use the showWelcomeOnStart flag
  loadSettingsFromLocal();

  // Check whether there are any existing projects (meta). If none (or only the
  // auto-created default "My First Project" with zero items) and the welcome
  // flag is enabled, show the welcome modal (first-run experience).
  try {
    const meta = await getAllMetaAny();
    if (state.settings.showWelcomeOnStart ?? true) {
      let showWelcome = false;
      if (meta.length === 0) {
        showWelcome = true;
      } else if (meta.length === 1) {
        // If the only project is the auto-created default and it has no items,
        // treat this as first-run so the welcome screen appears.
        const m = meta[0];
        const isDefaultName = m.name === 'My First Project' || m.name === 'Untitled Project';
        const isEmpty = !m.count || m.count === 0;
        if (isDefaultName && isEmpty) showWelcome = true;
      }
      if (showWelcome) state.showWelcomeModal = true;
    }
  } catch (e) {
    // ignore failures here and proceed with normal initialization
    console.error('initStore: failed to fetch meta for welcome check', e);
  }

  // Ensure at least one project exists (this will create the default project if needed)
  await loadFirstProjectIfMissing();
  await refreshMetaBar();

  // If configured for MongoDB at startup, test connection and (optionally) attempt auto-sync if available
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    const ok = await testMongoConnection();
    if (ok) {
      if (state.settings.autoSyncOnStart) {
        addToast('Connected to MongoDB — syncing local projects', 'ok');
        await syncLocalToMongo();
      } else {
        addToast('Connected to MongoDB', 'ok');
      }
    } else {
      addToast('MongoDB unreachable. Using browser storage. Open Settings to retry.', 'warn');
    }
  }
}

/* ----------------- Expose API ----------------- */
export function useProjectStore() {
  return {
    state,
    initStore,
    refreshMetaBar,
    createProject,
    setCurrentProject(project: Project) {
      state.projects.set(project.id, project);
      if (!state.order.includes(project.id)) state.order.push(project.id);
      state.currentId = project.id;
      state.currentIndex = project.cursor || 0;
    },
    loadProjectById,
    getCurrentProject,
    currentItem,
    filteredItems,
    getAbsoluteIndex,
    ingestFiles,
    saveCurrentProject,
    exportProject,
    exportProjectZip,
    importProjectFromJSON,
    applyEdits,
    copyFromFile,
    clearCaption,
    bulkApply,
    autoCaptionCurrent,
    autoCaptionBulk,
    prev,
    next,
    toggleSelect,
    clearList,
    removeCurrentItem,
    saveSettings,
    deleteProject,
    testOllama: async () => {
      try {
        const ok = await testOllama(state.settings.ollamaUrl);
        return ok;
      } catch {
        return false;
      }
    },
    testMongo: async () => {
      try {
        const ok = await testMongoConnection();
        if (ok) {
          addToast('MongoDB connection OK', 'ok');
          await syncLocalToMongo();
        } else {
          addToast('MongoDB connection failed', 'warn');
        }
        return ok;
      } catch (e) {
        console.error('testMongo', e);
        addToast('MongoDB connection failed', 'warn');
        return false;
      }
    },
    syncToMongo: async () => {
      try {
        await syncLocalToMongo();
        return true;
      } catch (e) {
        console.error('syncToMongo', e);
        return false;
      }
    },
    toasts: state.toasts,
    addToast,
    dismissToast,
    stateRef: state,
    // Prompt candidate actions
    acceptPromptCandidate,
    rejectPromptCandidate,
    acceptAllPromptCandidates,
    rejectAllPromptCandidates,
    // Curation helpers
    setCurationStatus,
    startCuration,
    stopCuration,
    removeRejectedFromProject,
    getCurationQueue
  };
}
