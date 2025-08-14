<template>
  <nav
    ref="containerRef"
    class="tb"
    role="toolbar"
    :aria-label="ariaLabel"
    @keydown="onKeydown"
  >
    <!-- Measurement rack (offscreen) used by useOverflow to cache intrinsic widths -->
      <div class="tb__measure" aria-hidden="true">
      <div v-for="item in itemsList" :key="(item as any).id + '-m'">
        <div v-if="item.type === 'separator'" class="tb__sep" :data-toolbar-id="(item as any).id" />
        <div v-else class="tb__stub" :data-toolbar-id="(item as any).id">
          <span class="tb__icon-stub" />
          <span class="tb__label">{{ (item as any).label ?? '' }}</span>
        </div>
      </div>

      <!-- Overflow button stub to reserve width -->
      <button data-overflow-button-stub class="tb__button tb__overflow-stub" aria-hidden="true"></button>
    </div>

    <!-- Left slot (custom region) -->
    <div class="tb__region tb__region--left">
      <slot name="left" />
    </div>

    <!-- Main rail -->
      <div class="tb__rail" ref="railRef">
      <template v-for="item in visibleItems" :key="(item as any).id">
        <!-- Separator -->
        <div v-if="item.type === 'separator'" class="tb__sep" :data-toolbar-id="(item as any).id" aria-hidden="true" />

        <!-- Action -->
        <button
          v-else-if="item.type === 'action'"
          :id="(item as any).id"
          class="tb__button"
          :class="{ 'is-disabled': (item as any).disabled }"
          :data-toolbar-id="(item as any).id"
          :title="(item as any).tooltip ?? (item as any).label"
          :aria-label="(item as any).label"
          @click="onActionClick(item as ToolbarActionItem)"
          data-roving="true"
        >
          <Icon v-if="(item as any).icon" :name="String((item as any).icon)" :ariaHidden="true" />
          <span class="tb__label">{{ (item as any).label }}</span>
        </button>

        <!-- Toggle -->
        <button
          v-else-if="item.type === 'toggle'"
          :id="(item as any).id"
          class="tb__toggle"
          :class="{ 'is-disabled': (item as any).disabled, 'is-on': (item as any).modelValue }"
          :data-toolbar-id="(item as any).id"
          role="switch"
          :aria-checked="(item as any).modelValue ? 'true' : 'false'"
          :aria-label="(item as any).label"
          :title="(item as any).tooltip ?? (item as any).label"
          @click="onToggleClick(item as ToolbarToggleItem)"
          data-roving="true"
        >
          <Icon v-if="(item as any).icon" :name="String((item as any).icon)" :ariaHidden="true" />
          <span class="tb__label">{{ (item as any).label }}</span>
        </button>

        <!-- Menu (top-level) -->
        <div v-else-if="item.type === 'menu'" class="tb__menu-wrap" :data-toolbar-id="(item as any).id">
          <button
            :id="(item as any).id"
            class="tb__button tb__menu-button"
            aria-haspopup="menu"
            :aria-expanded="false"
            :aria-label="(item as any).label"
            :title="(item as any).tooltip ?? (item as any).label"
            data-roving="true"
          >
            <Icon v-if="(item as any).icon" :name="String((item as any).icon)" :ariaHidden="true" />
            <span class="tb__label">{{ (item as any).label }}</span>
          </button>
          <!-- Submenu rendering can be added here (deferred) -->
        </div>

        <!-- Fallback -->
        <div v-else :data-toolbar-id="(item as any).id" />
      </template>

      <!-- Overflow button (always present, reserves space) -->
      <div class="tb__overflow">
        <button
          class="tb__button tb__overflow-button"
          :aria-expanded="isOverflowOpen ? 'true' : 'false'"
          aria-haspopup="menu"
          aria-controls="overflow-menu"
          data-overflow-button
          @click="toggleOverflow"
          @keydown.stop
          ref="overflowButtonRef"
          :title="overflowItemsTitle"
        >
          <Icon name="more" :ariaHidden="true" />
          <span class="tb__label visually-hidden">More</span>
        </button>

        <div
          v-if="isOverflowOpen && overflowItems.length"
          id="overflow-menu"
          role="menu"
          class="tb__menu"
          ref="overflowMenuRef"
          @keydown="onOverflowKeydown"
        >
          <template v-for="item in overflowItems" :key="(item as any).id + '-ovf'">
            <button
              v-if="item.type === 'action'"
              class="tb__button"
              role="menuitem"
              :aria-label="(item as any).label"
              @click="onActionClick(item as ToolbarActionItem)"
            >
              <Icon v-if="(item as any).icon" :name="String((item as any).icon)" :ariaHidden="true" />
              <span class="tb__label">{{ (item as any).label }}</span>
            </button>

            <button
              v-else-if="item.type === 'toggle'"
              class="tb__toggle"
              role="menuitem"
              :aria-checked="(item as any).modelValue ? 'true' : 'false'"
              @click="onToggleClick(item as ToolbarToggleItem)"
            >
              <Icon v-if="(item as any).icon" :name="String((item as any).icon)" :ariaHidden="true" />
              <span class="tb__label">{{ (item as any).label }}</span>
            </button>

            <div v-else-if="item.type === 'separator'" class="tb__sep" aria-hidden="true" />

            <div v-else role="menuitem">
              <span class="tb__label">{{ (item as any).label ?? '' }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Right slot (custom region) -->
    <div class="tb__region tb__region--right">
      <slot name="right" />
    </div>
  </nav>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import Icon from '../Icon.vue';
import {
  useOverflow,
  type ToolbarItem,
  type ToolbarActionItem,
  type ToolbarToggleItem,
} from '../../composables/useOverflow';
import { useRovingTabindex } from '../../composables/useRovingTabindex';

const props = defineProps<{
  items?: ToolbarItem[];
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'action', payload: { id: string }): void;
  (e: 'update:modelValue', payload: { id: string; value: boolean } | boolean): void;
}>();

const ariaLabel = props.ariaLabel ?? 'Editor toolbar';

const containerRef = ref<HTMLElement | null>(null);
const railRef = ref<HTMLElement | null>(null);
const overflowMenuRef = ref<HTMLElement | null>(null);
const overflowButtonRef = ref<HTMLElement | null>(null);

const itemsList = computed<ToolbarItem[]>(() => props.items ?? []);

// Overflow controller
const overflowCtrl = useOverflow(containerRef, itemsList, {
  getPriority: (it: ToolbarItem) => {
    return (it as any).priority ?? 0;
  },
  overflowButtonSelector: '[data-overflow-button], [data-overflow-button-stub]',
});

// destructure refs for template clarity
const visibleItemsRef = overflowCtrl.visibleItems;
const overflowItemsRef = overflowCtrl.overflowItems;
const remeasure = overflowCtrl.remeasure;

const visibleItems = computed(() => visibleItemsRef.value ?? []);
const overflowItems = computed(() => overflowItemsRef.value ?? []);

const isOverflowOpen = ref(false);

const overflowItemsTitle = computed(() =>
  (overflowItems.value.length ?? 0) ? 'More actions' : 'No extra actions'
);

// Roving tabindex
const roving = useRovingTabindex(containerRef, { orientation: 'horizontal' });

function closeOverflow() {
  isOverflowOpen.value = false;
  nextTick(() => overflowButtonRef.value?.focus());
}

function toggleOverflow() {
  isOverflowOpen.value = !isOverflowOpen.value;
  if (isOverflowOpen.value) {
    nextTick(() => {
      const first = overflowMenuRef.value?.querySelector<HTMLElement>('button, [role="menuitem"]');
      first?.focus();
    });
  } else {
    nextTick(() => overflowButtonRef.value?.focus());
  }
}

function onKeydown(e: KeyboardEvent) {
  roving.handleKeydown(e);
  if (e.key === 'Escape') {
    if (isOverflowOpen.value) {
      e.stopPropagation();
      closeOverflow();
    }
  }
}

function onOverflowKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeOverflow();
    return;
  }
  roving.handleKeydown(e);
}

function onActionClick(item: ToolbarActionItem) {
  if ((item as any).disabled) return;
  emit('action', { id: item.id });
  item.onClick?.();
}

function onToggleClick(item: ToolbarToggleItem) {
  if ((item as any).disabled) return;
  const next = !item.modelValue;
  item.onUpdate?.(next);
  emit('update:modelValue', { id: item.id, value: next });
}

// Close overflow on outside click
function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node | null;
  if (!target) return;
  if (isOverflowOpen.value) {
    const menu = overflowMenuRef.value;
    const btn = overflowButtonRef.value;
    if (menu && !menu.contains(target) && btn && !btn.contains(target)) {
      closeOverflow();
    }
  }
}

onMounted(() => {
  window.addEventListener('click', onDocumentClick);
  nextTick(() => {
    roving.setTabindexes();
    remeasure();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('click', onDocumentClick);
});

watch(
  () => props.items,
  () => {
    nextTick(() => remeasure());
  },
  { deep: true }
);
</script>

<style scoped>
/* Toolbar variables */
:root {
  --tb-height: clamp(40px, 5vw, 56px);
  --tb-gap: clamp(4px, 1.2vw, 10px);
  --tb-pad-x: clamp(8px, 2.5vw, 16px);
  --tb-radius: 10px;
  --tb-border: 1px;
  --tb-bg: #ffffff;
  --tb-ink: #111827;
  --tb-muted: #6b7280;
  --tb-accent: #2563eb;
  --tb-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

/* Core layout: grid with auto-flow column */
.tb {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: center;
  gap: var(--tb-gap);
  padding: 6px;
  padding-inline: max(var(--tb-pad-x), env(safe-area-inset-left));
  padding-inline-end: max(var(--tb-pad-x), env(safe-area-inset-right));
  background: var(--tb-bg);
  color: var(--tb-ink);
  border-radius: var(--tb-radius);
  box-shadow: var(--tb-shadow);
  user-select: none;
  width: 100%;
  box-sizing: border-box;
}

/* Regions */
.tb__region {
  display: flex;
  align-items: center;
  gap: var(--tb-gap);
}
.tb__region--left {
  justify-content: flex-start;
  min-width: 0;
}
.tb__region--right {
  justify-content: flex-end;
  min-width: 0;
}

/* The main rail holds items + overflow */
.tb__rail {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  align-items: center;
  gap: var(--tb-gap);
  min-width: 0;
}

/* Measurement rack (offscreen) */
.tb__measure {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: auto;
  height: auto;
  visibility: hidden;
  pointer-events: none;
  overflow: hidden;
}

/* Item primitives */
.tb__item {
  min-width: 40px;
  min-height: 40px;
}

.tb__button,
.tb__toggle,
.tb__menu-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: var(--tb-height);
  padding: 0 10px;
  border-radius: 8px;
  border: var(--tb-border) solid transparent;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  line-height: 1;
  min-width: 40px;
  min-height: 40px;
}

.tb__button:focus,
.tb__toggle:focus,
.tb__menu-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.18);
  border-color: rgba(37,99,235,0.2);
}

/* Disabled */
.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* Toggle state */
.tb__toggle.is-on {
  background: rgba(37,99,235,0.06);
  color: var(--tb-accent);
}

/* Separator */
.tb__sep {
  width: 1px;
  height: 24px;
  background: var(--tb-border-color, #e5e7eb);
  margin-inline: 6px;
  align-self: center;
}

/* Overflow area */
.tb__overflow {
  position: relative;
}
.tb__menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: var(--tb-bg);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
  z-index: 50;
}

/* Labels hidden for compact items (via media queries) */
.tb__label {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Visually hidden helper */
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0 0 0 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Tooltips (simple) */
[role="tooltip"] {
  position: absolute;
  background: #111827;
  color: #fff;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 60;
  transform-origin: top center;
  transition: opacity 120ms ease;
}

/* Icon sizing */
.tb__button svg,
.tb__toggle svg,
.tb__menu-button svg {
  width: clamp(20px, 3.5vw, 22px);
  height: clamp(20px, 3.5vw, 22px);
  display: block;
}

/* Responsive behaviors */
/* ≥1280 keep labels visible */
@media (min-width: 1280px) {
  .tb__label { display: inline; }
}

/* ≥1024 keep most labels visible */
@media (min-width: 1024px) and (max-width: 1279px) {
  .tb__label { display: inline; }
}

/* ≥768 compact: hide labels for low-priority via attribute? 
   For simplicity, hide labels when container is small - spacing via clamp handles many cases */
@media (max-width: 1023px) {
  .tb__button .tb__label { display: none; }
  .tb__toggle.is-on .tb__label { display: inline; }
}

/* Tiny screens - icons only for low priorities; keep primary visible until 360px then icon-only */
@media (max-width: 360px) {
  .tb__button .tb__label { display: none; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
</style>
