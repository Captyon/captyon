export type Region = {
  id: string;
  name: string;
  caption?: string;
  // Coordinates are always in source image pixels (full-resolution)
  x: number;
  y: number;
  w: number;
  h: number;
  aspect: string; // e.g. "1:1", "4:3"
  size: [number, number]; // [W, H] in pixels
  createdAt?: number;
  updatedAt?: number;
};

export type Item = {
  id: string;
  filename: string;
  base: string;
  caption: string;
  originalCaption: string;
  aiGenerated?: boolean;
  img: string; // data URL
  tags: string[];
  selected: boolean;
  width: number;
  height: number;
  // Average brightness measured on import (0-255). Higher = brighter.
  avgBrightness?: number;
  mediaType?: 'image' | 'video' | string;
  size?: number; // bytes
  regions?: Region[];

  // Curation status accept/reject workflow
  curationStatus?: 'accepted' | 'rejected';
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

  // Image dimming settings
  // When enabled, images whose average brightness exceeds `autoDimThreshold`
  // will be dimmed to `defaultDimPercent` percent brightness.
  autoDimEnabled?: boolean;
  autoDimThreshold?: number; // 0-255 brightness threshold
  defaultDimPercent?: number; // 10-100 percent (100 = no dim)
  
  // UI label settings
  showOverlayLabels?: boolean; // Show "Alt+Click+drag" and auto-dim labels (default true)
};

export type ToastKind = '' | 'ok' | 'warn' | 'danger';
export type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
  // Unix timestamp (ms) when the toast was created
  ts?: number;
  // Whether the user has seen (opened the tray) this toast
  seen?: boolean;
  // If true the toast should not auto-dismiss when displayed transiently
  pinned?: boolean;
};
