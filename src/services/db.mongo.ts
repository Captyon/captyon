import type { Project } from '../types';

type Opts = {
  baseUrl?: string;
  apiKey?: string | null;
};

function baseUrlOrThrow(baseUrl?: string) {
  if (!baseUrl) throw new Error('mongoApiUrl not configured');
  return baseUrl.replace(/\/+$/, '');
}

function headers(apiKey?: string | null) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    // Prefer Bearer token but many servers accept x-api-key as well.
    h['Authorization'] = `Bearer ${apiKey}`;
    h['x-api-key'] = apiKey;
  }
  return h;
}

async function doJson(url: string, init: RequestInit) {
  // Force fresh responses to avoid 304 Not Modified surprises from caches
  init = { ...(init || {}), cache: (init && (init as any).cache) || 'no-cache' };

  const res = await fetch(url, init);

  // Treat 204 and 304 as "no content but successful"
  if (res.status === 204 || res.status === 304) return null;

  if (!res.ok) {
    // If the server returned JSON error, try to include it in message
    let errText = res.statusText || String(res.status);
    try {
      const body = await res.json();
      if (body && body.error) errText = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    } catch {}
    const err = new Error(`HTTP ${res.status} - ${errText}`);
    // attach response for caller debugging
    (err as any).status = res.status;
    throw err;
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function putProject(project: Project, opts: Opts = {}): Promise<void> {
  const base = baseUrlOrThrow(opts.baseUrl);
  const url = `${base}/projects/${encodeURIComponent(project.id)}`;
  await doJson(url, {
    method: 'PUT',
    headers: headers(opts.apiKey || null),
    body: JSON.stringify(project)
  });
}

export async function getProject(id: string, opts: Opts = {}): Promise<Project | null> {
  const base = baseUrlOrThrow(opts.baseUrl);
  const url = `${base}/projects/${encodeURIComponent(id)}`;
  try {
    const json = await doJson(url, { method: 'GET', headers: headers(opts.apiKey || null) });
    return (json as Project) || null;
  } catch (err: any) {
    // treat 404 as not found
    if (err && err.status === 404) return null;
    throw err;
  }
}

export async function deleteProject(id: string, opts: Opts = {}): Promise<void> {
  const base = baseUrlOrThrow(opts.baseUrl);
  const url = `${base}/projects/${encodeURIComponent(id)}`;
  await doJson(url, { method: 'DELETE', headers: headers(opts.apiKey || null) });
}

export async function getAllMeta(opts: Opts = {}): Promise<Array<{ id: string; name: string; count: number; updatedAt: number }>> {
  const base = baseUrlOrThrow(opts.baseUrl);
  const url = `${base}/projects/meta`;
  let json = await doJson(url, { method: 'GET', headers: headers(opts.apiKey || null) });
  // Retry once with cache-buster if server returned no content (304 -> null)
  if (json === null) {
    const retryUrl = `${url}?_=${Date.now()}`;
    json = await doJson(retryUrl, { method: 'GET', headers: headers(opts.apiKey || null) });
  }
  return (json as any) || [];
}

/**
 * Test connection to the server. Prefer a /health endpoint if available,
 * otherwise fall back to /projects/meta.
 */
export async function testConnection(opts: Opts = {}): Promise<boolean> {
  const base = baseUrlOrThrow(opts.baseUrl);
  try {
    // Try health first
    try {
      const url = `${base}/health`;
      const res = await fetch(url, { method: 'GET', headers: headers(opts.apiKey || null) });
      if (res.ok) return true;
    } catch {
      // ignore and fall back
    }
    // Fallback to meta endpoint
    await getAllMeta(opts);
    return true;
  } catch {
    return false;
  }
}
