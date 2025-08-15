<template>
  <dialog id="welcomeModal" ref="dlg" class="welcome-dialog">
    <div class="welcome-container">
      <!-- Hero Section -->
      <div class="welcome-hero">
        <div class="welcome-logo">
          <div class="logo-icon">
            <img src="/cs-icon.svg" alt="Captyon Logo" width="40" height="40">
          </div>
          <div class="welcome-title">
            <h1>Welcome to Captyon</h1>
            <p>Your AI-powered image captioning workspace</p>
          </div>
        </div>
        <button class="welcome-close" @click="close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          X
        </button>
      </div>

      <!-- Quick Start Section -->
      <div class="welcome-content">
        <div class="welcome-intro">
          <h2>Get started in seconds</h2>
          <p>Create your first project, import images, or configure your AI models. Everything you need to begin captioning is just a click away.</p>
        </div>

        <!-- Action Cards -->
        <div class="action-cards">
          <div class="action-card primary" @click="welcomeCreateProject">
            <div class="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div class="card-content">
              <h3>Create a Project</h3>
              <p>Start fresh with a new captioning project</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="action-card" @click="welcomeAddImages">
            <div class="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21,15 16,10 5,21"></polyline>
              </svg>
            </div>
            <div class="card-content">
              <h3>Import Images</h3>
              <p>Upload your images to start captioning</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="action-card" @click="welcomeOpenSettings">
            <div class="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="m12 1 2.09 3.26L18 4.78 16.71 9.18 20.24 10.64 19.05 15.45 22.5 17.8 20.24 22.35 19.05 27.16 16.71 28.82 14.09 23.74 12 27 9.91 23.74 7.29 28.82 4.95 27.16 3.76 22.35 1.5 17.8 4.95 15.45 3.76 10.64 7.29 9.18 6 4.78 9.91 3.26z"></path>
              </svg>
            </div>
            <div class="card-content">
              <h3>Configure Settings</h3>
              <p>Set up your AI models and preferences</p>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>

        <!-- Features Preview -->
        <div class="features-preview">
          <h3>What you can do with Captyon:</h3>
          <div class="features-grid">
            <div class="feature-item">
              <span class="feature-icon">🤖</span>
              <span>AI-powered captioning with Ollama</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📝</span>
              <span>Batch processing and bulk operations</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎨</span>
              <span>Visual editing and cropping tools</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">💾</span>
              <span>Multiple export formats</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="welcome-footer">
        <div class="footer-left">
          <label class="checkbox-label">
            <input type="checkbox" v-model="neverShow" />
            <span class="checkmark"></span>
            Never show this again
          </label>
        </div>
        <div class="footer-right">
          <button class="btn secondary" @click="close">Skip for now</button>
          <button class="btn primary" @click="welcomeCreateProject">Get started</button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';
import { useFilePicker } from '../../../composables/useFilePicker';

const props = defineProps<{
  onNewProject?: () => void;
}>();

const store = useProjectStore();
const { state } = store;
const dlg = ref<HTMLDialogElement | null>(null);
const { pickFiles } = useFilePicker();

// "Never show again" is the inverse of showWelcomeOnStart
const neverShow = computed({
  get: () => !(state.settings?.showWelcomeOnStart ?? true),
  set: (v: boolean) => {
    // persist immediately
    const show = !v;
    try {
      store.saveSettings({ showWelcomeOnStart: show });
    } catch (e) {
      // best-effort; ignore errors
      console.error('Failed to save welcome setting', e);
    }
  }
});

function close() {
  try {
    // Update store flag so other logic knows the modal was dismissed
    state.showWelcomeModal = false;
    dlg.value?.close();
  } catch (e) {
    // ignore DOM errors
  }
}

function welcomeCreateProject() {
  // Use the provided onNewProject prop if available, otherwise fallback to prompt
  if (props.onNewProject) {
    props.onNewProject();
    close();
    return;
  }

  // Fallback to prompt if no prop is provided
  const name = prompt('Project name?') || 'Untitled';
  try {
    store.createProject(name);
    store.saveCurrentProject?.();
    store.refreshMetaBar?.();
  } catch (e) {
    console.error('welcomeCreateProject failed', e);
  }
  close();
}

function welcomeAddImages() {
  try { pickFiles(); } catch (e) { console.error(e); }
  close();
}

function welcomeOpenSettings() {
  try { (document.getElementById('settingsModal') as HTMLDialogElement | null)?.showModal(); } catch (e) { console.error(e); }
}

watch(() => state.showWelcomeModal, (val) => {
  try {
    if (val) {
      dlg.value?.showModal();
    } else {
      dlg.value?.close();
    }
  } catch (e) {
    // ignore DOM exceptions
  }
});

// Ensure dialog reflects initial store state on mount
onMounted(() => {
  try {
    if (state.showWelcomeModal) {
      dlg.value?.showModal();
    }
  } catch (e) {}
});
</script>

<style scoped>
.welcome-dialog {
  width: min(680px, 95vw);
  max-width: 680px;
  background: transparent;
  border: none;
  padding: 0;
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.welcome-dialog::backdrop {
  background: rgba(10, 15, 22, 0.8);
  backdrop-filter: blur(4px);
}

.welcome-container {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* Hero Section */
.welcome-hero {
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  color: white;
}

.welcome-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(61, 111, 255, 0.9) 0%, rgba(0, 209, 178, 0.8) 100%);
  z-index: 1;
}

.welcome-logo {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 2;
}

.logo-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
  padding: 8px;
}

.logo-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.welcome-title h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.welcome-title p {
  margin: 0;
  font-size: 18px;
  opacity: 0.9;
  font-weight: 400;
}

.welcome-close {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  position: relative;
  z-index: 2;
  backdrop-filter: blur(10px);
}

.welcome-close:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.1);
}

.welcome-close svg {
  opacity: 0.9;
  stroke: currentColor;
  stroke-width: 2;
}

.welcome-close:hover svg {
  opacity: 1;
}

/* Content Section */
.welcome-content {
  padding: 32px;
}

.welcome-intro {
  text-align: center;
  margin-bottom: 32px;
}

.welcome-intro h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
}

.welcome-intro p {
  margin: 0;
  font-size: 16px;
  color: var(--text-dim);
  line-height: 1.5;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

/* Action Cards */
.action-cards {
  display: grid;
  gap: 16px;
  margin-bottom: 32px;
}

.action-card {
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--brand), var(--accent));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-card:hover::before {
  opacity: 0.05;
}

.action-card:hover {
  border-color: var(--brand);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(61, 111, 255, 0.15);
}

.action-card.primary {
  border-color: var(--brand);
  background: linear-gradient(135deg, rgba(61, 111, 255, 0.1), rgba(0, 209, 178, 0.05));
}

.card-icon {
  width: 48px;
  height: 48px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
  position: relative;
  z-index: 2;
}

.action-card.primary .card-icon {
  background: rgba(61, 111, 255, 0.15);
  border-color: var(--brand);
  color: var(--brand);
}

.card-content {
  flex: 1;
  position: relative;
  z-index: 2;
}

.card-content h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.card-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-dim);
}

.card-arrow {
  color: var(--text-dim);
  font-size: 20px;
  font-weight: 300;
  transition: transform 0.2s ease;
  position: relative;
  z-index: 2;
}

.action-card:hover .card-arrow {
  transform: translateX(4px);
  color: var(--brand);
}

/* Features Preview */
.features-preview {
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 24px;
}

.features-preview h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-dim);
}

.feature-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

/* Footer */
.welcome-footer {
  background: var(--muted);
  border-top: 1px solid var(--border);
  padding: 24px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.footer-left {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-dim);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.footer-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  background: var(--muted);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.btn:hover {
  border-color: var(--brand);
  background-color: var(--panel);
}

.btn.primary {
  background: linear-gradient(135deg, var(--brand), var(--accent));
  color: white;
  border-color: transparent;
}

.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(61, 111, 255, 0.3);
}

.btn.secondary {
  background: transparent;
  color: var(--text-dim);
}

.btn.secondary:hover {
  color: var(--text);
  background: var(--muted);
}

/* Responsive Design */
@media (max-width: 768px) {
  .welcome-hero {
    padding: 24px;
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .welcome-logo {
    flex-direction: column;
    gap: 16px;
  }

  .welcome-close {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  .welcome-content {
    padding: 24px;
  }

  .welcome-intro h2 {
    font-size: 20px;
  }

  .welcome-title h1 {
    font-size: 24px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .welcome-footer {
    padding: 20px 24px;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .footer-right {
    justify-content: stretch;
  }

  .footer-right .btn {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .welcome-dialog {
    width: 95vw;
    margin: 20px auto;
  }
}
</style>
