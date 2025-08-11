import { ref } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

export function useFilePicker() {
  const store = useProjectStore();
  const filesInput = ref<HTMLInputElement | null>(null);
  const folderInput = ref<HTMLInputElement | null>(null);
  const jsonInput = ref<HTMLInputElement | null>(null);

  async function pickFiles() {
    // Prefer the Directory Picker when available so we can scan the whole folder
    // for matching .txt caption files even if the user only selects images.
    // Fall back to the regular file input if the API isn't available or is cancelled.
    if ((window as any).showDirectoryPicker) {
      try {
        const dir = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        async function recurse(d: any) {
          for await (const [, handle] of d.entries()) {
            if (handle.kind === 'file') {
              try {
                const f = await handle.getFile();
                files.push(f);
              } catch (e) {
                // ignore files we can't read
              }
            } else if (handle.kind === 'directory') {
              await recurse(handle);
            }
          }
        }
        await recurse(dir);
        if (files.length) {
          store.ingestFiles(files);
        }
        return;
      } catch (err) {
        // user cancelled or permission denied — fall back to input picker
      }
    }
    filesInput.value?.click();
  }

  function pickFolder() {
    folderInput.value?.click();
  }

  function triggerJsonImport() {
    jsonInput.value?.click();
  }

  function onFilesPicked(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el?.files) store.ingestFiles(el.files);
    if (el) el.value = '';
  }

  function onFolderPicked(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el?.files) store.ingestFiles(el.files);
    if (el) el.value = '';
  }

  function onImportJson(e: Event) {
    const el = e.target as HTMLInputElement;
    const f = el.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        store.importProjectFromJSON(obj);
      } catch {
        store.addToast('Invalid JSON', 'warn');
      }
    };
    reader.readAsText(f);
    if (el) el.value = '';
  }

  return {
    filesInput,
    folderInput,
    jsonInput,
    pickFiles,
    pickFolder,
    triggerJsonImport,
    onFilesPicked,
    onFolderPicked,
    onImportJson,
  };
}
