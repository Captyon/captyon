<template>
  <section class="editor">
    <!-- Region Editor (when a region is selected) -->
    <div v-if="selectedRegion" class="region-editor">
      <div class="editor-header">
        <div class="header-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="region-icon">
            <rect x="3" y="3" width="18" height="14" rx="2" ry="2"/>
            <path d="m5 17 2-2 4 4 8-8"/>
          </svg>
          <h3 class="editor-title">Region Editor</h3>
        </div>
        <div class="header-actions">
          <button class="btn btn--success" @click="applyRegionEdits" title="Save region changes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            <span class="btn__text">Save Region</span>
          </button>
          <button class="btn btn--ghost" @click="clearRegionSelection" title="Cancel region editing">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            <span class="btn__text">Cancel</span>
          </button>
        </div>
      </div>

      <div class="editor-content">
        <div class="field-group">
          <label class="field-label">Region Title</label>
          <input
            type="text"
            v-model="regionTitle"
            placeholder="Enter a descriptive title for this region"
            class="title-input"
          />
        </div>

        <div class="field-group field-group--main">
          <label class="field-label">Region Caption</label>
          <textarea
            v-model="regionCaption"
            placeholder="Describe what you see in this region..."
            class="caption-textarea"
            rows="8"
          ></textarea>
        </div>

        <div class="editor-stats">
          <div class="stats-info">
            <span class="stat-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              {{ regionCaption.length }} characters
            </span>
            <span class="stat-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20"/>
                <path d="M8 18V6"/>
                <path d="M16 6v12"/>
              </svg>
              {{ (regionCaption.trim().match(/\S+/g) || []).length }} words
            </span>
            <span class="stat-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              ~{{ Math.ceil(regionCaption.length/4) }} tokens
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Item Editor -->
    <div v-else class="item-editor">
      <div class="editor-header">
        <div class="header-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="editor-icon">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <h3 class="editor-title">Caption Editor</h3>
        </div>
        <div class="header-actions">
          <button class="btn btn--primary" @click="applyEdits" title="Save caption and tags (Alt+S)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
            <span class="btn__text">Save Caption</span>
          </button>
        </div>
      </div>

      <!-- Action Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-group toolbar-group--primary">
          <button class="btn btn--highlight" @click="store.autoCaptionCurrent" title="Generate caption with AI (Alt+G)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span class="btn__text">AI Generate</span>
          </button>

          <button class="btn btn--ghost" @click="copyFromFile" title="Copy caption from associated text file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span class="btn__text">Copy From File</span>
          </button>

          <button class="btn btn--ghost" @click="clearCaption" title="Clear current caption">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
            </svg>
            <span class="btn__text">Clear</span>
          </button>
        </div>

        <div class="toolbar-group toolbar-group--secondary">
          <button class="btn btn--danger" @click="confirmDelete" title="Remove this item from project (Alt+D)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <span class="btn__text">Remove</span>
          </button>
        </div>

        <div class="toolbar-group toolbar-group--tags">
          <div class="tags-control">
            <label class="tags-label">Tags</label>
            <input 
              type="text" 
              id="tagInput" 
              v-model="tagInput" 
              placeholder="tag1, tag2, tag3..." 
              class="tags-input"
              title="Enter comma-separated tags"
            />
          </div>
        </div>
      </div>

      <!-- Main Textarea -->
      <div class="editor-content">
        <div class="field-group field-group--main">
          <textarea 
            id="captionBox" 
            v-model="captionBox" 
            placeholder="Describe what you see in this image..."
            class="caption-textarea"
            rows="12"
          ></textarea>
        </div>

        <!-- Enhanced Footer with Tags and Stats -->
        <div class="editor-footer">
          <div class="tags-display" v-if="(currentItem?.tags || []).length > 0">
            <div class="tags-label-small">Active Tags:</div>
            <div class="tags-list">
              <span v-for="tag in currentItem?.tags || []" :key="tag" class="tag-chip">
                {{ tag }}
              </span>
            </div>
          </div>
          
          <div class="stats-info">
            <span class="stat-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              {{ captionBox.length }} characters
            </span>
            <span class="stat-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20"/>
                <path d="M8 18V6"/>
                <path d="M16 6v12"/>
              </svg>
              {{ (captionBox.trim().match(/\S+/g) || []).length }} words
            </span>
            <span class="stat-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              ~{{ Math.ceil(captionBox.length/4) }} tokens
            </span>
          </div>
        </div>
      </div>
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

// Region editing state
const selectedRegion = computed(() => {
  const it = currentItem.value;
  const rid = state.selectedRegionId;
  if (!it || !rid) return null;
  return (it.regions || []).find((r: any) => r.id === rid) || null;
});

const regionTitle = ref('');
const regionCaption = ref('');

// initialize region fields whenever selection changes
watch(selectedRegion, (r) => {
  if (r) {
    regionTitle.value = r.name || '';
    regionCaption.value = r.caption || '';
  } else {
    regionTitle.value = '';
    regionCaption.value = '';
  }
}, { immediate: true });

// actions
function applyEdits() {
  store.applyEdits(captionBox.value, tagInput.value);
  store.saveCurrentProject();
}

function applyRegionEdits() {
  const r = selectedRegion.value;
  if (!r) return;
  // write back fields to region object
  r.name = regionTitle.value;
  r.caption = regionCaption.value;
  // clear _editing flag if present (cast to any to avoid TS errors for transient UI fields)
  if ((r as any)._editing) (r as any)._editing = false;
  // persist (suppress global "Project saved" toast for region edits)
  store.saveCurrentProject?.(true);
  // keep the region selected so user can continue editing or explicitly clear
}

function clearRegionSelection() {
  try { store.setSelectedRegion?.(null); } catch (e) { (state as any).selectedRegionId = null; }
}

// existing helper actions preserved
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
/* Editor Layout */
.editor {
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  min-height: 0;
}

/* Editor Header */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.06) 0%, 
    rgba(255, 255, 255, 0.02) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.region-icon, .editor-icon {
  color: var(--brand);
  flex-shrink: 0;
}

.editor-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Editor Toolbar */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-group--primary {
  gap: 8px;
}

.toolbar-group--secondary {
  margin-left: auto;
}

.toolbar-group--tags {
  flex: 1;
  max-width: 300px;
  min-width: 200px;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: 32px;
}

.btn:hover {
  border-color: rgba(255, 255, 255, 0.20);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

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
}

.btn--success {
  background: linear-gradient(180deg, #16a34a, #15803d);
  border-color: #16a34a;
  color: white;
  font-weight: 600;
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

.btn--ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.06);
}

.btn--ghost:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

.btn--danger {
  background: linear-gradient(180deg, #dc2626, #b91c1c);
  border-color: #dc2626;
  color: white;
  font-weight: 600;
}

/* Tags Control */
.tags-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.tags-label {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
  white-space: nowrap;
}

.tags-input {
  flex: 1;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.tags-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.06);
}

.tags-input::placeholder {
  color: var(--text-dim);
}

/* Editor Content */
.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 20px;
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-group--main {
  flex: 1;
  min-height: 0;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.title-input {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.title-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.06);
}

.caption-textarea {
  width: 100%;
  flex: 1;
  min-height: 200px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  resize: none;
  transition: all 0.2s ease;
}

.caption-textarea:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.caption-textarea::placeholder {
  color: var(--text-dim);
}

/* Editor Footer & Stats */
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.editor-stats {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.stats-info {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
}

.stat-item svg {
  flex-shrink: 0;
}

/* Tags Display */
.tags-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tags-label-small {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-chip {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: var(--brand);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

/* Region Editor Specific Styles */
.region-editor .editor-content {
  background: linear-gradient(180deg, 
    rgba(99, 102, 241, 0.02) 0%, 
    transparent 100%
  );
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  margin: 0 20px 20px 20px;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .editor-toolbar {
    gap: 12px;
    padding: 10px 16px;
  }
  
  .toolbar-group--tags {
    order: -1;
    width: 100%;
    max-width: none;
  }
  
  .btn__text {
    display: none;
  }
  
  .btn--primary .btn__text,
  .btn--success .btn__text,
  .btn--highlight .btn__text {
    display: inline;
  }
}

@media (max-width: 900px) {
  .editor-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .toolbar-group {
    justify-content: center;
    width: 100%;
  }
  
  .toolbar-group--secondary {
    margin-left: 0;
  }
  
  .editor-content {
    padding: 16px;
  }
}

@media (max-width: 640px) {
  .editor-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .stats-info {
    justify-content: center;
  }
  
  .tags-display {
    justify-content: center;
  }
}

/* Animations */
@keyframes slideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.region-editor {
  animation: slideIn 0.3s ease-out;
}

/* Focus states for accessibility */
.btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.title-input:focus-visible,
.caption-textarea:focus-visible,
.tags-input:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
</style>
