<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

const store = useProjectStore();
const toasts = computed(() => store.state.toasts);

function dismiss(id: string) {
  store.dismissToast(id);
}
</script>

<template>
  <div id="toasts" style="pointer-events:none; position:fixed; right:14px; bottom:14px; z-index:9999">
    <div v-for="t in toasts" :key="t.id" :class="['toast', t.kind]" style="pointer-events:auto; margin-top:8px">
      <div class="row" style="display:flex; gap:8px; align-items:center; justify-content:space-between">
        <div>{{ t.message }}</div>
        <button class="btn small" @click="dismiss(t.id)">Dismiss</button>
      </div>
    </div>
  </div>
</template>