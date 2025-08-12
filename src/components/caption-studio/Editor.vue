<template>
  <section class="editor">
    <div class="editor-tools">
      <button class="btn small" id="applyBtn" @click="applyEdits">Save Caption <kbd>Alt+S</kbd></button>
      <button class="btn small" id="genBtn" @click="store.autoCaptionCurrent">AI Generate <kbd>Alt+G</kbd></button>
      <button class="btn small" id="copyBtn" @click="copyFromFile">Copy From File</button>
      <button class="btn small" id="clearBtn" @click="clearCaption">Clear</button>
      <button class="btn small" id="removeBtn" @click="confirmDelete">Remove <kbd>Alt+D</kbd></button>
        <div class="right" style="display:flex; gap:8px; align-items:center">
        <label>Tags</label>
        <input type="text" id="tagInput" v-model="tagInput" placeholder="comma separated" class="tags-input" />
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
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';

const store = useProjectStore();
const { state } = store;

const captionBox = ref('');
const tagInput = ref('');

const currentItem = computed(() => store.currentItem());

/* keep local editor fields in sync when currentItem changes */
watch(currentItem, (it) => {
  captionBox.value = it?.caption || '';
  tagInput.value = (it?.tags || []).join(', ');
}, { immediate: true });

watch(() => currentItem.value?.caption, (c) => {
  captionBox.value = c || '';
});

// actions
function applyEdits() {
  store.applyEdits(captionBox.value, tagInput.value);
  store.saveCurrentProject();
}

function copyFromFile() {
  const s = store.copyFromFile();
  if (s) captionBox.value = s;
}

function clearCaption() {
  captionBox.value = '';
  store.clearCaption();
}

function confirmDelete() {
  const it = store.currentItem();
  if (!it) return;
  if (!state.settings.confirmDeleteOnRemove) {
    doDelete();
    return;
  }
  const el = document.getElementById('deleteConfirm') as HTMLDialogElement | null;
  el?.showModal();
}

function doDelete() {
  try {
    (store as any).removeCurrentItem?.();
  } catch (e) { console.error(e); }
  try { (document.getElementById('deleteConfirm') as HTMLDialogElement | null)?.close(); } catch {}
}
</script>

<style scoped>
.tags-input { width: 210px; max-width: 45vw; box-sizing: border-box; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--muted); color: var(--text); }
@media (max-width: 680px) {
  .tags-input { width: 100%; max-width: none; }
  .editor .editor-tools { flex-direction: column; align-items: stretch; gap: 8px; }
  .editor .editor-tools .right { width: 100%; display:flex; justify-content:space-between; }
}
</style>
