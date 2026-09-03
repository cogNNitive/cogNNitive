/**
 * scripts/lib/github-client.js
 *
 * Zero-dependency Node.js HTTP/HTTPS client for GitHub API and raw content.
 * Handles GitHub token authentication, redirects, rate limiting, and git ref resolution.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

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
 * Returns the matching HTTP/HTTPS client for a given URL.
 * @param {string} url
 * @returns {typeof https | typeof http}
 */
function clientFor(url) {
  return url.startsWith('http:') ? http : https;
}

/**
 * Executes a GET request against GitHub REST API and returns status and parsed JSON data.
 * @template T
 * @param {string} url
 * @returns {Promise<{ status: number, data: T | null, error?: string }>}
 */
function apiRequest(url) {
  return new Promise((resolve) => {
    const client = clientFor(url);
    client.get(url, { headers: { 'User-Agent': USER_AGENT, ...authHeaders() } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let data = null;
        try { data = JSON.parse(body); } catch (err) { /* non-JSON body */ }
        resolve({ status: res.statusCode || 0, data });
      });
    }).on('error', (err) => resolve({ status: 0, data: null, error: err.message }));
  });
}

/**
 * Fetches string content from a remote URL, following HTTP redirects.
 * @param {string} url
 * @param {number} [redirectsLeft=5]
 * @returns {Promise<string>}
 */
function fetchString(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const client = clientFor(url);
    const req = client.get(url, { headers: { 'User-Agent': USER_AGENT, ...authHeaders() } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectsLeft <= 0) return reject(new Error(`Too many redirects fetching ${url}`));
        const nextUrl = new URL(res.headers.location, url).toString();
        return resolve(fetchString(nextUrl, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
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
 * Downloads a file to a destination path, following HTTP redirects and cleaning up on failure.
 * @param {string} url
 * @param {string} destPath
 * @param {number} [redirectsLeft=5]
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(destPath);
    const client = clientFor(url);

    const cleanup = () => {
      try { file.close(); } catch (_) {}
      try { fs.unlinkSync(destPath); } catch (_) {}
    };

    const req = client.get(url, { headers: { 'User-Agent': USER_AGENT, ...authHeaders() } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        cleanup();
        if (redirectsLeft <= 0) return reject(new Error(`Too many redirects downloading ${url}`));
        const nextUrl = new URL(res.headers.location, url).toString();
        return resolve(downloadFile(nextUrl, destPath, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        cleanup();
        return reject(new Error(`Failed to download ${url}, status: ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    });

    req.on('error', (err) => {
      cleanup();
      reject(err);
    });

    file.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
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
