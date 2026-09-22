/**
 * scripts/lib/github-client.js
 *
 * Zero-dependency Node.js HTTP client for GitHub API and raw content.
 * Uses the global `fetch` (Node >=18; repo floor is Node >=20.15).
 * Handles GitHub token authentication, redirects, rate limiting, and git ref resolution.
 */

const fs = require('fs');
const path = require('path');

const USER_AGENT = 'actioNN-Skills-Updater';
const RATE_LIMIT_HINT = 'set GITHUB_TOKEN to raise the rate limit';

/**
 * Returns authorization headers if GitHub token is present in the environment.
 * @returns {Record<string, string>}
 */
function authHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Checks if an HTTP status code indicates rate limiting.
 * @param {number} status
 * @returns {boolean}
 */
function rateLimited(status) {
  return status === 403 || status === 429;
}

/**
 * Executes a GET request against GitHub REST API and returns status and parsed JSON data.
 * @template T
 * @param {string} url
 * @returns {Promise<{ status: number, data: T | null, error?: string }>}
 */
async function apiRequest(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...authHeaders() } });
    const body = await res.text();
    let data = null;
    try { data = JSON.parse(body); } catch (err) { /* non-JSON body */ }
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, data: null, error: err.message };
  }
}

/**
 * Fetches string content from a remote URL, following HTTP redirects.
 * @param {string} url
 * @param {number} [redirectsLeft=5]
 * @returns {Promise<string>}
 */
async function fetchString(url, redirectsLeft = 5) {
  let currentUrl = url;
  let left = redirectsLeft;

  for (;;) {
    const res = await fetch(currentUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, ...authHeaders() },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (left <= 0) throw new Error(`Too many redirects fetching ${currentUrl}`);
      currentUrl = new URL(res.headers.get('location'), currentUrl).toString();
      left -= 1;
      continue;
    }
    if (res.status !== 200) {
      throw new Error(`Failed to fetch ${currentUrl}, status: ${res.status}`);
    }
    return res.text();
  }
}

/**
 * Fetches a remote URL and parses the response body as JSON.
 * @template T
 * @param {string} url
 * @returns {Promise<T>}
 */
function fetchJson(url) {
  return fetchString(url).then(text => JSON.parse(text));
}

/**
 * Downloads a remote URL to a local destination file.
 * Handles HTTP redirects up to redirectsLeft times.
 * Cleans up partial file on failure.
 * @param {string} url
 * @param {string} destPath
 * @param {number} [redirectsLeft=5]
 * @returns {Promise<void>}
 */
async function downloadFile(url, destPath, redirectsLeft = 5) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let currentUrl = url;
  let left = redirectsLeft;

  for (;;) {
    const res = await fetch(currentUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, ...authHeaders() },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (left <= 0) throw new Error(`Too many redirects downloading ${currentUrl}`);
      currentUrl = new URL(res.headers.get('location'), currentUrl).toString();
      left -= 1;
      continue;
    }
    if (res.status !== 200) {
      throw new Error(`Failed to download ${currentUrl}, status: ${res.status}`);
    }

    try {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
    } catch (err) {
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (_) { /* best effort cleanup */ }
      }
      throw err;
    }
    return;
  }
}

/**
 * Resolves a git ref (tag or branch) in a GitHub repository to its commit SHA.
 * @param {string} repo
 * @param {string} ref
 * @returns {Promise<{ sha: string, kind: 'tag' | 'branch' } | { error: string }>}
 */
async function resolveRef(repo, ref) {
  const tagRes = await apiRequest(`https://api.github.com/repos/${repo}/git/ref/tags/${ref}`);
  if (tagRes.status === 200 && tagRes.data && tagRes.data.object) {
    let sha = tagRes.data.object.sha;
    if (tagRes.data.object.type === 'tag') {
      const peelRes = await apiRequest(`https://api.github.com/repos/${repo}/git/tags/${sha}`);
      if (rateLimited(peelRes.status)) {
        return { error: `rate limit hit peeling annotated tag '${ref}' in ${repo} (HTTP ${peelRes.status}); ${RATE_LIMIT_HINT}` };
      }
      if (peelRes.status !== 200 || !peelRes.data || !peelRes.data.object || !peelRes.data.object.sha) {
        return { error: `could not peel annotated tag '${ref}' in ${repo} (HTTP ${peelRes.status || peelRes.error || 'network error'})` };
      }
      sha = peelRes.data.object.sha;
    }
    return { sha, kind: 'tag' };
  }
  if (rateLimited(tagRes.status)) {
    return { error: `rate limit hit resolving ref '${ref}' in ${repo} (HTTP ${tagRes.status}); ${RATE_LIMIT_HINT}` };
  }

  const branchRes = await apiRequest(`https://api.github.com/repos/${repo}/git/ref/heads/${ref}`);
  if (branchRes.status === 200 && branchRes.data && branchRes.data.object) {
    return { sha: branchRes.data.object.sha, kind: 'branch' };
  }
  if (rateLimited(branchRes.status)) {
    return { error: `rate limit hit resolving ref '${ref}' in ${repo} (HTTP ${branchRes.status}); ${RATE_LIMIT_HINT}` };
  }

  return { error: `ref '${ref}' not found as a tag or branch in ${repo}` };
}

module.exports = {
  USER_AGENT,
  RATE_LIMIT_HINT,
  authHeaders,
  rateLimited,
  apiRequest,
  fetchString,
  fetchJson,
  downloadFile,
  resolveRef,
};
