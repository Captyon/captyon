<template>
  <dialog id="projectSettingsModal">
    <div class="modal-head">
      <h3 style="margin:0">Project Settings</h3>
      <button class="btn small" data-close="projectSettingsModal" @click="close">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:8px">
        <div>
          <label><strong>Name:</strong></label>
          <input type="text" v-model="projectName" placeholder="Project name" :disabled="renaming" />
          <div style="color:#ffcccc;font-size:13px;margin-top:6px" v-if="nameError">{{ nameError }}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button class="btn" @click="resetName" :disabled="renaming">Reset</button>
            <button class="btn primary" @click="renameProject" :disabled="renaming">
              <span v-if="renaming">Saving…</span>
              <span v-else>Rename</span>
            </button>
          </div>
        </div>
        <div><strong>Items:</strong> {{ (currentProject?.items || []).length }}</div>
        <div><strong>Created:</strong> {{ currentProject?.createdAt ? new Date(currentProject.createdAt).toLocaleString() : '' }}</div>
        <div><strong>Updated:</strong> {{ currentProject?.updatedAt ? new Date(currentProject.updatedAt).toLocaleString() : '' }}</div>
        <div style="margin-top:8px">
          <button class="btn" @click="exportProject">Export Project</button>
        </div>
      </div>

      <hr />

      <div style="margin-top:12px; padding:12px; border-radius:6px; background:#3a0f0f; color:#ffdede">
        <h4 style="margin:0 0 8px 0">Danger Zone</h4>
        <p>Deleting a project is permanent. This will remove the project and its images from local storage.</p>
        <label style="display:flex;flex-direction:column;gap:6px; margin-top:8px">
          <span>Type the project name to confirm:</span>
          <input type="text" v-model="deleteProjectConfirmInput" placeholder="Type project name to confirm" />
        </label>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="btn" @click="close">Cancel</button>
          <button class="btn" style="background:#b91c1c;color:white" :disabled="deleteProjectConfirmInput !== (currentProject && currentProject.name) " @click="confirmDeleteProject">Delete Project</button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';

const store = useProjectStore();
const currentProject = computed(() => store.getCurrentProject());

const deleteProjectConfirmInput = ref('');
const projectName = ref(currentProject.value?.name || '');
const renaming = ref(false);
const nameError = ref('');

// Keep projectName in sync with the currently selected project
watch(currentProject, (proj) => {
  projectName.value = proj?.name || '';
  deleteProjectConfirmInput.value = '';
  nameError.value = '';
}, { immediate: true });

function close() {
  try { (document.getElementById('projectSettingsModal') as HTMLDialogElement | null)?.close(); } catch {}
}

function resetName() {
  projectName.value = currentProject.value?.name || '';
  nameError.value = '';
}

async function confirmDeleteProject() {
  const proj = currentProject.value;
  if (!proj) return;
  if (deleteProjectConfirmInput.value !== proj.name) {
    store.addToast('Project name does not match', 'warn');
    return;
  }
  try {
    const ok = await store.deleteProject(proj.id);
    if (ok) {
      close();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('deleteProject failed', e);
    store.addToast('Failed to delete project', 'warn');
  }
}

async function renameProject() {
  const proj = currentProject.value;
  if (!proj) return;
  const name = projectName.value?.trim();
  nameError.value = '';
  if (!name) {
    nameError.value = 'Project name required';
    return;
  }
  if (name.length > 100) {
    nameError.value = 'Name too long (max 100 characters)';
    return;
  }
  const duplicate = store.state.order.some(id => id !== proj.id && (store.state.projects.get(id)?.name || '').toLowerCase() === name.toLowerCase());
  if (duplicate) {
    nameError.value = 'Another project already uses this name';
    return;
  }

  const prevName = proj.name;
  proj.name = name;
  proj.updatedAt = Date.now();
  renaming.value = true;
  try {
    await store.saveCurrentProject();
    store.addToast('Project renamed', 'ok');
    close();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('renameProject failed', e);
    proj.name = prevName;
    store.addToast('Failed to rename project', 'warn');
    nameError.value = 'Save failed';
  } finally {
    renaming.value = false;
  }
}

function exportProject() {
  try { store.exportProject(); } catch (e) { console.error(e); }
}
</script>
