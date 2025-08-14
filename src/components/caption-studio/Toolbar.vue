<template>
  <div class="toolbar">
    <!-- Project Section -->
    <div class="toolbar-section toolbar-section--project">
      <div class="project-selector-wrapper">
        <select 
          id="projectSelect" 
          ref="projectSelect" 
          v-model="selectedId" 
          @change="onProjectChange" 
          :disabled="state.order.length === 0"
          class="project-select">
          <option v-if="state.order.length === 0" disabled value="">
            {{ state.showWelcomeModal ? 'No project — use the Welcome screen' : 'No projects' }}
          </option>
          <option v-for="id in state.order" :key="id" :value="id">
            {{ state.projects.get(id)?.name || id }}
          </option>
        </select>
        <button 
          id="renameBtn" 
          class="btn btn--icon btn--small" 
          @click="openRenamePopover" 
          title="Rename project"
          :disabled="!selectedId">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        <!-- Rename Popover -->
        <div 
          v-if="showRenamePopover" 
          class="rename-popover"
          @click.stop>
          <div class="rename-popover__content">
            <input 
              id="renameInput" 
              type="text" 
              v-model="projectName" 
              :disabled="renaming" 
              @keydown.enter.prevent="saveRenameFromPopover" 
              @keydown.esc.prevent="closeRenamePopover"
              placeholder="Project name" 
              class="rename-input" />
            <div class="rename-actions">
              <button class="btn btn--small" @click="closeRenamePopover" :disabled="renaming">Cancel</button>
              <button class="btn btn--small btn--primary" @click="saveRenameFromPopover" :disabled="renaming">
                <span v-if="renaming">Saving…</span>
                <span v-else>Save</span>
              </button>
            </div>
            <div v-if="nameError" class="rename-error">{{ nameError }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Primary Actions Section -->
    <div class="toolbar-section toolbar-section--primary">
      <button class="btn btn--primary" id="newProjectBtn" @click="onNewProject">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span class="btn__text">New Project</span>
      </button>

      <button class="btn btn--primary" id="openBtn" @click="pickFiles">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="btn__text">Add Media</span>
      </button>

      <button class="btn btn--accent" id="autoBtn" @click="store.autoCaptionBulk">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
        <span class="btn__text">Auto Caption</span>
      </button>
    </div>

    <!-- Search Section -->
    <div class="toolbar-section toolbar-section--search">
      <div class="search-wrapper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input 
          type="search" 
          ref="searchBox" 
          id="searchBox" 
          v-model="state.filter.text" 
          placeholder="Search captions or files" 
          class="search-input" />
      </div>
    </div>

    <!-- Secondary Actions Section -->
    <div class="toolbar-section toolbar-section--secondary">
      <button class="btn" id="importJsonBtn" @click="triggerJsonImport">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span class="btn__text">Import</span>
      </button>

      <button class="btn" id="saveBtn" @click="saveProject">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17,21 17,13 7,13 7,21"/>
          <polyline points="7,3 7,8 15,8"/>
        </svg>
        <span class="btn__text">Save</span>
      </button>

      <div class="export-dropdown">
        <button class="btn" id="exportBtn" @click="exportOpen = !exportOpen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9"/>
            <polyline points="7,14 12,9 17,14"/>
            <line x1="12" y1="9" x2="12" y2="21"/>
          </svg>
          <span class="btn__text">Export</span>
        </button>
        <div v-if="exportOpen" class="dropdown-menu dropdown-menu--right">
          <button class="dropdown-item" @click="exportProjectJson">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            JSON
          </button>
          <button class="dropdown-item" @click="exportProjectZip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 22h2a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/>
              <polyline points="14,2 14,8 20,8"/>
              <path d="M10 20v-1a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0Z"/>
              <path d="M10 7h4"/>
              <path d="M10 12h4"/>
            </svg>
            Zip (images + txt)
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu Toggle -->
    <div class="toolbar-section toolbar-section--mobile-toggle">
      <button class="btn btn--icon mobile-menu-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Mobile Menu -->
    <div v-if="mobileMenuOpen" class="mobile-menu">
      <div class="mobile-menu__content">
        <button class="mobile-menu__item" @click="() => { triggerJsonImport(); mobileMenuOpen = false; }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Import JSON
        </button>

        <button class="mobile-menu__item" @click="() => { saveProject(); mobileMenuOpen = false; }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>
          Save Project
        </button>

        <div class="mobile-menu__divider"></div>

        <button class="mobile-menu__item" @click="() => { exportProjectJson(); mobileMenuOpen = false; }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          Export JSON
        </button>

        <button class="mobile-menu__item" @click="() => { exportProjectZip(); mobileMenuOpen = false; }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 22h2a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/>
            <polyline points="14,2 14,8 20,8"/>
            <path d="M10 20v-1a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0Z"/>
            <path d="M10 7h4"/>
            <path d="M10 12h4"/>
          </svg>
          Export Zip
        </button>

        <div class="mobile-menu__divider"></div>

        <button 
          class="mobile-menu__item"
          :class="{ 'mobile-menu__item--active': state.curationMode }"
          @click="() => { 
            if (state.curationMode) { 
              openCurationExitConfirm(); 
            } else { 
              store.startCuration(); 
            } 
            mobileMenuOpen = false; 
          }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Curation Mode
          <span v-if="state.curationMode" class="curation-counts">
            <span class="curation-accepted">✓ {{ curationCounts.accepted }}</span>
            <span class="curation-rejected">✕ {{ curationCounts.rejected }}</span>
            <span>{{ curationCounts.remaining }} left</span>
          </span>
        </button>

        <button class="mobile-menu__item" @click="() => { openProjectSettings(); mobileMenuOpen = false; }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Project Settings
        </button>

        <button class="mobile-menu__item" @click="() => { openSettings(); mobileMenuOpen = false; }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6"/>
            <path d="m1 12 6 0m6 0 6 0"/>
            <path d="M13.5 3.5 11 6M6 13.5l-2.5-2.5M16.5 20.5 14 18M18 6l-2.5 2.5"/>
          </svg>
          Settings
        </button>

        <button class="mobile-menu__item" @click="() => { openHelp(); mobileMenuOpen = false; }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Help
        </button>
      </div>
    </div>

    <!-- Desktop-only tertiary actions -->
    <div class="toolbar-section toolbar-section--tertiary">
      <button 
        class="btn"
        :class="{ 'btn--active': state.curationMode }"
        id="curationBtn"
        @click="() => { if (state.curationMode) { openCurationExitConfirm(); } else { store.startCuration(); } }"
        title="Curation mode (swipe to accept/reject)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span class="btn__text">Curation</span>
        <span v-if="state.curationMode" class="curation-badge">
          <span class="curation-accepted">✓{{ curationCounts.accepted }}</span>
          <span class="curation-rejected">✕{{ curationCounts.rejected }}</span>
          <span class="curation-remaining">{{ curationCounts.remaining }} left</span>
        </span>
      </button>

      <button class="btn" id="projectSettingsBtn" @click="openProjectSettings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span class="btn__text">Project Settings</span>
      </button>

      <button class="btn" id="settingsBtn" @click="openSettings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6"/>
          <path d="m1 12 6 0m6 0 6 0"/>
          <path d="M13.5 3.5 11 6M6 13.5l-2.5-2.5M16.5 20.5 14 18M18 6l-2.5 2.5"/>
        </svg>
        <span class="btn__text">Settings</span>
      </button>

      <button class="btn btn--ghost" id="helpBtn" @click="openHelp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span class="btn__text">Help</span>
      </button>
    </div>

    <!-- Status Badge -->
    <div class="toolbar-section toolbar-section--status">
      <span class="status-badge">{{ state.status }}</span>
    </div>

    <!-- Hidden file inputs -->
    <input ref="folderInput" id="folderInput" accept="image/*,video/*,.txt" multiple webkitdirectory directory type="file" class="hidden" @change="onFolderPicked" />
    <input ref="filesInput" id="filesInput" accept="image/*,video/*,.txt" multiple type="file" class="hidden" @change="onFilesPicked" />
    <input ref="jsonInput" id="jsonInput" accept="application/json" class="hidden" type="file" @change="onImportJson" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
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
const exportOpen = ref(false);
const mobileMenuOpen = ref(false);

// Rename functionality
const projectName = ref('');
const renaming = ref(false);
const nameError = ref('');
const showRenamePopover = ref(false);

watch(() => state.currentId, (v) => { selectedId.value = v; });

// Close dropdowns when clicking outside
function handleClickOutside(e: Event) {
  if (!((e.target as Element)?.closest?.('.export-dropdown'))) {
    exportOpen.value = false;
  }
  if (!((e.target as Element)?.closest?.('.mobile-menu, .mobile-menu-toggle'))) {
    mobileMenuOpen.value = false;
  }
  if (!((e.target as Element)?.closest?.('.rename-popover, .project-selector-wrapper button'))) {
    closeRenamePopover();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function openRenamePopover() {
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
  // Respect prompt cancellation: prompt() returns null when the user cancels.
  const resp = prompt('Project name?');
  if (resp === null) return; // user cancelled — do not create a project

  const name = (resp || '').trim() || 'Untitled';
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

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(11,15,20,.75);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  min-height: 60px;
  overflow-x: auto;
}

/* Responsive breakpoints */
@media (max-width: 1200px) {
  .toolbar-section--primary,
  .toolbar-section--tertiary,
  .toolbar-section--status {
    display: none;
  }
  
  .toolbar-section--mobile-toggle {
    display: flex;
  }
}

@media (max-width: 768px) {
  .toolbar {
    gap: 8px;
  }
  
  .toolbar-section--search,
  .toolbar-section--secondary {
    display: none;
  }
}

/* Section layouts */
.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

.toolbar-section--project {
  flex-shrink: 0;
  min-width: 200px;
}

.toolbar-section--primary {
  flex-shrink: 0;
}

.toolbar-section--search {
  flex: 1;
  max-width: 400px;
  min-width: 200px;
  justify-content: center;
}

.toolbar-section--secondary {
  flex-shrink: 0;
}

.toolbar-section--tertiary {
  flex-shrink: 0;
}

.toolbar-section--status {
  flex-shrink: 0;
  margin-left: auto;
}

.toolbar-section--mobile-toggle {
  display: none;
  flex-shrink: 0;
}

/* Project selector */
.project-selector-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.project-select {
  min-width: 140px;
  max-width: 220px;
  background: var(--muted);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 0.25s;
  flex-shrink: 1;
}

.project-select:focus {
  outline: none;
  border-color: var(--brand);
}

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--muted);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  text-decoration: none;
  min-height: 36px;
}

.btn:hover {
  border-color: var(--brand);
  background: color-mix(in srgb, var(--muted) 80%, var(--brand) 20%);
}

.btn:focus {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 80%, #000 20%));
  border-color: var(--brand);
  color: white;
}

.btn--primary:hover {
  background: linear-gradient(180deg, 
    color-mix(in srgb, var(--brand) 90%, white 10%), 
    color-mix(in srgb, var(--brand) 70%, #000 30%)
  );
}

.btn--accent {
  background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #000 20%));
  border-color: var(--accent);
  color: white;
}

.btn--accent:hover {
  background: linear-gradient(180deg, 
    color-mix(in srgb, var(--accent) 90%, white 10%), 
    color-mix(in srgb, var(--accent) 70%, #000 30%)
  );
}

.btn--ghost {
  background: transparent;
  border-color: transparent;
}

.btn--ghost:hover {
  background: var(--muted);
  border-color: var(--border);
}

.btn--active {
  background: color-mix(in srgb, var(--brand) 20%, var(--muted) 80%);
  border-color: var(--brand);
}

.btn--icon {
  padding: 8px;
  min-width: 36px;
  justify-content: center;
}

.btn--small {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 32px;
}

.btn--small.btn--icon {
  padding: 6px;
  min-width: 32px;
}

.btn__text {
  white-space: nowrap;
}

/* Search */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 300px;
  min-width: 180px;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-dim);
  pointer-events: none;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 40px;
  background: var(--muted);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: border-color 0.25s;
}

.search-input:focus {
  outline: none;
  border-color: var(--brand);
}

.search-input::placeholder {
  color: var(--text-dim);
}

/* Dropdowns */
.export-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  margin-top: 4px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  z-index: 1000;
  min-width: 160px;
  padding: 4px;
}

.dropdown-menu--right {
  right: 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.dropdown-item:hover {
  background: var(--muted);
}

/* Rename popover */
.rename-popover {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 1200;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  padding: 12px;
  min-width: 300px;
}

.rename-popover__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rename-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--muted);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.rename-input:focus {
  outline: none;
  border-color: var(--brand);
}

.rename-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.rename-error {
  color: var(--danger);
  font-size: 12px;
}

/* Mobile menu */
.mobile-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  z-index: 1000;
  min-width: 220px;
}

.mobile-menu__content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-menu__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
  text-align: left;
}

.mobile-menu__item:hover {
  background: var(--muted);
}

.mobile-menu__item--active {
  background: color-mix(in srgb, var(--brand) 15%, var(--muted) 85%);
  color: var(--brand);
}

.mobile-menu__divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

/* Curation styling */
.curation-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-left: 8px;
}

.curation-counts {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-left: auto;
}

.curation-accepted {
  color: var(--ok);
}

.curation-rejected {
  color: var(--danger);
}

.curation-remaining {
  color: var(--text-dim);
}

/* Status badge */
.status-badge {
  background: var(--muted);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}

/* Responsive text hiding */
@media (max-width: 1400px) {
  .btn__text {
    display: none;
  }
  
  .btn--primary .btn__text,
  .btn--accent .btn__text {
    display: inline;
  }
  
  .curation-badge {
    display: none;
  }
  
  .toolbar-section--project {
    min-width: 160px;
  }
}

@media (max-width: 1100px) {
  .btn__text {
    display: none;
  }
  
  .toolbar-section--project {
    min-width: 140px;
  }
  
  .search-wrapper {
    min-width: 150px;
  }
  
  .project-select {
    min-width: 120px;
  }
}

@media (max-width: 900px) {
  .toolbar {
    gap: 6px;
  }
  
  .toolbar-section {
    gap: 6px;
  }
}

/* Ensure proper icon sizing */
svg {
  flex-shrink: 0;
}

/* Hide elements properly */
.hidden {
  display: none !important;
}
</style>
