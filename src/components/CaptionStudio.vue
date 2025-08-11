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
const selectedId = ref<string | null>(state.currentId);
// keep the local select in sync when the store's currentId changes
watch(() => state.currentId, (v) => {
  selectedId.value = v;
});

const captionBox = ref('');
const tagInput = ref('');

// transient video metadata (not persisted) keyed by item id
const videoMeta = ref<Record<string, { duration?: number; width?: number; height?: number }>>({});

// called when a <video> element loads metadata so we can display duration/resolution
function onVideoLoadedMeta(itemId: string | null, e: Event) {
  try {
    if (!itemId) return;
    const vid = e?.target as HTMLVideoElement | null;
    if (!vid) return;
    const meta = { duration: isFinite(vid.duration) ? vid.duration : undefined, width: vid.videoWidth || undefined, height: vid.videoHeight || undefined };
    videoMeta.value = { ...videoMeta.value, [String(itemId)]: meta };
    // Also update the currentItem's width/height if not already set so other parts of the UI can reuse it
    try {
      const it = currentItem.value as any;
      if (it && (!it.width || !it.height) && meta.width && meta.height) {
        it.width = meta.width;
        it.height = meta.height;
      }
    } catch {}
  } catch (err) {
    console.error('onVideoLoadedMeta error', err);
  }
}

// format seconds -> H:MM:SS or M:SS
function formatDuration(sec?: number) {
  if (!sec || !isFinite(sec) || sec <= 0) return '';
  const s = Math.floor(sec);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  return `${minutes}:${String(seconds).padStart(2,'0')}`;
}

/* ----------------- Curation UI state & helpers (component-local) ----------------- */
// translation/rotation for the draggable curation card
const curationTranslate = ref({ x: 0, y: 0 });
const curationRot = ref(0);
const curationDragging = ref(false);
const curationStart = ref({ x: 0, y: 0 });
const curationPointerId = ref<number | null>(null);
const curationAnimating = ref(false);
const CURATION_THRESHOLD = 120; // pixels to consider swipe committed

// small internal flag shown by a local modal/dialog to confirm removal of rejected items
const showCurationExitConfirm = ref(false);

function openCurationExitConfirm() {
  showCurationExitConfirm.value = true;
}

function cancelExitCuration() {
  showCurationExitConfirm.value = false;
}

/**
 * Called when user confirms exiting curation mode.
 * If removeRejected is true, also remove rejected items from the project.
 */
function confirmExitCuration(removeRejected = false) {
  try {
    store.stopCuration();
    if (removeRejected) {
      store.removeRejectedFromProject();
    }
  } catch (e) {
    console.error('confirmExitCuration error', e);
  } finally {
    showCurationExitConfirm.value = false;
  }
}

const curationCounts = computed(() => {
  const proj = store.getCurrentProject();
  if (!proj) return { accepted: 0, rejected: 0, remaining: 0 };
  const accepted = proj.items.filter(i => i.curationStatus === 'accepted').length;
  const rejected = proj.items.filter(i => i.curationStatus === 'rejected').length;
  const remaining = proj.items.filter(i => !i.curationStatus).length;
  return { accepted, rejected, remaining };
});

function resetCurationCard(animate = true) {
  if (animate) {
    curationAnimating.value = true;
    // animate back to center
    curationTranslate.value = { x: 0, y: 0 };
    curationRot.value = 0;
    setTimeout(() => { curationAnimating.value = false; }, 200);
  } else {
    curationTranslate.value = { x: 0, y: 0 };
    curationRot.value = 0;
    curationAnimating.value = false;
  }
}

function commitCuration(status: 'accepted' | 'rejected') {
  const it = currentItem.value;
  if (!it) return;
  // animate card off-screen
  curationAnimating.value = true;
  curationTranslate.value = { x: status === 'accepted' ? window.innerWidth : -window.innerWidth, y: 0 };
  curationRot.value = status === 'accepted' ? 18 : -18;
  // persist status
  try {
    store.setCurationStatus(it.id, status);
  } catch (e) { console.error(e); }
  // after animation, reset for next card
  setTimeout(() => {
    curationAnimating.value = false;
    curationTranslate.value = { x: 0, y: 0 };
    curationRot.value = 0;
  }, 250);
}

function curationPointerDown(e: PointerEvent) {
  if (curationAnimating.value) return;
  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  curationPointerId.value = e.pointerId;
  curationDragging.value = true;
  curationStart.value = { x: e.clientX, y: e.clientY };
}

function curationPointerMove(e: PointerEvent) {
  if (!curationDragging.value || curationPointerId.value !== e.pointerId) return;
  const dx = e.clientX - curationStart.value.x;
  const dy = e.clientY - curationStart.value.y;
  curationTranslate.value = { x: dx, y: dy };
  // small rotation proportional to horizontal displacement
  curationRot.value = Math.max(-25, Math.min(25, dx / 12));
}

function curationPointerUp(e: PointerEvent) {
  if (!curationDragging.value) return;
  try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
  curationDragging.value = false;
  const dx = curationTranslate.value.x;
  if (dx > CURATION_THRESHOLD) {
    commitCuration('accepted');
  } else if (dx < -CURATION_THRESHOLD) {
    commitCuration('rejected');
  } else {
    resetCurationCard(true);
  }
}

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

// When rename popover is open, keep the input synchronized with the current project.
// This covers cases where the project loads or changes right before/during popover open.
watch(currentProject, (p) => {
  if (showRenamePopover.value) {
    projectName.value = p?.name || '';
  }
});

const welcomeNever = ref(false);

watch(() => state.showWelcomeModal, (val) => {
  const el = document.getElementById('welcomeModal') as HTMLDialogElement | null;
  if (val) {
    // reset local checkbox when opening
    welcomeNever.value = false;
    el?.showModal();
  } else {
    try { el?.close(); } catch {}
  }
});

function closeWelcome() {
  if (welcomeNever.value) {
    // persist the user's choice to not show the welcome screen again
    try { store.saveSettings({ showWelcomeOnStart: false }); } catch (e) { console.error(e); }
  }
  state.showWelcomeModal = false;
}

function welcomeCreateProject() {
  onNewProject();
  closeWelcome();
}

function welcomeAddImages() {
  pickFiles();
  closeWelcome();
}

function welcomeOpenSettings() {
  openSettings();
  closeWelcome();
}

async function onNewProject() {
  const name = prompt('Project name?') || 'Untitled';
  // create the project in-memory and persist it before refreshing the meta list
  store.createProject(name);
  try {
    // ensure the newly created project is saved to storage so refreshMetaBar can see it
    await (store.saveCurrentProject?.());
  } catch (e) {
    console.error('Failed to save new project', e);
  }
  try {
    await store.refreshMetaBar();
  } catch (e) {
    console.error(e);
  }
}

function onProjectChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  if (!val) return;

  // Keep previous selection so we can revert if loading fails
  const prevId = state.currentId;

  // Ensure meta is fresh, then attempt to load the full project via the store
  store.refreshMetaBar().then(async () => {
    try {
      const proj = await store.loadProjectById(val);
      if (proj) {
        // load succeeded — make it current
        store.setCurrentProject(proj);
      } else {
        // load failed or not found — revert selection and notify user
        state.currentId = prevId;
        store.addToast('Failed to load project; reverted selection', 'warn');
        console.warn('onProjectChange: project not found after loadProjectById', val);
      }
    } catch (err) {
      console.error('onProjectChange loadProjectById failed', err);
      state.currentId = prevId;
      store.addToast('Failed to load project; reverted selection', 'warn');
    }
  }).catch(err => {
    console.error('onProjectChange refreshMetaBar failed', err);
    state.currentId = prevId;
    store.addToast('Failed to refresh project list; reverted selection', 'warn');
  });
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

const exportOpen = ref(false);
function exportProjectJson() {
  try {
    store.exportProject();
  } catch (e) {
    console.error('exportProjectJson failed', e);
  } finally {
    exportOpen.value = false;
  }
}
function exportProjectZip() {
  try {
    (store as any).exportProjectZip?.();
  } catch (e) {
    console.error('exportProjectZip failed', e);
  } finally {
    exportOpen.value = false;
  }
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
const projectName = ref('');
const renaming = ref(false);
const nameError = ref('');
const showRenamePopover = ref(false);
const __rename_doc_click = (e: MouseEvent) => {
  try {
    if (!showRenamePopover.value) return;
    const target = e.target as Node;
    const pop = document.getElementById('renamePopover');
    const btn = document.getElementById('renameBtn');
    if (pop && (pop.contains(target) || (btn && btn.contains(target)))) return;
    showRenamePopover.value = false;
  } catch (err) {
    // ignore
  }
};

function openProjectSettings() {
  deleteProjectConfirmInput.value = '';
  projectName.value = currentProject.value?.name || '';
  nameError.value = '';
  renaming.value = false;
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

async function renameProject() {
  const proj = currentProject.value;
  if (!proj) return;
  const name = projectName.value?.trim();
  nameError.value = '';
  if (!name) {
    nameError.value = 'Project name required';
    return;
  }
  if (name.length > 100) {
    nameError.value = 'Name too long (max 100 characters)';
    return;
  }
  // Prevent duplicate names (case-insensitive) across other projects
  const duplicate = state.order.some(id => id !== proj.id && (state.projects.get(id)?.name || '').toLowerCase() === name.toLowerCase());
  if (duplicate) {
    nameError.value = 'Another project already uses this name';
    return;
  }

  const prevName = proj.name;
  // Optimistic update
  proj.name = name;
  proj.updatedAt = Date.now();
  renaming.value = true;
  try {
    await store.saveCurrentProject();
    store.addToast('Project renamed', 'ok');
    closeModal('projectSettingsModal');
  } catch (e) {
    console.error('renameProject failed', e);
    // revert optimistic update
    proj.name = prevName;
    store.addToast('Failed to rename project', 'warn');
    nameError.value = 'Save failed';
  } finally {
    renaming.value = false;
  }
}

async function openRenamePopover() {
  // Refresh meta so placeholders and project names are up-to-date
  try { await store.refreshMetaBar(); } catch (e) { /* ignore */ }

  // Try currentProject first
  let proj = currentProject.value;

  // Derive a candidate project id from select or state as fallback
  let candidateId: string | null = null;
  try {
    const sel = projectSelect.value;
    if (sel && sel.value) candidateId = sel.value;
  } catch {}

  if (!candidateId && state.currentId) candidateId = state.currentId;
  if (!candidateId && Array.isArray(state.order) && state.order.length > 0) candidateId = state.order[0];

  // If we don't have a full project in memory, attempt to load it (ensures name is populated)
  if (!proj && candidateId) {
    try {
      const loaded = await store.loadProjectById(candidateId);
      if (loaded) proj = loaded;
    } catch {
      // ignore load failures
    }
  }

  // Populate the input from the resolved project, or fallback to select text / projects map
  if (proj) {
    projectName.value = proj.name || '';
  } else {
    try {
      const sel = projectSelect.value;
      if (sel) {
        const opt = sel.selectedOptions && sel.selectedOptions[0];
        if (opt && opt.textContent) {
          projectName.value = opt.textContent.trim();
        } else if (sel.value) {
          projectName.value = (state.projects.get(sel.value)?.name) || sel.value || '';
        } else {
          projectName.value = '';
        }
      } else if (candidateId) {
        projectName.value = (state.projects.get(candidateId)?.name) || candidateId || '';
      } else {
        projectName.value = '';
      }
    } catch {
      projectName.value = '';
    }
  }

  // Extra robust fallback: read currently selected option text directly from DOM (covers timing issues)
  try {
    const checkedOpt = document.querySelector('#projectSelect option:checked') as HTMLOptionElement | null;
    if (checkedOpt && checkedOpt.textContent && checkedOpt.textContent.trim()) {
      projectName.value = checkedOpt.textContent.trim();
    }
  } catch (e) {
    // ignore
  }

  nameError.value = '';
  renaming.value = false;
  showRenamePopover.value = true;
  // focus input after render
  setTimeout(() => {
    try { (document.getElementById('renameInput') as HTMLInputElement | null)?.focus(); } catch {}
  }, 0);
}

function closeRenamePopover() {
  showRenamePopover.value = false;
  nameError.value = '';
}

async function saveRenameFromPopover() {
  const proj = currentProject.value;
  if (!proj) return;
  const name = projectName.value?.trim();
  nameError.value = '';
  if (!name) {
    nameError.value = 'Project name required';
    return;
  }
  if (name.length > 100) {
    nameError.value = 'Name too long (max 100 characters)';
    return;
  }
  const duplicate = state.order.some(id => id !== proj.id && (state.projects.get(id)?.name || '').toLowerCase() === name.toLowerCase());
  if (duplicate) {
    nameError.value = 'Another project already uses this name';
    return;
  }

  const prevName = proj.name;
  proj.name = name;
  proj.updatedAt = Date.now();
  renaming.value = true;
  try {
    await store.saveCurrentProject();
    store.addToast('Project renamed', 'ok');
    showRenamePopover.value = false;
  } catch (e) {
    console.error('saveRenameFromPopover failed', e);
    proj.name = prevName;
    store.addToast('Failed to rename project', 'warn');
    nameError.value = 'Save failed';
  } finally {
    renaming.value = false;
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

async function saveSettingsAndClose() {
  await (store as any).saveSettings(state.settings);
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

// Keyboard shortcuts (including curation-specific keys)
const __cs_onKeyDown = (e: KeyboardEvent) => {
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  const activeEl = document.activeElement as HTMLElement | null;
  const isEditable = ['input','textarea','select'].includes(tag) || !!(activeEl && activeEl.isContentEditable);

  // Slash opens search only when not focused in an editable field
  if (e.key === '/' && !['input','textarea'].includes(tag)) { e.preventDefault(); e.stopImmediatePropagation(); searchBox.value?.focus(); return; }
  // If typing in an editable field, don't trigger hotkeys
  if (isEditable) return;

  // Allow arrow keys for curation when active
  if (state.curationMode) {
    if (e.key === 'ArrowRight') { e.preventDefault(); commitCuration('accepted'); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); commitCuration('rejected'); return; }
    if (e.key === 'Escape') { e.preventDefault(); openCurationExitConfirm(); return; }
  }

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
window.addEventListener('click', __rename_doc_click, { capture: true });
onUnmounted(() => {
  window.removeEventListener('keydown', __cs_onKeyDown, true);
  window.removeEventListener('keyup', __cs_onKeyUp, true);
  window.removeEventListener('click', __rename_doc_click, true);
});
</script>

<template>
  <div class="app">
    <header>
      <div class="brand">
        <div class="cs-logo-wrap" aria-hidden="false">
          <!-- logo omitted for brevity (unchanged) -->
          <svg class="cs-logo" id="logoSymbol" viewBox="0 0 512 512" role="img" aria-label="Caption Studio logo" style="width:100%;height:100%;display:block;border-radius:inherit;overflow:hidden">
            <!-- SVG content identical to previous version -->
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
            </defs>
            <rect x="22" y="22" width="468" height="468" rx="40" fill="#0b1220"></rect>
            <rect x="22" y="22" width="468" height="468" rx="40" fill="url(#fill)"></rect>
            <rect x="22" y="22" width="468" height="468" rx="40" fill="none" stroke="url(#plasma)" stroke-width="4"></rect>
            <!-- simplified -->
          </svg>
        </div>
        <h1>Caption Studio</h1>
      </div>

      <div class="toolbar">
        <div style="position:relative; display:inline-flex; align-items:center;">
          <select id="projectSelect" ref="projectSelect" v-model="selectedId" @change="onProjectChange" :disabled="state.order.length === 0">
            <option v-if="state.order.length === 0" disabled value="">{{ state.showWelcomeModal ? 'No project — use the Welcome screen' : 'No projects' }}</option>
            <option v-for="id in state.order" :key="id" :value="id">{{ state.projects.get(id)?.name || id }}</option>
          </select>
          <button id="renameBtn" class="btn small" style="margin-left:8px" @click="openRenamePopover" title="Rename project">✎</button>

          <!-- Compact rename popover (toolbar) -->
          <div id="renamePopover" v-if="showRenamePopover" @click.stop
               style="position:absolute; z-index:1200; top:40px; left:0; background:var(--panel-bg,#0f1720); padding:10px; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.6); display:flex; gap:8px; align-items:center; min-width:320px">
            <input id="renameInput" type="text" v-model="projectName" :disabled="renaming" @keydown.enter.prevent="saveRenameFromPopover" @keydown.esc.prevent="closeRenamePopover"
                   placeholder="Project name" style="flex:1; padding:8px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.06)" />
            <div style="display:flex; gap:8px; align-items:center">
              <button class="btn" @click="closeRenamePopover" :disabled="renaming">Cancel</button>
              <button class="btn primary" @click="saveRenameFromPopover" :disabled="renaming">
                <span v-if="renaming">Saving…</span>
                <span v-else>Save</span>
              </button>
            </div>
            <div style="color:#ffcccc;font-size:12px;margin-left:8px" v-if="nameError">{{ nameError }}</div>
          </div>
        </div>

        <button class="btn" id="newProjectBtn" @click="onNewProject"><i class="icon">＋</i> New Project</button>
        <button class="btn" id="openBtn" @click="pickFiles"><i class="icon">📁</i> Add Media+Captions</button>
        <input ref="folderInput" id="folderInput" accept="image/*,video/*,.txt" multiple webkitdirectory directory type="file" class="hidden" @change="onFolderPicked" />
        <input ref="filesInput" id="filesInput" accept="image/*,video/*,.txt" multiple type="file" class="hidden" @change="onFilesPicked" />
        <button class="btn" id="importJsonBtn" @click="triggerJsonImport"><i class="icon">⬆</i> Import JSON</button>
        <input ref="jsonInput" id="jsonInput" accept="application/json" class="hidden" type="file" @change="onImportJson" />
        <div class="spacer"></div>
        <input type="search" ref="searchBox" id="searchBox" v-model="state.filter.text" placeholder="Search captions or file names" style="width: 280px" />
        <button class="btn" id="saveBtn" @click="saveProject"><i class="icon">💾</i> Save</button>
        <div style="position:relative; display:inline-block;">
          <button class="btn" id="exportBtn" @click="exportOpen = !exportOpen"><i class="icon">⬇</i> Export</button>
          <div v-if="exportOpen" style="position:absolute; right:0; top:40px; background:var(--panel-bg,#0f1720); padding:8px; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.6); z-index:1200; display:flex; gap:8px; white-space:nowrap">
            <button class="btn" @click="exportProjectJson">JSON</button>
            <button class="btn" @click="exportProjectZip">Zip (images + txt)</button>
          </div>
        </div>

        <button class="btn primary" id="autoBtn" @click="store.autoCaptionBulk"><i class="icon">✨</i> Auto Caption</button>

        <!-- Curation mode toggle -->
        <button
          class="btn"
          id="curationBtn"
          :class="{ primary: state.curationMode }"
          @click="() => { if (state.curationMode) { openCurationExitConfirm(); } else { store.startCuration(); } }"
          title="Curation mode (swipe to accept/reject)">
          <i class="icon">🃏</i>
          Curation
          <span v-if="state.curationMode" style="margin-left:8px; font-size:12px; opacity:0.9">
            <span style="color:#7dd3a6">✓ {{ curationCounts.accepted }}</span>
            <span style="color:#ff7b7b; margin-left:8px">✕ {{ curationCounts.rejected }}</span>
            <span style="margin-left:8px">• {{ curationCounts.remaining }} left</span>
          </span>
        </button>

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
        <div class="panel-head"><h3>Media</h3><span class="right badge" id="countBadge">{{ (currentProject && currentProject.items) ? currentProject.items.length : 0 }}</span></div>
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
            <template v-if="it.mediaType === 'video'">
              <div style="position:relative; width:100%; height:100%; overflow:hidden; display:flex;align-items:center;justify-content:center; background:#000">
                <video :src="it.img" muted autoplay loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover" @loadedmetadata="(e) => onVideoLoadedMeta(it.id, e)"></video>
                <span style="position:absolute; left:6px; top:6px; background:rgba(0,0,0,0.5); color:#fff; padding:2px 6px; border-radius:4px; font-size:12px">▶</span>
              </div>
            </template>
            <template v-else>
              <img :src="it.img" alt="" />
            </template>
            <div class="cap">
              <span v-if="it.caption" v-html="it.caption"></span>
              <i v-else style="color:#7d8aa0">No caption</i>
            </div>
            <div v-if="it.selected" class="mark">✓</div>
            <div v-else-if="it.curationStatus === 'accepted'" class="mark" style="background:var(--ok,#16a34a);">✓</div>
            <div v-else-if="it.curationStatus === 'rejected'" class="mark" style="background:#b91c1c;">✕</div>
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
          <div class="canvas-wrap">
            <!-- Curation card -->
            <template v-if="state.curationMode">
              <!-- Mode banner (non-overlapping) + content wrapper -->
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;width:100%;gap:12px">
                <div role="status" aria-live="polite" style="margin-top:12px; z-index:1600; display:flex; gap:12px; align-items:center; padding:8px 14px; border-radius:999px; background:linear-gradient(90deg, rgba(2,6,23,0.92), rgba(9,12,20,0.92)); color:#fff; box-shadow:0 8px 30px rgba(0,0,0,0.6); font-weight:600;">
                  <span style="display:flex;align-items:center;gap:8px"><i style="font-style:normal">🃏</i> CURATION MODE</span>
                  <span style="opacity:0.95; font-size:13px">✓ {{ curationCounts.accepted }} • ✕ {{ curationCounts.rejected }} • {{ curationCounts.remaining }} left</span>
                  <span style="opacity:0.85; font-size:13px; margin-left:8px;">Press <strong>Esc</strong> to exit</span>
                  <span style="opacity:0.85; font-size:13px; margin-left:10px; display:flex; gap:8px; align-items:center;">
                    <span style="display:flex;align-items:center;gap:6px">Hotkeys:</span>
                    <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><kbd style="background:transparent; border:0; padding:0; font-weight:700">←</kbd> Reject</span>
                    <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><kbd style="background:transparent; border:0; padding:0; font-weight:700">→</kbd> Accept</span>
                    <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><kbd style="background:transparent; border:0; padding:0; font-weight:700">Esc</kbd> Exit</span>
                  </span>
                </div>

                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%">
                  <div
                    id="curationCard"
                    role="button"
                    tabindex="0"
                    :style="{
                      width: '90%',
                      maxWidth: '1100px',
                      height: '90%',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                      overflow: 'hidden',
                      touchAction: 'none',
                      transform: `translate(${curationTranslate.x}px, ${curationTranslate.y}px) rotate(${curationRot}deg)`,
                      transition: curationAnimating ? 'transform 180ms ease-out' : undefined,
                      background: '#000'
                    }"
                    @pointerdown="curationPointerDown"
                    @pointermove="curationPointerMove"
                    @pointerup="curationPointerUp"
                    @pointercancel="curationPointerUp"
                  >
                    <template v-if="currentItem?.mediaType === 'video'">
                      <video :src="currentItem?.img || ''" muted autoplay loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain; background:#000; object-position:center"></video>
                    </template>
                    <template v-else>
                      <img :src="currentItem?.img || ''" style="width:100%;height:100%;object-fit:contain; background:#000; object-position:center" alt="" />
                    </template>

                    <!-- Overlay badges -->
                    <div v-if="Math.abs(curationTranslate.x) > 10" :style="{
                      position:'absolute',
                      top:'12px',
                      left: curationTranslate.x > 0 ? '12px' : 'auto',
                      right: curationTranslate.x < 0 ? '12px' : 'auto',
                      padding:'6px 10px',
                      borderRadius:'6px',
                      background: curationTranslate.x > 0 ? 'rgba(16,185,129,0.9)' : 'rgba(185,28,28,0.9)',
                      color:'#fff',
                      fontWeight:700,
                      transform: 'translateZ(0)'
                    }">
                      {{ curationTranslate.x > 0 ? 'ACCEPT' : 'REJECT' }}
                    </div>
                  </div>

                  <div style="display:flex;gap:12px;align-items:center;margin-top:14px">
                    <button class="btn" @click="() => commitCuration('rejected')">Reject</button>
                    <button class="btn primary" @click="() => commitCuration('accepted')">Accept</button>
                    <button class="btn" @click="() => openCurationExitConfirm()">Exit</button>
                  </div>
                </div>
              </div>

              <!-- Curation exit confirmation dialog (component-local) -->
              <div v-if="showCurationExitConfirm" style="position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:2000;">
                <div style="background:var(--panel-bg,#0f1720); padding:18px; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.6); width:420px;">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <h3 style="margin:0">Exit Curation</h3>
                    <button class="btn small" @click="cancelExitCuration">✕</button>
                  </div>
                  <div style="padding-top:12px">
                    <p style="margin:0 0 12px 0">Do you want to remove rejected items from the project when exiting curation mode?</p>
                    <div style="display:flex;gap:8px;justify-content:flex-end">
                      <button class="btn" @click="cancelExitCuration">Cancel</button>
                      <button class="btn" @click="() => confirmExitCuration(false)">Exit (keep rejected)</button>
                      <button class="btn primary" @click="() => confirmExitCuration(true)">Exit and remove rejected</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Normal viewer -->
            <template v-else>
              <template v-if="currentItem?.mediaType === 'video'">
                <video id="mainVideo"
                       controls
                       :src="currentItem?.img || ''"
                       preload="metadata"
                       @loadedmetadata="(e) => onVideoLoadedMeta(currentItem?.id || null, e)"
                       :style="{ transform: `scale(${state.zoom/100}) rotate(${state.rotation}deg)` }"
                       style="max-width:100%; max-height:100%; display:block; margin:0 auto;">
                </video>
              </template>
              <template v-else>
                <img id="mainImage" :src="currentItem?.img || ''" :style="{ transform: `scale(${state.zoom/100}) rotate(${state.rotation}deg)` }" alt="" />
              </template>
            </template>
          </div>
        </div>

        <div class="viewer-footer">
          <div style="display:flex; gap:10px; align-items:center">
            <span id="fileInfo">
              {{ currentItem?.filename || 'No file' }}
              <span v-if="currentItem?.mediaType === 'video'">
                <span v-if="videoMeta[currentItem.id] && videoMeta[currentItem.id].duration"> • {{ formatDuration(videoMeta[currentItem.id].duration) }}</span>
                <span v-if="(videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || (currentItem?.width)"> • {{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || currentItem?.width }}×{{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].height) || currentItem?.height }}</span>
              </span>
              <span v-else-if="currentItem?.width"> • {{ currentItem.width }}×{{ currentItem.height }}</span>
            </span>
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
        <div>
          <label><strong>Name:</strong></label>
          <input type="text" v-model="projectName" placeholder="Project name" :disabled="renaming" />
          <div style="color:#ffcccc;font-size:13px;margin-top:6px" v-if="nameError">{{ nameError }}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button class="btn" @click="projectName = currentProject?.name || ''" :disabled="renaming">Reset</button>
            <button class="btn primary" @click="renameProject" :disabled="renaming">
              <span v-if="renaming">Saving…</span>
              <span v-else>Rename</span>
            </button>
          </div>
        </div>
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

      <!-- MongoDB storage settings -->
      <div style="margin-top:12px; padding:12px; border-radius:6px; background:var(--panel-bg, #0f1720);">
        <h4 style="margin:0 0 8px 0">Storage</h4>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
          <label style="display:flex;align-items:center;gap:6px"><input type="radio" value="browser" v-model="state.settings.storage"> Browser (IndexedDB)</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="radio" value="mongodb" v-model="state.settings.storage"> MongoDB</label>
        </div>

        <div style="display:flex;gap:8px;flex-direction:column">
          <div class="field">
            <label for="mongoApiUrl">Mongo API base URL (Not Mongo URI)</label>
            <input id="mongoApiUrl" type="text" v-model="state.settings.mongoApiUrl" placeholder="http://localhost:4000">
          </div>
          <div class="field">
            <label for="mongoApiKey">API Key (optional)</label>
            <input id="mongoApiKey" type="text" v-model="state.settings.mongoApiKey" placeholder="Leave blank for none">
          </div>
          <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">
            <button class="btn" id="testMongoBtn" @click="() => store.testMongo()">Test Mongo</button>
            <button class="btn" id="retryMongoBtn" v-if="state.settings.storage === 'mongodb' && state.settings.mongoApiUrl" @click="() => store.testMongo()">Retry</button>
          </div>
          <p style="margin-top:8px;color:var(--muted,#9aa4b2)">When MongoDB is selected and the connection test succeeds, local projects will be synced automatically to the server.</p>
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

  <dialog id="welcomeModal">
    <div class="modal-head">
      <h3 style="margin:0">Welcome to Caption Studio</h3>
      <button class="btn small" data-close="welcomeModal" @click="() => closeWelcome()">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-top:0">Quick setup — get started in seconds. Choose one of the options below to create your first project or import images.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn" @click="welcomeCreateProject"><i class="icon">＋</i> Create a Project</button>
        <button class="btn" @click="welcomeAddImages"><i class="icon">📁</i> Add Images</button>
        <button class="btn" @click="welcomeOpenSettings"><i class="icon">⚙</i> Settings</button>
      </div>

      <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" v-model="welcomeNever" /> Never show again</label>
        <div style="display:flex;gap:8px">
          <button class="btn" @click="closeWelcome">Close</button>
          <button class="btn primary" @click="closeWelcome">Get started</button>
        </div>
      </div>
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
