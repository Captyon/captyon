<template>
  <div class="thumbs" id="thumbs">
    <div v-for="(it, idx) in items" :key="it.id" class="thumb"
         :class="{ active: getAbsoluteIndex(idx) === state.currentIndex }"
         @click="selectThumb(idx)"
         @contextmenu.prevent="toggleSelect(it)">
      <template v-if="it.mediaType === 'video'">
        <div style="position:relative; width:100%; height:100%; overflow:hidden; display:flex;align-items:center;justify-content:center; background:#000">
          <video :src="it.img" muted autoplay loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover" @loadedmetadata="(e) => onVideoLoadedMeta(it.id, e)"></video>
          <span style="position:absolute; left:6px; top:6px; background:rgba(0,0,0,0.5); color:#fff; padding:2px 6px; border-radius:4px; font-size:12px">▶</span>
        </div>
      </template>
      <template v-else>
        <img :src="it.img" alt="" />
      </template>
      <div v-if="it.regions && it.regions.length" class="regions-badge" @click.stop="selectThumb(idx)" :title="it.regions.length + ' regions'" style="position:absolute; top:6px; right:6px; background:rgba(59,130,246,0.9); color:#fff; font-weight:700; font-size:10px; padding:4px 6px; border-radius:999px; cursor:pointer; z-index:2">
        {{ it.regions.length }}
      </div>
      <div class="cap">
        <span v-if="it.caption" v-html="it.caption"></span>
        <i v-else style="color:#7d8aa0">No caption</i>
      </div>
      <div v-if="it.selected" class="mark">✓</div>
      <div v-else-if="it.curationStatus === 'accepted'" class="mark" style="background:var(--ok,#16a34a);">✓</div>
      <div v-else-if="it.curationStatus === 'rejected'" class="mark" style="background:#b91c1c;">✕</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { useVideoMeta } from '../../composables/useVideoMeta';

const store = useProjectStore();
const { state } = store;

const items = computed(() => store.filteredItems());
const { onVideoLoadedMeta } = useVideoMeta();

function getAbsoluteIndex(filteredIdx: number) {
  return store.getAbsoluteIndex(filteredIdx);
}

function selectThumb(filteredIdx: number) {
  const abs = store.getAbsoluteIndex(filteredIdx);
  if (abs === -1) return;
  state.currentIndex = abs;
  const proj = store.getCurrentProject();
  if (proj) proj.cursor = state.currentIndex;
}

function toggleSelect(it: any) {
  it.selected = !it.selected;
}
</script>
