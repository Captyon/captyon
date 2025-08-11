import { onMounted, onUnmounted } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

type ShortcutsHandlers = {
  applyEditsSafe: () => void;
  prev: () => void;
  next: () => void;
  commitCuration: (status: 'accepted' | 'rejected') => void;
  openCurationExitConfirm: () => void;
  remove?: () => void;
  autoCaptionCurrent?: () => void;
  // any other handlers may be added as needed
};

export function useKeyboardShortcuts(handlers: ShortcutsHandlers) {
  const store = useProjectStore();

  const __cs_onKeyDown = (e: KeyboardEvent) => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    const activeEl = document.activeElement as HTMLElement | null;
    const isEditable = ['input', 'textarea', 'select'].includes(tag) || !!(activeEl && activeEl.isContentEditable);

    // Slash opens search only when not focused in an editable field
    if (e.key === '/' && !['input', 'textarea'].includes(tag)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      try { (document.getElementById('searchBox') as HTMLInputElement | null)?.focus(); } catch {}
      return;
    }
    // If typing in an editable field, don't trigger hotkeys
    if (isEditable) return;

    // Allow arrow keys for curation when active
    if (store.state.curationMode) {
      if (e.key === 'ArrowRight') { e.preventDefault(); handlers.commitCuration('accepted'); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlers.commitCuration('rejected'); return; }
      if (e.key === 'Escape') { e.preventDefault(); handlers.openCurationExitConfirm(); return; }
    }

    // Require Alt for action hotkeys
    if (!e.altKey) return;

    const code = (e as KeyboardEvent).code;
    try {
      if (code === 'KeyS' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); handlers.applyEditsSafe(); return; }
      if (code === 'KeyG' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { handlers.autoCaptionCurrent?.(); } catch(err){ console.error(err);} return; }
      if (code === 'KeyN' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { handlers.prev(); } catch(err){ console.error(err);} return; }
      if (code === 'KeyM' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { handlers.next(); } catch(err){ console.error(err);} return; }
      if (code === 'KeyD' && !e.shiftKey && e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); try { handlers.remove?.(); } catch(err){ console.error(err);} return; }
    } catch (err) { console.error('useKeyboardShortcuts: Shortcut handler error', err); }
  };

  const __cs_onKeyUp = (e: KeyboardEvent) => {
    // fallback: prevent default on keyup for combos that might slip through
    if (!(e.ctrlKey || e.metaKey)) return;
    const code = (e as KeyboardEvent).code;
    if (['KeyS','KeyG','KeyN','KeyM','KeyD'].includes(code) && e.altKey) {
      try { e.preventDefault(); e.stopImmediatePropagation(); } catch(ex) {}
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', __cs_onKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', __cs_onKeyUp, { capture: true, passive: false });
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', __cs_onKeyDown, true);
    window.removeEventListener('keyup', __cs_onKeyUp, true);
  });
}
