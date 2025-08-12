<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    :aria-hidden="ariaHidden ? 'true' : 'false'"
    role="img"
    v-bind="$attrs"
  >
    <g v-html="path" :fill="color"></g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  name: string;
  size?: number | string;
  ariaHidden?: boolean;
  color?: string;
}>();

const size = props.size ?? 20;
const ariaHidden = props.ariaHidden ?? true;
const color = props.color ?? 'currentColor';

const ICONS: Record<string, string> = {
  more: '<path fill="currentColor" d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/>',
  bold: '<path fill="currentColor" d="M7 7h5.5a3.5 3.5 0 110 7H7V7zm0 9h6.5a3.5 3.5 0 110 7H7v-7z" transform="translate(0 -6)"/>',
  italic: '<path fill="currentColor" d="M10 4h8v2h-3.5L8.5 20H12v2H4v-2h3.5L15.5 6H12V4z"/>',
  save: '<path fill="currentColor" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zM12 19a3 3 0 110-6 3 3 0 010 6zM7 7h6v4H7z"/>',
  trash: '<path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 11a2 2 0 01-2 2H9a2 2 0 01-2-2L6 9z"/>',
  settings: '<path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 5.06l-1.12-.65a7.02 7.02 0 000-2.82l1.12-.65a1 1 0 00.38-1.36l-1.06-1.84a1 1 0 00-1.22-.45l-1.32.52a7.09 7.09 0 00-2.44-1.41l-.2-1.4A1 1 0 0012.6 1h-2.2a1 1 0 00-.99.86l-.2 1.4a7.09 7.09 0 00-2.44 1.41l-1.32-.52a1 1 0 00-1.22.45L2.7 7.58a1 1 0 00.38 1.36l1.12.65a7.02 7.02 0 000 2.82l-1.12.65a1 1 0 00-.38 1.36l1.06 1.84a1 1 0 001.22.45l1.32-.52a7.09 7.09 0 002.44 1.41l.2 1.4A1 1 0 0010.4 23h2.2a1 1 0 00.99-.86l.2-1.4a7.09 7.09 0 002.44-1.41l1.32.52a1 1 0 001.22-.45l1.06-1.84a1 1 0 00-.38-1.36z"/>',
};

const path = computed(() => ICONS[props.name] ?? ICONS['more']);
</script>
