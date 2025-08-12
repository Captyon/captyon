<template>
  <div class="project-select-component flex items-center gap-2 min-w-0" role="group" aria-label="Project selector">
    <div v-if="!editing" class="project-label flex items-center gap-2 min-w-0" tabindex="0" @keydown.enter.prevent="startEdit" :aria-label="`Project: ${currentName || 'No project'}`">
      <strong class="project-name text-sm truncate font-semibold text-text">{{ currentName || 'No project' }}</strong>

      <button class="inline-flex items-center p-1 rounded-md text-text hover:bg-muted-contrast" title="Rename project" @click.stop="startEdit" aria-label="Rename project">
        <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 21l3-1 11-11a2.5 2.5 0 10-3.5-3.5L6.5 16.5 5 19l-2 2zM14.5 6.5l3 3"/>
        </svg>
      </button>

      <select
        v-model="selectedId"
        @change="onChange"
        :disabled="projects.length === 0"
        aria-label="Select project"
        class="ml-2 rounded-md px-2 py-1 text-sm min-w-[160px] bg-muted text-text border border-border"
      >
        <option v-if="projects.length === 0" disabled value="">{{ state.showWelcomeModal ? 'No project — use the Welcome screen' : 'No projects' }}</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>

    <div v-else class="project-edit flex items-center gap-2" @keydown.esc.prevent="cancelEdit">
      <input ref="inputRef" v-model="name"
        class="px-2 py-1 rounded-md border border-border bg-muted text-text min-w-[180px]"
        :disabled="saving" @keydown.enter.prevent="save" placeholder="Project name" aria-label="Edit project name" />
      <button class="inline-flex items-center px-3 py-1 rounded-md border border-border text-text disabled:opacity-60" @click="cancelEdit" :disabled="saving" aria-label="Cancel rename">Cancel</button>
      <button class="inline-flex items-center px-3 py-1 rounded-md bg-gradient-to-b from-[var(--btn-top)] to-[var(--btn-btm)] border border-border text-text disabled:opacity-60" @click="save" :disabled="saving" aria-label="Save rename">
        <span v-if="saving">Saving…</span><span v-else>Save</span>
      </button>
      <div class="rename-error text-warn ml-2" v-if="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';

const store = useProjectStore();
const { state } = store;

const projects = ref(Array.from(state.order || []).map(id => ({ id, name: state.projects.get(id)?.name || id })));
watch(() => state.order, () => {
  projects.value = Array.from(state.order || []).map(id => ({ id, name: state.projects.get(id)?.name || id }));
});

const selectedId = ref(state.currentId || null);
watch(() => state.currentId, (v) => { selectedId.value = v; });

const editing = ref(false);
const name = ref('');
const saving = ref(false);
const error = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const currentName = computed(() => {
  return store.getCurrentProject()?.name ?? '';
});

function startEdit() {
  name.value = store.getCurrentProject()?.name || '';
  error.value = '';
  saving.value = false;
  editing.value = true;
  setTimeout(() => inputRef.value?.focus(), 0);
}
function cancelEdit() {
  editing.value = false;
  error.value = '';
}
async function save() {
  const proj = store.getCurrentProject();
  if (!proj) return;
  const n = (name.value || '').trim();
  error.value = '';
  if (!n) { error.value = 'Project name required'; return; }
  if (n.length > 100) { error.value = 'Name too long (max 100 characters)'; return; }
  const duplicate = state.order.some(id => id !== proj.id && (state.projects.get(id)?.name || '').toLowerCase() === n.toLowerCase());
  if (duplicate) { error.value = 'Another project already uses this name'; return; }

  const prev = proj.name;
  proj.name = n;
  proj.updatedAt = Date.now();
  saving.value = true;
  try {
    await store.saveCurrentProject();
    store.addToast('Project renamed', 'ok');
    editing.value = false;
  } catch (e) {
    console.error('ProjectSelect save failed', e);
    proj.name = prev;
    store.addToast('Failed to rename project', 'warn');
    error.value = 'Save failed';
  } finally {
    saving.value = false;
  }
}

function onChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  if (!val) return;
  const prevId = state.currentId;
  store.refreshMetaBar().then(async () => {
    try {
      const proj = await store.loadProjectById(val);
      if (proj) {
        store.setCurrentProject(proj);
      } else {
        state.currentId = prevId;
        store.addToast('Failed to load project; reverted selection', 'warn');
      }
    } catch (err) {
      console.error('ProjectSelect onChange failed', err);
      state.currentId = prevId;
      store.addToast('Failed to load project; reverted selection', 'warn');
    }
  }).catch(err => {
    console.error('ProjectSelect refreshMetaBar failed', err);
    state.currentId = prevId;
    store.addToast('Failed to refresh project list; reverted selection', 'warn');
  });
}
</script>

<style scoped>
.project-select-component { display:flex; align-items:center; gap:8px; min-width:0; }
.project-label { display:flex; align-items:center; gap:8px; min-width:0; }
.project-name { font-size:14px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rename-error { color: var(--warn); font-size:12px; margin-left:8px; }
</style>
