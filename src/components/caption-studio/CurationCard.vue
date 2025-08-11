<template>
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;width:100%;gap:12px">
    <div role="status" aria-live="polite" style="margin-top:12px; z-index:1600; display:flex; gap:12px; align-items:center; padding:8px 14px; border-radius:999px; background:linear-gradient(90deg, rgba(2,6,23,0.92), rgba(9,12,20,0.92)); color:#fff; box-shadow:0 8px 30px rgba(0,0,0,0.6); font-weight:600;">
      <span style="display:flex;align-items:center;gap:8px"><i style="font-style:normal">🃏</i> CURATION MODE</span>
      <span style="opacity:0.95; font-size:13px">✓ {{ curationCounts.accepted }} • ✕ {{ curationCounts.rejected }} • {{ curationCounts.remaining }} left</span>
      <span style="opacity:0.85; font-size:13px; margin-left:8px;">Press <strong>Esc</strong> to exit</span>
      <span style="opacity:0.85; font-size:13px; margin-left:10px; display:flex; gap:8px; align-items:center;">
        <span style="display:flex;align-items:center;gap:6px">Hotkeys:</span>
        <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><kbd style="background:transparent; border:0; padding:0; font-weight:700">←</kbd> Reject</span>
        <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><kbd style="background:transparent; border:0; padding:0; font-weight:700">→</kbd> Accept</span>
        <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><kbd style="background:transparent; border:0; padding:0; font-weight:700">Esc</kbd> Exit</span>
      </span>
    </div>

    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%">
      <div
        id="curationCard"
        role="button"
        tabindex="0"
        :style="cardStyle"
        @pointerdown="curationPointerDown"
        @pointermove="curationPointerMove"
        @pointerup="curationPointerUp"
        @pointercancel="curationPointerUp"
      >
        <template v-if="currentItem?.mediaType === 'video'">
          <video :src="currentItem?.img || ''" muted autoplay loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain; background:#000; object-position:center"></video>
        </template>
        <template v-else>
          <img :src="currentItem?.img || ''" style="width:100%;height:100%;object-fit:contain; background:#000; object-position:center" alt="" />
        </template>

        <div v-if="Math.abs(curationTranslateObj.x) > 10" :style="badgeStyle">
          {{ curationTranslateObj.x > 0 ? 'ACCEPT' : 'REJECT' }}
        </div>
      </div>

      <div style="display:flex;gap:12px;align-items:center;margin-top:14px">
        <button class="btn" @click="() => commitCuration('rejected')">Reject</button>
        <button class="btn primary" @click="() => commitCuration('accepted')">Accept</button>
        <button class="btn" @click="() => openCurationExitConfirm()">Exit</button>
      </div>
    </div>

    <!-- Curation exit confirmation dialog (component-local) -->
    <div v-if="showCurationExitConfirm" style="position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:2000;">
      <div style="background:var(--panel-bg,#0f1720); padding:18px; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.6); width:420px;">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0">Exit Curation</h3>
          <button class="btn small" @click="cancelExitCuration">✕</button>
        </div>
        <div style="padding-top:12px">
          <p style="margin:0 0 12px 0">Do you want to remove rejected items from the project when exiting curation mode?</p>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn" @click="cancelExitCuration">Cancel</button>
            <button class="btn" @click="() => confirmExitCuration(false)">Exit (keep rejected)</button>
            <button class="btn primary" @click="() => confirmExitCuration(true)">Exit and remove rejected</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { useCuration } from '../../composables/useCuration';

const store = useProjectStore();

const {
  curationTranslate,
  curationRot,
  curationAnimating,
  showCurationExitConfirm,
  openCurationExitConfirm,
  cancelExitCuration,
  confirmExitCuration,
  curationCounts,
  commitCuration,
  curationPointerDown,
  curationPointerMove,
  curationPointerUp,
} = useCuration();

// currentItem as a computed ref (unwraps in template)
const currentItem = computed(() => store.currentItem());

const cardStyle = computed(() => {
  const tx = (curationTranslate as any).value?.x ?? 0;
  const ty = (curationTranslate as any).value?.y ?? 0;
  const rot = (curationRot as any).value ?? 0;
  const anim = (curationAnimating as any).value ?? false;
  return {
    width: '90%',
    maxWidth: '1100px',
    height: '90%',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    touchAction: 'none',
    transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
    transition: anim ? 'transform 180ms ease-out' : undefined,
    background: '#000',
  } as Record<string, any>;
});

const curationTranslateObj = computed(() => {
  return {
    x: (curationTranslate as any).value?.x ?? 0,
    y: (curationTranslate as any).value?.y ?? 0,
  };
});

const badgeStyle = computed(() => {
  const tx = (curationTranslate as any).value?.x ?? 0;
  return {
    position: 'absolute',
    top: '12px',
    left: tx > 0 ? '12px' : 'auto',
    right: tx < 0 ? '12px' : 'auto',
    padding: '6px 10px',
    borderRadius: '6px',
    background: tx > 0 ? 'rgba(16,185,129,0.9)' : 'rgba(185,28,28,0.9)',
    color: '#fff',
    fontWeight: 700,
    transform: 'translateZ(0)',
  } as Record<string, any>;
});
</script>
