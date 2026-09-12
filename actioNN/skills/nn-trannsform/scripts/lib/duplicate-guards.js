/**
 * duplicate-guards.js — import-time guard helpers (backlog:
 * feature/source-import-guards).
 *
 * Two guards share one matching layer:
 *  1. History guard  — search past conversation transcripts for prior handling
 *     of the same/similar source (by filename, source_file/source_url, topic).
 *  2. Duplicate guard — compare an incoming file against already-ingested
 *     sources: exact (sha256) or near (structural similarity) duplicates.
 *
 * These are pure helpers: the caller (agent workflow / scanner) decides how to
 * surface the verdict and ask the user reuse/adjust/from-scratch.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** Canonicalize whitespace + ordering for structural comparison. */
function canonicalize(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .toLowerCase();
}

/** Tokenize a canonicalized text into an ordered token array. */
function tokenize(text) {
  return canonicalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Structural similarity in [0,1] — shared-token Jaccard over canonicalized
 * content. Same substance with different organisation scores high because
 * vocabulary dominates over layout.
 */
function structuralSimilarity(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta);
  let shared = 0;
  const seen = new Set();
  for (const t of tb) {
    if (setA.has(t) && !seen.has(t)) {
      shared++;
      seen.add(t);
    }
  }
  const union = new Set([...ta, ...tb]);
  return shared / union.size;
}

/** sha256 of a file's bytes. */
function computeFileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Duplicate guard: classify an incoming file against already-ingested sources.
 *
 * @param {string} incomingPath Absolute path of the incoming file.
 * @param {Array<{ path: string, sha256?: string|null, content?: string }>} corpus
 *   Existing sources (sources/nn/**). Provide `content` lazily to avoid reading
 *   every file up front — `contentLoader(path)` is called on demand.
 * @param {{ contentLoader?: (p: string) => string|null, nearThreshold?: number }} opts
 *   `nearThreshold` default 0.5.
 * @returns {{ exact: Array<string>, near: Array<{ path: string, score: number }> }}
 */
function detectDuplicates(incomingPath, corpus, opts = {}) {
  const { contentLoader = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null, nearThreshold = 0.5 } = opts;
  const newHash = computeFileHash(incomingPath);
  const newContent = canonicalize(contentLoader(incomingPath) ?? '');
  const exact = [];
  const near = [];
  for (const item of corpus) {
    if (!item || !item.path) continue;
    if (item.sha256 && item.sha256 === newHash) {
      exact.push(item.path);
      continue;
    }
    if (!newContent) continue;
    const other = canonicalize(contentLoader(item.path) ?? '');
    if (!other) continue;
    const score = structuralSimilarity(newContent, other);
    if (score >= nearThreshold) near.push({ path: item.path, score: Math.round(score * 100) / 100 });
  }
  return { exact, near };
}

/**
 * History guard: search past conversation transcripts for prior handling of a
 * source. Matches on filename stem, `source_file`/`source_url` fields, or the
 * slugified topic inside `conversations/*.md`.
 *
 * @param {string} workspaceRoot
 * @param {{ fileName?: string, topic?: string, sourceRef?: string }} query
 * @returns {Array<{ file: string, title?: string, date?: string, excerpt?: string }>}
 */
function searchConversationHistory(workspaceRoot, query = {}) {
  const convDir = path.join(workspaceRoot, 'conversations');
  if (!fs.existsSync(convDir)) return [];
  const terms = [];
  if (query.fileName) terms.push(query.fileName.toLowerCase().replace(/\.md$/, ''));
  if (query.topic) terms.push(query.topic.toLowerCase());
  if (query.sourceRef) terms.push(String(query.sourceRef).toLowerCase());
  const haystacks = terms.filter(Boolean);
  if (haystacks.length === 0) return [];

  const hits = [];
  const files = fs
    .readdirSync(convDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.md$/i.test(e.name))
    .map((e) => path.join(convDir, e.name));
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const lower = text.toLowerCase();
    const matched = haystacks.filter((t) => lower.includes(t));
    if (matched.length === 0) continue;
    const title = (text.match(/^#\s+(.+)$/m) || [])[1];
    const date = (f.match(/(\d{4}-\d{2}-\d{2})/) || [])[1];
    const lines = text.split('\n');
    let excerpt = '';
    for (let i = 0; i < lines.length; i++) {
      if (matched.some((t) => lines[i].toLowerCase().includes(t))) {
        excerpt = lines.slice(Math.max(0, i - 1), i + 2).join(' ').trim().slice(0, 200);
        break;
      }
    }
    hits.push({ file: path.relative(workspaceRoot, f).replace(/\\/g, '/'), title, date, excerpt });
  }
  return hits;
}

module.exports = {
  canonicalize,
  tokenize,
  structuralSimilarity,
  computeFileHash,
  detectDuplicates,
  searchConversationHistory,
};