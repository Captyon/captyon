import type { Settings } from '../types';

export async function testOllama(url: string): Promise<boolean> {
  try {
    const api = new URL('/api/tags', url).toString();
    const res = await fetch(api, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function captionImage(settings: Settings, imgBase64: string, onChunk?: (s: string) => void, onConnected?: () => void): Promise<string> {
  const url = new URL('/api/chat', settings.ollamaUrl).toString();
  const body = {
    model: settings.ollamaModel,
    stream: Boolean(settings.stream),
    messages: [{ role: 'user', content: settings.promptTpl || 'Describe this image.', images: [imgBase64] }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error('HTTP ' + res.status);

  // Notify caller that the connection to Ollama succeeded (useful to update UI)
  if (onConnected) onConnected();

  if (settings.stream && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line);
          const piece = evt.message?.content || evt.response || '';
          if (piece) {
            text += piece;
            if (onChunk) onChunk(piece);
          }
        } catch {}
      }
    }
    return text.trim();
  } else {
    const data = await res.json();
    const content = (data.message && data.message.content) || data.response || '';
    const s = String(content || '').trim();
    if (onChunk) onChunk(s);
    return s;
  }
}
