<template>
  <div class="toolbar">
    <div style="position:relative; display:inline-flex; align-items:center;">
      <select id="projectSelect" ref="projectSelect" v-model="selectedId" @change="onProjectChange" :disabled="state.order.length === 0">
        <option v-if="state.order.length === 0" disabled value="">{{ state.showWelcomeModal ? 'No project — use the Welcome screen' : 'No projects' }}</option>
        <option v-for="id in state.order" :key="id" :value="id">{{ state.projects.get(id)?.name || id }}</option>
      </select>
      <button id="renameBtn" class="btn small" style="margin-left:8px" @click="openRenamePopover" title="Rename project">✎</button>

      <div id="renamePopover" v-if="showRenamePopover" @click.stop
           style="position:absolute; z-index:1200; top:40px; left:0; background:var(--panel-bg,#0f1720); padding:10px; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.6); display:flex; gap:8px; align-items:center; min-width:320px">
        <input id="renameInput" type="text" v-model="projectName" :disabled="renaming" @keydown.enter.prevent="saveRenameFromPopover" @keydown.esc.prevent="closeRenamePopover"
               placeholder="Project name" style="flex:1; padding:8px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.06)" />
        <div style="display:flex; gap:8px; align-items:center">
          <button class="btn" @click="closeRenamePopover" :disabled="renaming">Cancel</button>
          <button class="btn primary" @click="saveRenameFromPopover" :disabled="renaming">
            <span v-if="renaming">Saving…</span>
            <span v-else>Save</span>
          </button>
        </div>
        <div style="color:#ffcccc;font-size:12px;margin-left:8px" v-if="nameError">{{ nameError }}</div>
      </div>
    </div>

    <button class="btn" id="newProjectBtn" @click="onNewProject"><i class="icon">＋</i> New Project</button>
    <button class="btn" id="openBtn" @click="pickFiles"><i class="icon">📁</i> Add Media+Captions</button>

    <!-- hidden inputs controlled by file picker composable -->
    <input ref="folderInput" id="folderInput" accept="image/*,video/*,.txt" multiple webkitdirectory directory type="file" class="hidden" @change="onFolderPicked" />
    <input ref="filesInput" id="filesInput" accept="image/*,video/*,.txt" multiple type="file" class="hidden" @change="onFilesPicked" />
    <button class="btn" id="importJsonBtn" @click="triggerJsonImport"><i class="icon">⬆</i> Import JSON</button>
    <input ref="jsonInput" id="jsonInput" accept="application/json" class="hidden" type="file" @change="onImportJson" />

    <div class="spacer"></div>
    <input type="search" ref="searchBox" id="searchBox" v-model="state.filter.text" placeholder="Search captions or file names" style="width: 280px" />
    <button class="btn" id="saveBtn" @click="saveProject"><i class="icon">💾</i> Save</button>

    <div style="position:relative; display:inline-block;">
      <button class="btn" id="exportBtn" @click="exportOpen = !exportOpen"><i class="icon">⬇</i> Export</button>
      <div v-if="exportOpen" style="position:absolute; right:0; top:40px; background:var(--panel-bg,#0f1720); padding:8px; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.6); z-index:1200; display:flex; gap:8px; white-space:nowrap">
        <button class="btn" @click="exportProjectJson">JSON</button>
        <button class="btn" @click="exportProjectZip">Zip (images + txt)</button>
      </div>
    </div>

    <button class="btn primary" id="autoBtn" @click="store.autoCaptionBulk"><i class="icon">✨</i> Auto Caption</button>

    <button
      class="btn"
      id="curationBtn"
      :class="{ primary: state.curationMode }"
      @click="() => { if (state.curationMode) { openCurationExitConfirm(); } else { store.startCuration(); } }"
      title="Curation mode (swipe to accept/reject)">
      <i class="icon">🃏</i>
      Curation
      <span v-if="state.curationMode" style="margin-left:8px; font-size:12px; opacity:0.9">
        <span style="color:#7dd3a6">✓ {{ curationCounts.accepted }}</span>
        <span style="color:#ff7b7b; margin-left:8px">✕ {{ curationCounts.rejected }}</span>
        <span style="margin-left:8px">• {{ curationCounts.remaining }} left</span>
      </span>
    </button>

    <button class="btn" id="projectSettingsBtn" @click="openProjectSettings"><i class="icon">🧰</i> Project Settings</button>
    <button class="btn" id="settingsBtn" @click="openSettings"><i class="icon">⚙</i> Settings</button>
    <button class="btn ghost" id="helpBtn" @click="openHelp"><i class="icon">❓</i> Help</button>

    <span class="badge" id="statusBadge">{{ state.status }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { useFilePicker } from '../../composables/useFilePicker';
import { useCuration } from '../../composables/useCuration';

const store = useProjectStore();
const { state } = store;

const { filesInput, folderInput, jsonInput, pickFiles, triggerJsonImport, onFilesPicked, onFolderPicked, onImportJson } = useFilePicker();
const { curationCounts, openCurationExitConfirm } = useCuration();

const projectSelect = ref<HTMLSelectElement | null>(null);
const searchBox = ref<HTMLInputElement | null>(null);
const selectedId = ref<string | null>(state.currentId);
watch(() => state.currentId, (v) => { selectedId.value = v; });

const exportOpen = ref(false);

const projectName = ref('');
const renaming = ref(false);
const nameError = ref('');
const showRenamePopover = ref(false);

function openRenamePopover() {
  // keep behavior simple: populate with current project name
  projectName.value = store.getCurrentProject()?.name || '';
  nameError.value = '';
  renaming.value = false;
  showRenamePopover.value = true;
  setTimeout(() => {
    try { (document.getElementById('renameInput') as HTMLInputElement | null)?.focus(); } catch {}
  }, 0);
}

function closeRenamePopover() {
  showRenamePopover.value = false;
  nameError.value = '';
}

async function saveRenameFromPopover() {
  const proj = store.getCurrentProject();
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
  const duplicate = state.order.some(id => id !== proj.id && (state.projects.get(id)?.name || '').toLowerCase() === name.toLowerCase());
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
    showRenamePopover.value = false;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('saveRenameFromPopover failed', e);
    proj.name = prevName;
    store.addToast('Failed to rename project', 'warn');
    nameError.value = 'Save failed';
  } finally {
    renaming.value = false;
  }
}

function onProjectChange(e: Event) {
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
        console.warn('onProjectChange: project not found after loadProjectById', val);
      }
    } catch (err) {
      console.error('onProjectChange loadProjectById failed', err);
      state.currentId = prevId;
      store.addToast('Failed to load project; reverted selection', 'warn');
    }
  }).catch(err => {
    console.error('onProjectChange refreshMetaBar failed', err);
    state.currentId = prevId;
    store.addToast('Failed to refresh project list; reverted selection', 'warn');
  });
}

async function onNewProject() {
  const name = prompt('Project name?') || 'Untitled';
  store.createProject(name);
  try { await (store.saveCurrentProject?.()); } catch (e) { console.error('Failed to save new project', e); }
  try { await store.refreshMetaBar(); } catch (e) { console.error(e); }
}

function openProjectSettings() {
  const el = document.getElementById('projectSettingsModal') as HTMLDialogElement | null;
  el?.showModal();
}

function openSettings() {
  const el = document.getElementById('settingsModal') as HTMLDialogElement | null;
  el?.showModal();
}

function openHelp() {
  const el = document.getElementById('helpModal') as HTMLDialogElement | null;
  el?.showModal();
}

function saveProject() {
  store.saveCurrentProject();
}

function exportProjectJson() {
  try {
    store.exportProject();
  } catch (e) {
    console.error('exportProjectJson failed', e);
  } finally {
    exportOpen.value = false;
  }
}
function exportProjectZip() {
  try {
    (store as any).exportProjectZip?.();
  } catch (e) {
    console.error('exportProjectZip failed', e);
  } finally {
    exportOpen.value = false;
  }
}
</script>
