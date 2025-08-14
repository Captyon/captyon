<template>
  <div class="thumbs-container">
    <div v-if="items.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
      </div>
      <div class="empty-title">No media files</div>
      <div class="empty-description">Add images or videos to start captioning</div>
    </div>

    <div v-else class="thumbs-grid">
      <div v-for="(item, idx) in items" 
           :key="item.id" 
           class="thumb-card"
           :class="{ 
             'thumb-card--active': getAbsoluteIndex(idx) === state.currentIndex,
             'thumb-card--selected': item.selected,
             'thumb-card--accepted': item.curationStatus === 'accepted',
             'thumb-card--rejected': item.curationStatus === 'rejected'
           }"
           @click="selectThumb(idx)"
           @contextmenu.prevent="toggleSelect(item)"
           :title="item.filename">
        
        <!-- Media Preview -->
        <div class="thumb-media">
          <template v-if="item.mediaType === 'video'">
            <div class="video-wrapper">
              <video 
                :src="item.img" 
                muted 
                autoplay 
                loop 
                playsinline 
                preload="metadata" 
                class="thumb-video"
                @loadedmetadata="(e) => onVideoLoadedMeta(item.id, e)">
              </video>
              <div class="media-type-indicator video-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              </div>
            </div>
          </template>
          <template v-else>
            <img :src="item.img" alt="" class="thumb-image" />
            <div v-if="item.regions && item.regions.length > 0" class="media-type-indicator regions-indicator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="14" rx="2" ry="2"/>
                <path d="m5 17 2-2 4 4 8-8"/>
              </svg>
              <span class="regions-count">{{ item.regions.length }}</span>
            </div>
          </template>
        </div>

        <!-- Status Indicators -->
        <div class="thumb-status">
          <div v-if="item.selected" class="status-badge status-badge--selected">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
          <div v-else-if="item.curationStatus === 'accepted'" class="status-badge status-badge--accepted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
          <div v-else-if="item.curationStatus === 'rejected'" class="status-badge status-badge--rejected">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>

        <!-- Caption Preview -->
        <div class="thumb-caption">
          <div v-if="item.caption" class="caption-text" v-html="truncateCaption(item.caption)"></div>
          <div v-else class="caption-placeholder">No caption</div>
        </div>

        <!-- Hover Actions -->
        <div class="thumb-actions">
          <button class="action-btn action-btn--view" @click.stop="selectThumb(idx)" title="View this item">
            <span class="action-icon">👁</span>
          </button>
          <button class="action-btn action-btn--select" @click.stop="toggleSelect(item)" 
                  :class="{ 'action-btn--selected': item.selected }"
                  :title="item.selected ? 'Unselect item' : 'Select item'">
            <span class="action-icon">{{ item.selected ? '×' : '✓' }}</span>
          </button>
        </div>

        <!-- Active Indicator -->
        <div v-if="getAbsoluteIndex(idx) === state.currentIndex" class="active-indicator">
          <div class="active-dot"></div>
        </div>
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

function toggleSelect(item: any) {
  item.selected = !item.selected;
}

function truncateCaption(caption: string, maxLength = 120): string {
  if (!caption) return '';
  if (caption.length <= maxLength) return caption;
  
  // Find a good breaking point near the max length
  const truncated = caption.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const breakPoint = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;
  
  return caption.substring(0, breakPoint) + '…';
}
</script>

<style scoped>
/* Container */
.thumbs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.4;
}

.empty-icon svg {
  color: var(--text-dim);
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: var(--text-dim);
  line-height: 1.5;
}

/* Grid Layout */
.thumbs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 12px;
  align-content: start;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.thumbs-grid::-webkit-scrollbar {
  width: 8px;
}

.thumbs-grid::-webkit-scrollbar-track {
  background: transparent;
}

.thumbs-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.thumbs-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Thumb Cards */
.thumb-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  height: 0;
  padding-bottom: 100%; /* 1:1 aspect ratio */
  display: block;
}

.thumb-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.15);
}

.thumb-card:hover .thumb-actions {
  opacity: 1;
}

/* Active State */
.thumb-card--active {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Selection States */
.thumb-card--selected {
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(99, 102, 241, 0.1);
}

.thumb-card--accepted {
  border-color: rgba(34, 197, 94, 0.6);
  background: rgba(34, 197, 94, 0.08);
}

.thumb-card--rejected {
  border-color: rgba(239, 68, 68, 0.6);
  background: rgba(239, 68, 68, 0.08);
}

/* Media Preview */
.thumb-media {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px; /* Leave space for caption */
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.thumb-image, .thumb-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.thumb-card:hover .thumb-image,
.thumb-card:hover .thumb-video {
  transform: scale(1.05);
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Media Type Indicators */
.media-type-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: white;
  z-index: 2;
}

.video-indicator {
  background: rgba(239, 68, 68, 0.9);
}

.regions-indicator {
  background: rgba(99, 102, 241, 0.9);
}

.regions-count {
  font-size: 10px;
  font-weight: 700;
}

/* Status Badges */
.thumb-status {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.status-badge--selected {
  background: rgba(99, 102, 241, 0.9);
  color: white;
}

.status-badge--accepted {
  background: rgba(34, 197, 94, 0.9);
  color: white;
}

.status-badge--rejected {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}

/* Caption Preview */
.thumb-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
}

.caption-text {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-wrap: break-word;
}

.caption-placeholder {
  font-size: 11px;
  color: var(--text-dim);
  font-style: italic;
}

/* Hover Actions */
.thumb-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 12px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 4;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(16px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-btn--view {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(29, 78, 216, 0.2));
}

.action-btn--select {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(21, 128, 61, 0.2));
}

.action-btn--selected {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(185, 28, 28, 0.2)) !important;
}

.action-btn:hover {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.action-btn--view:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(29, 78, 216, 0.6));
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(29, 78, 216, 0.2);
}

.action-btn--select:hover {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(21, 128, 61, 0.6));
  box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3), 0 4px 12px rgba(21, 128, 61, 0.2);
}

.action-btn--selected:hover {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(185, 28, 28, 0.6)) !important;
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3), 0 4px 12px rgba(185, 28, 28, 0.2);
}

.action-btn:hover::before {
  opacity: 1;
}

.action-btn:active {
  transform: scale(1.05) translateY(-1px);
  transition-duration: 0.1s;
}

.action-icon {
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  transition: transform 0.2s ease;
  z-index: 1;
  position: relative;
}

.action-btn:hover .action-icon {
  transform: scale(1.1);
}

/* Active Indicator */
.active-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
}

.active-dot {
  width: 8px;
  height: 8px;
  background: var(--brand);
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsive Design */
@media (max-width: 1400px) {
  .thumbs-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }
  
  .thumb-caption {
    padding: 10px;
  }
  
  .caption-text {
    -webkit-line-clamp: 2;
  }
}

@media (max-width: 1200px) {
  .thumbs-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    padding: 8px;
  }
}

@media (max-width: 900px) {
  .thumbs-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .thumb-actions {
    opacity: 1; /* Always show on mobile */
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 640px) {
  .thumbs-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 6px;
  }
  
  .thumb-caption {
    padding: 8px;
  }
  
  .caption-text {
    font-size: 10px;
    -webkit-line-clamp: 2;
  }
  
  .media-type-indicator {
    padding: 2px 4px;
    font-size: 9px;
  }
  
  .status-badge {
    width: 20px;
    height: 20px;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.thumb-card {
  animation: fadeIn 0.3s ease-out;
}

/* Focus states for accessibility */
.thumb-card:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.action-btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* Loading placeholder for images */
.thumb-image[src=""] {
  background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
