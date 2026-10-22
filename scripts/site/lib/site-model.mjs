// Fail-closed reader for the `site` domaiNN. Fields are the contiguous `key::`
// block right after `## NN <Concept>: <Name>`; the body is kept verbatim.
// nn-core has no required-field, singleton or `sources::` checks, so they live here.
import fs from 'node:fs';
import path from 'node:path';

export const KINDS = ['pitch', 'tutorial', 'guide', 'concept', 'reference', 'legal'];

const HEADING = /^##\s+(?:\d+|NN)\s+(\w+):\s*(.+?)\s*$/;
const FIELD = /^([\w-]+)::\s*(.*?)\s*$/;
export const KEY_LINE = /^\s*[\w-]+::(\s|$)/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BASE_URL = /^https?:\/\/\S+\/$/;
const CITATION = /\[([^\]@]+)@([^\]]+)\]/y;

export class SiteError extends Error {
  constructor(file, line, message) {
    super(line ? `${file}:${line}: ${message}` : `${file}: ${message}`);
    this.name = 'SiteError';
    this.file = file;
    this.line = line;
  }
}

/** Parse one document into raw elements. Throws on any ambiguity. */
function parseDocument(file, raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (text.includes('\uFFFD')) throw new SiteError(file, 0, 'contains U+FFFD (invalid UTF-8)');
  const lines = text.split('\n');
  let i = lines[0] === '---' ? lines.indexOf('---', 1) + 1 : 0;
  const elements = [];
  let inFence = false;
  let current = null;
  let fieldsOpen = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 1;
    if (/^\s*```/.test(line)) inFence = !inFence;
    const heading = inFence ? null : HEADING.exec(line);
    if (heading || (!inFence && /^#\s/.test(line))) {
      current = null;
      if (!heading) continue;
      const [, concept, name] = heading;
      current = { concept, name, file, line: n, fields: {}, fieldLines: {}, bodyLines: [], body: '', bodyLine: 0 };
      elements.push(current);
      fieldsOpen = true;
      continue;
    }
    if (!current) continue;
    const field = fieldsOpen ? FIELD.exec(line) : null;
    if (field) {
      current.fields[field[1]] = field[2];
      current.fieldLines[field[1]] = n;
      continue;
    }
    fieldsOpen = false;
    if (KEY_LINE.test(line)) throw new SiteError(file, n, `key:: line outside the field block: "${line.trim()}"`);
    if (!current.bodyLines.length && line.trim() === '') continue;
    if (!current.bodyLines.length) current.bodyLine = n;
    current.bodyLines.push(line);
  }
  for (const el of elements) {
    while (el.bodyLines.length && el.bodyLines[el.bodyLines.length - 1].trim() === '') el.bodyLines.pop();
    el.body = el.bodyLines.join('\n');
  }
  const seen = new Map();
  for (const el of elements) {
    const key = `${el.concept}:${el.name}`.toLowerCase();
    if (seen.has(key)) throw new SiteError(file, el.line, `duplicate element name "${el.name}" (first at line ${seen.get(key)})`);
    seen.set(key, el.line);
  }
  return elements;
}

function requireFields(el, names) {
  for (const f of names) {
    if (!el.fields[f]) throw new SiteError(el.file, el.line, `${el.concept} "${el.name}" is missing required field ${f}`);
  }
}

function parseSources(el) {
  const value = el.fields.sources;
  if (value === undefined) return [];
  const out = [];
  let pos = 0;
  while (pos < value.length) {
    if (value[pos] === ' ') { pos++; continue; }
    CITATION.lastIndex = pos;
    const m = CITATION.exec(value);
    if (!m) throw new SiteError(el.file, el.fieldLines.sources, `sources must hold only [path@unit] tokens, got "${value}"`);
    out.push({ path: m[1].trim(), unit: m[2].trim() });
    pos = CITATION.lastIndex;
  }
  if (!out.length) throw new SiteError(el.file, el.fieldLines.sources, 'sources is empty');
  return out;
}

function toSite(el) {
  requireFields(el, ['tagline', 'base_url']);
  if (!BASE_URL.test(el.fields.base_url)) {
    throw new SiteError(el.file, el.fieldLines.base_url, `base_url must be absolute and end with "/", got "${el.fields.base_url}"`);
  }
  return { ...el.fields, name: el.name, concept: 'Site', fields: el.fields, file: el.file, line: el.line };
}

function toPage(el) {
  requireFields(el, ['slug', 'kind', 'order', 'summary']);
  const { slug, ...fields } = el.fields;
  if (!SLUG.test(slug)) throw new SiteError(el.file, el.fieldLines.slug, `malformed slug "${slug}"`);
  if (!KINDS.includes(fields.kind)) {
    throw new SiteError(el.file, el.fieldLines.kind, `unknown kind "${fields.kind}" (allowed: ${KINDS.join(', ')})`);
  }
  if (!/^-?\d+$/.test(fields.order)) throw new SiteError(el.file, el.fieldLines.order, `order must be an integer, got "${fields.order}"`);
  return {
    name: el.name, concept: 'Page', slug, kind: fields.kind, order: Number(fields.order), summary: fields.summary,
    sources: parseSources(el), body: el.body, fields, file: el.file, line: el.line, bodyLine: el.bodyLine,
  };
}

export function loadSite(domainDir) {
  const kdir = path.join(domainDir, 'kNNowledge');
  if (!fs.existsSync(kdir)) throw new SiteError('kNNowledge', 0, 'directory not found');
  const files = fs.readdirSync(kdir).filter((f) => f.endsWith('.md')).sort();
  const sites = [];
  const pages = [];
  for (const f of files) {
    const rel = `kNNowledge/${f}`;
    for (const el of parseDocument(rel, fs.readFileSync(path.join(kdir, f), 'utf8'))) {
      if (el.concept === 'Site') sites.push(el);
      else if (el.concept === 'Page') pages.push(el);
      else throw new SiteError(rel, el.line, `unknown concept "${el.concept}" (expected Site or Page)`);
    }
  }
  if (sites.length !== 1) {
    const extra = sites[1];
    throw extra
      ? new SiteError(extra.file, extra.line, `Site is a singleton: second Site "${extra.name}" (first at ${sites[0].file}:${sites[0].line})`)
      : new SiteError('kNNowledge', 0, 'exactly one Site element is required, found none');
  }
  const site = toSite(sites[0]);
  const model = pages.map(toPage);
  const bySlug = new Map();
  for (const p of model) {
    const prev = bySlug.get(p.slug);
    if (prev) throw new SiteError(p.file, p.line, `duplicate slug "${p.slug}" (also in ${prev.file}:${prev.line})`);
    bySlug.set(p.slug, p);
  }
  if (!bySlug.has('index')) throw new SiteError('kNNowledge', 0, 'no Page has slug "index" (the home Page)');
  return { dir: domainDir, site, pages: model };
}
