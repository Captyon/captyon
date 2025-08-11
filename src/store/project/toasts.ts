import { state, newId } from './state';
import type { ToastItem, ToastKind } from '../../types';

// Default auto-dismiss duration for transient overlay (ms)
export const DEFAULT_DURATION = 7000;

/**
 * Add a toast to the history.
 * The store keeps a persistent history of toasts in state.toasts.
 * Auto-dismiss for the transient overlay is handled in the component so the toast
 * remains in history until dismissed by the user or cleared.
 *
 * @param message - toast text
 * @param kind - visual kind ('ok' | 'warn' | 'danger' | '')
 * @param opts - optional overrides (pinned)
 */
export function addToast(message: string, kind: ToastKind = '', opts: { pinned?: boolean } = {}) {
  const t: ToastItem = {
    id: newId('t_'),
    message,
    kind,
    ts: Date.now(),
    seen: false,
    pinned: !!opts.pinned
  };
  state.toasts.push(t);
  return t;
}

/**
 * Remove a toast from the history.
 */
export function dismissToast(id: string) {
  const idx = state.toasts.findIndex(x => x.id === id);
  if (idx !== -1) state.toasts.splice(idx, 1);
}

/**
 * Mark a toast as seen (e.g. when the tray is opened or the toast is inspected).
 */
export function markToastSeen(id: string) {
  const t = state.toasts.find(x => x.id === id);
  if (t) t.seen = true;
}

/**
 * Clear all toasts from history.
 */
export function clearToasts() {
  state.toasts.splice(0, state.toasts.length);
}
