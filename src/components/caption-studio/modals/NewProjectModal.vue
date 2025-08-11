<template>
  <dialog class="modal" role="dialog" aria-modal="true" ref="dlg">
    <div class="modal-head">
      <h3 style="margin:0">Create new project</h3>
      <button class="btn small" @click="close" aria-label="Close">✕</button>
    </div>

    <div class="modal-body">
      <div class="field">
        <label for="newName">Project name</label>
        <input id="newName" class="input-inline" v-model="name" @keydown.enter.prevent="submit" placeholder="Untitled project" />
        <div class="hint" style="font-size:12px;color:var(--text-dim)">Give your project a descriptive name to identify it later.</div>
      </div>

      <div class="field" style="margin-top:8px">
        <label for="newDesc">Description (optional)</label>
        <textarea id="newDesc" class="input-inline" v-model="description" placeholder="Short description (optional)" rows="3"></textarea>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn" @click="close">Cancel</button>
        <button class="btn primary" @click="submit" :disabled="creating">
          <span v-if="creating">Creating…</span>
          <span v-else>Create</span>
        </button>
      </div>

      <div v-if="error" style="color:var(--warn); margin-top:8px; font-size:13px">{{ error }}</div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';

const emit = defineEmits(['create','close']);
const dlg = ref<HTMLDialogElement | null>(null);
const name = ref('');
const description = ref('');
const creating = ref(false);
const error = ref('');

const store = useProjectStore();

function close() {
  error.value = '';
  name.value = '';
  description.value = '';
  emit('close');
  try { dlg.value?.close(); } catch {}
}

async function submit() {
  error.value = '';
  const n = (name.value || '').trim() || 'Untitled';
  if (n.length > 100) {
    error.value = 'Name too long (max 100 characters)';
    return;
  }
  // create locally first so store can use same flow
  creating.value = true;
  try {
    // create project using store API; store.createProject already used elsewhere
    store.createProject(n);
    // optional: attach description if project structure supports it
    try { await store.saveCurrentProject?.(); } catch (e) { console.error(e); }
    try { await store.refreshMetaBar?.(); } catch (e) { console.error(e); }
    emit('create', n);
    close();
  } catch (e) {
    console.error('Failed to create project', e);
    error.value = 'Failed to create project';
  } finally {
    creating.value = false;
  }
}

// Ensure dialog opens when mounted
onMounted(() => {
  try { dlg.value?.showModal(); } catch (e) {}
});
onBeforeUnmount(() => {
  try { dlg.value?.close(); } catch (e) {}
});
</script>

<style scoped>
.modal { width: min(640px, 92vw); border:1px solid var(--border); background:var(--panel); border-radius:12px; padding:0; box-shadow:var(--shadow); }
.modal-head { padding:12px; display:flex; align-items:center; justify-content:space-between; background:var(--muted); border-bottom:1px solid var(--border); border-top-left-radius:12px; border-top-right-radius:12px; }
.modal-body { padding:12px; display:grid; gap:8px; }
.input-inline { width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border); background:var(--muted); color:var(--text); resize:vertical; }
.field label { font-size:13px; color:var(--text-dim); display:block; margin-bottom:6px }
.hint { color:var(--text-dim); }
</style>
