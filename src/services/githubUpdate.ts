/**
 * Client-side, one-time check on app launch for updates to a GitHub repo branch.
 * Fetches the latest commit for Captyon/captyon main and compares against a saved SHA in localStorage.
 * If the saved SHA exists and differs from the fetched SHA, a pinned toast is added.
 */

import { addToast } from '../store/project/toasts';

const OWNER = 'Captyon';
const REPO = 'captyon';
const BRANCH = 'main';
const STORAGE_KEY = `github:update:${OWNER}/${REPO}:${BRANCH}`;

type GitCommitResponse = {
  sha: string;
  html_url?: string;
  commit?: { message?: string };
};

/**
 * Check the repo for an updated commit on the configured branch.
 * - On first run (no saved SHA) it will save the SHA and do nothing.
 * - On subsequent runs, if SHA differs, it will add a pinned toast and update the saved SHA.
 */
export async function checkRepoUpdate(): Promise<void> {
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits/${BRANCH}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      // Non-2xx responses are treated as non-fatal; just log and return.
      console.warn(`GitHub update check: received status ${res.status} from ${url}`);
      return;
    }

    const json = (await res.json()) as GitCommitResponse;
    if (!json || !json.sha) {
      console.warn('GitHub update check: unexpected response shape', json);
      return;
    }

    const sha = json.sha;
    const shortSha = sha.slice(0, 7);
    const commitMsg = (json.commit && json.commit.message) ? String(json.commit.message).split('\n')[0].trim() : '(no message)';
    const commitUrl = json.html_url ?? `https://github.com/${OWNER}/${REPO}/commit/${sha}`;

    const prev = window.localStorage.getItem(STORAGE_KEY);
    if (prev && prev !== sha) {
      // Repo updated since last saved SHA — notify user with a pinned toast.
      const toastMessage = `${OWNER}/${REPO} ${BRANCH} updated — ${shortSha}: ${commitMsg} — ${commitUrl}`;
      addToast(toastMessage, 'ok', { pinned: true });
    }

    // Store latest SHA for future comparisons (including first-run).
    try {
      window.localStorage.setItem(STORAGE_KEY, sha);
    } catch (e) {
      console.warn('Failed to persist GitHub SHA to localStorage', e);
    }
  } catch (err) {
    // Network errors or other issues are non-fatal — log for debugging.
    console.warn('Failed to check GitHub repo updates:', err);
  }
}
