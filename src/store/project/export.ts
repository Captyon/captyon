import { state } from './state';
import { addToast } from './toasts';
import { slug } from '../../utils/file';

/**
 * Project export / import helpers
 */
export function exportProject() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) {
    addToast('No project', 'warn');
    return;
  }
  const data = { schema: 'caption-studio-v1', project: proj };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = slug(proj.name) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Export project as a ZIP containing numbered image + text pairs.
 */
export async function exportProjectZip() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) {
    addToast('No project', 'warn');
    return;
  }

  try {
    state.status = 'Preparing export';
    const items = proj.items || [];
    if (items.length === 0) {
      addToast('No items to export', 'warn');
      state.status = 'Idle';
      return;
    }

    // Use JSZip (dynamic import)
    const JSZipModule = await import('jszip');
    const JSZip = (JSZipModule && (JSZipModule as any).default) || JSZipModule;
    const zipObj = new JSZip();

    const count = items.length;
    const pad = Math.max(4, String(count).length);
    const padded = (i: number) => String(i + 1).padStart(pad, '0');

    const dataUrlToU8 = (dataUrl: string) => {
      const comma = dataUrl.indexOf(',');
      const meta = dataUrl.slice(0, comma);
      const b64 = dataUrl.slice(comma + 1);
      const binStr = atob(b64);
      const len = binStr.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
      const mimeMatch = meta.match(/data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      return { u8, mime };
    };

    state.progress.cur = 0;
    state.progress.total = 100;

    const manifest: Record<string, { original: string; name: string; regions?: any[] }> = {};
    let skipped = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const idx = padded(i);

      if (!it.img) {
        skipped++;
        state.progress.cur = Math.floor(((i + 1) / items.length) * 30);
        continue;
      }

      let ext = 'jpg';
      const m = (it.filename || '').match(/\.([^.]+)$/);
      if (m && m[1]) ext = m[1].toLowerCase();
      if (!m) {
        try {
          const mimeTry = it.img.slice(5, it.img.indexOf(';'));
          if (mimeTry) {
            if (mimeTry === 'image/jpeg') ext = 'jpg';
            else if (mimeTry === 'image/png') ext = 'png';
            else if (mimeTry === 'image/webp') ext = 'webp';
            else if (mimeTry === 'image/gif') ext = 'gif';
            else if (mimeTry === 'image/bmp') ext = 'bmp';
            else {
              const parts = mimeTry.split('/');
              if (parts[1]) ext = parts[1];
            }
          }
        } catch {}
      }

      const imgName = `${idx}.${ext}`;
      const txtName = `${idx}.txt`;

      try {
        const { u8 } = dataUrlToU8(it.img);
        zipObj.file(imgName, u8);
      } catch (e) {
        console.error('Failed to convert image to binary for', it.filename, e);
        skipped++;
        state.progress.cur = Math.floor(((i + 1) / items.length) * 30);
        continue;
      }

      zipObj.file(txtName, it.caption || '');

      // Process regions for this item
      const regionData: any[] = [];
      if (it.regions && it.regions.length > 0) {
        try {
          // Prepare source image element for region cropping
          const img = new Image();
          img.src = it.img;
          await new Promise((resolve, reject) => {
            img.onload = () => resolve(null);
            img.onerror = (e) => reject(e);
          });

          // Track region names to handle duplicates
          const usedRegionNames: Record<string, number> = {};
          
          for (let r = 0; r < it.regions.length; r++) {
            const region = it.regions[r];
            
            // Handle duplicate region names by appending counter
            let regionName = region.name || 'region';
            if (usedRegionNames[regionName]) {
              usedRegionNames[regionName]++;
              regionName = `${regionName}_${usedRegionNames[regionName]}`;
            } else {
              usedRegionNames[regionName] = 1;
            }

            // Create canvas for region crop
            const canvas = document.createElement('canvas');
            canvas.width = region.w;
            canvas.height = region.h;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            // Draw the crop from the source image
            ctx.drawImage(img, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);

            // Convert to PNG blob
            const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (blob) {
              const regionImgName = `${idx}_region_${regionName}.png`;
              const regionTxtName = `${idx}_region_${regionName}.txt`;
              
              zipObj.file(regionImgName, blob);
              zipObj.file(regionTxtName, region.caption || '');
              
              regionData.push({
                originalName: region.name || 'region',
                exportName: regionName,
                imageName: regionImgName,
                textName: regionTxtName,
                caption: region.caption || '',
                coordinates: {
                  x: Math.round(region.x),
                  y: Math.round(region.y),
                  w: Math.round(region.w),
                  h: Math.round(region.h)
                },
                aspect: region.aspect || `${Math.round(region.w)}:${Math.round(region.h)}`,
                size: [Math.round(region.w), Math.round(region.h)]
              });
            }
          }
        } catch (e) {
          console.error('Failed to process regions for', it.filename, e);
          // Continue with export even if region processing fails
        }
      }

      manifest[imgName] = { 
        original: it.filename || '', 
        name: imgName,
        regions: regionData.length > 0 ? regionData : undefined
      };

      state.progress.cur = Math.floor(((i + 1) / items.length) * 30);
    }

    zipObj.file('manifest.json', JSON.stringify({
      projectName: proj.name,
      count: items.length,
      skipped,
      mapping: manifest
    }, null, 2));

    state.status = 'Generating zip';

    const blob = await zipObj.generateAsync(
      { type: 'blob', compression: 'DEFLATE' },
      (metadata: any) => {
        const genPercent = Math.round(metadata.percent || 0);
        state.progress.cur = Math.min(100, Math.floor(30 + (genPercent * 0.7)));
      }
    );

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug(proj.name) + '.zip';
    a.click();
    URL.revokeObjectURL(a.href);

    addToast(`Export complete${skipped ? ` • skipped ${skipped} item(s)` : ''}`, 'ok');
  } catch (err) {
    console.error('exportProjectZip failed', err);
    addToast('Export failed', 'warn');
  } finally {
    state.status = 'Idle';
    state.progress = { cur: 0, total: 0 };
  }
}

export async function exportRegions() {
  const proj = state.currentId ? state.projects.get(state.currentId) : null;
  if (!proj) {
    addToast('No project', 'warn');
    return;
  }
  const idx = typeof state.currentIndex === 'number' ? state.currentIndex : 0;
  const item = (proj.items || [])[idx];
  if (!item) {
    addToast('No item selected', 'warn');
    return;
  }
  if (!item.regions || item.regions.length === 0) {
    addToast('No regions to export for current item', 'warn');
    return;
  }

  try {
    state.status = 'Preparing region export';

    // Load JSZip dynamically (same approach as exportProjectZip)
    const JSZipModule = await import('jszip');
    const JSZip = (JSZipModule && (JSZipModule as any).default) || JSZipModule;
    const zipObj = new JSZip();

    // Prepare source image element so we can draw full-res crops
    const img = new Image();
    img.src = item.img || '';
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(null);
      img.onerror = (e) => reject(e);
    });

    const sidecar: any = {
      sourceImageId: item.id,
      regions: []
    };

    for (let i = 0; i < item.regions.length; i++) {
      const r = item.regions[i];
      // create a canvas at the region's full-resolution pixel size
      const canvas = document.createElement('canvas');
      canvas.width = r.w;
      canvas.height = r.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      // draw the crop from the source image
      ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);

      // convert to PNG blob
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const name = `region-${String(i + 1).padStart(3, '0')}.png`;
      if (blob) {
        zipObj.file(name, blob);
      }

      sidecar.regions.push({
        name: r.name || '',
        caption: r.caption || '',
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.w),
        h: Math.round(r.h),
        aspect: r.aspect || `${Math.round(r.w)}:${Math.round(r.h)}`,
        size: [Math.round(r.w), Math.round(r.h)]
      });
    }

    zipObj.file('regions.json', JSON.stringify(sidecar, null, 2));

    state.status = 'Generating regions zip';

    const bundle = await zipObj.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(bundle);
    a.download = slug((item.filename || 'regions') + '-regions') + '.zip';
    a.click();
    URL.revokeObjectURL(a.href);

    addToast('Region export complete', 'ok');
  } catch (err) {
    console.error('exportRegions failed', err);
    addToast('Export failed', 'warn');
  } finally {
    state.status = 'Idle';
    state.progress = { cur: 0, total: 0 };
  }
}

export function importProjectFromJSON(obj: any) {
  if (obj && obj.schema === 'caption-studio-v1' && obj.project) {
    const p: any = obj.project;
    p.updatedAt = Date.now();
    state.projects.set(p.id, p);
    if (!state.order.includes(p.id)) state.order.push(p.id);
    state.currentId = p.id;
    state.currentIndex = p.cursor || 0;
    addToast('Project imported', 'ok');
    // refreshMetaBar will be handled by facade caller or settings init if needed
    return true;
  } else {
    addToast('Invalid JSON schema', 'warn');
    return false;
  }
}
