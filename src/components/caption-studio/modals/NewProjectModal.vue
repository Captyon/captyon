<template>
  <dialog class="new-project-dialog" role="dialog" aria-modal="true" ref="dlg" v-if="show">
    <div class="new-project-container">
      <!-- Hero Section -->
      <div class="new-project-hero">
        <div class="hero-content">
          <div class="hero-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <line x1="12" y1="13" x2="12" y2="19"/>
              <line x1="9" y1="16" x2="15" y2="16"/>
            </svg>
          </div>
          <div class="hero-text">
            <h2>Create New Project</h2>
            <p>Start a fresh captioning project with your media files</p>
          </div>
        </div>
        <button class="close-btn" @click="close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          X
        </button>
      </div>

      <!-- Form Content -->
      <div class="new-project-content">
        <form @submit.prevent="submit" class="project-form">
          <div class="form-field">
            <label for="newName" class="field-label">
              <span class="label-text">Project Name</span>
              <span class="label-required">*</span>
            </label>
            <div class="input-wrapper">
              <input 
                id="newName" 
                type="text"
                class="form-input" 
                v-model="name" 
                @keydown.enter.prevent="submit" 
                placeholder="My Amazing Project" 
                :disabled="creating"
                maxlength="100"
              />
              <div class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                </svg>
              </div>
            </div>
            <div class="field-hint">Give your project a descriptive name to identify it later</div>
          </div>

          <div class="form-field">
            <label for="newDesc" class="field-label">
              <span class="label-text">Description</span>
              <span class="label-optional">Optional</span>
            </label>
            <div class="input-wrapper">
              <textarea 
                id="newDesc" 
                class="form-textarea" 
                v-model="description" 
                placeholder="Brief description of what this project is for..." 
                rows="3"
                :disabled="creating"
                maxlength="500"
              ></textarea>
            </div>
            <div class="field-hint">Help organize your projects with a short description</div>
          </div>

          <div v-if="error" class="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ error }}
          </div>
        </form>
      </div>

      <!-- Footer Actions -->
      <div class="new-project-footer">
        <button type="button" class="btn btn--secondary" @click="close" :disabled="creating">
          Cancel
        </button>
        <button type="button" class="btn btn--primary" @click="submit" :disabled="creating">
          <span v-if="creating" class="btn-loading">
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Creating...
          </span>
          <span v-else class="btn-content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Project
          </span>
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useProjectStore } from '../../../store/useProjectStore';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['create','close']);
const dlg = ref<HTMLDialogElement | null>(null);
const name = ref('');
const description = ref('');
const creating = ref(false);
const error = ref('');

const store = useProjectStore();

function close() {
  error.value = '';
  name.value = '';
  description.value = '';
  emit('close');
  try { dlg.value?.close(); } catch {}
}

async function submit() {
  error.value = '';
  const n = (name.value || '').trim() || 'Untitled';
  if (n.length > 100) {
    error.value = 'Name too long (max 100 characters)';
    return;
  }
  // create locally first so store can use same flow
  creating.value = true;
  try {
    // create project using store API; store.createProject already used elsewhere
    store.createProject(n);
    // optional: attach description if project structure supports it
    try { await store.saveCurrentProject?.(); } catch (e) { console.error(e); }
    try { await store.refreshMetaBar?.(); } catch (e) { console.error(e); }
    emit('create', n);
    close();
  } catch (e) {
    console.error('Failed to create project', e);
    error.value = 'Failed to create project';
  } finally {
    creating.value = false;
  }
}

// Watch for show prop changes
watch(() => props.show, (newShow) => {
  if (newShow) {
    nextTick(() => {
      try { 
        dlg.value?.showModal();
        // Focus the name input when modal opens
        const nameInput = document.getElementById('newName') as HTMLInputElement;
        nameInput?.focus();
      } catch (e) {}
    });
  } else {
    try { dlg.value?.close(); } catch (e) {}
  }
});
</script>

<style scoped>
/* Base Modal */
.new-project-dialog {
  width: min(580px, 95vw);
  max-width: 580px;
  background: transparent;
  border: none;
  padding: 0;
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.new-project-dialog::backdrop {
  background: rgba(10, 15, 22, 0.8);
  backdrop-filter: blur(4px);
}

.new-project-container {
  background: var(--panel, #1a1d23);
  border: 1px solid var(--border, #2a2e36);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
}

/* Hero Section */
.new-project-hero {
  background: linear-gradient(135deg, var(--brand, #3d6fff) 0%, var(--accent, #00d1b2) 100%);
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  color: white;
}

.new-project-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(61, 111, 255, 0.9) 0%, rgba(0, 209, 178, 0.8) 100%);
  z-index: 1;
}

.hero-content {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 2;
}

.hero-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md, 8px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.hero-text h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.hero-text p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  font-weight: 400;
}

.close-btn {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  width: 40px;
  height: 40px;
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

.close-btn:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.05);
}

/* Content Section */
.new-project-content {
  padding: 32px;
}

.project-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #e2e8f0);
}

.label-text {
  color: var(--text, #e2e8f0);
}

.label-required {
  color: #ff6b6b;
  font-size: 12px;
}

.label-optional {
  color: var(--text-dim, #64748b);
  font-size: 12px;
  font-weight: 400;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 14px 16px;
  padding-right: 44px;
  background: var(--muted, #0f1419);
  border: 2px solid var(--border, #2a2e36);
  border-radius: var(--radius-md, 8px);
  color: var(--text, #e2e8f0);
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--brand, #3d6fff);
  box-shadow: 0 0 0 3px rgba(61, 111, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-dim, #64748b);
}

.form-input:disabled,
.form-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-icon {
  position: absolute;
  right: 14px;
  color: var(--text-dim, #64748b);
  pointer-events: none;
  display: flex;
  align-items: center;
}

.field-hint {
  font-size: 13px;
  color: var(--text-dim, #64748b);
  margin-top: 4px;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: var(--radius-md, 8px);
  color: #ff6b6b;
  font-size: 14px;
  font-weight: 500;
}

/* Footer */
.new-project-footer {
  background: var(--muted, #0f1419);
  border-top: 1px solid var(--border, #2a2e36);
  padding: 24px 32px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-height: 44px;
  position: relative;
  overflow: hidden;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--secondary {
  background: transparent;
  color: var(--text-dim, #64748b);
  border: 1px solid var(--border, #2a2e36);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--muted, #0f1419);
  color: var(--text, #e2e8f0);
  border-color: var(--text-dim, #64748b);
}

.btn--primary {
  background: linear-gradient(135deg, var(--brand, #3d6fff), var(--accent, #00d1b2));
  color: white;
  border: 1px solid transparent;
  box-shadow: 0 2px 8px rgba(61, 111, 255, 0.3);
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(61, 111, 255, 0.4);
}

.btn--primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-loading,
.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Loading Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 640px) {
  .new-project-dialog {
    width: 95vw;
    margin: 10px;
  }
  
  .new-project-hero {
    padding: 24px;
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .hero-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
  }
  
  .new-project-content {
    padding: 24px;
  }
  
  .new-project-footer {
    padding: 20px 24px;
    flex-direction: column;
    gap: 12px;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
