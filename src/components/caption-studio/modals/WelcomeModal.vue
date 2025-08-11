<template>
  <dialog id="welcomeModal" ref="dlg">
      <div class="modal-head">
      <h3 style="margin:0">Welcome to Caption Studio</h3>
      <button class="btn small" data-close="welcomeModal" @click="close" aria-label="Close">
        <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6L18 18M6 18L18 6"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <p style="margin-top:0">Quick setup — get started in seconds. Choose one of the options below to create your first project or import images.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn" @click="welcomeCreateProject">
          <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/></svg>
          Create a Project
        </button>
        <button class="btn" @click="welcomeAddImages">
          <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 7a2 2 0 012-2h3l2 3h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM9 10l2-2 2 2"/></svg>
          Add Images
        </button>
        <button class="btn" @click="welcomeOpenSettings">
          <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 2.5l-1.12-.2a7.05 7.05 0 00-.6-1.45l.66-.92-1.4-1.4-.92.66c-.46-.23-.95-.4-1.45-.6l-.2-1.12H9.8l-.2 1.12c-.5.2-.99.37-1.45.6l-.92-.66-1.4 1.4.66.92c-.23.46-.4.95-.6 1.45l-1.12.2v2.8l1.12.2c.2.5.37.99.6 1.45l-.66.92 1.4 1.4.92-.66c.46.23.95.4 1.45.6l.2 1.12h4.4l.2-1.12c.5-.2.99-.37 1.45-.6l.92.66 1.4-1.4-.66-.92c.23-.46.4-.95.6-1.45l1.12-.2v-2.8z"/></svg>
          Settings
        </button>
      </div>

      <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <label style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" v-model="neverShow" /> Never show again
        </label>
        <div style="display:flex;gap:8px">
          <button class="btn" @click="close">Close</button>
          <button class="btn primary" @click="close">Get started</button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';
import { useFilePicker } from '../../../composables/useFilePicker';

const store = useProjectStore();
const { state } = store;
const dlg = ref<HTMLDialogElement | null>(null);
const { pickFiles } = useFilePicker();

// "Never show again" is the inverse of showWelcomeOnStart
const neverShow = computed({
  get: () => !(state.settings?.showWelcomeOnStart ?? true),
  set: (v: boolean) => {
    // persist immediately
    const show = !v;
    try {
      store.saveSettings({ showWelcomeOnStart: show });
    } catch (e) {
      // best-effort; ignore errors
      console.error('Failed to save welcome setting', e);
    }
  }
});

function close() {
  try {
    // Update store flag so other logic knows the modal was dismissed
    state.showWelcomeModal = false;
    dlg.value?.close();
  } catch (e) {
    // ignore DOM errors
  }
}

function welcomeCreateProject() {
  const name = prompt('Project name?') || 'Untitled';
  try {
    store.createProject(name);
    store.saveCurrentProject?.();
    store.refreshMetaBar?.();
  } catch (e) {
    console.error('welcomeCreateProject failed', e);
  }
  close();
}

function welcomeAddImages() {
  try { pickFiles(); } catch (e) { console.error(e); }
  close();
}

function welcomeOpenSettings() {
  try { (document.getElementById('settingsModal') as HTMLDialogElement | null)?.showModal(); } catch (e) { console.error(e); }
}

watch(() => state.showWelcomeModal, (val) => {
  try {
    if (val) {
      dlg.value?.showModal();
    } else {
      dlg.value?.close();
    }
  } catch (e) {
    // ignore DOM exceptions
  }
});

// Ensure dialog reflects initial store state on mount
onMounted(() => {
  try {
    if (state.showWelcomeModal) {
      dlg.value?.showModal();
    }
  } catch (e) {}
});
</script>
