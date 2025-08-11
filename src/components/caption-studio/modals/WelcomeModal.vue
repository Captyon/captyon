<template>
  <dialog id="welcomeModal" ref="dlg">
    <div class="modal-head">
      <h3 style="margin:0">Welcome to Caption Studio</h3>
      <button class="btn small" data-close="welcomeModal" @click="close">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-top:0">Quick setup — get started in seconds. Choose one of the options below to create your first project or import images.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn" @click="welcomeCreateProject"><i class="icon">＋</i> Create a Project</button>
        <button class="btn" @click="welcomeAddImages"><i class="icon">📁</i> Add Images</button>
        <button class="btn" @click="welcomeOpenSettings"><i class="icon">⚙</i> Settings</button>
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
