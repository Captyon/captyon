<template>
  <dialog id="welcomeModal">
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
        <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" v-model="welcomeNever" /> Never show again</label>
        <div style="display:flex;gap:8px">
          <button class="btn" @click="close">Close</button>
          <button class="btn primary" @click="close">Get started</button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';
import { useFilePicker } from '../../../composables/useFilePicker';

const store = useProjectStore();
const { pickFiles } = useFilePicker();

const welcomeNever = ref(false);

function close() {
  try { (document.getElementById('welcomeModal') as HTMLDialogElement | null)?.close(); } catch {}
}

function welcomeCreateProject() {
  const name = prompt('Project name?') || 'Untitled';
  store.createProject(name);
  try { store.saveCurrentProject?.(); } catch {}
  try { store.refreshMetaBar?.(); } catch {}
  close();
}

function welcomeAddImages() {
  pickFiles();
  close();
}

function welcomeOpenSettings() {
  try { (document.getElementById('settingsModal') as HTMLDialogElement | null)?.showModal(); } catch {}
}
</script>
