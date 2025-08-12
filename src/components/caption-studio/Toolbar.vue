<template>
  <div class="toolbar topbar" role="toolbar" aria-label="Caption Studio toolbar">
    <!-- LEFT: Brand + Project selector -->
    <div class="topbar-left">
      <div class="brand" title="Caption Studio">
        <div class="cs-logo-wrap" aria-hidden>
          <img src="/cs-icon.svg" alt="" class="cs-logo" />
        </div>
        <ProjectSelect />
      </div>
    </div>

    <!-- CENTER: Add group + Search -->
    <div class="topbar-center">
      <div class="segmented-group" ref="addGroup">
        <button class="btn small" @click="openNewProjectModal" title="New project" aria-haspopup="dialog"><svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/></svg> New</button>

        <div class="dropdown-wrap">
          <button class="btn small" @click="toggleAddOpen" :aria-expanded="addOpen" aria-haspopup="menu" title="Add media or captions">
            <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/></svg> Add
            <span class="caret" :class="{ open: addOpen }">▾</span>
          </button>
          <div v-if="addOpen" class="dropdown-panel" @click.stop>
            <button class="btn" @click="onNewProjectFromAdd">New Project</button>
            <button class="btn" @click="pickFiles">Add Media + Captions</button>
            <button class="btn" @click="triggerJsonImport">Import JSON</button>
          </div>
        </div>

        <div class="dropdown-wrap">
          <button class="btn small" @click="toggleExportOpen" :aria-expanded="exportOpen" aria-haspopup="menu" title="Export">
            <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v6h6.66V9h3.84L12 2z"/></svg> Export <span class="caret" :class="{ open: exportOpen }">▾</span>
          </button>
          <div v-if="exportOpen" class="dropdown-panel export-panel" @click.stop>
            <button class="btn" @click="exportProjectJson">Export JSON</button>
            <button class="btn" @click="exportProjectZip">Export ZIP (images + txt)</button>
          </div>
        </div>
      </div>

      <!-- hidden inputs controlled by file picker composable -->
      <input ref="folderInput" id="folderInput" accept="image/*,video/*,.txt" multiple webkitdirectory directory type="file" class="hidden" @change="onFolderPicked" />
      <input ref="filesInput" id="filesInput" accept="image/*,video/*,.txt" multiple type="file" class="hidden" @change="onFilesPicked" />
      <input ref="jsonInput" id="jsonInput" accept="application/json" class="hidden" type="file" @change="onImportJson" />

      <div class="search-wrap" ref="searchWrap">
        <input type="search" ref="searchBox" id="searchBox" v-model="state.filter.text" placeholder="Search captions or file names" class="search-input" aria-label="Search captions or file names" />
        <button v-if="state.filter.text" class="icon-btn" @click="clearSearch" title="Clear search" aria-label="Clear search">
          <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 6 L18 18 M6 18 L18 6"/></svg>
        </button>
        <div class="hint">⌘K</div>
      </div>
    </div>

    <!-- RIGHT: Actions -->
    <div class="topbar-right">
      <button class="btn primary" id="autoBtn" @click="store.autoCaptionBulk" title="Auto caption selected media"><svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14 10.5 9.5 6 8l4.5-1.5L12 2z"/></svg> Auto Caption</button>

      <button
        class="btn"
        id="curationBtn"
        :class="{ primary: state.curationMode }"
        @click="toggleCuration"
        title="Curation mode (swipe to accept/reject)"
        :aria-pressed="state.curationMode">
        <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2l4 8h-8l4-8zm0 20l-4-8h8l-4 8z"/></svg>
        Curation
        <span v-if="state.curationMode" class="curation-counts">
          <span class="accepted"><svg class="icon-svg" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path fill="none" stroke="#7dd3a6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.5 L10 17 L20 6"/></svg> {{ curationCounts.accepted }}</span>
          <span class="rejected"><svg class="icon-svg" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path fill="none" stroke="#ff7b7b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M6 6 L18 18 M6 18 L18 6"/></svg> {{ curationCounts.rejected }}</span>
          <span class="remaining"><svg class="icon-svg" viewBox="0 0 24 24" width="6" height="6" aria-hidden="true" focusable="false"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg> {{ curationCounts.remaining }}</span>
        </span>
      </button>

      <button class="icon-btn" id="projectSettingsBtn" @click="openProjectSettings" title="Project settings" aria-label="Project settings">
        <svg class="icon-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 2.5l-1.12-.2a7.05 7.05 0 00-.6-1.45l.66-.92-1.4-1.4-.92.66c-.46-.23-.95-.4-1.45-.6l-.2-1.12H9.8l-.2 1.12c-.5.2-.99.37-1.45.6l-.92-.66-1.4 1.4.66.92c-.23.46-.4.95-.6 1.45l-1.12.2v2.8l1.12.2c.2.5.37.99.6 1.45l-.66.92 1.4 1.4.92-.66c.46.23.95.4 1.45.6l.2 1.12h4.4l.2-1.12c.5-.2.99-.37 1.45-.6l.92.66 1.4-1.4-.66-.92c.23-.46.4-.95.6-1.45l1.12-.2v-2.8z"/></svg>
      </button>

      <button class="icon-btn" id="settingsBtn" @click="openSettings" title="Settings" aria-label="Settings"><svg class="icon-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zM4 12a8 8 0 1116 0 8 8 0 01-16 0z"/></svg></button>

      <button class="icon-btn ghost" id="helpBtn" @click="openHelp" title="Help" aria-label="Help"><svg class="icon-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h2v-.5c0-.8.45-1.2 1.17-1.95.76-.78 1.33-1.72 1.33-2.55 0-1.66-1.34-3-3-3s-3 1.34-3 3H8c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.66-.96 3.03-2.93 4.25z"/></svg></button>

      <span class="badge status-badge" id="statusBadge" title="Project status">{{ state.status }}</span>

      <!-- More overflow menu for narrow screens -->
      <div class="dropdown-wrap more-wrap">
        <button class="icon-btn" @click="toggleMore" aria-haspopup="menu" :aria-expanded="moreOpen" title="More"><svg class="icon-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/></svg></button>
        <div v-if="moreOpen" class="dropdown-panel" @click.stop>
          <button class="btn" @click="openProjectSettings">Project Settings</button>
          <button class="btn" @click="openSettings">Settings</button>
          <button class="btn" @click="openHelp">Help</button>
          <button class="btn" @click="exportProjectJson">Export JSON</button>
        </div>
      </div>
    </div>

    <!-- New Project modal -->
    <NewProjectModal v-if="showNewProjectModal" @create="createProjectFromModal" @close="showNewProjectModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { useFilePicker } from '../../composables/useFilePicker';
import { useCuration } from '../../composables/useCuration';
import NewProjectModal from './modals/NewProjectModal.vue';
import ProjectSelect from './ProjectSelect.vue';

const store = useProjectStore();
const { state } = store;

const { filesInput, folderInput, jsonInput, pickFiles, triggerJsonImport, onFilesPicked, onFolderPicked, onImportJson } = useFilePicker();
const { curationCounts, openCurationExitConfirm } = useCuration();

const projectSelect = ref<HTMLSelectElement | null>(null);
const searchBox = ref<HTMLInputElement | null>(null);
const selectedId = ref<string | null>(state.currentId);
watch(() => state.currentId, (v) => { selectedId.value = v; });

const exportOpen = ref(false);
const addOpen = ref(false);
const moreOpen = ref(false);

const showNewProjectModal = ref(false);


function openNewProjectModal() {
  showNewProjectModal.value = true;
}
async function createProjectFromModal(name: string) {
  showNewProjectModal.value = false;
  if (!name) return;
  store.createProject(name);
  try { await store.saveCurrentProject?.(); } catch (e) { console.error('Failed to save new project', e); }
  try { await store.refreshMetaBar(); } catch (e) { console.error(e); }
}

function onNewProjectFromAdd() {
  // keep behavior: open the modal
  openNewProjectModal();
  addOpen.value = false;
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


function exportProjectJson() {
  try {
    store.exportProject();
  } catch (e) {
    console.error('exportProjectJson failed', e);
  } finally {
    exportOpen.value = false;
    addOpen.value = false;
    moreOpen.value = false;
  }
}
function exportProjectZip() {
  try {
    (store as any).exportProjectZip?.();
  } catch (e) {
    console.error('exportProjectZip failed', e);
  } finally {
    exportOpen.value = false;
    addOpen.value = false;
    moreOpen.value = false;
  }
}

function toggleExportOpen() { exportOpen.value = !exportOpen.value; addOpen.value = false; moreOpen.value = false; }
function toggleAddOpen() { addOpen.value = !addOpen.value; exportOpen.value = false; moreOpen.value = false; }
function toggleMore() { moreOpen.value = !moreOpen.value; exportOpen.value = false; addOpen.value = false; }

function clearSearch() { state.filter.text = ''; (searchBox.value as HTMLInputElement | null)?.focus(); }

function toggleCuration() {
  if (state.curationMode) {
    openCurationExitConfirm();
  } else {
    store.startCuration();
  }
}


/* Close dropdowns on outside click */
function handleDocClick(e: MouseEvent) {
  const path = e.composedPath?.() || (e as any).path || [];
  // If click happens outside toolbar, close all
  if (!path.some((el: any) => el === (projectSelect.value as any) || el === (document.querySelector('.topbar') as any))) {
    exportOpen.value = false;
    addOpen.value = false;
    moreOpen.value = false;
  }
}

function handleKeyDown(e: KeyboardEvent) {
  // Close panels / modals on Escape
  if (e.key === 'Escape') {
    exportOpen.value = false;
    addOpen.value = false;
    moreOpen.value = false;
    showNewProjectModal.value = false;
  }
  // Cmd/Ctrl+K focuses the search box
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    (searchBox.value as HTMLInputElement | null)?.focus();
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocClick);
  document.addEventListener('keydown', handleKeyDown);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* Layout */
.topbar { display:flex; gap:12px; align-items:center; padding:10px; width:100%; flex-wrap:wrap; }
.topbar-left { display:flex; align-items:center; gap:12px; min-width:120px; flex: 0 0 auto; }
.topbar-center { display:flex; flex:1 1 auto; align-items:center; gap:12px; justify-content:center; min-width:0; overflow:visible; }
.topbar-right { display:flex; align-items:center; gap:8px; margin-left:auto; flex: 0 0 auto; }

/* Project select */
.project-select { display:flex; align-items:center; gap:8px; min-width:0; }
.project-label { display:flex; align-items:center; gap:8px; }
.project-name { font-size:14px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.input-inline { padding:6px 8px; border-radius:8px; border:1px solid var(--border); background:var(--muted); color:var(--text); min-width:180px; }
.rename-error { color: var(--warn); font-size:12px; margin-left:8px; }

/* Segmented group */
.segmented-group { display:inline-flex; gap:6px; align-items:center; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02)); padding:4px; border-radius:10px; border:1px solid var(--border); }
.segmented-group .btn.small { padding:6px 10px; height:34px; border-radius:8px; }

/* Search */
.search-wrap { position:relative; flex: 1 1 220px; min-width:120px; max-width:60%; display:flex; align-items:center; gap:8px; overflow:hidden; }
.search-input { width:100%; padding:8px 12px; border-radius:10px; border:1px solid var(--border); background:var(--muted); color:var(--text); transition: box-shadow .12s ease, border-color .12s ease; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.search-input:focus { border-color: var(--brand); outline:none; box-shadow: 0 8px 30px rgba(47,79,168,0.12); }
.search-wrap .icon-btn { position:absolute; right:8px; background:transparent; border:0; color:var(--text-dim); }
.search-wrap .hint { margin-left:8px; color:var(--text-dim); font-size:12px; white-space:nowrap; }

/* Dropdowns */
.dropdown-wrap { position:relative; display:inline-block; }
.dropdown-panel { position:absolute; top:42px; right:0; min-width:200px; background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:8px; box-shadow:0 10px 30px rgba(0,0,0,0.55); z-index:1200; display:flex; flex-direction:column; gap:8px; transform-origin:top right; animation: dropdown-in .12s ease both; }
.dropdown-panel.export-panel { right:0; left:auto; }
@keyframes dropdown-in { from { opacity:0; transform: translateY(-6px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }
.caret { margin-left:8px; transition: transform .18s ease; }
.caret.open { transform:rotate(180deg); }

/* Buttons and icons */
.btn, .icon-btn { transition: transform .12s ease, box-shadow .12s ease, background-color .12s ease; }
.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
.icon-btn { background:transparent; border:1px solid transparent; padding:6px; border-radius:8px; color:var(--text); display:inline-flex; align-items:center; justify-content:center; }
.icon-btn:hover { background:var(--muted-contrast); border-color:var(--border); }

/* Focus styles for accessibility */
.icon-btn:focus-visible, .btn:focus-visible, .input-inline:focus-visible, .search-input:focus-visible, select:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
  border-color: var(--brand);
}

/* SVG icons */
.icon-svg { display:inline-block; vertical-align:middle; color:var(--text); }

/* Primary style */
.btn.primary { background: linear-gradient(180deg, #0f1720, #0b1318); border:1px solid rgba(255,255,255,0.03); box-shadow: 0 6px 20px rgba(0,0,0,0.45); }

/* Curation counts */
.curation-counts { margin-left:6px; font-size:12px; color:var(--text-dim); display:inline-flex; gap:6px; align-items:center; }
.curation-counts .accepted { color:#7dd3a6 }
.curation-counts .rejected { color:#ff7b7b }

/* Status badge */
.status-badge { padding:6px 10px; border-radius:999px; background:var(--muted); border:1px solid var(--border); color:var(--text-dim); font-size:13px; }

/* Responsive behavior */
@media (max-width: 980px) {
  .search-wrap { width:320px; max-width:40%; }
  .topbar-left { min-width:160px; }
}

/* Mid breakpoint: move non-essential actions into More earlier to avoid overlap */
@media (max-width: 900px) {
  .topbar-center { justify-content:flex-start; }
  .topbar-right .icon-btn#projectSettingsBtn,
  .topbar-right .icon-btn#settingsBtn,
  .topbar-right .icon-btn#helpBtn,
  .topbar-right .status-badge { display:none; }
  .more-wrap { display:block; }
}

/* Small screens: keep existing rules */
@media (max-width: 680px) {
  .topbar { gap:8px; padding:8px; }
  .search-wrap { display:none; }
  .segmented-group { display:none; } /* hide segmented actions on small screens */
  .topbar-center { justify-content:flex-start; }
  .more-wrap { display:block; }

  /* Move less-used actions into "More" by hiding them on small screens */
  .topbar-right .icon-btn#projectSettingsBtn,
  .topbar-right .icon-btn#settingsBtn,
  .topbar-right .icon-btn#helpBtn,
  .topbar-right .status-badge { display:none; }
}

/* Small tweak for very small screens */
@media (max-width: 420px) {
  .topbar-left { min-width:120px; }
  .search-wrap { display:none; }
  .segmented-group { display:none; }
}
</style>
