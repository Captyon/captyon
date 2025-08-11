<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

const store = useProjectStore();
const toasts = computed(() => store.state.toasts);

// duration should match auto dismiss timeout in addToast
const DURATION = 7000;

function dismiss(id: string) {
  store.dismissToast(id);
}
</script>

<template>
  <div id="toasts" class="toast-container">
    <transition-group name="toast" tag="div">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast', t.kind]"
        @click.self="dismiss(t.id)"
      >
        <div class="toast-icon">
          <svg v-if="t.kind === 'ok'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="t.kind === 'warn'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v4m0 4h.01M5.07 19h13.86L12 5.5 5.07 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="t.kind === 'danger'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M12 16v-4m0-4h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="toast-message">{{ t.message }}</div>
        <button class="toast-close" @click.stop="dismiss(t.id)">×</button>
        <div class="toast-progress" :style="{ '--toast-duration': DURATION + 'ms' }"></div>
      </div>
    </transition-group>
  </div>
</template>