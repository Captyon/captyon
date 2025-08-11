<template>
  <dialog id="promptModal">
    <div class="modal-head">
      <h3 style="margin:0">Detected embedded prompts</h3>
      <button class="btn small" data-close="promptModal" @click="closePromptModal">✕</button>
    </div>
    <div class="modal-body" style="max-width:900px">
      <p>Stable Diffusion prompt metadata was detected in the following images. Select the prompts you want to apply as captions.</p>
      <div style="display:flex;flex-direction:column;gap:10px;max-height:420px;overflow:auto;padding-top:8px">
        <div v-for="c in state.promptCandidates" :key="c.itemId" style="display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:6px;background:var(--panel-bg, #0f1720);">
          <div style="width:72px;height:56px;flex:0 0 72px;display:flex;align-items:center;justify-content:center;background:#111;border-radius:4px;overflow:hidden">
            <img :src="c.img" style="width:72px;height:56px;object-fit:cover" alt="" />
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="font-weight:600">{{ c.filename }}</div>
              <label style="font-size:13px">
                <input type="checkbox" :checked="promptSelections.has(c.itemId)" @change="() => togglePromptSelection(c.itemId)" /> Use
              </label>
            </div>
            <pre style="margin:0;white-space:pre-wrap;font-size:13px;color:var(--muted,#9aa4b2);max-height:120px;overflow:auto">{{ c.prompt }}</pre>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn" @click="applySelectedPrompts">Apply Selected</button>
        <button class="btn" @click="applyAllPrompts">Apply All</button>
        <button class="btn" @click="skipAllPrompts">Skip All</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useProjectStore } from '../../../store/useProjectStore';
import { usePromptSelections } from '../../../composables/usePromptSelections';

const store = useProjectStore();
const { state } = store;

const { promptSelections, togglePromptSelection, applySelectedPrompts, applyAllPrompts, skipAllPrompts, closePromptModal } = usePromptSelections();

</script>
