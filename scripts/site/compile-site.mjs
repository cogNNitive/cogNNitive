// Compiles the `site_NN/` domaiNN into flat static files (default: docs/next/).
// Reads only the domaiNN. Everything is parsed, checked and rendered in memory before
// the output directory is touched, so a failing run leaves the previous output intact.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { KINDS, loadSite, SiteError } from './lib/site-model.mjs';
import { esc, renderBody } from './lib/markdown-subset.mjs';

const require = createRequire(import.meta.url);
const { auditModelCitations, checkScanImpact, findStaleSources } = require('../../skills/nn-sources/scripts/lib/impact-checker.js');

const ASSETS = 'specs/bluepriNNts/site/assets';
const SLOTS = ['title', 'description', 'site', 'tagline', 'nav', 'content', 'sources'];
const KIND_LABEL = { pitch: 'Overview', tutorial: 'Tutorials', guide: 'Guides', concept: 'Concepts', reference: 'Reference', legal: 'Legal' };

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const mdText = (s) => s.replace(/[\\[\]]/g, '\\$&');
const mdUrl = (s) => s.replace(/\(/g, '%28').replace(/\)/g, '%29');
const lf = (s) => `${s.replace(/\r\n?/g, '\n').replace(/\n+$/, '')}\n`;

function readAsset(domainDir, name) {
  const rel = `${ASSETS}/${name}`;
  const abs = path.join(domainDir, rel);
  if (!fs.existsSync(abs)) throw new SiteError(rel, 0, 'asset not found');
  const text = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (text.includes('\uFFFD')) throw new SiteError(rel, 0, 'contains U+FFFD (invalid UTF-8)');
  return { rel, text };
}

function checkShell({ rel, text }) {
  const seen = new Set();
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) {
    if (!SLOTS.includes(m[1])) throw new SiteError(rel, text.slice(0, m.index).split('\n').length, `unknown slot {{${m[1]}}}`);
    seen.add(m[1]);
  }
  for (const s of SLOTS) if (!seen.has(s)) throw new SiteError(rel, 0, `missing slot {{${s}}}`);
}

/** Resolve through symlinks and 8.3 names even when the tail does not exist yet. */
function resolveReal(p) {
  const abs = path.resolve(p);
  const tail = [];
  let head = abs;
  while (!fs.existsSync(head) && path.dirname(head) !== head) {
    tail.unshift(path.basename(head));
    head = path.dirname(head);
  }
  return path.join(fs.realpathSync(head), ...tail);
}

function checkOutDir(domainDir, outDir) {
  const out = resolveReal(outDir);
  const dom = resolveReal(domainDir);
  const within = (parent, child) => {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  };
  if (within(out, dom) || within(dom, out)) {
    throw new SiteError('outDir', 0, 'must not be the domaiNN, one of its folders, or a folder that contains it');
  }
  if (fs.existsSync(out) && !fs.statSync(out).isDirectory()) throw new SiteError('outDir', 0, 'exists and is not a directory');
}

function walkFiles(root, rel = '') {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => byText(a.name, b.name))) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walkFiles(root, r));
    else out.push(r);
  }
  return out;
}

/** Citation policy: audit errors, unresolved_in_latest and stale sidecar hashes fail; superseded warns. */
function checkCitations(domainDir) {
  const errors = [];
  const warnings = [];
  const audit = auditModelCitations(domainDir);
  errors.push(...audit.errors);
  warnings.push(...audit.warnings);
  for (const fam of checkScanImpact(domainDir)) {
    for (const a of fam.affectedModels) {
      const msg = `Page "${a.element ?? '?'}" (${a.modelFile}) cites ${a.citation}: ${a.message}`;
      (a.status === 'unresolved_in_latest' ? errors : warnings).push(msg);
    }
  }
  for (const member of findStaleSources(domainDir, walkFiles(domainDir, 'sources'))) {
    errors.push(`source "${member}" no longer matches its sidecar sha256 (edited in place); restore it or add a new member`);
  }
  return { errors, warnings };
}

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => values[name]);
}

function renderNav(groups) {
  const sections = groups.map(({ kind, pages }) => {
    const items = pages.map((p) => `<li><a href="${p.slug}.html">${esc(p.name)}</a><span>${esc(p.summary)}</span></li>`);
    return `<section>\n<h2>${KIND_LABEL[kind]}</h2>\n<ul>\n${items.join('\n')}\n</ul>\n</section>`;
  });
  return `<nav aria-label="Site">\n${sections.join('\n')}\n</nav>`;
}

function renderSources(page) {
  if (!page.sources.length) return '';
  const items = page.sources.map((s) => `<li><code>${esc(s.path)}</code> <span>${esc(s.unit)}</span></li>`);
  return `<aside class="sources">\n<h2>Sources</h2>\n<ul>\n${items.join('\n')}\n</ul>\n</aside>`;
}

function renderSitemap(site, ordered) {
  const urls = ordered.map((p) => `<url><loc>${esc(site.base_url + p.slug)}.html</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

function renderLlms(site, groups) {
  const out = [`# ${site.name}`, '', `> ${site.tagline}`];
  for (const { kind, pages } of groups) {
    out.push('', `## ${KIND_LABEL[kind]}`);
    for (const p of pages) out.push(`- [${mdText(p.name)}](${mdUrl(`${site.base_url}${p.slug}.html`)}): ${p.summary}`);
  }
  return out.join('\n');
}

/** Build every output file in memory. Throws SiteError on any problem. */
function build(domainDir, log) {
  const { site, pages } = loadSite(domainDir);
  const shell = readAsset(domainDir, 'shell.html');
  checkShell(shell);
  const css = readAsset(domainDir, 'site.css');

  const { errors, warnings } = checkCitations(domainDir);
  for (const w of warnings) log(`warning: ${w}`);
  if (errors.length) throw new SiteError('citations', 0, `\n${errors.map((e) => `  ${e}`).join('\n')}`);

  const ordered = [...pages].sort(
    (a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.order - b.order || byText(a.slug, b.slug),
  );
  const groups = KINDS.map((kind) => ({ kind, pages: ordered.filter((p) => p.kind === kind) })).filter((g) => g.pages.length);
  const pagesByName = new Map(pages.map((p) => [p.name, p]));
  const nav = renderNav(groups);

  const files = new Map();
  for (const p of ordered) {
    const content = renderBody(p.body, { file: p.file, line: p.bodyLine, pagesByName });
    const values = {
      title: esc(p.name), description: esc(p.summary), site: esc(site.name), tagline: esc(site.tagline),
      nav, content, sources: renderSources(p),
    };
    files.set(`${p.slug}.html`, fill(shell.text, values));
  }
  files.set('site.css', css.text);
  files.set('sitemap.xml', renderSitemap(site, ordered));
  files.set('llms.txt', renderLlms(site, groups));

  for (const [name, text] of files) {
    if (text.includes('\uFFFD')) throw new SiteError(name, 0, 'output contains U+FFFD');
    files.set(name, lf(text));
  }
  return files;
}

/** @returns {Promise<0 | 1>} */
export async function run({ domainDir, outDir, log = console.log }) {
  let files;
  try {
    checkOutDir(domainDir, outDir);
    files = build(domainDir, log);
  } catch (e) {
    if (!(e instanceof SiteError)) throw e;
    log(`error: ${e.message}`);
    return 1;
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, text] of files) fs.writeFileSync(path.join(outDir, name), text, 'utf8');
  log(`compiled ${files.size - 3} pages`);
  return 0;
}

const here = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const repo = path.resolve(path.dirname(here), '../..');
  process.exitCode = await run({ domainDir: path.join(repo, 'site_NN'), outDir: path.join(repo, 'docs', 'next') });
}
