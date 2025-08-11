<template>
  <dialog id="deleteConfirm">
    <div class="modal-head">
      <h3 style="margin:0">Delete image</h3>
      <button class="btn small" data-close="deleteConfirm" @click="close">✕</button>
    </div>
    <div class="modal-body">
      <p>Delete this image from the current project? This action cannot be undone.</p>
      <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" v-model="deleteDontAsk" /> Do not ask next time</label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn" @click="close">Cancel</button>
        <button class="btn primary" @click="onConfirmDelete">Delete</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';

const store = useProjectStore();
const deleteDontAsk = ref(false);

function close() {
  try { (document.getElementById('deleteConfirm') as HTMLDialogElement | null)?.close(); } catch {}
}

function onConfirmDelete() {
  if (deleteDontAsk.value) {
    store.saveSettings({ confirmDeleteOnRemove: false });
  }
  try { (store as any).removeCurrentItem?.(); } catch (e) { console.error(e); }
  close();
}
</script>
