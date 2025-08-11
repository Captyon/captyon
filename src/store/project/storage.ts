import * as idb from '../../services/db';
import * as mongoDb from '../../services/db.mongo';
import { state } from './state';
import { addToast } from './toasts';

/**
 * Storage abstraction helpers: choose between IndexedDB (idb) and Mongo API (mongoDb)
 */
export async function putProjectAny(project: any): Promise<void> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      await mongoDb.putProject(project, { baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return;
    } catch (e) {
      addToast('Failed to save to MongoDB; using browser storage', 'warn');
      console.error('mongo putProject failed', e);
      // fall back to IndexedDB
    }
  }
  return idb.putProject(project);
}

export async function getProjectAny(id: string): Promise<any | null> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      const p = await mongoDb.getProject(id, { baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return p;
    } catch (e) {
      addToast('Failed to read from MongoDB; using browser storage', 'warn');
      console.error('mongo getProject failed', e);
    }
  }
  return idb.getProject(id);
}

export async function deleteProjectAny(id: string): Promise<void> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      await mongoDb.deleteProject(id, { baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return;
    } catch (e) {
      addToast('Failed to delete from MongoDB; using browser storage', 'warn');
      console.error('mongo deleteProject failed', e);
    }
  }
  return idb.deleteProject(id);
}

export async function getAllMetaAny(): Promise<Array<{ id: string; name: string; count: number; updatedAt: number }>> {
  if (state.settings.storage === 'mongodb' && state.settings.mongoApiUrl) {
    try {
      const m = await mongoDb.getAllMeta({ baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
      return m;
    } catch (e) {
      addToast('Failed to read project list from MongoDB; using browser storage', 'warn');
      console.error('mongo getAllMeta failed', e);
    }
  }
  return idb.getAllMeta();
}

export async function testMongoConnection(): Promise<boolean> {
  if (!state.settings.mongoApiUrl) return false;
  try {
    const ok = await mongoDb.testConnection({ baseUrl: state.settings.mongoApiUrl, apiKey: state.settings.mongoApiKey || null });
    return ok;
  } catch (e) {
    console.error('testMongoConnection error', e);
    return false;
  }
}

export async function syncLocalToMongo(): Promise<void> {
  try {
    const localMeta = await idb.getAllMeta();
    const opts = { baseUrl: state.settings.mongoApiUrl!, apiKey: state.settings.mongoApiKey || null };

    // Try to fetch remote meta so we can avoid uploading unchanged projects.
    let remoteMap = new Map<string, number>();
    try {
      const remoteMeta = await mongoDb.getAllMeta(opts);
      for (const r of remoteMeta) {
        remoteMap.set(r.id, r.updatedAt || 0);
      }
    } catch (e) {
      // If fetching remote meta fails, fall back to uploading all local projects.
      console.error('syncLocalToMongo: failed to fetch remote meta', e);
    }

    let uploaded = 0;
    for (const m of localMeta) {
      try {
        const proj = await idb.getProject(m.id);
        if (!proj) continue;
        const remoteUpdated = remoteMap.get(m.id);
        // If remote exists and is newer or equal, skip upload.
        if (remoteUpdated !== undefined && proj.updatedAt <= remoteUpdated) {
          continue;
        }
        await mongoDb.putProject(proj, opts);
        uploaded++;
      } catch (e) {
        console.error('syncLocalToMongo: failed project', m.id, e);
      }
    }

    if (uploaded > 0) {
      addToast(`Synced ${uploaded} project(s) to MongoDB`, 'ok');
    } else {
      addToast('No local changes to sync to MongoDB', 'ok');
    }
  } catch (e) {
    console.error('syncLocalToMongo failed', e);
  }
}
