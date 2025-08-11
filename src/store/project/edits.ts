import { state } from './state';
import { addToast } from './toasts';
import { putProjectAny } from './storage';

/* ----------------- Editing & navigation ----------------- */
export function applyEdits(caption: string, tagsRaw: string) {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  const it = proj.items[state.currentIndex];
  if (!it) return;
  it.caption = caption.trim();
  it.tags = tagsRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
  addToast('Caption saved', 'ok');
}

export function copyFromFile() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return '';
  const it = proj.items[state.currentIndex];
  if (!it) return '';
  if (it.originalCaption) {
    addToast('Copied original caption', 'ok');
    return it.originalCaption;
  } else {
    addToast('No original .txt caption found', 'warn');
    return '';
  }
}

export function clearCaption() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  const it = proj.items[state.currentIndex];
  if (!it) return;
  it.caption = '';
}

export function bulkApply(prefix = '', suffix = '', find = '', replaceStr = '') {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  const targets = proj.items.filter((it: any) => (state.filter.onlySelected ? it.selected : true));
  const rx = find ? new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : null;
  for (const it of targets) {
    let t = it.caption || '';
    if (rx) t = t.replace(rx, replaceStr);
    if (prefix) t = prefix + t;
    if (suffix) t = t + suffix;
    it.caption = t.trim();
  }
  addToast('Bulk edit applied', 'ok');
}

export async function saveCurrentProject() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  proj.updatedAt = Date.now();
  await putProjectAny(proj);
  addToast('Project saved', 'ok');
  // refreshMetaBar is in meta module; the facade will call it if needed
}

export function prev() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  proj.cursor = state.currentIndex;
}

export function next() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  state.currentIndex = Math.min(proj.items.length - 1, state.currentIndex + 1);
  proj.cursor = state.currentIndex;
}

export function toggleSelect(itemId: string) {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  const it = proj.items.find((i: any) => i.id === itemId);
  if (!it) return;
  it.selected = !it.selected;
}

export function clearList() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  proj.items.length = 0;
  state.currentIndex = 0;
}

export function removeCurrentItem() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  const idx = state.currentIndex;
  if (idx < 0 || idx >= proj.items.length) return;
  const removed = proj.items.splice(idx, 1)[0];
  // clamp currentIndex to valid range
  if (proj.items.length === 0) {
    state.currentIndex = 0;
  } else {
    state.currentIndex = Math.min(idx, proj.items.length - 1);
  }
  proj.cursor = state.currentIndex;
  putProjectAny(proj).catch(console.error);
  addToast(`Removed image: ${removed.filename}`, 'ok');

  // If there are any pending promptCandidates for this item, drop them
  const candIdx = state.promptCandidates.findIndex(c => c.itemId === removed.id);
  if (candIdx !== -1) {
    state.promptCandidates.splice(candIdx, 1);
    if (state.promptCandidates.length === 0) state.showPromptModal = false;
  }
}
