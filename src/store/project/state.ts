import { reactive } from 'vue';
import type { Project, Settings } from '../../types';
import type { ToastItem } from '../../types';

export function newId(prefix = 'p_') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export type Progress = { cur: number; total: number };

export type State = {
  projects: Map<string, Project>;
  order: string[];
  currentId: string | null;
  currentIndex: number;
  zoom: number;
  rotation: number;
  filter: { text: string; onlyMissing: boolean; onlySelected: boolean };
  settings: Settings;
  selection: Set<string>;
  status: string;
  progress: Progress;
  toasts: ToastItem[];
  // Prompt candidates extracted from images (but not yet applied)
  promptCandidates: Array<{ itemId: string; filename: string; img: string; prompt: string }>;
  // Local UI flag to show the welcome dialog on first-run
  showWelcomeModal: boolean;
  // Show confirmation modal when promptCandidates is non-empty and user opted-in
  showPromptModal: boolean;
  // Whether curation (tinder-like) mode is active
  curationMode?: boolean;
};

export const state = reactive<State>({
  projects: new Map(),
  order: [],
  currentId: null,
  currentIndex: -1,
  zoom: 100,
  rotation: 0,
  filter: { text: '', onlyMissing: false, onlySelected: false },
  settings: {
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2-vision',
    promptTpl:
      'Describe this image as a short, high quality caption. Focus on the main subject, action, style, lighting and mood. Keep it concise.',
    stream: false,
    usePromptMetadata: true,
    confirmPromptOnImport: true,
    confirmDeleteOnRemove: true,
    // Show the welcome modal on first run (only shown when there are no projects)
    showWelcomeOnStart: true,
    // Storage settings (default to browser)
    autoSyncOnStart: false,
    storage: 'browser',
    mongoApiUrl: '',
    mongoApiKey: ''
  },
  selection: new Set(),
  status: 'Idle',
  progress: { cur: 0, total: 0 },
  toasts: [],
  promptCandidates: [],
  showWelcomeModal: false,
  showPromptModal: false,
  // Curation mode off by default
  curationMode: false
});
