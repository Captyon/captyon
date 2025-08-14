<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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
import NewProjectModal from './caption-studio/modals/NewProjectModal.vue';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { useCuration } from '../composables/useCuration';
import { useFilePicker } from '../composables/useFilePicker';
import Toasts from './Toasts.vue';
import type { ToolbarItem } from './caption-studio/toolbar-types';

const store = useProjectStore();
const { state } = store;

// Modal state management
const showNewProjectModal = ref(false);

// Modal handlers
function openNewProjectModal() {
  showNewProjectModal.value = true;
}

function closeNewProjectModal() {
  showNewProjectModal.value = false;
}

function onNewProjectCreated() {
  showNewProjectModal.value = false;
}

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

function clearList() {
  try {
    const proj = store.getCurrentProject?.();
    if (!proj) {
      (store as any).addToast?.('No project selected', 'warn');
      return;
    }
    (store as any).clearList?.();
    const res = (store as any).saveCurrentProject?.();
    if (res && typeof res.then === 'function') res.catch((e: any) => console.error('saveCurrentProject failed', e));
    (store as any).addToast?.('Cleared media list', 'ok');
  } catch (e) {
    console.error('clearList handler failed', e);
  }
}

// File input handlers for EmptyState component
function handleFilesInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    store.ingestFiles(Array.from(input.files));
    input.value = ''; // Reset input
  }
}

function handleFolderInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    store.ingestFiles(Array.from(input.files));
    input.value = ''; // Reset input
  }
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

 // Toolbar items for the header toolbar. Defined here so handlers (prev/next/etc) can be wired.
 const toolbarItems: ToolbarItem[] = [
   { type: 'action', id: 'prev', label: '◀ Prev', onClick: prev, priority: 10 },
   { type: 'action', id: 'next', label: 'Next ▶', onClick: next, priority: 9 },
   { type: 'separator', id: 'sep-1' },
   { type: 'action', id: 'settings', label: 'Settings', onClick: () => (document.getElementById('projectSettingsModal') as HTMLDialogElement | null)?.showModal?.(), priority: 0 },
   { type: 'action', id: 'help', label: 'Help', onClick: () => (document.getElementById('helpModal') as HTMLDialogElement | null)?.showModal?.(), priority: 0 },
 ];
 
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

  // Handle new project event from empty state
  function handleNewProjectEvent() {
    openNewProjectModal();
  }

  window.addEventListener('dragover', dragOver);
  window.addEventListener('dragleave', dragLeave);
  window.addEventListener('drop', dropHandler);
  document.addEventListener('new-project', handleNewProjectEvent);

  // cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('dragover', dragOver);
    window.removeEventListener('dragleave', dragLeave);
    window.removeEventListener('drop', dropHandler);
    document.removeEventListener('new-project', handleNewProjectEvent);
  });
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <Toolbar :onNewProject="openNewProjectModal" />
    </header>

    <main>
      <aside>
        <div class="panel-head"><h3>Media</h3><span class="right badge" id="countBadge">{{ (store.getCurrentProject()?.items || []).length }}</span></div>
        <div class="project-bar">
          <div class="seg" role="group" aria-label="select source" style="display:flex;gap:6px">
            <button class="btn small" id="pickFolderBtn" @click="openFolderInput">Pick Folder</button>
            <button class="btn small" id="pickFilesBtn" @click="openFilesInput">Pick Files</button>
            <button class="btn small" id="clearListBtn" @click="clearList">Clear</button>
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

      <!-- Only show Editor when there's a project with items -->
      <Editor v-if="(store.getCurrentProject()?.items || []).length > 0" />
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

    <!-- Hidden file inputs for EmptyState component -->
    <input type="file" id="filesInput" style="display:none" multiple accept="image/*,video/*" @change="handleFilesInput" />
    <input type="file" id="folderInput" style="display:none" webkitdirectory @change="handleFolderInput" />

    <Toasts />

    <!-- Modals -->
    <ProjectSettingsModal />
    <SettingsModal />
    <PromptModal />
    <BulkModal />
    <DeleteConfirm />
    <HelpModal />
    <WelcomeModal :onNewProject="openNewProjectModal" />
    <NewProjectModal :show="showNewProjectModal" @close="closeNewProjectModal" @create="onNewProjectCreated" />
  </div>
</template>
