import { ref, watch, onMounted, onBeforeUnmount, nextTick, getCurrentInstance, type Ref } from 'vue';

/**
 * ToolbarItem types (also mirrored/used by Toolbar.vue)
 */
export type ToolbarActionItem = {
  type: 'action';
  id: string;
  label: string;
  icon?: string; // icon name or inline SVG string - Toolbar will accept either but measurement uses rendered node
  onClick?: () => void;
  priority?: number;
  disabled?: boolean;
  tooltip?: string;
};

export type ToolbarToggleItem = {
  type: 'toggle';
  id: string;
  label: string;
  icon?: string;
  modelValue: boolean;
  onUpdate: (v: boolean) => void;
  priority?: number;
  disabled?: boolean;
  tooltip?: string;
};

export type ToolbarMenuItem = {
  type: 'menu';
  id: string;
  label: string;
  icon?: string;
  items: ToolbarItem[];
  priority?: number;
  disabled?: boolean;
  tooltip?: string;
};

export type ToolbarSeparatorItem = {
  type: 'separator';
  id: string;
};

export type ToolbarItem = ToolbarActionItem | ToolbarToggleItem | ToolbarMenuItem | ToolbarSeparatorItem;

type Options = {
  getPriority?: (item: ToolbarItem) => number;
  overflowButtonSelector?: string; // selector within container for overflow reserve
};

type CacheEntry = {
  width: number;
  measuredAt: number;
};

export function useOverflow(
  el: Ref<HTMLElement | null>,
  items: Ref<any[]>,
  options: Options = {}
) {
  const visibleItems = ref<ToolbarItem[]>(items.value ? items.value.slice() : []);
  const overflowItems = ref<ToolbarItem[]>([]);
  const cache = new Map<string, CacheEntry>();
  let ro: ResizeObserver | null = null;
  let raf = 0;

  const getPriority = options.getPriority ?? ((i: ToolbarItem) => (i && (i as any).priority != null ? (i as any).priority : 0));
  const overflowButtonSelector = options.overflowButtonSelector ?? '[data-overflow-button]';

  // Helper: measure all children widths and cache by item id
  async function measureAll() {
    // Batch measurements within a rAF to avoid layout thrash
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const container = el.value;
      if (!container) return;

      // find overflow button width to reserve
      const overflowBtn = container.querySelector(overflowButtonSelector) as HTMLElement | null;
      const overflowBtnWidth = overflowBtn ? Math.ceil(overflowBtn.getBoundingClientRect().width) : 0;

      // Measure each item element once, cache width
      const now = Date.now();
      const children = Array.from(container.querySelectorAll<HTMLElement>('[data-toolbar-id]'));

      // Do a single loop to call getBoundingClientRect once per element
      for (const child of children) {
        const id = child.dataset.toolbarId;
        if (!id) continue;
        // For separators, we still record width
        const rect = child.getBoundingClientRect();
        cache.set(id, { width: Math.ceil(rect.width), measuredAt: now });
      }

      // Now compute visibility using cached widths
      computeVisible(overflowBtnWidth);
    });
  }

  function computeVisible(overflowBtnWidth: number) {
    const container = el.value;
    if (!container) return;

    const containerWidth = Math.floor(container.getBoundingClientRect().width);
    // If the container has no measurable width (e.g. jsdom), skip adjusting visibility.
    // This prevents tests from having all items moved to overflow due to a 0 width.
    if (containerWidth <= 0) {
      return;
    }

    const availableWidth = containerWidth - overflowBtnWidth - 1; // small safety margin
    if (availableWidth <= 0) {
      // everything into overflow except maybe separators collapsed
      visibleItems.value = [];
      overflowItems.value = items.value.slice();
      return;
    }

    // Prepare array of items with widths (use cache fallback)
    const idToItem = new Map<string, ToolbarItem>();
    items.value.forEach((it) => idToItem.set(it.id, it));

    // Build list preserving original order for primary keeping, but move lowest priority items
    // We'll create a working array of { item, width, priority, originalIndex }
    const working = items.value.map((it, idx) => {
      const width = cache.get(it.id)?.width ?? 48; // fallback minimal clickable width
      return {
        item: it,
        width,
        priority: getPriority(it),
        originalIndex: idx,
      };
    });

    // Sum of all widths
    const totalWidth = working.reduce((s, w) => s + w.width, 0);

    if (totalWidth <= availableWidth) {
      // everything fits
      visibleItems.value = items.value.slice();
      overflowItems.value = [];
      return;
    }

    // Priority+: we will try to keep the highest priority items visible.
    // Make a sorted list of indices by ascending priority then by originalIndex (so lower priority first to remove)
    const removable = [...working].sort((a, b) =>
      a.priority === b.priority ? a.originalIndex - b.originalIndex : a.priority - b.priority
    );

    // Start with all visible, then remove from visible the lowest priority items until width fits
    const visibleSet = new Set(items.value.map((it) => it.id));
    let currentWidth = totalWidth;

    // Reserve for overflow button: ensure overflow button is present when any are removed
    // Subtracting overflowBtnWidth already applied in availableWidth earlier

    for (const rem of removable) {
      if (currentWidth <= availableWidth) break;
      // Do not remove items that are separators placed adjacent - we remove them but keep logic simple
      visibleSet.delete(rem.item.id);
      currentWidth -= rem.width;
    }

    // Compose visibleItems in original order
    const vis = items.value.filter((it) => visibleSet.has(it.id));
    const ovf = items.value.filter((it) => !visibleSet.has(it.id));

    visibleItems.value = vis;
    overflowItems.value = ovf;
  }

  function remeasure() {
    // Force measuring items. Wait for nextTick to ensure DOM updates
    nextTick().then(() => measureAll());
  }

  const inSetup = !!getCurrentInstance();

  function setupObservers() {
    // Observe size changes of container
    if (!el.value) return;

    ro = new ResizeObserver(() => {
      remeasure();
    });
    ro.observe(el.value);

    // watch items changes shallowly and remeasure
    watch(
      items,
      () => {
        remeasure();
      },
      { deep: true }
    );

    // initial measurement after mount / immediate usage
    remeasure();
  }

  function cleanup() {
    if (ro && el.value) ro.unobserve(el.value);
    ro = null;
    cancelAnimationFrame(raf);
  }

  if (inSetup) {
    onMounted(setupObservers);
    onBeforeUnmount(cleanup);
  } else {
    // Running outside a component (e.g., unit tests) — initialize immediately.
    setupObservers();
  }

  return {
    visibleItems,
    overflowItems,
    remeasure,
    // Testing helpers (non-exported in production if needed)
    __cache: cache,
  };
}
