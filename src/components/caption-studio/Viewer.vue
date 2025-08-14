<template>
  <section class="viewer">
    <!-- Modern Viewer Toolbar -->
    <div class="viewer-toolbar">
      <!-- Navigation Group -->
      <div class="toolbar-group toolbar-group--navigation">
        <button class="btn btn--primary" @click="prev" title="Previous image (Alt+N)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          <span class="btn__text">Previous</span>
        </button>
        <button class="btn btn--primary" @click="next" title="Next image (Alt+M)">
          <span class="btn__text">Next</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </div>

      <!-- View Controls Group -->
      <div class="toolbar-group toolbar-group--view">
        <div class="zoom-controls">
          <label class="zoom-label">Zoom</label>
          <div class="zoom-slider-wrapper">
            <input 
              type="range" 
              id="zoomRange" 
              min="10" 
              max="300" 
              v-model.number="state.zoom"
              class="zoom-slider" />
            <span class="zoom-value">{{ state.zoom }}%</span>
          </div>
        </div>
        
        <div class="view-actions">
          <button class="btn btn--ghost" @click="fit" title="Fit to viewport">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            <span class="btn__text">Fit</span>
          </button>
          <button class="btn btn--ghost" @click="fill" title="Fill viewport">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
            </svg>
            <span class="btn__text">Fill</span>
          </button>
          <button class="btn btn--ghost" @click="rotate" title="Rotate 90°">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
            <span class="btn__text">Rotate</span>
          </button>
        </div>
      </div>

      <!-- Tools Group -->
      <div class="toolbar-group toolbar-group--tools">
        <button class="btn btn--accent" @click="onSuggestRegions" title="AI-suggest crop regions">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
            <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
            <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
            <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
          </svg>
          <span class="btn__text">Suggest Regions</span>
        </button>

        <!-- Brightness Control -->
        <div class="brightness-control" v-if="currentItem?.mediaType === 'image'">
          <label class="brightness-label">Brightness</label>
          <div class="brightness-wrapper">
            <input 
              type="range" 
              id="manualDim" 
              min="10" 
              max="100" 
              v-model.number="state.manualDimPercent"
              class="brightness-slider" />
            <span class="brightness-value">{{ state.manualDimPercent }}%</span>
          </div>
          <div v-if="dimInfo?.source === 'auto'" class="brightness-indicator" title="Auto-dimmed based on brightness">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Curation Controls (when active) -->
      <div v-if="state.curationMode" class="toolbar-group toolbar-group--curation">
        <button class="btn btn--danger" @click="() => commitCuration('rejected')" title="Reject this item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <span class="btn__text">Reject</span>
        </button>
        <button class="btn btn--success" @click="() => commitCuration('accepted')" title="Accept this item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          <span class="btn__text">Accept</span>
        </button>
        <button class="btn btn--ghost" @click="openCurationExitConfirm" title="Exit curation mode">
          <span class="btn__text">Exit Curation</span>
        </button>
      </div>
    </div>

    <!-- Main Viewport -->
    <div class="viewport" id="viewport">
      <div class="canvas-wrap" 
           :class="{ dragging: isDragging }" 
           @pointerdown="onPointerDown" 
           @pointermove="onPointerMove" 
           @pointerup="onPointerUp" 
           @pointercancel="onPointerUp" 
           @pointerleave="onPointerUp" 
           @wheel.prevent="onWheel">
        
        <!-- Auto-dim indicator -->
        <div v-if="dimInfo?.source === 'auto'" class="dim-indicator">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <span>Auto-dimmed</span>
        </div>

        <!-- Curation Card or Main Media -->
        <CurationCard v-if="state.curationMode" />
        <template v-else>
          <template v-if="currentItem?.mediaType === 'video'">
            <video 
              id="mainVideo"
              controls
              :src="currentItem?.img || ''"
              preload="metadata"
              @loadedmetadata="(e) => onVideoLoadedMeta(currentItem?.id || null, e)"
              :style="mainMediaStyle"
              class="main-video">
            </video>
          </template>
          <template v-else>
            <img 
              id="mainImage" 
              :src="currentItem?.img || ''" 
              :style="mainMediaStyle" 
              alt=""
              class="main-image" />
          </template>
        </template>
        
        <CropOverlay ref="cropOverlay" />
      </div>
    </div>

    <!-- Enhanced Footer -->
    <div class="viewer-footer">
      <div class="file-info">
        <div class="filename">
          {{ currentItem?.filename || 'No file selected' }}
        </div>
        <div class="file-meta">
          <template v-if="currentItem?.mediaType === 'video'">
            <span v-if="videoMeta[currentItem.id] && videoMeta[currentItem.id].duration" class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              {{ formatDuration(videoMeta[currentItem.id].duration) }}
            </span>
            <span v-if="(videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || currentItem?.width" class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              {{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || currentItem?.width }}×{{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].height) || currentItem?.height }}
            </span>
          </template>
          <template v-else-if="currentItem?.width">
            <span class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              {{ currentItem.width }}×{{ currentItem.height }}
            </span>
          </template>
        </div>
      </div>

      <div class="progress-info">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <div class="progress-text">
          {{ (state.currentIndex + 1) }} of {{ (currentProject && currentProject.items) ? currentProject.items.length : 0 }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { useVideoMeta } from '../../composables/useVideoMeta';
import CurationCard from './CurationCard.vue';
import { useCuration } from '../../composables/useCuration';
import CropOverlay from './CropOverlay.vue';
import { CROPPING } from '../../config/cropping';

const { commitCuration, openCurationExitConfirm } = useCuration();

const store = useProjectStore();
const { state } = store;
const cropOverlay = ref<any>(null);

const currentProject = computed(() => store.getCurrentProject());
const currentItem = computed(() => store.currentItem());
const videoMetaCompos = useVideoMeta();
const { videoMeta, onVideoLoadedMeta, formatDuration } = videoMetaCompos;

// Progress calculation
const progressPercentage = computed(() => {
  if (!state.progress.total) return 0;
  return Math.max(0, Math.min(100, Math.round(state.progress.cur / state.progress.total * 100)));
});

// Pointer-drag panning state (mouse & touch)
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const startPanX = ref(0);
const startPanY = ref(0);

function onPointerDown(e: PointerEvent) {
  if ((e as any).button !== undefined && (e as any).button !== 0) return;
  const el = e.currentTarget as HTMLElement | null;
  try { el?.setPointerCapture(e.pointerId); } catch {}
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  startPanX.value = state.panX;
  startPanY.value = state.panY;
  e.preventDefault();
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return;
  const dx = e.clientX - dragStartX.value;
  const dy = e.clientY - dragStartY.value;
  state.panX = startPanX.value + dx;
  state.panY = startPanY.value + dy;
  e.preventDefault();
}

function onPointerUp(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement | null;
  try { el?.releasePointerCapture(e.pointerId); } catch {}
  isDragging.value = false;
}

function onWheel(e: WheelEvent) {
  const wrapper = document.querySelector('.canvas-wrap') as HTMLElement | null;
  if (!wrapper) return;
  const rect = wrapper.getBoundingClientRect();
  const prevScale = state.zoom / 100;

  const delta = -e.deltaY;
  const step = delta * 0.05;
  let newZoom = Math.round(state.zoom + step);
  newZoom = Math.max(10, Math.min(300, newZoom));
  const newScale = newZoom / 100;
  if (newScale === prevScale) {
    e.preventDefault();
    return;
  }

  const pointerX = e.clientX - rect.left;
  const pointerY = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  state.panX = state.panX + (pointerX - centerX) * ((1 / newScale) - (1 / prevScale));
  state.panY = state.panY + (pointerY - centerY) * ((1 / newScale) - (1 / prevScale));

  state.zoom = newZoom;
  e.preventDefault();
}

function prev() { store.prev(); }
function next() { store.next(); }
function fit() { state.zoom = 100; state.panX = 0; state.panY = 0; }
function fill() { state.zoom = 150; state.panX = 0; state.panY = 0; }
function rotate() { state.rotation = (state.rotation + 90) % 360; }

async function onSuggestRegions() {
  const proj = currentProject.value;
  const it = currentItem.value;
  if (!proj || !it) {
    (store as any).addToast?.('No image loaded', 'warn');
    return;
  }

  const imgW = it.width || (it as any).img?.width || 0;
  const imgH = it.height || (it as any).img?.height || 0;

  let naturalW = imgW;
  let naturalH = imgH;
  if (!naturalW || !naturalH) {
    try {
      const tmp = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = (e) => reject(e);
        im.src = it.img || '';
      });
      naturalW = tmp.naturalWidth || tmp.width || naturalW;
      naturalH = tmp.naturalHeight || tmp.height || naturalH;
    } catch (e) {
      console.warn('Failed to load image to determine natural size', e);
    }
  }

  const minW = Math.min(CROPPING.minSize.w, naturalW || CROPPING.minSize.w);
  const minH = Math.min(CROPPING.minSize.h, naturalH || CROPPING.minSize.h);

  if ((naturalW && naturalH) && (naturalW < CROPPING.minSize.w || naturalH < CROPPING.minSize.h)) {
    (store as any).addToast?.(`Image smaller than minimum region size ${CROPPING.minSize.w}×${CROPPING.minSize.h}`, 'warn');
    return;
  }

  const w = Math.min(CROPPING.minSize.w, naturalW || CROPPING.minSize.w);
  const h = Math.min(CROPPING.minSize.h, naturalH || CROPPING.minSize.h);
  const x = Math.max(0, Math.round(((naturalW || w) - w) / 2));
  const y = Math.max(0, Math.round(((naturalH || h) - h) / 2));

  try {
    if (cropOverlay.value?.addSuggestedBoxes) {
      cropOverlay.value.addSuggestedBoxes([{ x, y, w, h }]);
      (store as any).addToast?.('Suggested region added (centered).', 'ok');
    } else {
      (store as any).addToast?.('Suggest failed: overlay not available', 'warn');
    }
  } catch (err) {
    console.error('onSuggestRegions failed', err);
    (store as any).addToast?.('Suggest regions failed', 'warn');
  }
}

const dimInfo = computed(() => {
  if (currentItem.value?.mediaType !== 'image') return { dimPercent: undefined, source: null };
  let dimPercent: number | undefined;
  let source: 'manual' | 'auto' | null = null;

  if (typeof state.manualDimPercent === 'number' && state.manualDimPercent > 0 && state.manualDimPercent < 100) {
    dimPercent = state.manualDimPercent;
    source = 'manual';
  } else if (state.settings?.autoDimEnabled) {
    const avg = currentItem.value?.avgBrightness;
    if (typeof avg === 'number' && typeof state.settings?.autoDimThreshold === 'number' && avg >= state.settings.autoDimThreshold) {
      dimPercent = state.settings.defaultDimPercent ?? 70;
      source = 'auto';
    }
  }

  return { dimPercent, source };
});

const mainMediaStyle = computed(() => {
  const styles: Record<string, any> = {
    transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom/100}) rotate(${state.rotation}deg)`
  };

  const di = dimInfo.value;
  if (typeof di?.dimPercent === 'number') {
    const mult = Math.max(0.01, Math.min(2, di.dimPercent / 100));
    styles.filter = `brightness(${mult})`;
  }

  return styles;
});
</script>

<style scoped>
/* Viewer Layout */
.viewer {
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  min-height: 0;
}

/* Modern Toolbar */
.viewer-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.04) 0%, 
    rgba(255, 255, 255, 0.02) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-group--navigation {
  gap: 4px;
}

.toolbar-group--view {
  gap: 12px;
  margin-left: auto;
}

.toolbar-group--curation {
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 92, 92, 0.08);
  border: 1px solid rgba(255, 92, 92, 0.2);
  border-radius: 8px;
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

.btn--accent {
  background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 85%, #000 15%));
  border-color: var(--accent);
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

.btn--success {
  background: linear-gradient(180deg, #16a34a, #15803d);
  border-color: #16a34a;
  color: white;
  font-weight: 600;
}

.btn--danger {
  background: linear-gradient(180deg, #dc2626, #b91c1c);
  border-color: #dc2626;
  color: white;
  font-weight: 600;
}

/* Control Groups */
.zoom-controls, .brightness-control {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.zoom-label, .brightness-label {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
  white-space: nowrap;
}

.zoom-slider-wrapper, .brightness-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-slider, .brightness-slider {
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb, .brightness-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--brand);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.zoom-value, .brightness-value {
  font-size: 12px;
  color: var(--text);
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

.view-actions {
  display: flex;
  gap: 4px;
}

.brightness-indicator {
  display: flex;
  align-items: center;
  color: var(--accent);
}

/* Viewport */
.viewport {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: 
    repeating-conic-gradient(
      rgba(255, 255, 255, 0.03) 0% 25%, 
      rgba(255, 255, 255, 0.01) 0% 50%
    ) 50% / 24px 24px;
  min-height: 0;
}

.canvas-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
}

.canvas-wrap.dragging {
  cursor: grabbing;
}

.main-image, .main-video {
  max-width: 100%;
  max-height: 100%;
  transform-origin: center;
  image-rendering: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.main-video {
  outline: none;
}

/* Dim Indicator */
.dim-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
  z-index: 10;
}

/* Enhanced Footer */
.viewer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.filename {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-dim);
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.progress-bar {
  width: 120px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand), var(--accent));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
  white-space: nowrap;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .viewer-toolbar {
    gap: 12px;
    padding: 10px 12px;
  }
  
  .toolbar-group--view {
    margin-left: 0;
  }
  
  .btn__text {
    display: none;
  }
  
  .btn--primary .btn__text {
    display: inline;
  }
  
  .zoom-slider, .brightness-slider {
    width: 80px;
  }
}

@media (max-width: 900px) {
  .viewer-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .toolbar-group {
    justify-content: space-between;
    width: 100%;
  }
  
  .toolbar-group--navigation {
    justify-content: center;
  }
  
  .toolbar-group--view {
    flex-wrap: wrap;
    justify-content: center;
    margin-left: 0;
  }
  
  .zoom-controls, .brightness-control {
    flex: 1;
    min-width: 200px;
  }
}

@media (max-width: 640px) {
  .viewer-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .file-info, .progress-info {
    align-self: stretch;
  }
  
  .progress-info {
    justify-content: space-between;
  }
  
  .file-meta {
    gap: 8px;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dim-indicator {
  animation: fadeIn 0.3s ease-out;
}

.toolbar-group--curation {
  animation: fadeIn 0.3s ease-out;
}

/* Focus states for accessibility */
.btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.zoom-slider:focus-visible, .brightness-slider:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* Firefox slider support */
.zoom-slider::-moz-range-thumb, .brightness-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--brand);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.zoom-slider::-moz-range-track, .brightness-slider::-moz-range-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  border: none;
}
</style>
