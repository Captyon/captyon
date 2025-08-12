<template>
  <div class="thumbs" id="thumbs">
    <div v-for="(it, idx) in items" :key="it.id" class="thumb"
         :class="{ active: getAbsoluteIndex(idx) === state.currentIndex }"
         @click="selectThumb(idx)"
         @contextmenu.prevent="toggleSelect(it)">
      <template v-if="it.mediaType === 'video'">
        <div class="thumb-media">
          <video :src="it.img"
                 muted
                 autoplay
                 loop
                 playsinline
                 preload="metadata"
                 class="thumb-video"
                 @loadedmetadata="(e) => onVideoLoadedMeta(it.id, e)"></video>
          <span class="thumb-play">▶</span>
        </div>
      </template>
      <template v-else>
        <img :src="it.img" alt="" class="thumb-img" />
      </template>

      <div class="cap">
        <span v-if="it.caption" v-html="it.caption"></span>
        <i v-else class="no-caption">No caption</i>
      </div>

      <div v-if="it.selected" class="mark">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5.5 12.5 L10 17 L20 6"/>
        </svg>
      </div>
      <div v-else-if="it.curationStatus === 'accepted'" class="mark accepted-mark">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5.5 12.5 L10 17 L20 6"/>
        </svg>
      </div>
      <div v-else-if="it.curationStatus === 'rejected'" class="mark rejected-mark">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M6 6 L18 18 M6 18 L18 6"/>
        </svg>
      </div>
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

<style scoped>
.thumbs {
  overflow: auto;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  gap: 8px;
  align-content: start;
  min-height: 0;
}

.thumb {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #0c1219;
  cursor: pointer;
  overflow: hidden;
  align-self: start;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.thumb-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.thumb-video,
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-play {
  position: absolute;
  left: 6px;
  top: 6px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.cap {
  padding: 6px;
  font-size: 11px;
  color: #d5dfef;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.02));
}

.no-caption { color: #7d8aa0; }

.mark {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(122,162,247,.9);
  color: #02060c;
  font-weight: 700;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
}

.accepted-mark { background: var(--ok, #16a34a); }
.rejected-mark { background: #b91c1c; }

.thumb.active { outline: 2px solid var(--brand); }
</style>
