import { state, newId } from './state';
import { addToast } from './toasts';
import { putProjectAny } from './storage';
import {
  readAsDataURL,
  readAsText,
  imgDims,
  isImg,
  isTxt,
  isVideo,
  mediaTypeOf,
  base as fileBase,
  extractSdPrompt,
  computeAvgBrightness
} from '../../utils/file';

/* ----------------- File ingestion ----------------- */
export async function ingestFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList as any) as File[];
  const images = files.filter(isImg);
  const videos = files.filter(isVideo);
  const texts = files.filter(isTxt);
  if (images.length === 0 && videos.length === 0 && texts.length === 0) {
    addToast('No supported files found', '');
    return;
  }

  const txtByBase = new Map<string, File>();
  for (const t of texts) {
    txtByBase.set(fileBase(t), t);
  }

  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) {
    addToast('No project selected', 'warn');
    return;
  }

  state.status = 'Reading files';
  let added = 0;

  // Build sets to avoid duplicates: files already in project and duplicates within this import
  const existingBases = new Set(proj.items.map((it: any) => it.base || it.filename));
  const seenBases = new Set<string>();
  const uniqueMedia: File[] = [];

  // Combine images and videos to a single import list while preserving order
  const mediaCandidates = [...images, ...videos];
  for (const f of mediaCandidates) {
    const b = fileBase(f);
    if (existingBases.has(b) || seenBases.has(b)) continue;
    seenBases.add(b);
    uniqueMedia.push(f);
  }

  // Client-side video size limit (MB) from Vite env or fallback to 5
  const CLIENT_VIDEO_MAX_MB = Number(import.meta.env.VITE_VIDEO_MAX_SIZE_MB) || 5;
  // Filter out oversized videos with a friendly toast
  const filteredMedia: File[] = [];
  for (const f of uniqueMedia) {
    if (isVideo(f) && typeof (f as any).size === 'number' && (f as any).size > CLIENT_VIDEO_MAX_MB * 1024 * 1024) {
      addToast(`${f.name} skipped — video exceeds ${CLIENT_VIDEO_MAX_MB} MB limit`, 'warn');
      continue;
    }
    filteredMedia.push(f);
  }

  state.progress.total = filteredMedia.length;
  state.progress.cur = 0;

  for (const fileItem of filteredMedia) {
    const b = fileBase(fileItem);
    const txtFile = txtByBase.get(b) || null;
    try {
      const [dataUrl, txt] = await Promise.all([readAsDataURL(fileItem), txtFile ? readAsText(txtFile) : Promise.resolve('')]);
      const mType = mediaTypeOf(fileItem);
      const item: any = {
        id: newId('i_'),
        filename: fileItem.name,
        base: b,
        caption: (txt || '').trim(),
        originalCaption: (txt || '').trim(),
        img: dataUrl,
        tags: [],
        selected: false,
        width: 0,
        height: 0
      };

      // For videos add metadata and avoid image-only processing
      if (mType === 'video') {
        item.mediaType = 'video';
        item.size = (fileItem as any).size || 0;
      } else {
        item.mediaType = 'image';
        try {
          const d = await imgDims(dataUrl);
          item.width = d.w;
          item.height = d.h;
        } catch {}
        try {
          // Compute and store average brightness (0-255) for automatic dim detection
          item.avgBrightness = await computeAvgBrightness(dataUrl);
        } catch {}
      }

      // If user enabled prompt metadata scanning and there's no .txt original caption,
      // attempt to extract embedded Stable Diffusion prompt metadata (images only).
      if (mType === 'image' && state.settings.usePromptMetadata && !(item.originalCaption && item.originalCaption.trim())) {
        try {
          const extracted = await extractSdPrompt(fileItem);
          if (extracted) {
            // push candidate (do not apply yet)
            state.promptCandidates.push({
              itemId: item.id,
              filename: item.filename,
              img: dataUrl,
              prompt: extracted
            });
          }
        } catch (e) {
          // ignore extraction errors
        }
      }

      proj.items.push(item);
      added++;
      state.progress.cur = added;
    } catch (err) {
      console.error('Failed to read file', fileItem.name, err);
    }
  }

  proj.updatedAt = Date.now();
  const duplicateSkipped = mediaCandidates.length - uniqueMedia.length;
  addToast(`Loaded ${added} media${texts.length ? ` with ${texts.length} text file(s)` : ''}${duplicateSkipped ? ` • ${duplicateSkipped} duplicate(s) skipped` : ''}.`, 'ok');

  // If there are extracted prompt candidates, either show the modal for confirmation
  // or auto-apply depending on settings
  if (state.promptCandidates.length > 0) {
    if (state.settings.confirmPromptOnImport) {
      state.showPromptModal = true;
      // Keep state.status Idle so UI remains responsive
      state.status = 'Idle';
      await putProjectAny(proj);
      return;
    } else {
      // Auto-apply all candidates (but still do not overwrite if originalCaption exists)
      let applied = 0;
      for (const c of state.promptCandidates) {
        const it = proj.items.find((x: any) => x.id === c.itemId);
        if (it && !(it.originalCaption && it.originalCaption.trim())) {
          it.caption = c.prompt;
          it.originalCaption = c.prompt;
          applied++;
        }
      }
      state.promptCandidates.length = 0;
      addToast(`Applied ${applied} embedded prompts as captions`, 'ok');
    }
  }

  state.status = 'Idle';
  await putProjectAny(proj);
}
