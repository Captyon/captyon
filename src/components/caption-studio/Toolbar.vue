<template>
  <div class="toolbar">
    <!-- Primary Section: Core Actions -->
    <div class="toolbar-section toolbar-section--primary">
      <!-- Project Management -->
      <div class="project-group">
        <div class="project-selector-wrapper">
          <select 
            v-model="selectedId" 
            @change="onProjectChange" 
            :disabled="state.order.length === 0"
            class="project-select"
            title="Select active project">
            <option v-if="state.order.length === 0" disabled value="">
              {{ state.showWelcomeModal ? 'No project — use Welcome screen' : 'No projects' }}
            </option>
            <option v-for="id in state.order" :key="id" :value="id">
              {{ state.projects.get(id)?.name || id }}
            </option>
          </select>
          <button 
            class="btn btn--icon btn--ghost" 
            @click="openRenamePopover" 
            title="Rename project"
            :disabled="!selectedId">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>

        <!-- Rename Popover -->
        <div v-if="showRenamePopover" class="rename-popover" @click.stop>
          <div class="rename-popover__content">
            <input 
              type="text" 
              v-model="projectName" 
              :disabled="renaming" 
              @keydown.enter.prevent="saveRenameFromPopover" 
              @keydown.esc.prevent="closeRenamePopover"
              placeholder="Project name" 
              class="rename-input" 
              ref="renameInputRef" />
            <div class="rename-actions">
              <button class="btn btn--small btn--ghost" @click="closeRenamePopover" :disabled="renaming">Cancel</button>
              <button class="btn btn--small btn--primary" @click="saveRenameFromPopover" :disabled="renaming">
                {{ renaming ? 'Saving…' : 'Save' }}
              </button>
            </div>
            <div v-if="nameError" class="rename-error">{{ nameError }}</div>
          </div>
        </div>
      </div>

      <!-- Core Actions -->
      <div class="action-group">
        <button class="btn btn--primary" @click="onNewProject" title="Create new project">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <line x1="12" y1="13" x2="12" y2="19"/>
            <line x1="9" y1="16" x2="15" y2="16"/>
          </svg>
          <span class="btn__text">New Project</span>
        </button>

        <button class="btn btn--accent" @click="pickFiles" title="Add images or videos">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <span class="btn__text">Add Media</span>
        </button>

        <button class="btn btn--highlight" @click="store.autoCaptionBulk" title="Auto-generate captions with AI">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <span class="btn__text">Auto Caption</span>
        </button>
      </div>
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
          v-model="state.filter.text" 
          placeholder="Search captions or files" 
          class="search-input"
          ref="searchInputRef" />
        <button 
          v-if="state.filter.text" 
          @click="state.filter.text = ''"
          class="search-clear"
          title="Clear search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Secondary Actions -->
    <div class="toolbar-section toolbar-section--secondary">
      <!-- File Management -->
      <div class="action-group action-group--compact">
        <button class="btn btn--ghost" @click="triggerJsonImport" title="Import project data">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="btn__text">Import</span>
        </button>

        <button class="btn btn--ghost" @click="saveProject" title="Save current project">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>
          <span class="btn__text">Save</span>
        </button>

        <!-- Export Dropdown -->
        <div class="dropdown-wrapper" ref="exportDropdownRef">
          <button ref="exportBtnRef" class="btn btn--ghost" @click="toggleExportDropdown" title="Export project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9"/>
              <polyline points="7,14 12,9 17,14"/>
              <line x1="12" y1="9" x2="12" y2="21"/>
            </svg>
            <span class="btn__text">Export</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dropdown-arrow">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>
          <Teleport to="body">
            <div
              v-if="exportOpen"
              ref="exportMenuRef"
              class="dropdown-menu dropdown-menu--floating"
              :style="{ top: exportMenuPos.top + 'px', left: exportMenuPos.left + 'px' }"
            >
              <button class="dropdown-item" @click="exportProjectJson">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
                Export as JSON
              </button>
              <button class="dropdown-item" @click="exportProjectZip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M16 22h2a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <path d="M10 20v-1a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0Z"/>
                  <path d="M10 7h4"/>
                  <path d="M10 12h4"/>
                </svg>
                Export as ZIP
              </button>
            </div>
          </Teleport>
        </div>
      </div>

      <!-- Tools & Settings -->
      <div class="action-group action-group--compact">
        <button 
          class="btn"
          :class="{ 'btn--active': state.curationMode }"
          @click="toggleCuration"
          title="Curation mode - quickly accept/reject items">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span class="btn__text">Curation</span>
          <span v-if="state.curationMode && (curationCounts.accepted > 0 || curationCounts.rejected > 0)" class="curation-badge">
            <span class="curation-accepted">✓{{ curationCounts.accepted }}</span>
            <span class="curation-rejected">✕{{ curationCounts.rejected }}</span>
          </span>
        </button>

        <button class="btn btn--ghost" @click="openProjectSettings" title="Project settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span class="btn__text">Settings</span>
        </button>
      </div>

      <!-- More Menu (Mobile) -->
      <div class="mobile-menu-wrapper">
        <button class="btn btn--ghost mobile-menu-toggle" @click="toggleMobileMenu" title="More options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
            <circle cx="5" cy="12" r="1"/>
          </svg>
        </button>
        <div v-if="mobileMenuOpen" class="mobile-menu">
          <button class="mobile-menu-item" @click="() => { openSettings(); closeMobileMenu(); }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
              <path d="m1 12 6 0m6 0 6 0"/>
            </svg>
            App Settings
          </button>
          <button class="mobile-menu-item" @click="() => { openHelp(); closeMobileMenu(); }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Help & Support
          </button>
        </div>
      </div>
    </div>

    <!-- Status Display -->
    <div class="toolbar-section toolbar-section--status">
      <div class="status-group">
        <div class="status-badge">{{ state.status }}</div>
        <div v-if="state.curationMode && curationCounts.remaining > 0" class="curation-remaining">
          {{ curationCounts.remaining }} remaining
        </div>
      </div>
    </div>

    <!-- Hidden file inputs -->
    <input id="folderInput" ref="folderInput" accept="image/*,video/*,.txt" multiple webkitdirectory directory type="file" class="hidden" @change="onFolderPicked" />
    <input id="filesInput" ref="filesInput" accept="image/*,video/*,.txt" multiple type="file" class="hidden" @change="onFilesPicked" />
    <input id="jsonInput" ref="jsonInput" accept="application/json" class="hidden" type="file" @change="onImportJson" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { useFilePicker } from '../../composables/useFilePicker';
import { useCuration } from '../../composables/useCuration';

const props = defineProps<{
  onNewProject?: () => void;
}>();

const store = useProjectStore();
const { state } = store;

const { filesInput, folderInput, jsonInput, pickFiles, triggerJsonImport, onFilesPicked, onFolderPicked, onImportJson } = useFilePicker();
const { curationCounts, openCurationExitConfirm } = useCuration();

// Reactive refs
const selectedId = ref<string | null>(state.currentId);
const exportOpen = ref(false);
const mobileMenuOpen = ref(false);
const exportBtnRef = ref<HTMLElement | null>(null);
const exportMenuRef = ref<HTMLElement | null>(null);
const exportMenuPos = ref({ top: 0, left: 0 });

// Rename functionality
const projectName = ref('');
const renaming = ref(false);
const nameError = ref('');
const showRenamePopover = ref(false);
const renameInputRef = ref<HTMLInputElement | null>(null);

// Element refs
const searchInputRef = ref<HTMLInputElement | null>(null);
const exportDropdownRef = ref<HTMLElement | null>(null);

// Watchers
watch(() => state.currentId, (v) => { selectedId.value = v; });

function positionExportMenu() {
  const anchor = exportBtnRef.value || exportDropdownRef.value;
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const menuW = exportMenuRef.value?.offsetWidth ?? 200;
  exportMenuPos.value.top = Math.round(rect.bottom + 8);
  exportMenuPos.value.left = Math.round(rect.right - menuW);
}

function onReposition() {
  if (exportOpen.value) positionExportMenu();
}

// Event handlers for closing dropdowns
function handleClickOutside(e: Event) {
  const target = e.target as Element;
  
  // Close export dropdown
  if (exportOpen.value 
      && !exportDropdownRef.value?.contains(target)
      && !exportMenuRef.value?.contains(target)) {
    exportOpen.value = false;
  }
  
  // Close mobile menu
  if (mobileMenuOpen.value && !target.closest('.mobile-menu-wrapper')) {
    mobileMenuOpen.value = false;
  }
  
  // Close rename popover
  if (showRenamePopover.value && !target.closest('.project-group')) {
    closeRenamePopover();
  }
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  // Focus search with "/" key
  if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const activeElement = document.activeElement;
    if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInputRef.value?.focus();
    }
  }
  
  // Escape to close modals/dropdowns
  if (e.key === 'Escape') {
    exportOpen.value = false;
    mobileMenuOpen.value = false;
    if (showRenamePopover.value) {
      closeRenamePopover();
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition, true); // capture scroll on ancestors
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', onReposition);
  window.removeEventListener('scroll', onReposition, true);
});

// Project management functions
function openRenamePopover() {
  projectName.value = store.getCurrentProject()?.name || '';
  nameError.value = '';
  renaming.value = false;
  showRenamePopover.value = true;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
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
  
  const duplicate = state.order.some(id => 
    id !== proj.id && (state.projects.get(id)?.name || '').toLowerCase() === name.toLowerCase()
  );
  
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
  // Use the provided onNewProject prop if available, otherwise fallback to prompt
  if (props.onNewProject) {
    props.onNewProject();
    return;
  }

  // Fallback to prompt if no prop is provided
  const resp = prompt('Project name?');
  if (resp === null) return; // user cancelled
  
  const name = (resp || '').trim() || 'Untitled';
  store.createProject(name);
  
  try { 
    await store.saveCurrentProject(); 
  } catch (e) { 
    console.error('Failed to save new project', e); 
  }
  
  try { 
    await store.refreshMetaBar(); 
  } catch (e) { 
    console.error(e); 
  }
}

// UI state functions
function toggleExportDropdown() {
  exportOpen.value = !exportOpen.value;
  if (exportOpen.value) nextTick(positionExportMenu);
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

function toggleCuration() {
  if (state.curationMode) {
    openCurationExitConfirm();
  } else {
    store.startCuration();
  }
}

// Modal functions
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

// Project functions
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
/* Base Toolbar Layout */
.toolbar {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: linear-gradient(180deg, 
    rgba(35, 37, 39, 0.98) 0%, 
    rgba(26, 28, 31, 0.95) 100%
  );
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  min-height: 64px;
  position: relative;
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.toolbar::-webkit-scrollbar {
  display: none;
}

/* Toolbar Sections */
.toolbar-section {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 0;
}

.toolbar-section--primary {
  gap: 20px;
}

.toolbar-section--search {
  flex: 1;
  justify-content: center;
  max-width: 480px;
  min-width: 200px;
}

.toolbar-section--secondary {
  gap: 12px;
}

.toolbar-section--status {
  margin-left: auto;
}

/* Action Groups */
.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-group--compact {
  gap: 8px;
}

/* Project Management */
.project-group {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-select {
  min-width: 160px;
  max-width: 240px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.project-select:hover {
  border-color: rgba(255, 255, 255, 0.20);
  background: rgba(255, 255, 255, 0.08);
}

.project-select:focus-visible {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.project-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  text-decoration: none;
  min-height: 40px;
  position: relative;
}

.btn:hover {
  border-color: rgba(255, 255, 255, 0.20);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.btn:focus-visible {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.btn:active {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Button Variants */
.btn--primary {
  background: linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 85%, #000 15%));
  border-color: var(--brand);
  color: white;
  font-weight: 600;
}

.btn--primary:hover {
  background: linear-gradient(180deg, 
    color-mix(in srgb, var(--brand) 92%, white 8%), 
    color-mix(in srgb, var(--brand) 78%, #000 22%)
  );
  border-color: color-mix(in srgb, var(--brand) 92%, white 8%);
}

.btn--accent {
  background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 85%, #000 15%));
  border-color: var(--accent);
  color: white;
  font-weight: 600;
}

.btn--accent:hover {
  background: linear-gradient(180deg, 
    color-mix(in srgb, var(--accent) 92%, white 8%), 
    color-mix(in srgb, var(--accent) 78%, #000 22%)
  );
  border-color: color-mix(in srgb, var(--accent) 92%, white 8%);
}

.btn--highlight {
  background: linear-gradient(180deg, 
    rgba(139, 92, 246, 1), 
    rgba(99, 102, 241, 0.9)
  );
  border-color: rgba(139, 92, 246, 1);
  color: white;
  font-weight: 600;
}

.btn--highlight:hover {
  background: linear-gradient(180deg, 
    rgba(147, 107, 249, 1), 
    rgba(107, 114, 242, 0.95)
  );
  border-color: rgba(147, 107, 249, 1);
}

.btn--ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.06);
}

.btn--ghost:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

.btn--active {
  background: linear-gradient(180deg, 
    rgba(99, 102, 241, 0.2), 
    rgba(99, 102, 241, 0.1)
  );
  border-color: var(--brand);
  color: var(--brand);
}

.btn--icon {
  padding: 10px;
  min-width: 40px;
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
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 40px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  padding-right: 40px;
}

.search-input:focus-visible {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.08);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-clear {
  position: absolute;
  right: 8px;
  padding: 4px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

/* Dropdowns */
.dropdown-wrapper {
  position: relative;
}

.dropdown-arrow {
  margin-left: 4px;
  transition: transform 0.2s ease;
}

.dropdown-wrapper:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: rgba(15, 20, 26, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  min-width: 180px;
  padding: 8px;
  animation: dropdownIn 0.15s ease-out;
}

/* Escape stacking-context jail */
.dropdown-menu--floating {
  position: fixed;
  z-index: 2147483647;
  width: auto;
  min-width: 180px;
  max-width: 250px;
}

@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Rename popover */
.rename-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 1200;
  background: rgba(15, 20, 26, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 16px;
  min-width: 320px;
  animation: dropdownIn 0.15s ease-out;
}

.rename-popover__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rename-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.rename-input:focus-visible {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.08);
}

.rename-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.rename-error {
  color: #ff6b6b;
  font-size: 12px;
  font-weight: 500;
}

/* Mobile menu */
.mobile-menu-wrapper {
  position: relative;
}

.mobile-menu-toggle {
  display: none;
}

.mobile-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: rgba(15, 20, 26, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  min-width: 200px;
  padding: 8px;
  animation: dropdownIn 0.15s ease-out;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  text-align: left;
}

.mobile-menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Curation styling */
.curation-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
}

.curation-accepted {
  color: #51cf66;
}

.curation-rejected {
  color: #ff6b6b;
}

/* Status */
.status-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.curation-remaining {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .toolbar {
    gap: 12px;
    padding: 12px 16px;
  }
  
  .toolbar-section--primary {
    gap: 16px;
  }
  
  .action-group {
    gap: 8px;
  }
  
  .btn__text {
    display: none;
  }
  
  .btn--primary .btn__text,
  .btn--accent .btn__text,
  .btn--highlight .btn__text {
    display: inline;
  }
}

@media (max-width: 900px) {
  .toolbar {
    gap: 10px;
    padding: 10px 12px;
  }
  
  .toolbar-section--search {
    max-width: 240px;
    min-width: 160px;
  }
  
  .project-select {
    min-width: 140px;
    max-width: 180px;
  }
  
  .btn__text {
    display: none;
  }
  
  .mobile-menu-toggle {
    display: inline-flex;
  }
  
  .action-group--compact .btn:not(.mobile-menu-toggle) {
    display: none;
  }
}

@media (max-width: 768px) {
  .toolbar-section--search {
    display: none;
  }
  
  .toolbar-section--secondary .action-group:first-child {
    display: none;
  }
}

@media (max-width: 640px) {
  .toolbar {
    gap: 8px;
    padding: 8px;
  }
  
  .project-select {
    min-width: 120px;
    max-width: 150px;
    font-size: 13px;
    padding: 8px 10px;
  }
  
  .btn {
    padding: 8px 10px;
    min-height: 36px;
  }
  
  .btn--icon {
    padding: 8px;
    min-width: 36px;
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

/* Animation for state changes */
.btn {
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}
</style>

<style>
/* Global styles for teleported dropdown to escape CSS scoping */
.dropdown-menu--floating {
  background: rgba(15, 20, 26, 0.98) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  padding: 8px !important;
  animation: dropdownIn 0.15s ease-out !important;
  font-family: inherit !important;
}

.dropdown-menu--floating .dropdown-item {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  width: 100% !important;
  padding: 10px 12px !important;
  background: transparent !important;
  border: none !important;
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  border-radius: 6px !important;
  transition: background-color 0.15s ease !important;
  text-align: left !important;
  white-space: nowrap !important;
}

.dropdown-menu--floating .dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}

.dropdown-menu--floating svg {
  flex-shrink: 0 !important;
  stroke: currentColor !important;
}

@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
