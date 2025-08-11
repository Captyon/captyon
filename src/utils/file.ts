export function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(String(r.result));
    r.readAsDataURL(file);
  });
}

export function readAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(String(r.result));
    r.readAsText(file);
  });
}

export function imgDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = rej;
    i.src = dataUrl;
  });
}

export const ext = (f: File | { name: string }) => String(f.name).split('.').pop()?.toLowerCase() || '';
export const base = (f: File | { name: string }) => String(f.name).replace(/\.[^.]+$/, '');

// media type helpers
export const isImg = (f: File | { name: string }) => /^(png|jpg|jpeg|webp|bmp|gif)$/i.test(ext(f));
export const isTxt = (f: File | { name: string }) => ext(f) === 'txt';
export const isVideo = (f: File | { name: string }) => /^(mp4|webm|mov|mkv|avi|m4v)$/i.test(ext(f));

// Convenience: classify by major media type string (image, video, text, other)
export function mediaTypeOf(f: File | { name: string; type?: string }) {
  // prefer MIME type when available
  if (f && (f as any).type) {
    const t = (f as any).type as string;
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t === 'text/plain') return 'text';
  }
  if (isImg(f)) return 'image';
  if (isVideo(f)) return 'video';
  if (isTxt(f)) return 'text';
  return 'other';
}

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ----------------- Stable Diffusion prompt extraction -----------------
   Function: extractSdPrompt(file: File) => Promise<string | null>

   Behavior:
   - Reads image file as ArrayBuffer and attempts to extract embedded prompt/parameters
     metadata commonly written by Stable Diffusion frontends (AUTOMATIC1111, WebUI, etc).
   - Handles PNG tEXt / iTXt / zTXt (zlib-compressed) chunks, plus a heuristic scan
     for "Parameters:" blocks in JPEG/XMP/other binary blobs.
   - Returns a cleaned prompt string when found, otherwise null.
   - Note: zTXt decompression uses `pako`. The project must install `pako` as a dependency.
*/

function arrayBufferToString(buf: Uint8Array, encoding: string = 'latin1') {
  try {
    return new TextDecoder(encoding).decode(buf);
  } catch {
    return String.fromCharCode(...Array.from(buf));
  }
}

function readUint32BE(buf: Uint8Array, off: number) {
  return (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
}

function extractPromptFromParametersBlock(block: string) {
  if (!block) return null;
  const trimmed = block.trim();

  // Sanitizer helper shared for all early-return paths
  const sanitizePrompt = (input: string | null): string | null => {
    if (!input) return null;
    const cap = 2000;

    // decode common HTML entities and numeric entities
    const decodeEntities = (s: string) =>
      s
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/&/g, '&')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/&#x([0-9A-Fa-f]+);?/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

    let sanitized = decodeEntities(input);

    // remove well-formed angle bracket blocks like <...> (covers cases like <segment:...//cid=...>)
    sanitized = sanitized.replace(/<[^>]*>/g, ' ');

    // remove any leftover angle bracket characters
    sanitized = sanitized.replace(/[<>]/g, ' ');

    // remove well-formed (...) and [...] contents
    sanitized = sanitized.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');

    // try to remove stray/unclosed tokens that start with <, (, or [ and continue until whitespace
    sanitized = sanitized.replace(/<\S+/g, ' ').replace(/\([^\s]*/g, ' ').replace(/\[[^\s]*/g, ' ');

    // remove sequences like //cid=123 or cid=123 specifically
    sanitized = sanitized.replace(/\/{2,}\S*/g, ' ').replace(/\bcid\s*=\s*\d+\b/gi, ' ').replace(/\b[a-z]{1,6}=[^\s,]+/gi, ' ');

    // remove tokens containing ':' or '/' (e.g. segment:face, lora:test:0.1)
    sanitized = sanitized.replace(/\b\S*[:\/]\S*\b/g, ' ');

    // remove quotes, equals signs and stray punctuation
    sanitized = sanitized.replace(/['"`=]/g, ' ');

    // strip characters other than letters, numbers, commas and whitespace
    sanitized = sanitized.replace(/[^A-Za-z0-9,\s]/g, ' ');

    // collapse multiple spaces and normalize commas
    sanitized = sanitized
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ',')
      .trim();

    return sanitized.length ? (sanitized.length > cap ? sanitized.slice(0, cap) : sanitized) : null;
  };

  // Helper: try to extract a prompt from JSON text (recursively)
  const tryExtractFromJson = (txt: string): string | null => {
    try {
      const obj = JSON.parse(txt);
      const findPrompt = (o: any): string | null => {
        if (!o || typeof o !== 'object') return null;
        // direct keys
        if (typeof o.prompt === 'string' && o.prompt.trim()) return o.prompt.trim();
        if (typeof o.Prompt === 'string' && o.Prompt.trim()) return o.Prompt.trim();
        // any key that looks like "prompt"
        for (const k of Object.keys(o)) {
          if (/prompt/i.test(k) && typeof o[k] === 'string' && o[k].trim()) {
            return o[k].trim();
          }
        }
        // nested objects
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (typeof v === 'object') {
            const res = findPrompt(v);
            if (res) return res;
          }
        }
        return null;
      };
      return findPrompt(obj);
    } catch {
      return null;
    }
  };

  // If block looks like JSON or contains JSON, prefer extracting from it first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const j = tryExtractFromJson(trimmed);
    if (j) return sanitizePrompt(j);
  } else {
    const jsonMatch = trimmed.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const j = tryExtractFromJson(jsonMatch[1]);
      if (j) return sanitizePrompt(j);
    }
  }

  // Remove any trailing sections (Negative prompt, Steps, Sampler, etc.)
  const cutoffKeywords = ['negative prompt', 'steps:', 'sampler:', 'cfg scale', 'seed:'];
  let cutIdx = -1;
  const lower = trimmed.toLowerCase();
  for (const k of cutoffKeywords) {
    const idx = lower.indexOf(k);
    if (idx !== -1 && (cutIdx === -1 || idx < cutIdx)) cutIdx = idx;
  }
  let primary: string | null = cutIdx === -1 ? trimmed : trimmed.slice(0, cutIdx).trim();

  // If block contains an explicit "Prompt:" field, prefer that
  const promptMatch = trimmed.match(/prompt\s*[:=]\s*([\s\S]*?)(?=(\r?\n[A-Z][a-z0-9\- ]+?:)|$)/i);
  if (promptMatch && promptMatch[1]) {
    let candidate = promptMatch[1].trim();
    // If the captured candidate itself is JSON, try to parse it
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      const fromJson = tryExtractFromJson(candidate);
      if (fromJson) return sanitizePrompt(fromJson);
    } else {
      // also see if there's a JSON substring inside the candidate
      const jm = candidate.match(/(\{[\s\S]*\})/);
      if (jm) {
        const fromJson = tryExtractFromJson(jm[1]);
        if (fromJson) return sanitizePrompt(fromJson);
      }
    }
    primary = candidate;
  } else {
    // Some tools use "Parameters:" and then the prompt as a long line
    const paramsMatch = trimmed.match(/parameters\s*[:]\s*([\s\S]*)/i);
    if (paramsMatch && paramsMatch[1]) {
      // take everything up to the first keyword like "Negative prompt"
      const p = paramsMatch[1].trim();
      // if p looks like JSON, extract from JSON
      if (p.startsWith('{') || p.startsWith('[')) {
        const fromJson = tryExtractFromJson(p);
        if (fromJson) return sanitizePrompt(fromJson);
      } else {
        const jm = p.match(/(\{[\s\S]*\})/);
        if (jm) {
          const fromJson = tryExtractFromJson(jm[1]);
          if (fromJson) return sanitizePrompt(fromJson);
        }
      }
      const npIdx = p.toLowerCase().indexOf('negative prompt');
      primary = npIdx === -1 ? p : p.slice(0, npIdx).trim();
    }
  }

  // If still empty, fall back to first long line
  if (!primary) {
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    primary = lines.length ? lines[0] : null;
  }

  if (!primary) return null;

  // Before returning, sanitize the candidate so all paths use the same rules
  const sanitized = sanitizePrompt(primary);
  return sanitized;
}

export async function extractSdPrompt(file: File): Promise<string | null> {
  try {
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);

    // PNG signature check
    const pngSig = [137, 80, 78, 71, 13, 10, 26, 10];
    let isPng = true;
    for (let i = 0; i < pngSig.length; i++) {
      if (bytes[i] !== pngSig[i]) {
        isPng = false;
        break;
      }
    }

    if (isPng) {
      // iterate PNG chunks
      let off = 8;
      while (off + 8 < bytes.length) {
        const len = readUint32BE(bytes, off);
        const type = String.fromCharCode(...bytes.slice(off + 4, off + 8));
        const dataStart = off + 8;
        const dataEnd = dataStart + len;
        if (dataEnd > bytes.length) break;
        const chunk = bytes.slice(dataStart, dataEnd);

        if (type === 'tEXt') {
          const txt = await arrayBufferToString(chunk, 'latin1');
          const sep = txt.indexOf('\u0000');
          const key = sep === -1 ? '' : txt.slice(0, sep);
          const val = sep === -1 ? txt : txt.slice(sep + 1);
          const keyL = key.toLowerCase();
          if (keyL.includes('param') || keyL.includes('prompt') || /steps:|negative prompt/i.test(val)) {
            const p = extractPromptFromParametersBlock(val);
            if (p) return p;
          }
        } else if (type === 'iTXt') {
          // iTXt: keyword\0 compressionFlag\0 compressionMethod\0 languageTag\0 translatedKeyword\0 text
          // Parse per spec
          let idx = 0;
          while (idx < chunk.length && chunk[idx] !== 0) idx++;
          const keyword = arrayBufferToString(chunk.slice(0, idx), 'latin1');
          idx++; // skip null
          const compressionFlag = chunk[idx]; idx++;
 idx++;
          // language tag
          while (idx < chunk.length && chunk[idx] !== 0) idx++;
          idx++;
          while (idx < chunk.length && chunk[idx] !== 0) idx++;
          idx++;
          const textBytes = chunk.slice(idx);
          let text = '';
          if (compressionFlag === 1) {
            // compressed iTXt: need pako to inflate
            try {
              const pako = await import('pako');
              const inflated = pako.inflate(textBytes);
              text = await arrayBufferToString(inflated, 'utf-8');
            } catch (err) {
              // fallback to latin1 decode
              text = await arrayBufferToString(textBytes, 'latin1');
            }
          } else {
            text = await arrayBufferToString(textBytes, 'utf-8');
          }
          const keyL = String(keyword || '').toLowerCase();
          if (keyL.includes('param') || keyL.includes('prompt') || /steps:|negative prompt/i.test(text)) {
            const p = extractPromptFromParametersBlock(text);
            if (p) return p;
          }
        } else if (type === 'zTXt') {
          // zTXt: keyword\0 compressionMethod(1 byte) compressedData
          let idx = 0;
          while (idx < chunk.length && chunk[idx] !== 0) idx++;
          const keyword = arrayBufferToString(chunk.slice(0, idx), 'latin1');
          idx++;
          idx++;
          const compressed = chunk.slice(idx);
          try {
            const pako = await import('pako');
            const inflated = pako.inflate(compressed);
            const text = await arrayBufferToString(inflated, 'latin1');
            const keyL = String(keyword || '').toLowerCase();
            if (keyL.includes('param') || keyL.includes('prompt') || /steps:|negative prompt/i.test(text)) {
              const p = extractPromptFromParametersBlock(text);
              if (p) return p;
            }
          } catch (err) {
            // ignore decompression errors
          }
        }

        off = dataEnd + 4; // skip CRC
      }
      return null;
    }

    // Fallback heuristic: scan for "Parameters:" blocks in the binary as latin1 text
    const asLatin1 = await arrayBufferToString(bytes, 'latin1');
    // Look for AUTOMATIC1111 style "Parameters: <block>" or "Parameters\n<block>"
    const paramsIdx = asLatin1.search(/parameters\s*[:\r\n]/i);
    if (paramsIdx !== -1) {
      // grab a chunk after the match to avoid scanning entire file
      const snippet = asLatin1.slice(paramsIdx, paramsIdx + 8000);
      const p = extractPromptFromParametersBlock(snippet);
      if (p) return p;
    }

    // Also try to find "prompt:" line directly
    const promptIdx = asLatin1.search(/prompt\s*[:=]/i);
    if (promptIdx !== -1) {
      const snippet = asLatin1.slice(promptIdx, promptIdx + 4000);
      const match = snippet.match(/prompt\s*[:=]\s*([\s\S]*?)(?=(\r?\n[A-Z][a-z0-9\- ]+?:)|$)/i);
      if (match && match[1]) {
        const p = match[1].trim();
        const extracted = extractPromptFromParametersBlock(p);
        if (extracted) return extracted;
      }
    }

    return null;
  } catch (err) {
    // fail silently on errors
    return null;
  }
}

/**
 * Compute average brightness of an image (0-255) from a data URL.
 * Uses an offscreen canvas and downsamples the image for performance.
 */
export function computeAvgBrightness(dataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        // Downscale target for faster processing while keeping accuracy
        const targetW = 64;
        const targetH = 64;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not available'));

        // Preserve aspect ratio
        const ratio = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight, 1);
        const w = Math.max(1, Math.round(img.naturalWidth * ratio));
        const h = Math.max(1, Math.round(img.naturalHeight * ratio));
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0;
        const pxCount = w * h;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Perceptual luminance (Rec. 601)
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sum += lum;
        }
        const avg = Math.round(sum / pxCount);
        resolve(avg);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for brightness computation'));
    img.src = dataUrl;
  });
}
