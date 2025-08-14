import { ref, watch, onMounted, onBeforeUnmount, getCurrentInstance, type Ref } from 'vue';

type Options = {
  /**
   * A selector to find focusable toolbar controls, in DOM order.
   * Defaults to buttons, [role="menuitem"], [tabindex].
   */
  focusableSelector?: string;
  /**
   * Keyboard orientation: 'horizontal' | 'vertical'
   */
  orientation?: 'horizontal' | 'vertical';
};

/**
 * Simple roving tabindex manager for a toolbar-like container.
 * - Keeps a single item with tabindex=0, others -1.
 * - Handles ArrowLeft / ArrowRight / Home / End navigation.
 * - Activate (Enter/Space) is left to caller (we synthesize click on Enter/Space).
 */
export function useRovingTabindex(container: Ref<HTMLElement | null>, options: Options = {}) {
  const focusableSelector =
    options.focusableSelector ?? 'button[data-toolbar-id], [role="menuitem"]';
  const orientation = options.orientation ?? 'horizontal';

  const currentIndex = ref(0);

  function getFocusable() {
    const el = container.value;
    if (!el) return [] as HTMLElement[];
    return Array.from(el.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (n) => !n.hasAttribute('disabled') && n.getAttribute('aria-hidden') !== 'true'
    );
  }

  function setTabindexes() {
    const nodes = getFocusable();
    nodes.forEach((n, i) => {
      n.tabIndex = i === currentIndex.value ? 0 : -1;
    });
  }

  function focusIndex(i: number) {
    const nodes = getFocusable();
    if (nodes.length === 0) return;
    const idx = ((i % nodes.length) + nodes.length) % nodes.length;
    currentIndex.value = idx;
    // Focus next tick-ish
    nodes[idx].focus();
    setTabindexes();
  }

  function move(delta: number) {
    const nodes = getFocusable();
    if (nodes.length === 0) return;
    focusIndex(currentIndex.value + delta);
  }

  function handleKeydown(e: KeyboardEvent) {
    const key = e.key;
    const nodes = getFocusable();
    if (nodes.length === 0) return;

    // Ensure currentIndex matches the actually focused element (if any)
    const activeEl = document.activeElement as HTMLElement | null;
    const activeIdx = activeEl ? nodes.indexOf(activeEl) : -1;
    if (activeIdx >= 0) {
      currentIndex.value = activeIdx;
    }

    const horizontal = orientation === 'horizontal';

    if (key === 'ArrowRight' && horizontal) {
      e.preventDefault();
      move(1);
      return;
    }
    if (key === 'ArrowLeft' && horizontal) {
      e.preventDefault();
      move(-1);
      return;
    }
    if (key === 'ArrowDown' && !horizontal) {
      e.preventDefault();
      move(1);
      return;
    }
    if (key === 'ArrowUp' && !horizontal) {
      e.preventDefault();
      move(-1);
      return;
    }
    if (key === 'Home') {
      e.preventDefault();
      focusIndex(0);
      return;
    }
    if (key === 'End') {
      e.preventDefault();
      focusIndex(nodes.length - 1);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      // Activate focused control (synthesize click)
      const active = nodes[currentIndex.value];
      if (active) {
        e.preventDefault();
        (active as HTMLElement).click();
      }
      return;
    }
    // let other keys pass through
  }

 // Keep tabindexes in sync when DOM changes
 let mo: MutationObserver | null = null;
 const inSetup = !!getCurrentInstance();

 if (inSetup) {
   onMounted(() => {
     setTimeout(() => {
       setTabindexes();
     }, 0);

     if (container.value) {
       mo = new MutationObserver(() => {
         setTabindexes();
       });
       mo.observe(container.value, { childList: true, subtree: true, attributes: true });
     }
   });

   onBeforeUnmount(() => {
     if (mo) mo.disconnect();
     mo = null;
   });
 } else {
   // Not in a component setup (e.g. unit tests or top-level usage): initialize immediately
   setTimeout(() => {
     setTabindexes();
   }, 0);

   if (container.value) {
     mo = new MutationObserver(() => {
       setTabindexes();
     });
     mo.observe(container.value, { childList: true, subtree: true, attributes: true });
   }

   // No lifecycle hooks available here to perform cleanup. If consumers need cleanup
   // in this environment, they'd need to disconnect the observer via references.
 }

  // Expose API
  return {
    currentIndex,
    setIndex: (i: number) => focusIndex(i),
    setTabindexes,
    handleKeydown,
    getFocusable,
  };
}
