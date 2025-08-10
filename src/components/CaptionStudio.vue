<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

const store = useProjectStore();
const { state } = store;

const projectSelect = ref<HTMLSelectElement | null>(null);
const filesInput = ref<HTMLInputElement | null>(null);
const folderInput = ref<HTMLInputElement | null>(null);
const jsonInput = ref<HTMLInputElement | null>(null);
const searchBox = ref<HTMLInputElement | null>(null);

const captionBox = ref('');
const tagInput = ref('');

const currentProject = computed(() => store.getCurrentProject());
const items = computed(() => store.filteredItems());
const currentItem = computed(() => store.currentItem());

watch(currentItem, (it) => {
  captionBox.value = it?.caption || '';
  tagInput.value = (it?.tags || []).join(', ');
}, { immediate: true });

watch(() => currentItem.value?.caption, (c) => {
  captionBox.value = c || '';
});

watch(() => state.showPromptModal, (val) => {
  const el = document.getElementById('promptModal') as HTMLDialogElement | null;
  if (val) {
    // default-select all candidates when modal opens
    promptSelections.value = new Set((state.promptCandidates || []).map((c: any) => c.itemId));
    el?.showModal();
  } else {
    try { el?.close(); } catch {}
  }
});

function onNewProject() {
  const name = prompt('Project name?') || 'Untitled';
  store.createProject(name);
  store.refreshMetaBar().catch(console.error);
}

function onProjectChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  if (!val) return;
  store.refreshMetaBar().then(async () => {
    const { getProject } = await import('../services/db');
    const proj = await getProject(val);
    if (proj) store.setCurrentProject(proj);
  }).catch(console.error);
}

async function pickFiles() {
  // Prefer the Directory Picker when available so we can scan the whole folder
  // for matching .txt caption files even if the user only selects images.
  // Fall back to the regular file input if the API isn't available or is cancelled.
  if ((window as any).showDirectoryPicker) {
    try {
      const dir = await (window as any).showDirectoryPicker();
      const files: File[] = [];
      async function recurse(d: any) {
        for await (const [, handle] of d.entries()) {
          if (handle.kind === 'file') {
            try {
              const f = await handle.getFile();
              files.push(f);
            } catch (e) {
              // ignore files we can't read
            }
          } else if (handle.kind === 'directory') {
            await recurse(handle);
          }
        }
      }
      await recurse(dir);
      if (files.length) {
        store.ingestFiles(files);
      }
      return;
    } catch (err) {
      // user cancelled or permission denied — fall back to input picker
    }
  }
  filesInput.value?.click();
}
function pickFolder() {
  folderInput.value?.click();
}
function triggerJsonImport() {
  jsonInput.value?.click();
}
function onFilesPicked(e: Event) {
  const el = e.target as HTMLInputElement;
  if (el?.files) store.ingestFiles(el.files);
  el.value = '';
}
function onFolderPicked(e: Event) {
  const el = e.target as HTMLInputElement;
  if (el?.files) store.ingestFiles(el.files);
  el.value = '';
}

function onImportJson(e: Event) {
  const el = e.target as HTMLInputElement;
  const f = el.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(String(reader.result));
      store.importProjectFromJSON(obj);
    } catch {
      store.addToast('Invalid JSON', 'warn');
    }
  };
  reader.readAsText(f);
  el.value = '';
}

function applyEdits() {
  store.applyEdits(captionBox.value, tagInput.value);
  store.saveCurrentProject();
}

function copyFromFile() {
  const s = store.copyFromFile();
  if (s) {
    captionBox.value = s;
  }
}

function clearCaption() {
  captionBox.value = '';
  store.clearCaption();
}

function prev() {
  store.prev();
}
function next() {
  store.next();
}

function fit() {
  state.zoom = 100;
}
function fill() {
  state.zoom = 150;
}
function rotate() {
  state.rotation = (state.rotation + 90) % 360;
}

function exportProject() {
  store.exportProject();
}

function saveProject() {
  store.saveCurrentProject();
}

function openSettings() {
  const el = document.getElementById('settingsModal') as HTMLDialogElement | null;
  el?.showModal();
}

function openHelp() {
  const el = document.getElementById('helpModal') as HTMLDialogElement | null;
  el?.showModal();
}

function openBulk() {
  const el = document.getElementById('bulkModal') as HTMLDialogElement | null;
  el?.showModal();
}

// Project Settings modal handling
const deleteProjectConfirmInput = ref('');

function openProjectSettings() {
  deleteProjectConfirmInput.value = '';
  const el = document.getElementById('projectSettingsModal') as HTMLDialogElement | null;
  el?.showModal();
}

async function confirmDeleteProject() {
  const proj = currentProject.value;
  if (!proj) return;
  if (deleteProjectConfirmInput.value !== proj.name) {
    store.addToast('Project name does not match', 'warn');
    return;
  }
  try {
    const ok = await store.deleteProject(proj.id);
    if (ok) {
      closeModal('projectSettingsModal');
    }
  } catch (e) {
    console.error('deleteProject failed', e);
    store.addToast('Failed to delete project', 'warn');
  }
}

function selectThumb(filteredIdx: number) {
  const abs = store.getAbsoluteIndex(filteredIdx);
  if (abs === -1) return;
  state.currentIndex = abs;
  const proj = store.getCurrentProject();
  if (proj) proj.cursor = state.currentIndex;
}

function toggleSelect(it: any) {
  it.selected = !it.selected;
}

function closeModal(id: string) {
  const el = document.getElementById(id) as HTMLDialogElement | null;
  el?.close();
}

function saveSettingsAndClose() {
  store.saveSettings(state.settings);
  closeModal('settingsModal');
}

// Prompt confirmation modal state (local selections)
const promptSelections = ref(new Set<string>());

function togglePromptSelection(id: string) {
  const s = promptSelections.value;
  if (s.has(id)) s.delete(id);
  else s.add(id);
  // trigger reactivity by replacing the Set reference
  promptSelections.value = new Set(s);
}

function applySelectedPrompts() {
  for (const id of Array.from(promptSelections.value)) {
    try { store.acceptPromptCandidate(id); } catch (e) { console.error(e); }
  }
  promptSelections.value = new Set();
}

function applyAllPrompts() {
  try { store.acceptAllPromptCandidates(); } catch (e) { console.error(e); }
  promptSelections.value = new Set();
}

function skipAllPrompts() {
  try { store.rejectAllPromptCandidates(); } catch (e) { console.error(e); }
  promptSelections.value = new Set();
}

function closePromptModal() {
  // simply hide the modal without applying — candidates remain available in the store
  state.showPromptModal = false;
  promptSelections.value = new Set();
}

function applyBulkAndClose() {
  const p = (document.getElementById('bulkPrefix') as HTMLInputElement).value;
  const s = (document.getElementById('bulkSuffix') as HTMLInputElement).value;
  const f = (document.getElementById('bulkFind') as HTMLInputElement).value;
  const r = (document.getElementById('bulkReplace') as HTMLInputElement).value;
  store.bulkApply(p, s, f, r);
  closeModal('bulkModal');
}

onMounted(async () => {
  await store.initStore();

  // drag/drop overlay
  const ov = document.getElementById('dropOverlay') as HTMLDivElement | null;
  window.addEventListener('dragover', (e) => { e.preventDefault(); if (ov) ov.style.display = 'flex'; });
  window.addEventListener('dragleave', (e) => { if ((e.target as any) === document || (e.target as any) === document.body) { if (ov) ov.style.display = 'none'; } });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (ov) ov.style.display = 'none';
    const dt = (e as DragEvent).dataTransfer;
    if (!dt) return;
    if (dt.items) {
      const itemsArr = Array.from(dt.items);
      const files = itemsArr.map((it: any) => it.kind === 'file' ? it.getAsFile() as File | null : null).filter(Boolean) as File[];
      store.ingestFiles(files);
    } else if (dt.files) {
      store.ingestFiles(dt.files);
    }
  });

  // keyboard shortcuts were previously registered inside onMounted.
});
 
const deleteDontAsk = ref(false);

function openDeleteConfirm() {
  deleteDontAsk.value = false;
  const el = document.getElementById('deleteConfirm') as HTMLDialogElement | null;
  el?.showModal();
}

function doDelete() {
  try {
    (store as any).removeCurrentItem?.();
  } catch (e) { console.error(e); }
  closeModal('deleteConfirm');
}

function onConfirmDeleteFromModal() {
  if (deleteDontAsk.value) {
    store.saveSettings({ confirmDeleteOnRemove: false });
  }
  doDelete();
}

function confirmDelete() {
  const it = currentItem.value;
  if (!it) return;
  if (!state.settings.confirmDeleteOnRemove) {
    doDelete();
    return;
  }
  openDeleteConfirm();
}

// Safe apply edits used by keyboard shortcuts to avoid uncaught promise/errors
const applyEditsSafe = () => {
  try {
    // apply edits synchronously to the store
    store.applyEdits(captionBox.value, tagInput.value);
    // saveCurrentProject may return a Promise or throw; catch either case
    const res = (store as any).saveCurrentProject?.();
    if (res && typeof res.then === 'function') {
      res.catch((e: any) => console.error('saveCurrentProject failed', e));
    }
  } catch (e) {
    console.error('applyEditsSafe error', e);
  }
};

const __cs_onKeyDown = (e: KeyboardEvent) => {
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  const activeEl = document.activeElement as HTMLElement | null;
  const isEditable = ['input','textarea','select'].includes(tag) || !!(activeEl && activeEl.isContentEditable);

  // Slash opens search only when not focused in an editable field
  if (e.key === '/' && !['input','textarea'].includes(tag)) { e.preventDefault(); e.stopImmediatePropagation(); searchBox.value?.focus(); return; }
  // If typing in an editable field, don't trigger hotkeys
  if (isEditable) return;

  // Require Alt for action hotkeys
  if (!e.altKey) return;

  const code = (e as KeyboardEvent).code;
  try {
    if (code === 'KeyS' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); applyEditsSafe(); return; }
    if (code === 'KeyG' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { (store as any).autoCaptionCurrent?.(); } catch(err){ console.error(err);} return; }
    if (code === 'KeyN' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { prev(); } catch(err){ console.error(err);} return; }
    if (code === 'KeyM' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { next(); } catch(err){ console.error(err);} return; }
    if (code === 'KeyD' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { confirmDelete(); } catch(err){ console.error(err);} return; }
  } catch (err) { console.error('Shortcut handler error', err); }
};

const __cs_onKeyUp = (e: KeyboardEvent) => {
  // fallback: prevent default on keyup for combos that might slip through
  if (!(e.ctrlKey || e.metaKey)) return;
  const code = (e as KeyboardEvent).code;
  if (['KeyS','KeyG','KeyN','KeyM','KeyD'].includes(code) && e.altKey) {
    try { e.preventDefault(); e.stopImmediatePropagation(); } catch(ex) {}
  }
};

window.addEventListener('keydown', __cs_onKeyDown, { capture: true, passive: false });
window.addEventListener('keyup', __cs_onKeyUp, { capture: true, passive: false });
onUnmounted(() => { window.removeEventListener('keydown', __cs_onKeyDown, true); window.removeEventListener('keyup', __cs_onKeyUp, true); });
</script>

<template>
  <div class="app">
    <header>
        <div class="brand">
          <div class="cs-logo-wrap" aria-hidden="false">
            <div class="shimmer">
              <svg class="cs-logo" id="logoSymbol" viewBox="0 0 512 512" role="img" aria-label="Caption Studio logo" style="width:100%;height:100%;display:block;border-radius:inherit;overflow:hidden">
                <defs>
                  <linearGradient id="plasma" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stop-color="var(--cs-a)"></stop>
                    <stop offset="50%" stop-color="var(--cs-b)"></stop>
                    <stop offset="100%" stop-color="var(--cs-c)"></stop>
                  </linearGradient>
                  <radialGradient id="fill" cx="50%" cy="40%" r="70%">
                    <stop offset="0%" stop-color="#ffffff15"></stop>
                    <stop offset="100%" stop-color="#ffffff00"></stop>
                  </radialGradient>
                  <!-- Soft outer glow so it pops on dark UIs -->
                  <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
                    <feGaussianBlur stdDeviation="8" result="b"></feGaussianBlur>
                    <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.35  0 0 0 0 0.95  0 0 0 0.6 0"></feColorMatrix>
                    <feBlend in="SourceGraphic" mode="screen"></feBlend>
                  </filter>
                </defs>

                <!-- Rounded backdrop plate -->
                <rect x="22" y="22" width="468" height="468" rx="40" fill="#0b1220"></rect>
                <rect x="22" y="22" width="468" height="468" rx="40" fill="url(#fill)"></rect>
                <rect x="22" y="22" width="468" height="468" rx="40" fill="none" stroke="url(#plasma)" stroke-width="4" filter="url(#softGlow)"></rect>

                <!-- Caption brackets -->
                <g stroke="url(#plasma)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M120 166 v180"></path>
                  <path d="M392 166 v180"></path>
                </g>

                <!-- Camera focus ring + audio squiggle at center -->
                <g filter="url(#softGlow)">
                  <circle cx="256" cy="256" r="86" fill="none" stroke="url(#plasma)" stroke-width="10"></circle>
                </g>
                <!-- The squiggle says “this thing handles captions and sound.” Shockingly literal. -->
                <path d="M144 256c26-28 48 28 74 0s48 28 74 0 48 28 74 0" fill="none" stroke="url(#plasma)" stroke-width="12" stroke-linecap="round"></path>

                <!-- Sparkle because you demanded flair, consciously or not. -->
                <g transform="translate(360 132)">
                  <path d="M0 -8 L3 0 0 8 -3 0Z" fill="url(#plasma)"></path>
                </g>
              </svg>
            </div>
          </div>
          <h1>Caption Studio</h1>
        </div>
      <div class="toolbar">
        <select id="projectSelect" ref="projectSelect" @change="onProjectChange">
          <option v-for="id in state.order" :key="id" :value="id">{{ state.projects.get(id)?.name || id }}</option>
        </select>
        <button class="btn" id="newProjectBtn" @click="onNewProject"><i class="icon">＋</i> New Project</button>
        <button class="btn" id="openBtn" @click="pickFiles"><i class="icon">📁</i> Add Images+Captions</button>
        <input ref="folderInput" id="folderInput" accept="image/*,.txt" multiple webkitdirectory directory type="file" class="hidden" @change="onFolderPicked" />
        <input ref="filesInput" id="filesInput" accept="image/*,.txt" multiple type="file" class="hidden" @change="onFilesPicked" />
        <button class="btn" id="importJsonBtn" @click="triggerJsonImport"><i class="icon">⬆</i> Import JSON</button>
        <input ref="jsonInput" id="jsonInput" accept="application/json" class="hidden" type="file" @change="onImportJson" />
        <div class="spacer"></div>
        <input type="search" ref="searchBox" id="searchBox" v-model="state.filter.text" placeholder="Search captions or file names" style="width: 280px" />
        <button class="btn" id="saveBtn" @click="saveProject"><i class="icon">💾</i> Save</button>
        <button class="btn" id="exportBtn" @click="exportProject"><i class="icon">⬇</i> Export JSON</button>
        <button class="btn primary" id="autoBtn" @click="store.autoCaptionBulk"><i class="icon">✨</i> Auto Caption</button>
        <button class="btn" id="projectSettingsBtn" @click="openProjectSettings"><i class="icon">🧰</i> Project Settings</button>
        <button class="btn" id="settingsBtn" @click="openSettings"><i class="icon">⚙</i> Settings</button>
        <button class="btn ghost" id="helpBtn" @click="openHelp"><i class="icon">❓</i> Help</button>
      </div>
      <div style="text-align:right">
        <span class="badge" id="statusBadge">{{ state.status }}</span>
      </div>
    </header>

    <main>
      <aside>
        <div class="panel-head"><h3>Images</h3><span class="right badge" id="countBadge">{{ (currentProject && currentProject.items) ? currentProject.items.length : 0 }}</span></div>
        <div class="project-bar">
          <div class="seg" role="group" aria-label="select source" style="display:flex;gap:6px">
            <button class="btn small" id="pickFolderBtn" @click="pickFolder">Pick Folder</button>
            <button class="btn small" id="pickFilesBtn" @click="pickFiles">Pick Files</button>
            <button class="btn small" id="clearListBtn" @click="store.clearList">Clear</button>
          </div>
          <div class="controls-row">
            <label><input type="checkbox" v-model="state.filter.onlyMissing"> Only missing captions</label>
            <label><input type="checkbox" v-model="state.filter.onlySelected"> Only selected</label>
            <button class="btn small right" id="bulkToolsBtn" @click="openBulk">Bulk Tools</button>
          </div>
        </div>
        <div class="thumbs" id="thumbs">
          <div v-for="(it, idx) in items" :key="it.id" class="thumb" :class="{ active: store.getAbsoluteIndex(idx) === state.currentIndex }" @click="selectThumb(idx)" @contextmenu.prevent="toggleSelect(it)">
            <img :src="it.img" alt="" />
            <div class="cap">
              <span v-if="it.caption" v-html="it.caption"></span>
              <i v-else style="color:#7d8aa0">No caption</i>
            </div>
            <div v-if="it.selected" class="mark">✓</div>
          </div>
        </div>
      </aside>

      <section class="viewer">
        <div class="viewer-tools">
          <button class="btn small" id="prevBtn" @click="prev">◀ Prev <kbd>Alt+N</kbd></button>
          <button class="btn small" id="nextBtn" @click="next">Next ▶ <kbd>Alt+M</kbd></button>
          <div class="seg" style="margin-left:auto; display:flex; gap:8px; align-items:center">
            <label for="zoomRange">Zoom</label>
            <input type="range" id="zoomRange" min="10" max="300" v-model.number="state.zoom" />
            <button class="btn small" id="fitBtn" @click="fit">Fit</button>
            <button class="btn small" id="fillBtn" @click="fill">Fill</button>
            <button class="btn small" id="rotateBtn" @click="rotate">Rotate 90°</button>
          </div>
        </div>
        <div class="viewport" id="viewport">
          <div class="canvas-wrap"><img id="mainImage" :src="currentItem?.img || ''" :style="{ transform: `scale(${state.zoom/100}) rotate(${state.rotation}deg)` }" alt="" /></div>
        </div>
        <div class="viewer-footer">
          <div style="display:flex; gap:10px; align-items:center">
            <span id="fileInfo">{{ currentItem?.filename || 'No file' }} {{ currentItem?.width ? '• ' + currentItem.width + '×' + currentItem.height : '' }}</span>
          </div>
          <div style="display:flex; gap:10px; align-items:center">
            <div class="meter"><i id="progressBar" :style="{ width: state.progress.total ? Math.max(0, Math.min(100, Math.round(state.progress.cur / state.progress.total * 100))) + '%' : '0%' }"></i></div>
            <span id="progressText">{{ (state.currentIndex + 1) }} of {{ (currentProject && currentProject.items) ? currentProject.items.length : 0 }}</span>
          </div>
        </div>
      </section>

      <section class="editor">
        <div class="editor-tools">
          <button class="btn small" id="applyBtn" @click="applyEdits">Save Caption <kbd>Alt+S</kbd></button>
          <button class="btn small" id="genBtn" @click="store.autoCaptionCurrent">AI Generate <kbd>Alt+G</kbd></button>
          <button class="btn small" id="copyBtn" @click="copyFromFile">Copy From File</button>
          <button class="btn small" id="clearBtn" @click="clearCaption">Clear</button>
          <button class="btn small" id="removeBtn" @click="confirmDelete">Remove <kbd>Alt+D</kbd></button>
          <div class="right" style="display:flex; gap:8px; align-items:center">
            <label>Tags</label>
            <input type="text" id="tagInput" v-model="tagInput" placeholder="comma separated" style="width: 210px" />
          </div>
        </div>
        <textarea id="captionBox" v-model="captionBox" placeholder="Write your caption..."></textarea>
        <div class="stats">
          <div class="tags" id="tagList">
            <span v-for="t in currentItem?.tags || []" :key="t" class="tag">{{ t }}</span>
          </div>
          <div class="right" id="counters">{{ (captionBox.length) }} chars • {{ (captionBox.trim().match(/\S+/g) || []).length }} words • est {{ Math.ceil(captionBox.length/4) }} tokens</div>
        </div>
      </section>
    </main>

    <footer>
        <div>
          <b>Shortcuts</b>
          <span class="badge"><kbd>Alt+N</kbd> Prev</span>
          <span class="badge"><kbd>Alt+M</kbd> Next</span>
          <span class="badge"><kbd>Alt+S</kbd> Save</span>
          <span class="badge"><kbd>Alt+G</kbd> AI</span>
          <span class="badge"><kbd>Alt+D</kbd> Remove</span>
          <span class="badge"><kbd>/</kbd> Search</span>
        </div>
      <div><span class="badge">Offline Mode</span></div>
    </footer>
  </div>

  <div class="drop-overlay" id="dropOverlay">Drop images and matching .txt here</div>

  <div id="toasts" style="pointer-events:none; position:fixed; right:14px; bottom:14px; z-index:9999">
    <div v-for="t in state.toasts" :key="t.id" :class="['toast', t.kind]" style="pointer-events:auto; margin-top:8px">
      <div class="row" style="display:flex; gap:8px; align-items:center; justify-content:space-between">
        <div>{{ t.message }}</div>
        <button class="btn small" @click="store.dismissToast(t.id)">Dismiss</button>
      </div>
    </div>
  </div>

  <dialog id="projectSettingsModal">
    <div class="modal-head">
      <h3 style="margin:0">Project Settings</h3>
      <button class="btn small" data-close="projectSettingsModal" @click="() => closeModal('projectSettingsModal')">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:8px">
        <div><strong>Name:</strong> {{ currentProject?.name || '—' }}</div>
        <div><strong>Items:</strong> {{ (currentProject?.items || []).length }}</div>
        <div><strong>Created:</strong> {{ currentProject?.createdAt ? new Date(currentProject.createdAt).toLocaleString() : '' }}</div>
        <div><strong>Updated:</strong> {{ currentProject?.updatedAt ? new Date(currentProject.updatedAt).toLocaleString() : '' }}</div>
        <div style="margin-top:8px">
          <button class="btn" @click="store.exportProject">Export Project</button>
        </div>
      </div>

      <hr />

      <div style="margin-top:12px; padding:12px; border-radius:6px; background:#3a0f0f; color:#ffdede">
        <h4 style="margin:0 0 8px 0">Danger Zone</h4>
        <p>Deleting a project is permanent. This will remove the project and its images from local storage.</p>
        <label style="display:flex;flex-direction:column;gap:6px; margin-top:8px">
          <span>Type the project name to confirm:</span>
          <input type="text" v-model="deleteProjectConfirmInput" placeholder="Type project name to confirm" />
        </label>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="btn" @click="() => closeModal('projectSettingsModal')">Cancel</button>
          <button class="btn" style="background:#b91c1c;color:white" :disabled="deleteProjectConfirmInput !== (currentProject && currentProject.name) " @click="confirmDeleteProject">Delete Project</button>
        </div>
      </div>
    </div>
  </dialog>

  <dialog id="settingsModal">
    <div class="modal-head">
      <h3 style="margin:0">Settings</h3>
      <button class="btn small" data-close="settingsModal" @click="() => closeModal('settingsModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="field">
          <label for="ollamaUrl">Ollama server URL</label>
          <input id="ollamaUrl" type="text" v-model="state.settings.ollamaUrl" placeholder="http://localhost:11434">
        </div>
        <div class="field">
          <label for="ollamaModel">Vision model name</label>
          <input id="ollamaModel" type="text" v-model="state.settings.ollamaModel" placeholder="llama3.2-vision or llava">
        </div>
      </div>
      <div class="field">
        <label for="promptTpl">Prompt template</label>
        <textarea id="promptTpl" class="input" v-model="state.settings.promptTpl" placeholder="Describe the image for a caption. Focus on key subjects, actions, style, quality."></textarea>
      </div>
      <div style="display:flex; gap:8px; align-items:center; justify-content:space-between">
        <div style="display:flex; gap:8px; align-items:center">
          <button class="btn" id="testOllamaBtn" @click="() => store.testOllama()">Test Connection</button>
          <span id="ollamaStatus" class="badge">Not tested</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end">
          <label><input type="checkbox" id="streamOllama" v-model="state.settings.stream"> Stream responses</label>
          <label><input type="checkbox" id="usePromptMeta" v-model="state.settings.usePromptMetadata"> Scan images for embedded prompts</label>
          <label><input type="checkbox" id="confirmPrompt" v-model="state.settings.confirmPromptOnImport"> Confirm before applying embedded prompts</label>
          <label><input type="checkbox" id="confirmDelete" v-model="state.settings.confirmDeleteOnRemove"> Confirm before deleting images</label>
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end">
        <button class="btn" id="resetSettingsBtn" @click="() => { state.settings.ollamaUrl='http://localhost:11434'; state.settings.ollamaModel='llama3.2-vision'; state.settings.promptTpl='Describe this image as a short, high quality caption. Focus on the main subject, action, style, lighting and mood. Keep it concise.'; state.settings.stream=false; }">Reset</button>
        <button class="btn primary" id="saveSettingsBtn" @click="saveSettingsAndClose">Save</button>
      </div>
    </div>
  </dialog>

  <dialog id="deleteConfirm">
    <div class="modal-head">
      <h3 style="margin:0">Delete image</h3>
      <button class="btn small" data-close="deleteConfirm" @click="() => closeModal('deleteConfirm')">✕</button>
    </div>
    <div class="modal-body">
      <p>Delete this image from the current project? This action cannot be undone.</p>
      <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" v-model="deleteDontAsk" /> Do not ask next time</label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn" @click="() => closeModal('deleteConfirm')">Cancel</button>
        <button class="btn primary" @click="onConfirmDeleteFromModal">Delete</button>
      </div>
    </div>
  </dialog>

  <dialog id="promptModal">
    <div class="modal-head">
      <h3 style="margin:0">Detected embedded prompts</h3>
      <button class="btn small" data-close="promptModal" @click="() => closePromptModal()">✕</button>
    </div>
    <div class="modal-body" style="max-width:900px">
      <p>Stable Diffusion prompt metadata was detected in the following images. Select the prompts you want to apply as captions.</p>
      <div style="display:flex;flex-direction:column;gap:10px;max-height:420px;overflow:auto;padding-top:8px">
        <div v-for="c in state.promptCandidates" :key="c.itemId" style="display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:6px;background:var(--panel-bg, #0f1720);">
          <div style="width:72px;height:56px;flex:0 0 72px;display:flex;align-items:center;justify-content:center;background:#111;border-radius:4px;overflow:hidden">
            <img :src="c.img" style="width:72px;height:56px;object-fit:cover" alt="" />
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="font-weight:600">{{ c.filename }}</div>
              <label style="font-size:13px"><input type="checkbox" :checked="promptSelections.has(c.itemId)" @change="() => togglePromptSelection(c.itemId)" /> Use</label>
            </div>
            <pre style="margin:0;white-space:pre-wrap;font-size:13px;color:var(--muted,#9aa4b2);max-height:120px;overflow:auto">{{ c.prompt }}</pre>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn" @click="applySelectedPrompts">Apply Selected</button>
        <button class="btn" @click="applyAllPrompts">Apply All</button>
        <button class="btn" @click="skipAllPrompts">Skip All</button>
      </div>
    </div>
  </dialog>

  <dialog id="helpModal">
    <div class="modal-head">
      <h3 style="margin:0">Help</h3>
      <button class="btn small" data-close="helpModal" @click="() => closeModal('helpModal')">✕</button>
    </div>
    <div class="modal-body">
      <p>This is a migrated mock. Drag in images plus matching .txt files to populate captions. Name pairs must match, like <code>cat_01.jpg</code> and <code>cat_01.txt</code>.</p>
      <ul>
        <li>Projects are stored locally via IndexedDB. Export JSON to back up or move.</li>
        <li>Ollama requires a local server. Some setups block browser calls due to CORS. If the test fails, run a small local proxy or configure CORS for Ollama.</li>
        <li>Nothing is uploaded anywhere.</li>
      </ul>
    </div>
  </dialog>

  <dialog id="bulkModal">
    <div class="modal-head">
      <h3 style="margin:0">Bulk Tools</h3>
      <button class="btn small" data-close="bulkModal" @click="() => closeModal('bulkModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="field">
          <label>Prefix</label>
          <input id="bulkPrefix" type="text" placeholder="Add text to the start of captions">
        </div>
        <div class="field">
          <label>Suffix</label>
          <input id="bulkSuffix" type="text" placeholder="Add text to the end of captions">
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Find</label>
          <input id="bulkFind" type="text" placeholder="find">
        </div>
        <div class="field">
          <label>Replace</label>
          <input id="bulkReplace" type="text" placeholder="replace">
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end">
        <button class="btn" id="bulkPreviewBtn">Preview</button>
        <button class="btn primary" id="bulkApplyBtn" @click="applyBulkAndClose">Apply</button>
      </div>
    </div>
  </dialog>
</template>
