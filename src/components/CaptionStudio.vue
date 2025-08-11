<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useProjectStore } from '../store/useProjectStore';
import Toolbar from './caption-studio/Toolbar.vue';
import ThumbsList from './caption-studio/ThumbsList.vue';
import Viewer from './caption-studio/Viewer.vue';
import Editor from './caption-studio/Editor.vue';
import ProjectSettingsModal from './caption-studio/modals/ProjectSettingsModal.vue';
import SettingsModal from './caption-studio/modals/SettingsModal.vue';
import PromptModal from './caption-studio/modals/PromptModal.vue';
import BulkModal from './caption-studio/modals/BulkModal.vue';
import DeleteConfirm from './caption-studio/modals/DeleteConfirm.vue';
import HelpModal from './caption-studio/modals/HelpModal.vue';
import WelcomeModal from './caption-studio/modals/WelcomeModal.vue';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { useCuration } from '../composables/useCuration';
import { useFilePicker } from '../composables/useFilePicker';
import Toasts from './Toasts.vue';

const store = useProjectStore();
const { state } = store;

// lightweight handlers used by keyboard shortcuts composable
function applyEditsSafe() {
  try {
    store.applyEdits((document.getElementById('captionBox') as HTMLTextAreaElement | null)?.value || '', (document.getElementById('tagInput') as HTMLInputElement | null)?.value || '');
    const res = (store as any).saveCurrentProject?.();
    if (res && typeof res.then === 'function') {
      res.catch((e: any) => console.error('saveCurrentProject failed', e));
    }
  } catch (e) {
    console.error('applyEditsSafe error', e);
  }
}

function prev() { try { store.prev(); } catch (e) { console.error(e); } }
function next() { try { store.next(); } catch (e) { console.error(e); } }
function commitCuration(status: 'accepted' | 'rejected') {
  try {
    // Use the composable's commitCuration so the accept/reject animation plays
    // before the status is persisted.
    useCuration().commitCuration(status);
  } catch (e) { console.error(e); }
}
function openCurationExitConfirm() {
  // reuse composable's modal state via useCuration in components; here we trigger store fallback
  try { store.stopCuration(); } catch {}
}

function remove() {
  try {
    // If user has disabled confirmation, remove immediately
    if (store.state.settings && store.state.settings.confirmDeleteOnRemove === false) {
      try { (store as any).removeCurrentItem?.(); } catch (e) { console.error(e); }
      return;
    }
    // Otherwise open the confirm dialog
    try { (document.getElementById('deleteConfirm') as HTMLDialogElement | null)?.showModal(); } catch (e) { console.error(e); }
  } catch (e) { console.error('remove handler failed', e); }
}

function autoCaptionCurrent() { try { (store as any).autoCaptionCurrent?.(); } catch (e) { console.error(e); } }

// DOM-trigger helpers (move inline document usage into functions to satisfy TypeScript)
function openFolderInput() {
  try { (document.getElementById('folderInput') as HTMLInputElement | null)?.click(); } catch {}
}
function openFilesInput() {
  try { (document.getElementById('filesInput') as HTMLInputElement | null)?.click(); } catch {}
}
function openBulkModal() {
  try { (document.getElementById('bulkModal') as HTMLDialogElement | null)?.showModal(); } catch {}
}

// wire keyboard shortcuts
useKeyboardShortcuts({
  applyEditsSafe,
  prev,
  next,
  commitCuration,
  openCurationExitConfirm,
  remove,
  autoCaptionCurrent,
});

// Initialize composables used by child components to ensure refs exist if needed
useFilePicker();
useCuration(); // curation state used by CurationCard/Viewer

onMounted(async () => {
  try {
    await store.initStore();
  } catch (e) {
    console.error('store.initStore failed', e);
  }

  // drag/drop overlay behavior
  const ov = document.getElementById('dropOverlay') as HTMLDivElement | null;
  function dragOver(e: DragEvent) { e.preventDefault(); if (ov) ov.style.display = 'flex'; }
  function dragLeave(e: DragEvent) {
    if ((e.target as any) === document || (e.target as any) === document.body) {
      if (ov) ov.style.display = 'none';
    }
  }
  function dropHandler(e: DragEvent) {
    e.preventDefault();
    if (ov) ov.style.display = 'none';
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.items) {
      const itemsArr = Array.from(dt.items);
      const files = itemsArr.map((it: any) => it.kind === 'file' ? it.getAsFile() as File | null : null).filter(Boolean) as File[];
      store.ingestFiles(files);
    } else if (dt.files) {
      store.ingestFiles(dt.files);
    }
  }

  window.addEventListener('dragover', dragOver);
  window.addEventListener('dragleave', dragLeave);
  window.addEventListener('drop', dropHandler);

  // cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('dragover', dragOver);
    window.removeEventListener('dragleave', dragLeave);
    window.removeEventListener('drop', dropHandler);
  });
});
</script>

<template>
  <div class="app">
    <header>
      <div class="brand">
        <div class="cs-logo-wrap" aria-hidden="true" style="margin-right:8px;">
          <img src="/cs-icon.svg" alt="Caption Studio" class="cs-logo" style="width:28px;height:28px;display:block;border-radius:inherit;overflow:hidden" />
        </div>
        <h1>Caption Studio</h1>
      </div>

      <Toolbar />
    </header>

    <main>
      <aside>
        <div class="panel-head"><h3>Media</h3><span class="right badge" id="countBadge">{{ (store.getCurrentProject()?.items || []).length }}</span></div>
        <div class="project-bar">
          <div class="seg" role="group" aria-label="select source" style="display:flex;gap:6px">
            <button class="btn small" id="pickFolderBtn" @click="openFolderInput">Pick Folder</button>
            <button class="btn small" id="pickFilesBtn" @click="openFilesInput">Pick Files</button>
            <button class="btn small" id="clearListBtn" @click="store.clearList">Clear</button>
          </div>
          <div class="controls-row">
            <label><input type="checkbox" v-model="state.filter.onlyMissing"> Only missing captions</label>
            <label><input type="checkbox" v-model="state.filter.onlySelected"> Only selected</label>
            <button class="btn small right" id="bulkToolsBtn" @click="openBulkModal">Bulk Tools</button>
          </div>
        </div>

        <ThumbsList />
      </aside>

      <Viewer />

      <Editor />
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
    </footer>

    <div class="drop-overlay" id="dropOverlay" style="display:none">Drop images and matching .txt here</div>

    <Toasts />

    <!-- Modals -->
    <ProjectSettingsModal />
    <SettingsModal />
    <PromptModal />
    <BulkModal />
    <DeleteConfirm />
    <HelpModal />
    <WelcomeModal />
  </div>
</template>
