<template>
  <dialog id="settingsModal" class="settings-dialog">
    <div class="settings-container">
      <!-- Hero -->
      <div class="settings-hero">
        <div class="hero-content">
          <div class="hero-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82h0c.21.59.77 1 1.41 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>
            </svg>
          </div>
          <div class="hero-text">
            <h2>Settings</h2>
            <p>Configure models, storage, and workspace preferences</p>
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

      <!-- Content -->
      <div class="settings-content">
        <!-- General -->
        <div class="section">
          <h3 class="section-title">General</h3>
          <div class="grid-2">
            <div class="form-field">
              <label for="ollamaUrl" class="field-label">
                <span class="label-text">Ollama server URL</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="ollamaUrl"
                  type="text"
                  class="form-input"
                  v-model="state.settings.ollamaUrl"
                  placeholder="http://localhost:11434"
                />
                <div class="input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7h18M3 12h18M3 17h18"></path>
                  </svg>
                </div>
              </div>
              <div class="field-hint">Your local or remote Ollama server base URL</div>
            </div>

            <div class="form-field">
              <label for="ollamaModel" class="field-label">
                <span class="label-text">Vision model name</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="ollamaModel"
                  type="text"
                  class="form-input"
                  v-model="state.settings.ollamaModel"
                  placeholder="llama3.2-vision or llava"
                />
                <div class="input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
              </div>
              <div class="field-hint">Model name as pulled in Ollama (e.g., llama3.2-vision)</div>
            </div>
          </div>

          <div class="form-field">
            <label for="promptTpl" class="field-label">
              <span class="label-text">Prompt template</span>
              <span class="label-optional">Optional</span>
            </label>
            <div class="input-wrapper">
              <textarea
                id="promptTpl"
                class="form-textarea"
                v-model="state.settings.promptTpl"
                placeholder="Describe the image for a caption. Focus on key subjects, actions, style, quality."
                rows="4"
              ></textarea>
            </div>
            <div class="field-hint">Default prompt used for generating captions</div>
          </div>

          <div class="actions-row">
            <div class="left-actions">
              <button class="btn btn--secondary" id="testOllamaBtn" @click="testOllama">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Test Connection
              </button>
              <span id="ollamaStatus" class="badge">Not tested</span>
            </div>
            <div class="preferences">
              <label class="check">
                <input type="checkbox" id="streamOllama" v-model="state.settings.stream" />
                <span>Stream responses</span>
              </label>
              <label class="check">
                <input type="checkbox" id="usePromptMeta" v-model="state.settings.usePromptMetadata" />
                <span>Scan images for embedded prompts</span>
              </label>
              <label class="check">
                <input type="checkbox" id="confirmPrompt" v-model="state.settings.confirmPromptOnImport" />
                <span>Confirm before applying embedded prompts</span>
              </label>
              <label class="check">
                <input type="checkbox" id="confirmDelete" v-model="state.settings.confirmDeleteOnRemove" />
                <span>Confirm before deleting images</span>
              </label>
              <label class="check">
                <input type="checkbox" id="showOverlayLabels" v-model="state.settings.showOverlayLabels" />
                <span>Show overlay labels</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Image Dimming -->
        <div class="section">
          <h3 class="section-title">Image Dimming</h3>

          <label class="check mb-12">
            <input type="checkbox" v-model="state.settings.autoDimEnabled" />
            <span>Automatically dim very bright images</span>
          </label>

          <div class="grid-2">
            <div class="form-field">
              <label for="autoDimThreshold" class="field-label">
                <span class="label-text">Auto-dim threshold (0-255)</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="autoDimThreshold"
                  type="number"
                  class="form-input"
                  v-model.number="state.settings.autoDimThreshold"
                  min="0"
                  max="255"
                />
              </div>
              <div class="field-hint">Brightness threshold for enabling auto-dim</div>
            </div>

            <div class="form-field">
              <label for="defaultDimPercent" class="field-label">
                <span class="label-text">Dim amount (%)</span>
              </label>
              <div class="range-row">
                <input
                  id="defaultDimPercent"
                  type="range"
                  v-model.number="state.settings.defaultDimPercent"
                  min="10"
                  max="100"
                />
                <span class="range-value">{{ state.settings.defaultDimPercent }}%</span>
              </div>
              <div class="field-hint">Default dimming applied to bright images</div>
            </div>
          </div>
        </div>

        <!-- Storage -->
        <div class="section">
          <h3 class="section-title">Storage</h3>

          <div class="radio-group">
            <label class="radio">
              <input type="radio" value="browser" v-model="state.settings.storage" />
              <span>Browser (IndexedDB)</span>
            </label>
            <label class="radio">
              <input type="radio" value="mongodb" v-model="state.settings.storage" />
              <span>MongoDB</span>
            </label>
          </div>

          <div class="grid-2">
            <div class="form-field">
              <label for="mongoApiUrl" class="field-label">
                <span class="label-text">Mongo API base URL (Not Mongo URI)</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="mongoApiUrl"
                  type="text"
                  class="form-input"
                  v-model="state.settings.mongoApiUrl"
                  placeholder="http://localhost:4000"
                />
                <div class="input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7h18M3 12h18M3 17h18"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="form-field">
              <label for="mongoApiKey" class="field-label">
                <span class="label-text">API Key (optional)</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="mongoApiKey"
                  type="text"
                  class="form-input"
                  v-model="state.settings.mongoApiKey"
                  placeholder="Leave blank for none"
                />
                <div class="input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7h18M3 12h18M3 17h18"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div class="inline-actions">
            <div class="spacer"></div>
            <div class="right-actions">
              <button class="btn btn--secondary" id="testMongoBtn" @click="testMongo">
                Test Mongo
              </button>
              <button
                class="btn btn--secondary"
                id="retryMongoBtn"
                v-if="state.settings.storage === 'mongodb' && state.settings.mongoApiUrl"
                @click="testMongo"
              >
                Retry
              </button>
            </div>
          </div>

          <p class="note">
            When MongoDB is selected and the connection test succeeds, local projects will be synced automatically to the server.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="settings-footer">
        <div class="footer-left">
          <button class="btn" id="resetSettingsBtn" @click="resetSettings">Reset</button>
        </div>
        <div class="footer-right">
          <button class="btn btn--secondary" @click="close">Cancel</button>
          <button class="btn btn--primary" id="saveSettingsBtn" @click="saveSettingsAndClose">
            Save
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useProjectStore } from '../../../store/useProjectStore';

const store = useProjectStore();
const { state } = store;

function close() {
  try { (document.getElementById('settingsModal') as HTMLDialogElement | null)?.close(); } catch {}
}

function testOllama() {
  try { store.testOllama(); } catch (e) { console.error(e); }
}

function testMongo() {
  try { store.testMongo(); } catch (e) { console.error(e); }
}

function saveSettingsAndClose() {
  try { (store as any).saveSettings(state.settings); } catch (e) { console.error(e); }
  close();
}

function resetSettings() {
  state.settings.ollamaUrl = 'http://localhost:11434';
  state.settings.ollamaModel = 'llama3.2-vision';
  state.settings.promptTpl = 'Describe this image as a short, high quality caption. Focus on the main subject, action, style, lighting and mood. Keep it concise.';
  state.settings.stream = false;

  // Reset image dimming settings to sensible defaults
  state.settings.autoDimEnabled = true;
  state.settings.autoDimThreshold = 230;
  state.settings.defaultDimPercent = 70;
  
  // Reset UI settings
  state.settings.showOverlayLabels = true;

  // Reset manual dim UI state
  (state as any).manualDimPercent = 100;
}
</script>

<style scoped>
/* Dialog Base */
.settings-dialog {
  width: min(760px, 95vw);
  max-width: 760px;
  background: transparent;
  border: none;
  padding: 0;
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.settings-dialog::backdrop {
  background: rgba(10, 15, 22, 0.8);
  backdrop-filter: blur(4px);
}

.settings-container {
  background: var(--panel, #1a1d23);
  border: 1px solid var(--border, #2a2e36);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Hero */
.settings-hero {
  background: linear-gradient(135deg, var(--brand, #3d6fff) 0%, var(--accent, #00d1b2) 100%);
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  color: white;
}

.settings-hero::before {
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

/* Content */
.settings-content {
  padding: 28px 32px 8px 32px;
}

.section {
  background: var(--muted, #0f1419);
  border: 1px solid var(--border, #2a2e36);
  border-radius: var(--radius-md, 8px);
  padding: 20px;
  margin-bottom: 20px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #e2e8f0);
}

/* Grid */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Form */
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

.form-textarea {
  min-height: 96px;
}

.form-input:focus-visible,
.form-textarea:focus-visible {
  outline: none;
  border-color: var(--brand, #3d6fff);
  box-shadow: 0 0 0 3px rgba(61, 111, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-dim, #64748b);
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
  margin-top: 2px;
}

/* Actions Row */
.actions-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preferences {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text, #e2e8f0);
}

.check input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.mb-12 { margin-bottom: 12px; }

/* Range */
.range-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-row input[type="range"] {
  flex: 1;
}

.range-value {
  font-size: 14px;
  color: var(--text, #e2e8f0);
  min-width: 44px;
  text-align: right;
}

/* Radios */
.radio-group {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.radio {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text, #e2e8f0);
  font-size: 14px;
}

.radio input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

/* Inline actions */
.inline-actions {
  display: flex;
  align-items: center;
  margin-top: 8px;
  gap: 12px;
}

.inline-actions .spacer {
  flex: 1;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text, #e2e8f0);
  font-size: 12px;
  font-weight: 600;
}

/* Note */
.note {
  margin: 12px 0 0 0;
  color: var(--text-dim, #64748b);
  font-size: 13px;
}

/* Footer */
.settings-footer {
  background: var(--muted, #0f1419);
  border-top: 1px solid var(--border, #2a2e36);
  padding: 20px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border, #2a2e36);
  background: var(--muted, #0f1419);
  color: var(--text, #e2e8f0);
  min-height: 40px;
}

.btn:hover {
  background: var(--panel, #1a1d23);
  border-color: var(--text-dim, #64748b);
}

.btn--secondary {
  background: transparent;
}

.btn--primary {
  background: linear-gradient(135deg, var(--brand, #3d6fff), var(--accent, #00d1b2));
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(61, 111, 255, 0.3);
}

.btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(61, 111, 255, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .settings-hero {
    padding: 24px;
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  .settings-content {
    padding: 24px 24px 8px 24px;
  }

  .grid-2 {
    grid-template-columns: 1fr;
  }

  .actions-row {
    flex-direction: column;
    align-items: stretch;
  }

  .left-actions {
    justify-content: flex-start;
  }

  .settings-footer {
    padding: 20px 24px;
    flex-direction: column;
    align-items: stretch;
  }

  .footer-right .btn {
    flex: 1;
  }
}
</style>
