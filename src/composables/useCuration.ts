import { ref, computed } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

let _sharedCuration: any = null;

export function useCuration() {
  if (_sharedCuration) return _sharedCuration;
  const store = useProjectStore();

  // translation/rotation for the draggable curation card
  const curationTranslate = ref({ x: 0, y: 0 });
  const curationRot = ref(0);
  const curationDragging = ref(false);
  const curationStart = ref({ x: 0, y: 0 });
  const curationPointerId = ref<number | null>(null);
  const curationAnimating = ref(false);
  const CURATION_THRESHOLD = 120; // pixels to consider swipe committed

  // small internal flag shown by a local modal/dialog to confirm removal of rejected items
  const showCurationExitConfirm = ref(false);

  function openCurationExitConfirm() {
    showCurationExitConfirm.value = true;
  }

  function cancelExitCuration() {
    showCurationExitConfirm.value = false;
  }

  /**
   * Called when user confirms exiting curation mode.
   * If removeRejected is true, also remove rejected items from the project.
   */
  function confirmExitCuration(removeRejected = false) {
    try {
      store.stopCuration();
      if (removeRejected) {
        store.removeRejectedFromProject();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('useCuration.confirmExitCuration error', e);
    } finally {
      showCurationExitConfirm.value = false;
    }
  }

  const curationCounts = computed(() => {
    const proj = store.getCurrentProject();
    if (!proj) return { accepted: 0, rejected: 0, remaining: 0 };
    const accepted = proj.items.filter((i: any) => i.curationStatus === 'accepted').length;
    const rejected = proj.items.filter((i: any) => i.curationStatus === 'rejected').length;
    const remaining = proj.items.filter((i: any) => !i.curationStatus).length;
    return { accepted, rejected, remaining };
  });

  function resetCurationCard(animate = true) {
    if (animate) {
      curationAnimating.value = true;
      // animate back to center
      curationTranslate.value = { x: 0, y: 0 };
      curationRot.value = 0;
      setTimeout(() => {
        curationAnimating.value = false;
      }, 200);
    } else {
      curationTranslate.value = { x: 0, y: 0 };
      curationRot.value = 0;
      curationAnimating.value = false;
    }
  }

  function commitCuration(status: 'accepted' | 'rejected') {
    const it = store.currentItem();
    if (!it) return;
    // animate card off-screen
    curationAnimating.value = true;
    try {
      curationTranslate.value = { x: status === 'accepted' ? window.innerWidth : -window.innerWidth, y: 0 };
    } catch {
      // fallback for environments without window (shouldn't happen in browser)
      curationTranslate.value = { x: status === 'accepted' ? 1000 : -1000, y: 0 };
    }
    curationRot.value = status === 'accepted' ? 18 : -18;
    // Wait for the animation to finish before persisting the curation status so the animation is visible.
    setTimeout(() => {
      try {
        store.setCurationStatus(it.id, status);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('useCuration.commitCuration setCurationStatus error', e);
      } finally {
        // after persisting, reset for next card
        curationAnimating.value = false;
        curationTranslate.value = { x: 0, y: 0 };
        curationRot.value = 0;
      }
    }, 250);
  }

  function curationPointerDown(e: PointerEvent) {
    // Ignore pointer input while the exit-confirm dialog is open so the card/canvas
    // cannot steal interactions from the modal.
    if (showCurationExitConfirm.value) return;
    if (curationAnimating.value) return;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
    curationPointerId.value = e.pointerId;
    curationDragging.value = true;
    curationStart.value = { x: e.clientX, y: e.clientY };
  }

  function curationPointerMove(e: PointerEvent) {
    // If the exit-confirm modal is open, ignore pointer moves.
    if (showCurationExitConfirm.value) return;
    if (!curationDragging.value || curationPointerId.value !== e.pointerId) return;
    const dx = e.clientX - curationStart.value.x;
    const dy = e.clientY - curationStart.value.y;
    curationTranslate.value = { x: dx, y: dy };
    // small rotation proportional to horizontal displacement
    curationRot.value = Math.max(-25, Math.min(25, dx / 12));
  }

function curationPointerUp(e: PointerEvent) {
    // Ignore pointer up if the exit-confirm modal is visible.
    if (showCurationExitConfirm.value) return;
    if (!curationDragging.value) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    curationDragging.value = false;
    resetCurationCard(true);
  }

  const api = {
    curationTranslate,
    curationRot,
    curationDragging,
    curationStart,
    curationPointerId,
    curationAnimating,
    CURATION_THRESHOLD,
    showCurationExitConfirm,
    openCurationExitConfirm,
    cancelExitCuration,
    confirmExitCuration,
    curationCounts,
    resetCurationCard,
    commitCuration,
    curationPointerDown,
    curationPointerMove,
    curationPointerUp,
  };
  _sharedCuration = api;
  return api;
}
