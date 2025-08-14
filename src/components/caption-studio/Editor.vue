<template>
  <section class="editor">
    <!-- Region Editor (when a region is selected) -->
    <div v-if="selectedRegion" class="region-editor">
      <div class="editor-header">
        <div class="header-info">
          <div class="header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="14" rx="2" ry="2"/>
              <path d="m5 17 2-2 4 4 8-8"/>
            </svg>
          </div>
          <div class="header-text">
            <h3 class="editor-title">Region Editor</h3>
            <p class="editor-subtitle">Edit captions for selected region</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn--success" @click="applyRegionEdits" title="Save region changes">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            <span class="btn__text">Save Region</span>
          </button>
          <button class="btn btn--ghost" @click="clearRegionSelection" title="Cancel region editing">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="editor-body">
        <div class="input-group">
          <label class="input-label">Region Title</label>
          <div class="input-wrapper">
            <input
              type="text"
              v-model="regionTitle"
              placeholder="Enter a descriptive title for this region"
              class="text-input"
            />
          </div>
        </div>

        <div class="input-group input-group--main">
          <label class="input-label">Region Caption</label>
          <div class="input-wrapper">
            <textarea
              v-model="regionCaption"
              placeholder="Describe what you see in this region..."
              class="caption-textarea"
              rows="8"
            ></textarea>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stats-row">
            <div class="stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <span>{{ regionCaption.length }} chars</span>
            </div>
            <div class="stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20"/>
                <path d="M8 18V6"/>
                <path d="M16 6v12"/>
              </svg>
              <span>{{ (regionCaption.trim().match(/\S+/g) || []).length }} words</span>
            </div>
            <div class="stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>~{{ Math.ceil(regionCaption.length/4) }} tokens</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Item Editor -->
    <div v-else class="item-editor">
      <div class="editor-header">
        <div class="header-info">
          <div class="header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div class="header-text">
            <h3 class="editor-title">Caption Editor</h3>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn--primary" @click="applyEdits" title="Save caption and tags (Alt+S)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
            <span class="btn__text">Save Caption</span>
          </button>
        </div>
      </div>

      <!-- AI and Action Toolbar -->
      <div class="ai-toolbar">
        <div class="ai-section">
          <button class="btn btn--ai" @click="store.autoCaptionCurrent" title="Generate caption with AI (Alt+G)">
            <div class="btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
            </div>
            <div class="btn-content">
              <span class="btn-title">AI Generate</span>
              <span class="btn-subtitle">Create caption automatically</span>
            </div>
          </button>
        </div>

        <div class="actions-section">
          <div class="action-group">
            <button class="btn btn--secondary" @click="copyFromFile" title="Copy caption from associated text file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span class="btn__text">Copy From File</span>
            </button>

            <button class="btn btn--secondary" @click="clearCaption" title="Clear current caption">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
              </svg>
              <span class="btn__text">Clear</span>
            </button>
          </div>

          <button class="btn btn--danger" @click="confirmDelete" title="Remove this item from project (Alt+D)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <span class="btn__text">Remove</span>
          </button>
        </div>
      </div>

      <!-- Tags Input -->
      <div class="tags-section">
        <div class="input-group">
          <label class="input-label">Tags</label>
          <div class="input-wrapper">
            <input 
              type="text" 
              id="tagInput" 
              v-model="tagInput" 
              placeholder="Enter comma-separated tags (e.g., portrait, outdoor, sunset)"
              class="text-input tags-input"
              title="Enter comma-separated tags"
            />
          </div>
        </div>
      </div>

      <!-- Main Caption Editor -->
      <div class="editor-body">
        <div class="input-group input-group--main">
          <label class="input-label">Caption</label>
          <div class="input-wrapper">
            <textarea 
              id="captionBox" 
              v-model="captionBox" 
              placeholder="Describe what you see in this image..."
              class="caption-textarea"
              rows="10"
            ></textarea>
          </div>
        </div>

        <!-- Active Tags Display -->
        <div class="tags-display" v-if="(currentItem?.tags || []).length > 0">
          <div class="tags-label">Active Tags</div>
          <div class="tags-list">
            <div v-for="tag in currentItem?.tags || []" :key="tag" class="tag-chip">
              <span class="tag-text">{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Stats Footer -->
        <div class="stats-bar">
          <div class="stats-row">
            <div class="stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <span>{{ captionBox.length }} characters</span>
            </div>
            <div class="stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20"/>
                <path d="M8 18V6"/>
                <path d="M16 6v12"/>
              </svg>
              <span>{{ (captionBox.trim().match(/\S+/g) || []).length }} words</span>
            </div>
            <div class="stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>~{{ Math.ceil(captionBox.length/4) }} tokens</span>
            </div>
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
  padding: 20px 24px;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08) 0%, 
    rgba(255, 255, 255, 0.03) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--brand), var(--accent));
  border-radius: 12px;
  color: white;
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.editor-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.editor-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
  font-weight: 500;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* AI Toolbar */
.ai-toolbar {
  display: flex;
  align-items: stretch;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(90deg, 
    rgba(139, 92, 246, 0.04) 0%, 
    rgba(99, 102, 241, 0.02) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}

.ai-section {
  flex: 1;
  min-width: 0;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Tags Section */
.tags-section {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* Editor Body */
.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 20px;
  min-height: 0;
}

/* Input Groups */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group--main {
  flex: 1;
  min-height: 0;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.input-wrapper {
  position: relative;
}

/* Text Inputs */
.text-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.06);
}

.text-input::placeholder {
  color: var(--text-dim);
}

/* Caption Textarea */
.caption-textarea {
  width: 100%;
  flex: 1;
  min-height: 180px;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--text);
  font-size: 15px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  resize: none;
  transition: all 0.2s ease;
}

.caption-textarea:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.caption-textarea::placeholder {
  color: var(--text-dim);
  font-style: italic;
}

/* Stats Bar */
.stats-bar {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-top: 8px;
}

.stats-row {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-dim);
  font-weight: 500;
}

.stat svg {
  opacity: 0.7;
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

.btn--secondary {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text);
  font-weight: 500;
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.20);
}

.btn--ai {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.15) 0%, 
    rgba(99, 102, 241, 0.10) 100%
  );
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  min-height: 56px;
}

.btn--ai:hover {
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.20) 0%, 
    rgba(99, 102, 241, 0.15) 100%
  );
  border-color: rgba(139, 92, 246, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.2);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--accent), var(--brand));
  border-radius: 8px;
  color: white;
  flex-shrink: 0;
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex: 1;
}

.btn-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}

.btn-subtitle {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
  opacity: 0.8;
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
  .ai-toolbar {
    flex-direction: column;
    gap: 12px;
  }
  
  .actions-section {
    width: 100%;
    justify-content: space-between;
  }
  
  .btn__text {
    display: none;
  }
  
  .btn--primary .btn__text,
  .btn--success .btn__text,
  .btn--ai .btn-title,
  .btn--ai .btn-subtitle {
    display: inline;
  }
}

@media (max-width: 900px) {
  .editor-header {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .header-info {
    flex: 1;
    min-width: 0;
  }
  
  .header-actions {
    flex-shrink: 0;
  }
  
  .ai-toolbar {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
  }
  
  .actions-section {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }
  
  .action-group {
    width: 100%;
    justify-content: center;
  }
  
  .tags-section {
    padding: 12px 16px;
  }
  
  .editor-body {
    padding: 16px;
  }
}

@media (max-width: 700px) {
  .editor-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 16px 20px;
  }
  
  .header-info {
    justify-content: center;
    text-align: center;
  }
  
  .header-actions {
    justify-content: center;
    width: 100%;
  }
  
  .header-actions .btn {
    flex: 1;
    max-width: 200px;
  }
}

@media (max-width: 500px) {
  .editor-header {
    padding: 12px 16px;
  }
  
  .header-icon {
    width: 32px;
    height: 32px;
  }
  
  .editor-title {
    font-size: 14px;
  }
  
  .editor-subtitle {
    font-size: 12px;
  }
  
  .btn {
    padding: 6px 10px;
    font-size: 12px;
    min-height: 28px;
  }
  
  .btn svg {
    width: 14px;
    height: 14px;
  }
}

@media (max-width: 640px) {
  .editor-header {
    padding: 16px 20px;
  }
  
  .header-icon {
    width: 36px;
    height: 36px;
  }
  
  .editor-title {
    font-size: 16px;
  }
  
  .btn--ai {
    padding: 12px 16px;
    min-height: 48px;
  }
  
  .btn-icon {
    width: 28px;
    height: 28px;
  }
  
  .action-group {
    flex-direction: column;
    width: 100%;
  }
  
  .stats-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .tags-display {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .tags-list {
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
