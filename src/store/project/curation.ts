import { state } from './state';
import { addToast } from './toasts';
import { putProjectAny } from './storage';

/**
 * Return items to include in the curation queue.
 * By default only return items without a curationStatus (uncurated).
 */
export function getCurationQueue(includeCurated = false) {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return [];
  return proj.items.filter((it: any) => includeCurated ? true : !(it.curationStatus));
}

/**
 * Set an item's curation status ('accepted' | 'rejected'), persist the project,
 * and advance to the next un-curated item. When accepted, also mark selected.
 */
export function setCurationStatus(itemId: string, status: 'accepted' | 'rejected') {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  const idx = proj.items.findIndex((i: any) => i.id === itemId);
  if (idx === -1) return;
  const it = proj.items[idx];
  // update item
  it.curationStatus = status;
  if (status === 'accepted') it.selected = true;
  proj.updatedAt = Date.now();
  // persist change
  putProjectAny(proj).catch(console.error);
  addToast(`${status === 'accepted' ? 'Accepted' : 'Rejected'}: ${it.filename}`, status === 'accepted' ? 'ok' : 'warn');

  // Advance to the next un-curated item in the project
  const remaining = proj.items.findIndex((x: any, i: number) => !x.curationStatus && i > idx);
  if (remaining !== -1) {
    state.currentIndex = remaining;
    proj.cursor = state.currentIndex;
  } else {
    // If none to the right, try from start
    const first = proj.items.findIndex((x: any) => !x.curationStatus);
    if (first !== -1) {
      state.currentIndex = first;
      proj.cursor = state.currentIndex;
    } else {
      addToast('Curation complete', 'ok');
    }
  }
}

/**
 * Remove all rejected items from the current project and persist.
 * Returns the number removed.
 */
export function removeRejectedFromProject() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return 0;
  const before = proj.items.length;
  proj.items = proj.items.filter((i: any) => i.curationStatus !== 'rejected');
  const removed = before - proj.items.length;
  // clamp currentIndex
  state.currentIndex = Math.min(state.currentIndex, Math.max(0, proj.items.length - 1));
  proj.cursor = state.currentIndex;
  proj.updatedAt = Date.now();
  putProjectAny(proj).catch(console.error);
  addToast(`Removed ${removed} rejected item${removed === 1 ? '' : 's'}`, removed ? 'ok' : '');
  return removed;
}

/**
 * Start/stop helpers for curation mode.
 */
export function startCuration(includeCurated = false) {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) {
    addToast('No project selected', 'warn');
    return;
  }
  state.curationMode = true;
  // Position cursor to first relevant item
  if (!includeCurated) {
    const idx = proj.items.findIndex((i: any) => !i.curationStatus);
    state.currentIndex = idx !== -1 ? idx : 0;
  } else {
    state.currentIndex = proj.cursor || 0;
  }
  proj.cursor = state.currentIndex;
}

export function stopCuration() {
  state.curationMode = false;
}
