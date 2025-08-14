<template>
  <section class="editor">
    <!-- Region editor (shown when a region is selected) -->
    <div v-if="selectedRegion">
      <div class="editor-tools">
        <button class="btn small" @click="applyRegionEdits">Save Region</button>
        <button class="btn small" @click="clearRegionSelection">Cancel</button>
      </div>
      <input
        type="text"
        v-model="regionTitle"
        placeholder="Region title"
        style="width:100%; margin:8px 0; padding:6px"
      />
      <textarea
        v-model="regionCaption"
        placeholder="Write region prompt..."
        style="height:220px; width:100%;"
      ></textarea>
      <div class="stats">
        <div class="right" id="region-counters">{{ (regionCaption.length) }} chars • {{ (regionCaption.trim().match(/\S+/g) || []).length }} words • est {{ Math.ceil(regionCaption.length/4) }} tokens</div>
      </div>
    </div>

    <!-- Item-level editor (fallback) -->
    <div v-else>
      <div class="editor-tools">
        <button class="btn small" id="applyBtn" @click="applyEdits">Save Caption <kbd>Alt+S</kbd></button>
        <button class="btn small" id="genBtn" @click="store.autoCaptionCurrent">AI Generate <kbd>Alt+G</kbd></button>
        <button class="btn small" id="copyBtn" @click="copyFromFile">Copy From File</button>
        <button class="btn small" id="clearBtn" @click="clearCaption">Clear</button>
        <button class="btn small" id="removeBtn" @click="confirmDelete">Remove <kbd>Alt+D</kbd></button>
        <div class="right" style="display:flex; gap:8px; align-items:center">
          <label>Tags</label>
          <input type="text" id="tagInput" v-model="tagInput" placeholder="comma separated" style="width: 210px" />
        </div>
      </div>
      <textarea id="captionBox" v-model="captionBox" placeholder="Write your caption..."></textarea>
      <div class="stats">
        <div class="tags" id="tagList">
          <span v-for="t in currentItem?.tags || []" :key="t" class="tag">{{ t }}</span>
        </div>
        <div class="right" id="counters">{{ (captionBox.length) }} chars • {{ (captionBox.trim().match(/\S+/g) || []).length }} words • est {{ Math.ceil(captionBox.length/4) }} tokens</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';

const store = useProjectStore();
const { state } = store;

const captionBox = ref('');
const tagInput = ref('');

const currentItem = computed(() => store.currentItem());

/* keep local editor fields in sync when currentItem changes */
watch(currentItem, (it) => {
  captionBox.value = it?.caption || '';
  tagInput.value = (it?.tags || []).join(', ');
}, { immediate: true });

watch(() => currentItem.value?.caption, (c) => {
  captionBox.value = c || '';
});

// Region editing state
const selectedRegion = computed(() => {
  const it = currentItem.value;
  const rid = state.selectedRegionId;
  if (!it || !rid) return null;
  return (it.regions || []).find((r: any) => r.id === rid) || null;
});

const regionTitle = ref('');
const regionCaption = ref('');

// initialize region fields whenever selection changes
watch(selectedRegion, (r) => {
  if (r) {
    regionTitle.value = r.name || '';
    regionCaption.value = r.caption || '';
  } else {
    regionTitle.value = '';
    regionCaption.value = '';
  }
}, { immediate: true });

// actions
function applyEdits() {
  store.applyEdits(captionBox.value, tagInput.value);
  store.saveCurrentProject();
}

function applyRegionEdits() {
  const r = selectedRegion.value;
  if (!r) return;
  // write back fields to region object
  r.name = regionTitle.value;
  r.caption = regionCaption.value;
  // clear _editing flag if present (cast to any to avoid TS errors for transient UI fields)
  if ((r as any)._editing) (r as any)._editing = false;
  // persist (suppress global "Project saved" toast for region edits)
  store.saveCurrentProject?.(true);
  // keep the region selected so user can continue editing or explicitly clear
}

function clearRegionSelection() {
  try { store.setSelectedRegion?.(null); } catch (e) { (state as any).selectedRegionId = null; }
}

// existing helper actions preserved
function copyFromFile() {
  const s = store.copyFromFile();
  if (s) captionBox.value = s;
}

function clearCaption() {
  captionBox.value = '';
  store.clearCaption();
}

function confirmDelete() {
  const it = store.currentItem();
  if (!it) return;
  if (!state.settings.confirmDeleteOnRemove) {
    doDelete();
    return;
  }
  const el = document.getElementById('deleteConfirm') as HTMLDialogElement | null;
  el?.showModal();
}

function doDelete() {
  try {
    (store as any).removeCurrentItem?.();
  } catch (e) { console.error(e); }
  try { (document.getElementById('deleteConfirm') as HTMLDialogElement | null)?.close(); } catch {}
}
</script>
