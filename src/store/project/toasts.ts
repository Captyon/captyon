import { state, newId } from './state';
import type { ToastItem } from '../../types';

export function addToast(message: string, kind: ToastItem['kind'] = '') {
  const t: ToastItem = { id: newId('t_'), message, kind };
  state.toasts.push(t);
  setTimeout(() => {
    const idx = state.toasts.findIndex(x => x.id === t.id);
    if (idx !== -1) state.toasts.splice(idx, 1);
  }, 7000);
}

export function dismissToast(id: string) {
  const idx = state.toasts.findIndex(x => x.id === id);
  if (idx !== -1) state.toasts.splice(idx, 1);
}
