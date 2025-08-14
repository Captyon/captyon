<template>
  <div class="empty-state">
    <div class="empty-state__container">
      <!-- Main Icon -->
      <div class="empty-state__icon">
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
      </div>

      <!-- Heading -->
      <div class="empty-state__heading">
        <h2>Ready to start captioning!</h2>
        <p>Import your images and videos to begin creating captions with AI assistance.</p>
      </div>

      <!-- Primary Actions -->
      <div class="empty-state__actions">
        <button class="btn btn--primary btn--large" @click="onPickFiles" title="Select image and video files">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          Pick Files
        </button>
        
        <button class="btn btn--secondary btn--large" @click="onPickFolder" title="Select a folder containing media files">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Pick Folder
        </button>
      </div>

      <!-- Secondary Actions -->
      <div class="empty-state__secondary-actions">
        <button class="btn btn--ghost" @click="onNewProject" title="Create a new project">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </button>
      </div>

      <!-- Hints Section -->
      <div class="empty-state__hints">
        <div class="hints-section">
          <h4>Quick Tips:</h4>
          <ul>
            <li>
              <span class="hint-icon">📁</span>
              <span>Drag and drop files or folders directly onto this area</span>
            </li>
            <li>
              <span class="hint-icon">🖼️</span>
              <span>Supports JPG, PNG, WebP images and MP4, AVI, MOV videos</span>
            </li>
            <li>
              <span class="hint-icon">⌨️</span>
              <span>Use keyboard shortcuts: <kbd>Alt+N/M</kbd> navigate, <kbd>Alt+S</kbd> save</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Drop Zone Indicator -->
      <div class="empty-state__drop-zone">
        <div class="drop-zone-border">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Drop files here</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  onPickFiles?: () => void;
  onPickFolder?: () => void;
  onNewProject?: () => void;
}

const props = defineProps<Props>();

function onPickFiles() {
  props.onPickFiles?.();
}

function onPickFolder() {
  props.onPickFolder?.();
}

function onNewProject() {
  props.onNewProject?.();
}
</script>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 32px;
  background: 
    radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.05) 0%, transparent 50%);
}

.empty-state__container {
  max-width: 600px;
  width: 100%;
  text-align: center;
  animation: fadeInUp 0.6s ease-out;
}

.empty-state__icon {
  margin-bottom: 32px;
  opacity: 0.6;
  color: var(--text-dim);
}

.empty-state__icon svg {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.empty-state__heading {
  margin-bottom: 40px;
}

.empty-state__heading h2 {
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 12px 0;
  line-height: 1.2;
}

.empty-state__heading p {
  font-size: 16px;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.empty-state__actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.empty-state__secondary-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 48px;
}

.btn--large {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  min-height: 48px;
  border-radius: 8px;
}

.btn--secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text);
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.empty-state__hints {
  margin-bottom: 40px;
}

.hints-section h4 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 16px 0;
}

.hints-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.hints-section li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-dim);
  line-height: 1.4;
}

.hint-icon {
  font-size: 18px;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.hints-section kbd {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  font-weight: 500;
  color: var(--text);
}

.empty-state__drop-zone {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.drop-zone-border {
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;
}

.drop-zone-border:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.04);
}

.drop-zone-border span {
  font-size: 14px;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .empty-state {
    padding: 24px 16px;
  }
  
  .empty-state__heading h2 {
    font-size: 28px;
  }
  
  .empty-state__heading p {
    font-size: 15px;
  }
  
  .empty-state__actions {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  
  .btn--large {
    width: 100%;
    max-width: 280px;
  }
  
  .hints-section ul {
    text-align: center;
  }
  
  .hints-section li {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .empty-state__icon svg {
    width: 72px;
    height: 72px;
  }
  
  .empty-state__heading h2 {
    font-size: 24px;
  }
  
  .empty-state__heading p {
    font-size: 14px;
  }
  
  .hints-section {
    display: none; /* Hide detailed hints on very small screens */
  }
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Enhanced states for drag interactions */
.empty-state.drag-over {
  background: 
    radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.08) 0%, transparent 50%);
}

.empty-state.drag-over .empty-state__drop-zone {
  opacity: 1;
}

.empty-state.drag-over .drop-zone-border {
  border-color: var(--brand);
  background: rgba(99, 102, 241, 0.1);
  color: var(--brand);
  transform: scale(1.02);
}

/* Focus states for accessibility */
.btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* Additional button styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  white-space: nowrap;
  min-height: 36px;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn--primary {
  background: linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 85%, #000 15%));
  border-color: var(--brand);
  color: white;
  font-weight: 600;
}

.btn--primary:hover {
  background: linear-gradient(180deg, 
    color-mix(in srgb, var(--brand) 92%, white 8%), 
    color-mix(in srgb, var(--brand) 78%, #000 22%)
  );
}

.btn--ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.08);
}

.btn--ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
}
</style>
