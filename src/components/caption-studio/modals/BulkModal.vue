<template>
  <dialog id="bulkModal">
    <div class="modal-head">
      <h3 style="margin:0">Bulk Tools</h3>
      <button class="btn small" data-close="bulkModal" @click="close">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="field">
          <label>Prefix</label>
          <input id="bulkPrefix" type="text" v-model="prefix" placeholder="Add text to the start of captions">
        </div>
        <div class="field">
          <label>Suffix</label>
          <input id="bulkSuffix" type="text" v-model="suffix" placeholder="Add text to the end of captions">
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Find</label>
          <input id="bulkFind" type="text" v-model="find" placeholder="find">
        </div>
        <div class="field">
          <label>Replace</label>
          <input id="bulkReplace" type="text" v-model="replace" placeholder="replace">
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end">
        <button class="btn" id="bulkPreviewBtn" @click="preview">Preview</button>
        <button class="btn primary" id="bulkApplyBtn" @click="apply">Apply</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';

const store = useProjectStore();

const prefix = ref('');
const suffix = ref('');
const find = ref('');
const replace = ref('');

function close() {
  try { (document.getElementById('bulkModal') as HTMLDialogElement | null)?.close(); } catch {}
}

function apply() {
  store.bulkApply(prefix.value, suffix.value, find.value, replace.value);
  close();
}

function preview() {
  // For now just apply preview by calling bulkApply with no mutation - the store may implement preview separately.
  // If not available, show a toast informing user preview is unavailable.
  try {
    if ((store as any).bulkPreview) {
      (store as any).bulkPreview(prefix.value, suffix.value, find.value, replace.value);
    } else {
      store.addToast('Preview not available', 'warn');
    }
  } catch (e) {
    console.error(e);
    store.addToast('Preview failed', 'warn');
  }
}
</script>
