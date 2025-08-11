export type Item = {
  id: string;
  filename: string;
  base: string;
  caption: string;
  originalCaption: string;
  img: string; // data URL
  tags: string[];
  selected: boolean;
  width: number;
  height: number;
};

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: Item[];
  cursor: number;
};

export type Settings = {
  ollamaUrl: string;
  ollamaModel: string;
  promptTpl: string;
  stream: boolean;
  usePromptMetadata: boolean;
  confirmPromptOnImport: boolean;
  confirmDeleteOnRemove: boolean;
  // Show the welcome screen on first run (default true). Can be persisted to localStorage.
  showWelcomeOnStart?: boolean;
  // If true, automatically sync local projects to MongoDB when the app starts.
  autoSyncOnStart?: boolean;
  // storage selection: default remains browser (IndexedDB)
  storage?: 'browser' | 'mongodb';
  // If storage === 'mongodb' the client will talk to this API base URL
  mongoApiUrl?: string;
  // Optional API key / token to send in Authorization header (Bearer) or x-api-key
  mongoApiKey?: string;
};

export type ToastKind = '' | 'ok' | 'warn' | 'danger';
export type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
};
