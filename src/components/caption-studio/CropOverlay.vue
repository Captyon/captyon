<template>
  <div class="crop-overlay" ref="overlayRef" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
    <!-- Render existing regions -->
    <div
      v-for="r in regions"
      :key="r.id"
      class="region-box"
      :class="{ invalid: isBelowMinSize(r), suggested: r._suggested, active: state.selectedRegionId === r.id }"
      :style="regionScreenStyle(r)"
      @pointerdown.stop.prevent="startDragRegion($event, r)"
      @click.stop="selectRegion(r)"
    >
      <div class="region-label">{{ r.name || 'Region' }}</div>
      <!-- resize handle bottom-right -->
      <div class="handle br" @pointerdown.stop.prevent="startResize($event, r, 'br')"></div>
    </div>

    <!-- Drawing preview while creating -->
    <div v-if="drawing" class="region-preview" :style="previewStyle"></div>

    <!-- Controls (top-right) -->
    <div v-if="state.settings?.showOverlayLabels" class="overlay-controls" :style="{ zIndex: 1200, top: autoDimActive ? '48px' : '8px' }">
      <div class="readouts">
        <div v-if="activeRect">
          <div><strong>Size:</strong> {{ activeRect.w }}×{{ activeRect.h }} px</div>
          <div><strong>Aspect:</strong> {{ activeRect.aspect }}</div>
          <div><strong>Valid:</strong> <span :style="{ color: activeRect.valid ? '#7dd3a6' : '#ff7b7b' }">{{ activeRect.valid ? 'Yes' : 'No' }}</span></div>
        </div>
        <div v-else style="opacity:0.85">Alt+Click+drag to create a region.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, type CSSProperties } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { screenRectToImageRect, imageRectToScreenRect, computeImageToViewportParams } from '../../utils/imageCoords';
import type { TransformState } from '../../utils/imageCoords';
import { CROPPING } from '../../config/cropping';
import { newId } from '../../store/project/state';

const store = useProjectStore();
const { state } = store;

const overlayRef = ref<HTMLElement | null>(null);
const drawing = ref(false);
const drawStart = ref<{ x: number; y: number } | null>(null);
const drawCurrent = ref<{ x: number; y: number } | null>(null);

 // Local copy of regions (keeps _suggested flag for UI but persists canonical fields into project items)
const regions = ref<Array<any>>([]);

// internal drag / resize
let activeDragRegion: any = null;
let dragStartClient = { x: 0, y: 0 };
let originalRegion: any = null;
let activeResize: { region: any; handle: string } | null = null;

// snap toggle
const snapEnabled = ref(false);
const snapList = Array.from(CROPPING.snapSizes as readonly number[]);

// Derived
const currentItem = computed(() => store.currentItem());

const autoDimActive = computed(() => {
  if (currentItem.value?.mediaType !== 'image') return false;
  if (typeof state.manualDimPercent === 'number' && state.manualDimPercent > 0 && state.manualDimPercent < 100) return false;
  if (!state.settings?.autoDimEnabled) return false;
  const avg = currentItem.value?.avgBrightness;
  if (typeof avg !== 'number' || typeof state.settings?.autoDimThreshold !== 'number') return false;
  return avg >= state.settings.autoDimThreshold;
});

function loadRegionsFromItem() {
  regions.value = (currentItem.value?.regions || []).map(r => ({ ...r }));
}

onMounted(() => {
  loadRegionsFromItem();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

 // key handlers: Shift locks aspect during drawing/resizing
const keyState = { shift: false };

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Shift') keyState.shift = true;
  // Delete key removes selected region
  if (e.key === 'Delete') {
    try { deleteSelectedRegion(); } catch (err) {}
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'Shift') keyState.shift = false;
}

function toggleSnap() {
  snapEnabled.value = !snapEnabled.value;
}

// pointer handlers for creating new region
function onPointerDown(e: PointerEvent) {
  // only start drawing when clicking empty space (not on a region) AND Alt is held
  const target = e.target as HTMLElement | null;
  if (!overlayRef.value) return;
  // If clicking on a region, let the region handlers manage it
  if (target && target.closest('.region-box')) return;
  // If Alt is not held this is a plain click on the image — clear region selection, focus the item caption, and allow pan to proceed
  if (!e.altKey) {
    try { store.setSelectedRegion?.(null); } catch (err) { state.selectedRegionId = null; }
    // focus the item-level caption textarea so the editor visibly switches to the image prompt
    setTimeout(() => {
      try {
        const el = document.getElementById('captionBox') as HTMLTextAreaElement | null;
        el?.focus();
      } catch (e) {}
    }, 0);
    return;
  }
  // Only primary button starts drawing
  if ((e as any).button !== undefined && (e as any).button !== 0) return;
  // Starting a drawing operation — prevent parent pan handlers from firing
  e.stopPropagation();
  e.preventDefault();
  drawing.value = true;
  drawStart.value = { x: e.clientX, y: e.clientY };
  drawCurrent.value = { x: e.clientX, y: e.clientY };
  (e.target as Element)?.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!drawing.value) return;
  // While drawing, prevent parent panning and default browser behavior
  e.stopPropagation();
  e.preventDefault();
  drawCurrent.value = { x: e.clientX, y: e.clientY };
}

function onPointerUp(e: PointerEvent) {
  if (!drawing.value || !drawStart.value || !drawCurrent.value) {
    drawing.value = false;
    drawStart.value = null;
    drawCurrent.value = null;
    return;
  }
  // finalize rectangle (convert screen coords -> image px)
  // prevent parent pan and default behavior while finishing draw
  e.stopPropagation();
  e.preventDefault();
  const wrapper = overlayRef.value?.parentElement as HTMLElement | null;
  if (!wrapper) {
    drawing.value = false;
    return;
  }
  const imgEl = document.getElementById('mainImage') as HTMLImageElement | HTMLVideoElement | null;
  if (!imgEl || !currentItem.value) {
    drawing.value = false;
    return;
  }
  const rect = rectFromClients(drawStart.value, drawCurrent.value, wrapper.getBoundingClientRect());
  const transformState: TransformState = { panX: state.panX, panY: state.panY, zoom: state.zoom, rotation: state.rotation };
  const imgRect = screenRectToImageRect(rect, imgEl, wrapper.getBoundingClientRect(), transformState);

  // apply aspect lock if Shift held: convert to nearest allowed aspect if configured
  let final = { ...imgRect };

  // Snap if enabled: snap width/height to nearest allowed snapSizes while preserving aspect if shift held
  if (snapEnabled.value) {
    const snapSizes = snapList;
    if (keyState.shift) {
      // preserve aspect: pick nearest snap size for the larger dimension and scale the other
      const targetW = nearest(snapSizes, final.w);
      const scale = targetW / Math.max(1, final.w);
      final.w = targetW;
      final.h = Math.round(final.h * scale);
    } else {
      final.w = nearest(snapSizes, final.w);
      final.h = nearest(snapSizes, final.h);
    }
  }

  // enforce min size
  if (final.w < CROPPING.minSize.w || final.h < CROPPING.minSize.h) {
    // show toast and abort creation
    store.addToast?.('Region too small — must be at least ' + CROPPING.minSize.w + '×' + CROPPING.minSize.h, 'warn');
    drawing.value = false;
    drawStart.value = null;
    drawCurrent.value = null;
    return;
  }

  // create region object and add to list — start in editing mode (no browser prompts)
  const region = {
    id: newId('r_'),
    name: 'region-' + (regions.value.length + 1),
    caption: '',
    x: final.x,
    y: final.y,
    w: final.w,
    h: final.h,
    aspect: computeAspectString(final.w, final.h),
    size: [final.w, final.h] as [number, number],
    createdAt: Date.now(),
    _suggested: false,
    _editing: true
  };

  regions.value.push(region);
  // persist to current item
  if (!currentItem.value.regions) currentItem.value.regions = [];
  currentItem.value.regions.push(region);
  // select newly created region for editing (store-backed selection)
  try { store.setSelectedRegion?.(region.id); } catch (err) { state.selectedRegionId = region.id; }
  // save project to persist regions (suppress global "Project saved" toast; region creation will surface its own feedback)
  try { store.saveCurrentProject?.(true); } catch (e) {}
  drawing.value = false;
  drawStart.value = null;
  drawCurrent.value = null;
}

// helpers
function rectFromClients(a: { x: number; y: number }, b: { x: number; y: number }, wrapperRect: DOMRect) {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);
  // keep rect in client coords (absolute)
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

 // preview style computed from drawStart/current
const previewStyle = computed<CSSProperties>(() => {
  if (!drawing.value || !drawStart.value || !drawCurrent.value || !overlayRef.value) return {} as CSSProperties;
  const wrapper = overlayRef.value.parentElement;
  if (!wrapper) return {} as CSSProperties;
  const rect = rectFromClients(drawStart.value, drawCurrent.value, wrapper.getBoundingClientRect());
  // convert absolute client coords to overlay-local (overlay positioned absolute covering wrapper)
  const wrapperRect = wrapper.getBoundingClientRect();
  const left = rect.left - wrapperRect.left;
  const top = rect.top - wrapperRect.top;
  return {
    left: left + 'px',
    top: top + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px'
  } as CSSProperties;
});

// activeRect readout for last created or hovered region (simplified: show last region)
const activeRect = computed(() => {
  const r = regions.value.length ? regions.value[regions.value.length - 1] : null;
  if (!r) return null;
  const valid = !(r.w < CROPPING.minSize.w || r.h < CROPPING.minSize.h);
  return { w: r.w, h: r.h, aspect: computeAspectString(r.w, r.h), valid };
});

function computeAspectString(w: number, h: number) {
  // convert to nearest simple ratio using common denominators
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const wi = Math.round(w);
  const hi = Math.round(h);
  const g = gcd(wi, hi) || 1;
  return `${Math.round(wi / g)}:${Math.round(hi / g)}`;
}

function nearest(arr: number[], v: number) {
  let best = arr[0];
  let bestD = Math.abs(arr[0] - v);
  for (let i = 1; i < arr.length; i++) {
    const d = Math.abs(arr[i] - v);
    if (d < bestD) {
      best = arr[i];
      bestD = d;
    }
  }
  return best;
}

 // region screen style
function regionScreenStyle(r: any): CSSProperties {
  const wrapper = overlayRef.value?.parentElement;
  if (!wrapper) return {} as CSSProperties;
  const imgEl = document.getElementById('mainImage') as HTMLImageElement | HTMLVideoElement | null;
  if (!imgEl) return {} as CSSProperties;
  const wrapperRect = wrapper.getBoundingClientRect();
  const transformState: TransformState = { panX: state.panX, panY: state.panY, zoom: state.zoom, rotation: state.rotation };
  const screen = imageRectToScreenRect({ x: r.x, y: r.y, w: r.w, h: r.h }, imgEl, wrapperRect, transformState);
  // Convert to overlay-local coordinates (overlay positioned absolute covering wrapper)
  const left = screen.left - wrapperRect.left;
  const top = screen.top - wrapperRect.top;
  return {
    position: 'absolute',
    left: left + 'px',
    top: top + 'px',
    width: screen.width + 'px',
    height: screen.height + 'px'
  } as CSSProperties;
}

// simple validation
function isBelowMinSize(r: any) {
  return r.w < CROPPING.minSize.w || r.h < CROPPING.minSize.h;
}

// export regions (delegates to store export function if present)
function exportRegions() {
  try {
    (store as any).exportRegions?.();
  } catch (e) {
    console.error('exportRegions failed', e);
    store.addToast?.('Export failed', 'warn');
  }
}

/* Drag / resize handlers (basic: move and bottom-right resize) */
function startDragRegion(e: PointerEvent, r: any) {
  activeDragRegion = r;
  dragStartClient = { x: e.clientX, y: e.clientY };
  originalRegion = { x: r.x, y: r.y, w: r.w, h: r.h };
  try { (e.target as Element)?.setPointerCapture?.(e.pointerId); } catch {}
  window.addEventListener('pointermove', dragMove);
  window.addEventListener('pointerup', endDrag);
}

function dragMove(e: PointerEvent) {
  if (!activeDragRegion || !originalRegion) return;
  const dx = e.clientX - dragStartClient.x;
  const dy = e.clientY - dragStartClient.y;
  // convert dx/dy in client coords to image px movement using wrapper transform
  const wrapper = overlayRef.value?.parentElement;
  if (!wrapper) return;
  const imgEl = document.getElementById('mainImage') as HTMLImageElement | HTMLVideoElement | null;
  if (!imgEl) return;
  const wrapperRect = wrapper.getBoundingClientRect();
  const transformState: TransformState = { panX: state.panX, panY: state.panY, zoom: state.zoom, rotation: state.rotation };
  // compute scale (source px -> client px)
  const { scale } = computeImageToViewportParams(imgEl, wrapperRect, transformState);
  const moveX = Math.round(dx / scale);
  const moveY = Math.round(dy / scale);
  activeDragRegion.x = Math.max(0, Math.min(activeDragRegion.x + moveX, (imgEl as any).naturalWidth || (imgEl as any).videoWidth || 0));
  activeDragRegion.y = Math.max(0, Math.min(activeDragRegion.y + moveY, (imgEl as any).naturalHeight || (imgEl as any).videoHeight || 0));
  // update original start to support continuous move
  dragStartClient = { x: e.clientX, y: e.clientY };
}

function endDrag(e: PointerEvent) {
  window.removeEventListener('pointermove', dragMove);
  window.removeEventListener('pointerup', endDrag);
  activeDragRegion = null;
  originalRegion = null;
  try { (e.target as Element)?.releasePointerCapture?.(e.pointerId); } catch {}
  // persist changes
  try { store.saveCurrentProject?.(true); } catch (err) {}
}

function startResize(e: PointerEvent, r: any, handle: string) {
  activeResize = { region: r, handle };
  dragStartClient = { x: e.clientX, y: e.clientY };
  originalRegion = { x: r.x, y: r.y, w: r.w, h: r.h };
  try { (e.target as Element)?.setPointerCapture?.(e.pointerId); } catch {}
  window.addEventListener('pointermove', resizeMove);
  window.addEventListener('pointerup', endResize);
}

function resizeMove(e: PointerEvent) {
  if (!activeResize || !originalRegion) return;
  const dx = e.clientX - dragStartClient.x;
  const dy = e.clientY - dragStartClient.y;
  const wrapper = overlayRef.value?.parentElement;
  if (!wrapper) return;
  const imgEl = document.getElementById('mainImage') as HTMLImageElement | HTMLVideoElement | null;
  if (!imgEl) return;
  const wrapperRect = wrapper.getBoundingClientRect();
  const transformState: TransformState = { panX: state.panX, panY: state.panY, zoom: state.zoom, rotation: state.rotation };
  const { scale } = computeImageToViewportParams(imgEl, wrapperRect, transformState);
  // convert movement to image px
  const moveX = Math.round(dx / scale);
  const moveY = Math.round(dy / scale);
  const r = activeResize.region;
  if (activeResize.handle === 'br') {
    let newW = Math.max(1, originalRegion.w + moveX);
    let newH = Math.max(1, originalRegion.h + moveY);
    if (keyState.shift) {
      // preserve aspect ratio
      const aspect = originalRegion.w / Math.max(1, originalRegion.h);
      if (Math.abs(moveX) > Math.abs(moveY)) {
        newH = Math.round(newW / aspect);
      } else {
        newW = Math.round(newH * aspect);
      }
    }
    if (snapEnabled.value) {
      if (keyState.shift) {
        // snap width preserving aspect
        newW = nearest(snapList, newW);
        newH = Math.round(newW * (originalRegion.h / originalRegion.w));
      } else {
        newW = nearest(snapList, newW);
        newH = nearest(snapList, newH);
      }
    }
    r.w = newW;
    r.h = newH;
  }
}

function endResize(e: PointerEvent) {
  window.removeEventListener('pointermove', resizeMove);
  window.removeEventListener('pointerup', endResize);
  activeResize = null;
  originalRegion = null;
  try { (e.target as Element)?.releasePointerCapture?.(e.pointerId); } catch {}
  try { store.saveCurrentProject?.(true); } catch (err) {}
}

// computeImageToViewportParams is imported from utils and used above

// initialize util reference for direct calls (kept for compatibility with older code paths)
if (!(window as any).__imageCoordsUtil) {
  import('../../utils/imageCoords').then((m) => { (window as any).__imageCoordsUtil = m; }).catch(() => {});
}

// watch for project item changes
// re-load regions when item changes
let lastItemId: string | null = null;
setInterval(() => {
  const it = currentItem.value;
  if ((it && it.id) !== lastItemId) {
    lastItemId = it?.id || null;
    loadRegionsFromItem();
  }
}, 500);

 // expose small API for external code (detector) to add suggested boxes
// Usage: (componentRef as any).addSuggestedBoxes([{x,y,w,h}, ...]) where coords are full-res image pixels
function addSuggestedBoxes(boxes: Array<{ x: number; y: number; w: number; h: number }>) {
  for (const b of boxes) {
    const region = {
      id: newId('s_'),
      name: 'suggestion',
      caption: '',
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      aspect: computeAspectString(b.w, b.h),
      size: [b.w, b.h] as [number, number],
      createdAt: Date.now(),
      _suggested: true
    };
    regions.value.push(region);
  }
}
function selectRegion(r: any) {
  const id = r?.id || null;
  try { store.setSelectedRegion?.(id); } catch (err) { state.selectedRegionId = id; }
  if (r) (r as any)._editing = true;
}

function deleteSelectedRegion(id?: string) {
  const rid = id || state.selectedRegionId;
  if (!rid) return;
  const idx = regions.value.findIndex(rr => rr.id === rid);
  if (idx !== -1) regions.value.splice(idx, 1);
  if (currentItem.value?.regions) {
    const idx2 = currentItem.value.regions.findIndex((rr: any) => rr.id === rid);
    if (idx2 !== -1) currentItem.value.regions.splice(idx2, 1);
  }
  // clear global selection if it referenced the removed region
  if (state.selectedRegionId === rid) state.selectedRegionId = null;
  try { store.saveCurrentProject?.(true); } catch (e) {}
}

defineExpose({ addSuggestedBoxes, selectRegion, deleteSelectedRegion });

</script>

<style scoped>
.crop-overlay {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  user-select: none;
  touch-action: none;
}

.region-box {
  border: 2px dashed rgba(255,255,255,0.9);
  box-sizing: border-box;
  background: rgba(0,0,0,0.12);
  cursor: move;
}
.region-box.invalid {
  border-color: #ff7b7b;
  background: rgba(255,123,123,0.08);
}
.region-box.suggested {
  border-style: solid;
  border-color: #fbbf24;
  background: rgba(251,191,36,0.06);
}

.region-box.active {
  border-style: solid;
  border-color: #60a5fa;
  background: rgba(96,165,250,0.08);
  box-shadow: 0 0 8px rgba(96,165,250,0.25);
  z-index: 1300;
}

.region-label {
  position: absolute;
  top: -20px;
  left: 0;
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: rgba(255,255,255,0.9);
  border: 1px solid rgba(0,0,0,0.2);
  box-sizing: border-box;
}
.handle.br { right: -6px; bottom: -6px; cursor: se-resize; }

.region-preview {
  position: absolute;
  border: 2px dashed rgba(0,0,0,0.9);
  background: rgba(0,0,0,0.06);
  box-sizing: border-box;
}

.overlay-controls {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 1200;
  color: #fff;
  background: rgba(0,0,0,0.45);
  padding: 8px;
  border-radius: 8px;
  min-width: 220px;
  font-size: 13px;
}

.btn.small {
  padding: 4px 8px;
  font-size: 12px;
}
.btn.small.active {
  background: #2563eb;
  color: white;
}
</style>
