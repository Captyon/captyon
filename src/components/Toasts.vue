<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useProjectStore } from '../store/useProjectStore';
import { markToastSeen, dismissToast, clearToasts, DEFAULT_DURATION } from '../store/project/toasts';
import type { ToastItem } from '../types';

const store = useProjectStore();
const toasts = computed(() => store.state.toasts as ToastItem[]);

// UI state
const trayOpen = ref(false);
const transientVisible = ref(false);
const transientToast = ref<ToastItem | null>(null);
let transientTimer: number | undefined;
let progressStart = 0;
let remaining = DEFAULT_DURATION;

// Unread count (toasts with seen=false)
const unreadCount = computed(() => toasts.value.filter(t => !t.seen).length);

// reversed toasts for display (newest first)
const reversedToasts = computed(() => [...toasts.value].reverse());

// When tray opens, mark toasts as seen
watch(trayOpen, (val) => {
  if (val) {
    toasts.value.forEach(t => markToastSeen(t.id));
  }
});

// Show transient overlay for newest toast when tray is closed
function showTransientIfNeeded() {
  if (trayOpen.value) return;
  if (!toasts.value.length) {
    transientVisible.value = false;
    transientToast.value = null;
    return;
  }
  const newest = toasts.value[toasts.value.length - 1];
  if (!newest) return;
  transientToast.value = newest;
  transientVisible.value = true;
  remaining = newest.pinned ? Infinity : DEFAULT_DURATION;
  startTransientTimer();
}

function startTransientTimer() {
  clearTransientTimer();
  if (!transientVisible.value || !isFinite(remaining)) return;
  progressStart = Date.now();
  transientTimer = window.setTimeout(() => {
    transientVisible.value = false;
    transientToast.value = null;
  }, remaining);
}

function clearTransientTimer() {
  if (transientTimer !== undefined) {
    window.clearTimeout(transientTimer);
    transientTimer = undefined;
  }
}

// Pause progress on hover
function pauseTransient() {
  if (!transientTimer) return;
  const elapsed = Date.now() - progressStart;
  remaining = Math.max(0, remaining - elapsed);
  clearTransientTimer();
}

function resumeTransient() {
  if (!transientVisible.value || !isFinite(remaining)) return;
  startTransientTimer();
}

// Dismiss handlers
function handleDismiss(id: string) {
  dismissToast(id);
  // if dismissed toast was transient, hide overlay
  if (transientToast.value && transientToast.value.id === id) {
    transientVisible.value = false;
    transientToast.value = null;
    clearTransientTimer();
  }
}

function toggleTray() {
  trayOpen.value = !trayOpen.value;
}

// Watch for new toasts
let lastToastCount = toasts.value.length;
watch(toasts, (newVal) => {
  if (newVal.length > lastToastCount) {
    // new toast added
    showTransientIfNeeded();
  }
  lastToastCount = newVal.length;
}, { deep: true });

// Initialize transient on mount
onMounted(() => {
  showTransientIfNeeded();
});

onBeforeUnmount(() => {
  clearTransientTimer();
});
</script>

<template>
  <!-- Tray button (bottom-right) -->
  <div class="toast-tray" :class="{ open: trayOpen }" aria-live="polite">
    <button class="toast-tray-button" @click="toggleTray" :aria-expanded="trayOpen">
      <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2C7.59 2 4 5.59 4 10v3l-2 2v1h20v-1l-2-2v-3c0-4.41-3.59-8-8-8z" fill="currentColor"/>
      </svg>
      <span v-if="unreadCount > 0" class="tray-badge">{{ unreadCount }}</span>
    </button>

    <!-- Expanded panel -->
    <div v-if="trayOpen" class="toast-panel" role="region" aria-label="Notifications">
      <div class="toast-panel-header">
        <strong>Notifications</strong>
        <div class="toast-panel-actions">
          <button class="btn small" @click="clearToasts()">Clear all</button>
        </div>
      </div>
      <div class="toast-list">
        <div v-for="t in reversedToasts" :key="t.id" class="toast-item">
          <div class="toast-item-left">
            <div class="toast-item-icon" :class="t.kind">
              <svg v-if="t.kind === 'ok'" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <svg v-else-if="t.kind === 'warn'" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M5.07 19h13.86L12 5.5 5.07 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <svg v-else-if="t.kind === 'danger'" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4m0-4h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
          <div class="toast-item-body">
            <div class="toast-item-msg">{{ t.message }}</div>
            <div class="toast-item-meta">{{ new Date(t.ts || 0).toLocaleTimeString() }}</div>
          </div>
          <div class="toast-item-actions">
            <button class="toast-close" @click.stop="handleDismiss(t.id)" aria-label="Dismiss">×</button>
          </div>
        </div>
        <div v-if="!toasts.length" class="toast-empty">No notifications</div>
      </div>
    </div>
  </div>

  <!-- Transient overlay for newest toast when tray closed -->
  <transition name="toast">
    <div v-if="transientVisible && transientToast" class="toast transient" @mouseenter="pauseTransient" @mouseleave="resumeTransient" role="status">
      <div class="toast-icon">
        <svg v-if="transientToast.kind === 'ok'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="transientToast.kind === 'warn'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v4m0 4h.01M5.07 19h13.86L12 5.5 5.07 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="transientToast.kind === 'danger'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M12 16v-4m0-4h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="toast-message">{{ transientToast.message }}</div>
      <button class="toast-close" @click.stop="transientToast && handleDismiss(transientToast.id)" aria-label="Dismiss">×</button>
      <div class="toast-progress" :style="{ '--toast-duration': DEFAULT_DURATION + 'ms' }"></div>
    </div>
  </transition>
</template>
