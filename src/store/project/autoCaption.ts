import { state } from './state';
import { addToast } from './toasts';
import { captionImage } from '../../services/ollama';
import { saveCurrentProject } from './edits.ts';

/* ----------------- Auto caption (Ollama) ----------------- */
export async function autoCaptionCurrent() {
  const it = state.currentId ? (state.projects.get(state.currentId)?.items[state.currentIndex]) : null;
  if (!it) {
    addToast('No media selected', 'warn');
    return;
  }

  // Block videos from AI captioning
  if ((it as any).mediaType === 'video' || (it.filename && /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(it.filename))) {
    addToast('AI captioning not supported for videos', 'warn');
    return;
  }

  try {
    state.status = 'Contacting Ollama';
    const img64 = it.img.split(',')[1] || '';
    const text = await captionImage(state.settings, img64, chunk => {
      it.caption = (it.caption || '') + chunk;
    });
    if (text) {
      it.caption = text;
      addToast('AI caption generated', 'ok');
      // Auto-save after AI caption completes
      try {
        await saveCurrentProject();
      } catch (e) {
        console.error('Auto-save after AI caption failed', e);
      }
    } else {
      addToast('Empty response from model', 'warn');
    }
  } catch (err) {
    console.error(err);
    addToast('AI request failed. Check settings. Browser to localhost can be blocked.', 'warn');
  } finally {
    state.status = 'Idle';
  }
}

export async function autoCaptionBulk() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) return;
  // Exclude videos from targets
  const targets = proj.items.filter((it: any) => (state.filter.onlySelected ? it.selected : !it.caption))
    .filter((it: any) => !((it as any).mediaType === 'video' || (it.filename && /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(it.filename))));
  if (targets.length === 0) {
    addToast('Nothing to caption', 'warn');
    return;
  }
  state.status = 'Auto captioning...';
  for (let i = 0; i < targets.length; i++) {
    const it = targets[i];
    state.currentIndex = proj.items.indexOf(it);
    try {
      const img64 = it.img.split(',')[1] || '';
      const text = await captionImage(state.settings, img64, chunk => {
        it.caption = (it.caption || '') + chunk;
      });
      if (text) {
        it.caption = text;
        // Auto-save after each generated caption to persist progress
        try {
          await saveCurrentProject();
        } catch (e) {
          console.error('Auto-save during bulk caption failed', e);
        }
      }
    } catch (e) {
      addToast('Failed on ' + it.filename, 'warn');
      break;
    }
    state.progress.cur = i + 1;
    await new Promise(res => setTimeout(res, 150));
  }
  state.status = 'Idle';
  addToast('Bulk auto caption complete', 'ok');
}
