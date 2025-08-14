<template>
  <section class="viewer">
    <div class="viewer-tools">
      <button class="btn small" id="prevBtn" @click="prev">◀ Prev <kbd>Alt+N</kbd></button>
      <button class="btn small" id="nextBtn" @click="next">Next ▶ <kbd>Alt+M</kbd></button>
        <div class="seg" style="margin-left:auto; display:flex; gap:8px; align-items:center">
          <label for="zoomRange">Zoom</label>
          <input type="range" id="zoomRange" min="10" max="300" v-model.number="state.zoom" />
          <button class="btn small" id="fitBtn" @click="fit">Fit</button>
          <button class="btn small" id="fillBtn" @click="fill">Fill</button>
          <button class="btn small" id="rotateBtn" @click="rotate">Rotate 90°</button>
          <button class="btn small" id="suggestBtn" @click="onSuggestRegions">Suggest Regions</button>

        <!-- Manual dim control -->
        <label for="manualDim" style="display:flex;align-items:center;gap:6px;margin-left:8px">
          Dim
          <input id="manualDim" type="range" min="10" max="100" v-model.number="state.manualDimPercent" style="width:120px" />
          <span style="min-width:36px;text-align:right">{{ state.manualDimPercent }}%</span>
        </label>

        <!-- Curation controls (moved to viewer bar when curation mode is active) -->
        <div v-if="state.curationMode" style="margin-left:8px; display:flex; gap:8px; align-items:center">
          <button class="btn" @click="() => commitCuration('rejected')">Reject</button>
          <button class="btn primary" @click="() => commitCuration('accepted')">Accept</button>
          <button class="btn" @click="openCurationExitConfirm">Exit</button>
        </div>
      </div>
    </div>

    <div class="viewport" id="viewport">
      <div class="canvas-wrap" :class="{ dragging: isDragging }" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp" @pointerleave="onPointerUp" @wheel.prevent="onWheel" style="position:relative; touch-action: none; user-select: none; -webkit-user-drag: none">
        <div v-if="dimInfo?.source === 'auto'" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.55); color:#fff; padding:4px 8px; border-radius:4px; font-size:12px; pointer-events:none; z-index:10">Dimmed (auto)</div>
        <CurationCard v-if="state.curationMode" />
        <template v-else>
          <template v-if="currentItem?.mediaType === 'video'">
            <video id="mainVideo"
                   controls
                   :src="currentItem?.img || ''"
                   preload="metadata"
                   @loadedmetadata="(e) => onVideoLoadedMeta(currentItem?.id || null, e)"
                   :style="mainMediaStyle"
                   style="max-width:100%; max-height:100%; display:block; margin:0 auto;">
            </video>
          </template>
          <template v-else>
            <img id="mainImage" :src="currentItem?.img || ''" :style="mainMediaStyle" alt="" />
          </template>
        </template>
        <CropOverlay ref="cropOverlay" />
      </div>
    </div>

    <div class="viewer-footer">
      <div style="display:flex; gap:10px; align-items:center">
        <span id="fileInfo">
          {{ currentItem?.filename || 'No file' }}
          <span v-if="currentItem?.mediaType === 'video'">
            <span v-if="videoMeta[currentItem.id] && videoMeta[currentItem.id].duration"> • {{ formatDuration(videoMeta[currentItem.id].duration) }}</span>
            <span v-if="(videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || (currentItem?.width)"> • {{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || currentItem?.width }}×{{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].height) || currentItem?.height }}</span>
          </span>
          <span v-else-if="currentItem?.width"> • {{ currentItem.width }}×{{ currentItem.height }}</span>
        </span>
      </div>
      <div style="display:flex; gap:10px; align-items:center">
        <div class="meter"><i id="progressBar" :style="{ width: state.progress.total ? Math.max(0, Math.min(100, Math.round(state.progress.cur / state.progress.total * 100))) + '%' : '0%' }"></i></div>
        <span id="progressText">{{ (state.currentIndex + 1) }} of {{ (currentProject && currentProject.items) ? currentProject.items.length : 0 }}</span>
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

// Pointer-drag panning state (mouse & touch)
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const startPanX = ref(0);
const startPanY = ref(0);

function onPointerDown(e: PointerEvent) {
  // Only primary button for mouse; touch will have button === 0 as well
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

  // Compute new zoom (tuned step)
  const delta = -e.deltaY; // wheel up -> positive
  const step = delta * 0.05; // adjust sensitivity
  let newZoom = Math.round(state.zoom + step);
  newZoom = Math.max(10, Math.min(300, newZoom));
  const newScale = newZoom / 100;
  if (newScale === prevScale) {
    // nothing to do
    e.preventDefault();
    return;
  }

  // Pointer position relative to wrapper
  const pointerX = e.clientX - rect.left;
  const pointerY = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Adjust pan so the content under the cursor stays fixed while zooming
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

/**
 * Suggest regions (lightweight in-browser heuristic).
 * - If a detector implementation is later provided, this function can be updated
 *   to call the detector and map boxes back to full-resolution coordinates.
 * - For now create a centered crop using CROPPING.minSize if the image is large enough.
 */
async function onSuggestRegions() {
  const proj = currentProject.value;
  const it = currentItem.value;
  if (!proj || !it) {
    (store as any).addToast?.('No image loaded', 'warn');
    return;
  }

  const imgW = it.width || (it as any).img?.width || 0;
  const imgH = it.height || (it as any).img?.height || 0;

  // if we don't have explicit dims, try to extract from data URL by loading an Image
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

  // Centered region at min size (or scaled down to image)
  const w = Math.min(CROPPING.minSize.w, naturalW || CROPPING.minSize.w);
  const h = Math.min(CROPPING.minSize.h, naturalH || CROPPING.minSize.h);
  const x = Math.max(0, Math.round(((naturalW || w) - w) / 2));
  const y = Math.max(0, Math.round(((naturalH || h) - h) / 2));

  try {
    // Use the CropOverlay component instance via ref to add suggested boxes.
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
  // Returns { dimPercent?: number, source: 'manual' | 'auto' | null }
  if (currentItem.value?.mediaType !== 'image') return { dimPercent: undefined, source: null };
  let dimPercent: number | undefined;
  let source: 'manual' | 'auto' | null = null;

  // Manual override (if user adjusted the manual dim slider)
  if (typeof state.manualDimPercent === 'number' && state.manualDimPercent > 0 && state.manualDimPercent < 100) {
    dimPercent = state.manualDimPercent;
    source = 'manual';
  } else if (state.settings?.autoDimEnabled) {
    // Automatic dimming based on measured average brightness (0-255)
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
    // brightness() expects a multiplier (1 = 100%), so convert percent to multiplier
    const mult = Math.max(0.01, Math.min(2, di.dimPercent / 100));
    styles.filter = `brightness(${mult})`;
  }

  return styles;
});
</script>
