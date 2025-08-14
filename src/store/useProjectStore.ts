import type { Project } from '../types';
import { state } from './project/state';
import { initStore, saveSettings } from './project/settings';
import { refreshMetaBar, createProject, loadProjectById, deleteProject } from './project/meta';
import { getCurrentProject, currentItem, filteredItems, getAbsoluteIndex } from './project/accessors';
import { ingestFiles } from './project/ingest';
import { saveCurrentProject, applyEdits, copyFromFile, clearCaption, bulkApply, prev, next, toggleSelect, clearList, removeCurrentItem } from './project/edits';
import { exportProject, exportProjectZip, importProjectFromJSON } from './project/export';
import { addToast, dismissToast } from './project/toasts';
import { autoCaptionCurrent, autoCaptionBulk } from './project/autoCaption';
import { acceptPromptCandidate, rejectPromptCandidate, acceptAllPromptCandidates, rejectAllPromptCandidates } from './project/promptCandidates';
import { setCurationStatus, startCuration, stopCuration, removeRejectedFromProject, getCurationQueue } from './project/curation';
import { testMongoConnection, syncLocalToMongo } from './project/storage';
import { testOllama } from '../services/ollama';

export function useProjectStore() {
  return {
    state,
    initStore,
    refreshMetaBar,
    createProject,
    setCurrentProject(project: Project) {
      state.projects.set(project.id, project);
      if (!state.order.includes(project.id)) state.order.push(project.id);
      state.currentId = project.id;
      state.currentIndex = project.cursor || 0;
    },
    loadProjectById,
    getCurrentProject,
    currentItem,
    filteredItems,
    getAbsoluteIndex,
    ingestFiles,
    saveCurrentProject,
    // selection helpers
    setSelectedRegion(id: string | null) {
      state.selectedRegionId = id;
    },
    exportProject,
    exportProjectZip,
    importProjectFromJSON,
    applyEdits,
    copyFromFile,
    clearCaption,
    bulkApply,
    autoCaptionCurrent,
    autoCaptionBulk,
    prev,
    next,
    toggleSelect,
    clearList,
    removeCurrentItem,
    saveSettings,
    deleteProject,
    testOllama: async () => {
      try {
        const ok = await testOllama(state.settings.ollamaUrl);
        return ok;
      } catch {
        return false;
      }
    },
    testMongo: async () => {
      try {
        const ok = await testMongoConnection();
        if (ok) {
          addToast('MongoDB connection OK', 'ok');
          await syncLocalToMongo();
        } else {
          addToast('MongoDB connection failed', 'warn');
        }
        return ok;
      } catch (e) {
        console.error('testMongo', e);
        addToast('MongoDB connection failed', 'warn');
        return false;
      }
    },
    syncToMongo: async () => {
      try {
        await syncLocalToMongo();
        return true;
      } catch (e) {
        console.error('syncToMongo', e);
        return false;
      }
    },
    closeProject: async () => {
      try {
        // Save current project before closing if there are unsaved changes
        if (state.currentId) {
          await saveCurrentProject();
        }
        
        // Reset to empty state
        state.currentId = null;
        state.currentIndex = -1;
        
        // Clear UI state
        state.zoom = 100;
        state.rotation = 0;
        state.panX = 0;
        state.panY = 0;
        state.selectedRegionId = null;
        state.selection.clear();
        state.filter = { text: '', onlyMissing: false, onlySelected: false };
        state.manualDimPercent = 100;
        state.curationMode = false;
        
        // Clear any ongoing operations
        state.status = 'Idle';
        state.progress = { cur: 0, total: 0 };
        state.promptCandidates = [];
        state.showPromptModal = false;
        
        addToast('Project closed', 'ok');
        return true;
      } catch (e) {
        console.error('closeProject failed', e);
        addToast('Failed to close project', 'warn');
        return false;
      }
    },
    // Toasts
    toasts: state.toasts,
    addToast,
    dismissToast,
    stateRef: state,
    // Prompt candidate actions
    acceptPromptCandidate,
    rejectPromptCandidate,
    acceptAllPromptCandidates,
    rejectAllPromptCandidates,
    // Curation helpers
    setCurationStatus,
    startCuration,
    stopCuration,
    removeRejectedFromProject,
    getCurationQueue
  };
}
