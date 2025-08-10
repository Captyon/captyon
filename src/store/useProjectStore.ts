import { reactive } from 'vue';
import type { Project, Item, Settings } from '../types';
import type { ToastItem } from '../types';
import * as idb from '../services/db';
import * as mongoDb from '../services/db.mongo';
import { readAsDataURL, readAsText, imgDims, isImg, isTxt, base as fileBase, sleep, slug, extractSdPrompt } from '../utils/file';
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
  // Show confirmation modal when promptCandidates is non-empty and user opted-in
  showPromptModal: boolean;
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
    // Storage settings (default to browser)
    storage: 'browser',
    mongoApiUrl: '',
    mongoApiKey: ''
  },
  selection: new Set(),
  status: 'Idle',
  progress: { cur: 0, total: 0 },
  toasts: [],
  promptCandidates: [],
  showPromptModal: false
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
    const meta = await idb.getAllMeta();
    for (const m of meta) {
      try {
        const proj = await idb.getProject(m.id);
        if (proj) {
          await mongoDb.putProject(proj, { baseUrl: state.settings.mongoApiUrl!, apiKey: state.settings.mongoApiKey || null });
        }
      } catch (e) {
        console.error('syncLocalToMongo: failed project', m.id, e);
      }
    }
    addToast('Local projects synced to MongoDB', 'ok');
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
  try {
    const proj = await getProjectAny(id);
    if (proj) {
      state.projects.set(proj.id, proj);
      state.currentId = proj.id;
      state.currentIndex = proj.cursor || 0;
    }
    return proj;
  } catch (e) {
    console.error('loadProjectById failed', e);
    return null;
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
  const texts = files.filter(isTxt);
  if (images.length === 0 && texts.length === 0) {
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
  const uniqueImages: File[] = [];
  for (const imgFile of images) {
    const b = fileBase(imgFile);
    if (existingBases.has(b) || seenBases.has(b)) continue;
    seenBases.add(b);
    uniqueImages.push(imgFile);
  }

  state.progress.total = uniqueImages.length;
  state.progress.cur = 0;

  for (const imgFile of uniqueImages) {
    const b = fileBase(imgFile);
    const txtFile = txtByBase.get(b) || null;
    try {
      const [imgData, txt] = await Promise.all([readAsDataURL(imgFile), txtFile ? readAsText(txtFile) : Promise.resolve('')]);
      const item: Item = {
        id: newId('i_'),
        filename: imgFile.name,
        base: b,
        caption: (txt || '').trim(),
        originalCaption: (txt || '').trim(),
        img: imgData,
        tags: [],
        selected: false,
        width: 0,
        height: 0
      };
      try {
        const d = await imgDims(imgData);
        item.width = d.w;
        item.height = d.h;
      } catch {}

      // If user enabled prompt metadata scanning and there's no .txt original caption,
      // attempt to extract embedded Stable Diffusion prompt metadata.
      if (state.settings.usePromptMetadata && !(item.originalCaption && item.originalCaption.trim())) {
        try {
          const extracted = await extractSdPrompt(imgFile);
          if (extracted) {
            // push candidate (do not apply yet)
            state.promptCandidates.push({
              itemId: item.id,
              filename: item.filename,
              img: imgData,
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
      console.error('Failed to read file', imgFile.name, err);
    }
  }

  proj.updatedAt = Date.now();
  const skipped = images.length - uniqueImages.length;
  addToast(`Loaded ${added} images${texts.length ? ` with ${texts.length} text file(s)` : ''}${skipped ? ` • ${skipped} duplicate(s) skipped` : ''}.`, 'ok');

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
  state.promptCandidates = state.promptCandidates.filter((c: any) => {
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

/* ----------------- Auto caption (Ollama) ----------------- */
async function autoCaptionCurrent() {
  const it = currentItem();
  if (!it) {
    addToast('No image selected', 'warn');
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
  const targets = proj.items.filter(it => (state.filter.onlySelected ? it.selected : !it.caption));
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
  loadSettingsFromLocal();
  await loadFirstProjectIfMissing();
  await refreshMetaBar();

  // If configured for MongoDB at startup, test connection and attempt auto-sync if available
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    const ok = await testMongoConnection();
    if (ok) {
      addToast('Connected to MongoDB — syncing local projects', 'ok');
      await syncLocalToMongo();
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
    rejectAllPromptCandidates
  };
}
