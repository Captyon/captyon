import { ref } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

export function usePromptSelections() {
  const store = useProjectStore();
  const promptSelections = ref(new Set<string>());

  function togglePromptSelection(id: string) {
    const s = promptSelections.value;
    if (s.has(id)) s.delete(id);
    else s.add(id);
    // trigger reactivity by replacing the Set reference
    promptSelections.value = new Set(s);
  }

  function applySelectedPrompts() {
    for (const id of Array.from(promptSelections.value)) {
      try { store.acceptPromptCandidate(id); } catch (e) { console.error(e); }
    }
    promptSelections.value = new Set();
  }

  function applyAllPrompts() {
    try { store.acceptAllPromptCandidates(); } catch (e) { console.error(e); }
    promptSelections.value = new Set();
  }

  function skipAllPrompts() {
    try { store.rejectAllPromptCandidates(); } catch (e) { console.error(e); }
    promptSelections.value = new Set();
  }

  function closePromptModal() {
    // simply hide the modal without applying — candidates remain available in the store
    store.state.showPromptModal = false;
    promptSelections.value = new Set();
  }

  return {
    promptSelections,
    togglePromptSelection,
    applySelectedPrompts,
    applyAllPrompts,
    skipAllPrompts,
    closePromptModal,
  };
}
