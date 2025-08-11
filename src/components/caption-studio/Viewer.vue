<template>
  <section class="viewer">
    <div class="viewer-tools">
      <button class="btn small" id="prevBtn" @click="prev">◀ Prev <kbd>Alt+N</kbd></button>
      <button class="btn small" id="nextBtn" @click="next">Next ▶ <kbd>Alt+M</kbd></button>
      <div class="seg" style="margin-left:auto; display:flex; gap:8px; align-items:center">
        <label for="zoomRange">Zoom</label>
        <input type="range" id="zoomRange" min="10" max="300" v-model.number="state.zoom" />
        <button class="btn small" id="fitBtn" @click="fit">Fit</button>
        <button class="btn small" id="fillBtn" @click="fill">Fill</button>
        <button class="btn small" id="rotateBtn" @click="rotate">Rotate 90°</button>
      </div>
    </div>

    <div class="viewport" id="viewport">
      <div class="canvas-wrap">
        <CurationCard v-if="state.curationMode" />
        <template v-else>
          <template v-if="currentItem?.mediaType === 'video'">
            <video id="mainVideo"
                   controls
                   :src="currentItem?.img || ''"
                   preload="metadata"
                   @loadedmetadata="(e) => onVideoLoadedMeta(currentItem?.id || null, e)"
                   :style="mainMediaStyle"
                   style="max-width:100%; max-height:100%; display:block; margin:0 auto;">
            </video>
          </template>
          <template v-else>
            <img id="mainImage" :src="currentItem?.img || ''" :style="mainMediaStyle" alt="" />
          </template>
        </template>
      </div>
    </div>

    <div class="viewer-footer">
      <div style="display:flex; gap:10px; align-items:center">
        <span id="fileInfo">
          {{ currentItem?.filename || 'No file' }}
          <span v-if="currentItem?.mediaType === 'video'">
            <span v-if="videoMeta[currentItem.id] && videoMeta[currentItem.id].duration"> • {{ formatDuration(videoMeta[currentItem.id].duration) }}</span>
            <span v-if="(videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || (currentItem?.width)"> • {{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].width) || currentItem?.width }}×{{ (videoMeta[currentItem.id] && videoMeta[currentItem.id].height) || currentItem?.height }}</span>
          </span>
          <span v-else-if="currentItem?.width"> • {{ currentItem.width }}×{{ currentItem.height }}</span>
        </span>
      </div>
      <div style="display:flex; gap:10px; align-items:center">
        <div class="meter"><i id="progressBar" :style="{ width: state.progress.total ? Math.max(0, Math.min(100, Math.round(state.progress.cur / state.progress.total * 100))) + '%' : '0%' }"></i></div>
        <span id="progressText">{{ (state.currentIndex + 1) }} of {{ (currentProject && currentProject.items) ? currentProject.items.length : 0 }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../../store/useProjectStore';
import { useVideoMeta } from '../../composables/useVideoMeta';
import CurationCard from './CurationCard.vue';

const store = useProjectStore();
const { state } = store;

const currentProject = computed(() => store.getCurrentProject());
const currentItem = computed(() => store.currentItem());
const videoMetaCompos = useVideoMeta();
const { videoMeta, onVideoLoadedMeta, formatDuration } = videoMetaCompos;

function prev() { store.prev(); }
function next() { store.next(); }
function fit() { state.zoom = 100; }
function fill() { state.zoom = 150; }
function rotate() { state.rotation = (state.rotation + 90) % 360; }

const mainMediaStyle = computed(() => {
  return { transform: `scale(${state.zoom/100}) rotate(${state.rotation}deg)` } as Record<string, any>;
});
</script>
