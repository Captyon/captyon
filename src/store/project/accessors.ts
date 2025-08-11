import { state } from './state';
import type { Project, Item } from '../../types';

export function getCurrentProject(): Project | null {
  if (!state.currentId) return null;
  return state.projects.get(state.currentId) || null;
}

export function currentItem(): Item | null {
  const proj = getCurrentProject();
  if (!proj) return null;
  return proj.items[state.currentIndex] || null;
}

export function filteredItems(): Item[] {
  const proj = getCurrentProject();
  if (!proj) return [];
  const q = state.filter.text.trim().toLowerCase();
  return proj.items.filter(it => {
    if (state.filter.onlyMissing && it.caption) return false;
    if (state.filter.onlySelected && !it.selected) return false;
    if (!q) return true;
    return it.filename.toLowerCase().includes(q) || (it.caption || '').toLowerCase().includes(q);
  });
}

export function getAbsoluteIndex(filteredIdx: number) {
  const proj = getCurrentProject();
  const list = filteredItems();
  const target = list[filteredIdx];
  if (!proj || !target) return -1;
  return proj.items.indexOf(target);
}
