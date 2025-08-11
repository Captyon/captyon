import { state } from './state';
import { addToast } from './toasts';
import { getAllMetaAny, testMongoConnection, syncLocalToMongo } from './storage';
import { loadFirstProjectIfMissing, refreshMetaBar } from './meta';

/**
 * Save settings and handle storage switching / auto-sync.
 */
export async function saveSettings(newSettings: Partial<any>) {
  const prevStorage = state.settings.storage;
  Object.assign(state.settings, newSettings);
  localStorage.setItem('captionSettings', JSON.stringify(state.settings));
  addToast('Settings saved', 'ok');

  // If storage switched to mongodb and an api url is configured, test and auto-sync
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl && prevStorage !== 'mongodb') {
    const ok = await testMongoConnection();
    if (ok) {
      addToast('Connected to MongoDB — syncing local projects', 'ok');
      await syncLocalToMongo();
    } else {
      addToast('MongoDB unreachable. Using browser storage. You can retry in Settings.', 'warn');
    }
  }
}

/**
 * Load settings from localStorage into state.settings
 */
export function loadSettingsFromLocal() {
  try {
    const s = JSON.parse(localStorage.getItem('captionSettings') || '{}');
    Object.assign(state.settings, s);
  } catch {}
}

/**
 * initStore: orchestrates startup steps
 */
export async function initStore() {
  // Load persisted settings first so we can use the showWelcomeOnStart flag
  loadSettingsFromLocal();

  // Check whether there are any existing projects (meta). If none (or only the
  // auto-created default "My First Project" with zero items) and the welcome
  // flag is enabled, show the welcome modal (first-run experience).
  try {
    const meta = await getAllMetaAny();
    if (state.settings.showWelcomeOnStart ?? true) {
      let showWelcome = false;
      if (meta.length === 0) {
        showWelcome = true;
      } else if (meta.length === 1) {
        // If the only project is the auto-created default and it has no items,
        // treat this as first-run so the welcome screen appears.
        const m = meta[0];
        const isDefaultName = m.name === 'My First Project' || m.name === 'Untitled Project';
        const isEmpty = !m.count || m.count === 0;
        if (isDefaultName && isEmpty) showWelcome = true;
      }
      if (showWelcome) state.showWelcomeModal = true;
    }
  } catch (e) {
    console.error('initStore: failed to fetch meta for welcome check', e);
  }

  // Ensure at least one project exists (this will create the default project if needed)
  await loadFirstProjectIfMissing();
  await refreshMetaBar();

  // If configured for MongoDB at startup, test connection and (optionally) attempt auto-sync if available
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    const ok = await testMongoConnection();
    if (ok) {
      if (state.settings.autoSyncOnStart) {
        addToast('Connected to MongoDB — syncing local projects', 'ok');
        await syncLocalToMongo();
      } else {
        addToast('Connected to MongoDB', 'ok');
      }
    } else {
      addToast('MongoDB unreachable. Using browser storage. Open Settings to retry.', 'warn');
    }
  }
}
