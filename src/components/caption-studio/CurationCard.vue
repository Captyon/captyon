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
    </div>

    <!-- Improved Curation exit confirmation dialog (teleported to body so it's outside transformed stacking contexts) -->
    <teleport to="body">
      <div
        v-if="showCurationExitConfirm"
        class="cs-curation-modal-backdrop"
        @keydown.stop.prevent="onModalKeyDown"
        style="position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:99999; pointer-events:auto;"
        aria-hidden="false"
      >
        <!-- Backdrop to block pointer events on underlying UI -->
        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.45);"></div>

        <!-- Modal panel -->
        <div
          ref="modalPanel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'cs-curation-exit-title'"
          :aria-describedby="'cs-curation-exit-desc'"
          tabindex="-1"
          style="position:relative; background:var(--panel-bg,#0f1720); padding:20px; border-radius:10px; box-shadow:0 12px 40px rgba(0,0,0,0.7); width:460px; max-width:94%; z-index:100000; outline: none; color: #e6eef8;"
        >
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 id="cs-curation-exit-title" style="margin:0; font-size:18px;">Exit Curation</h3>
            <button class="btn small" @click="cancelExitCuration" aria-label="Close dialog">✕</button>
          </div>

          <div id="cs-curation-exit-desc" style="padding-top:12px; color:inherit; font-size:14px;">
            <p style="margin:0 0 10px 0; color:inherit;">
              You have <strong>{{ curationCounts.rejected }}</strong> rejected item<span v-if="curationCounts.rejected !== 1">s</span> and <strong>{{ curationCounts.remaining }}</strong> remaining.
              Do you want to remove rejected items from the project when exiting curation mode?
            </p>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
              <button class="btn" @click="cancelExitCuration" ref="firstAction">Cancel</button>
              <button class="btn" @click="() => confirmExitCuration(false)">Exit (keep rejected)</button>
              <button
                class="btn"
                :style="destructiveStyle"
                @click="() => confirmExitCuration(true)"
                ref="destructiveAction"
              >
                Exit and remove rejected
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
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
  curationCounts
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
    // Apply global pan/zoom from viewer state so curation respects zooming.
    // Order: global pan -> curation translate -> scale -> rotate
    transform: `translate(${store.state.panX}px, ${store.state.panY}px) translate(${tx}px, ${ty}px) scale(${store.state.zoom/100}) rotate(${rot}deg)`,
    transition: anim ? 'transform 250ms ease-out' : undefined,
    background: '#000',
    // Ensure the card cannot cover the modal when modal is open by lowering pointer-events
    pointerEvents: showCurationExitConfirm.value ? 'none' : undefined,
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

// Modal focus management
const modalPanel = ref<HTMLElement | null>(null);
const firstAction = ref<HTMLElement | null>(null);
const destructiveAction = ref<HTMLElement | null>(null);

const destructiveStyle = {
  background: 'rgba(220,38,38,0.92)',
  color: '#fff',
  borderRadius: '6px',
  padding: '8px 12px',
  fontWeight: 700,
};

// Handle Escape and simple focus-trap for the modal
function onModalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    // Prevent Escape from reaching global handlers and close the modal only.
    e.stopPropagation();
    e.preventDefault();
    cancelExitCuration();
    return;
  }

  if (e.key === 'Tab') {
    const focusables: HTMLElement[] = [];
    if (firstAction.value) focusables.push(firstAction.value);
    if (destructiveAction.value) focusables.push(destructiveAction.value);
    // If no managed focusables, let browser handle
    if (focusables.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const idx = focusables.indexOf(active as HTMLElement);
    if (e.shiftKey) {
      if (idx === -1 || idx === 0) {
        e.preventDefault();
        focusables[focusables.length - 1].focus();
      }
    } else {
      if (idx === -1 || idx === focusables.length - 1) {
        e.preventDefault();
        focusables[0].focus();
      }
    }
  }
}

watch(showCurationExitConfirm, async (val) => {
  if (val) {
    await nextTick();
    try {
      // Focus first action for keyboard users
      (firstAction.value || modalPanel.value)?.focus();
    } catch {}
  }
});

 // When there are no remaining un-curated items, open the exit-confirm dialog so the user
// can choose whether to remove rejected items or just exit curation mode.
// Watch the composable's curationCounts (works whether it's a plain object or a ref).
const remainingFromCuration = computed(() => {
  const cc: any = curationCounts as any;
  if (!cc) return 0;
  if (typeof cc.value !== 'undefined') return cc.value?.remaining ?? 0;
  return cc?.remaining ?? 0;
});

watch(remainingFromCuration, (remaining) => {
  if (remaining === 0 && store.state.curationMode && !showCurationExitConfirm.value) {
    setTimeout(() => {
      try {
        openCurationExitConfirm();
      } catch {}
    }, 300);
  }
});
</script>
