import { state } from './state';
import { addToast } from './toasts';
import { putProjectAny } from './storage';

/* ----------------- Prompt candidates (embedded metadata) ----------------- */
export function acceptPromptCandidate(itemId: string) {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  const idx = proj.items.findIndex((i: any) => i.id === itemId);
  if (idx === -1) return;
  const candIdx = state.promptCandidates.findIndex(c => c.itemId === itemId);
  if (candIdx === -1) return;
  const c = state.promptCandidates[candIdx];
  const it = proj.items[idx];
  if (!(it.originalCaption && it.originalCaption.trim())) {
    // replace the item object so Vue reactivity picks up the change
    const newIt = { ...it, caption: c.prompt, originalCaption: c.prompt };
    proj.items[idx] = newIt;
    addToast(`Applied prompt for ${it.filename}`, 'ok');
  } else {
    addToast(`Skipped ${it.filename} (already has original caption)`, 'warn');
  }
  state.promptCandidates.splice(candIdx, 1);
  if (state.promptCandidates.length === 0) state.showPromptModal = false;
  putProjectAny(proj).catch(console.error);
}

export function rejectPromptCandidate(itemId: string) {
  const idx = state.promptCandidates.findIndex(c => c.itemId === itemId);
  if (idx === -1) return;
  state.promptCandidates.splice(idx, 1);
  if (state.promptCandidates.length === 0) state.showPromptModal = false;
}

export function acceptAllPromptCandidates() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  let applied = 0;
  for (const c of state.promptCandidates) {
    const idx = proj.items.findIndex((x: any) => x.id === c.itemId);
    if (idx !== -1) {
      const it = proj.items[idx];
      if (!(it.originalCaption && it.originalCaption.trim())) {
        const newIt = { ...it, caption: c.prompt, originalCaption: c.prompt };
        proj.items[idx] = newIt;
        applied++;
      }
    }
  }
  state.promptCandidates.length = 0;
  state.showPromptModal = false;
  addToast(`Applied ${applied} embedded prompts`, 'ok');
  putProjectAny(proj).catch(console.error);
}

export function rejectAllPromptCandidates() {
  state.promptCandidates.length = 0;
  state.showPromptModal = false;
}
