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
};

export type ToastKind = '' | 'ok' | 'warn' | 'danger';
export type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
};
