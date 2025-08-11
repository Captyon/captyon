import { ref } from 'vue';
import { useProjectStore } from '../store/useProjectStore';

type VideoMeta = {
  duration?: number;
  width?: number;
  height?: number;
};

export function useVideoMeta() {
  const videoMeta = ref<Record<string, VideoMeta>>({});
  const store = useProjectStore();

  function formatDuration(sec?: number) {
    if (!sec || !isFinite(sec) || sec <= 0) return '';
    const s = Math.floor(sec);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function onVideoLoadedMeta(itemId: string | null, e: Event) {
    try {
      if (!itemId) return;
      const vid = e?.target as HTMLVideoElement | null;
      if (!vid) return;
      const meta = {
        duration: isFinite(vid.duration) ? vid.duration : undefined,
        width: vid.videoWidth || undefined,
        height: vid.videoHeight || undefined,
      };
      videoMeta.value = { ...videoMeta.value, [String(itemId)]: meta };

      // Also update the currentItem's width/height if not already set so other parts of the UI can reuse it
      try {
        const it = (store.currentItem() as any);
        if (it && (!it.width || !it.height) && meta.width && meta.height) {
          it.width = meta.width;
          it.height = meta.height;
        }
      } catch {}
    } catch (err) {
      // keep errors local to avoid breaking render
      // eslint-disable-next-line no-console
      console.error('useVideoMeta.onVideoLoadedMeta error', err);
    }
  }

  return {
    videoMeta,
    formatDuration,
    onVideoLoadedMeta,
  };
}
