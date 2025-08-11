<template>
  <dialog id="settingsModal">
    <div class="modal-head">
      <h3 style="margin:0">Settings</h3>
      <button class="btn small" data-close="settingsModal" @click="close">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="field">
          <label for="ollamaUrl">Ollama server URL</label>
          <input id="ollamaUrl" type="text" v-model="state.settings.ollamaUrl" placeholder="http://localhost:11434">
        </div>
        <div class="field">
          <label for="ollamaModel">Vision model name</label>
          <input id="ollamaModel" type="text" v-model="state.settings.ollamaModel" placeholder="llama3.2-vision or llava">
        </div>
      </div>
      <div class="field">
        <label for="promptTpl">Prompt template</label>
        <textarea id="promptTpl" class="input" v-model="state.settings.promptTpl" placeholder="Describe the image for a caption. Focus on key subjects, actions, style, quality."></textarea>
      </div>
      <div style="display:flex; gap:8px; align-items:center; justify-content:space-between">
        <div style="display:flex; gap:8px; align-items:center">
          <button class="btn" id="testOllamaBtn" @click="testOllama">Test Connection</button>
          <span id="ollamaStatus" class="badge">Not tested</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end">
          <label><input type="checkbox" id="streamOllama" v-model="state.settings.stream"> Stream responses</label>
          <label><input type="checkbox" id="usePromptMeta" v-model="state.settings.usePromptMetadata"> Scan images for embedded prompts</label>
          <label><input type="checkbox" id="confirmPrompt" v-model="state.settings.confirmPromptOnImport"> Confirm before applying embedded prompts</label>
          <label><input type="checkbox" id="confirmDelete" v-model="state.settings.confirmDeleteOnRemove"> Confirm before deleting images</label>
        </div>
      </div>

      <!-- Image dimming settings -->
      <div style="margin-top:12px; padding:12px; border-radius:6px; background:var(--panel-bg, #0f1720);">
        <h4 style="margin:0 0 8px 0">Image dimming</h4>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
          <label style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" v-model="state.settings.autoDimEnabled"> Automatically dim very bright images
          </label>
        </div>
        <div style="display:flex;gap:8px;flex-direction:column">
          <div class="field">
            <label for="autoDimThreshold">Auto-dim threshold (0-255)</label>
            <input id="autoDimThreshold" type="number" v-model.number="state.settings.autoDimThreshold" min="0" max="255">
          </div>
          <div class="field">
            <label for="defaultDimPercent">Dim amount (%)</label>
            <input id="defaultDimPercent" type="range" v-model.number="state.settings.defaultDimPercent" min="10" max="100">
            <span>{{ state.settings.defaultDimPercent }}%</span>
          </div>
        </div>
      </div>

      <!-- MongoDB storage settings -->
      <div style="margin-top:12px; padding:12px; border-radius:6px; background:var(--panel-bg, #0f1720);">
        <h4 style="margin:0 0 8px 0">Storage</h4>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
          <label style="display:flex;align-items:center;gap:6px"><input type="radio" value="browser" v-model="state.settings.storage"> Browser (IndexedDB)</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="radio" value="mongodb" v-model="state.settings.storage"> MongoDB</label>
        </div>

        <div style="display:flex;gap:8px;flex-direction:column">
          <div class="field">
            <label for="mongoApiUrl">Mongo API base URL (Not Mongo URI)</label>
            <input id="mongoApiUrl" type="text" v-model="state.settings.mongoApiUrl" placeholder="http://localhost:4000">
          </div>
          <div class="field">
            <label for="mongoApiKey">API Key (optional)</label>
            <input id="mongoApiKey" type="text" v-model="state.settings.mongoApiKey" placeholder="Leave blank for none">
          </div>
          <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">
            <button class="btn" id="testMongoBtn" @click="testMongo">Test Mongo</button>
            <button class="btn" id="retryMongoBtn" v-if="state.settings.storage === 'mongodb' && state.settings.mongoApiUrl" @click="testMongo">Retry</button>
          </div>
<p style="margin-top:8px;color:var(--text-color,#d1d5db)">When MongoDB is selected and the connection test succeeds, local projects will be synced automatically to the server.</p>
        </div>
      </div>

      <div style="display:flex; gap:8px; justify-content:flex-end">
        <button class="btn" id="resetSettingsBtn" @click="resetSettings">Reset</button>
        <button class="btn primary" id="saveSettingsBtn" @click="saveSettingsAndClose">Save</button>
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

  // Reset manual dim UI state
  (state as any).manualDimPercent = 100;
}
</script>
