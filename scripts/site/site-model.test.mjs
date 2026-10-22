import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadSite, SiteError } from './lib/site-model.mjs';

const FM = '---\nlevel: 3\nparent_spec:\n  name: "site"\n  url: "specs/bluepriNNts/site/spec_NN.md"\nknowledge_version: "V_0-1-0"\ntitle: "T"\n---\n\n';
const SITE = '# NN Site\n\n## NN Site: Demo\ntagline:: A tagline.\nbase_url:: https://example.com/next/\n';
const page = (name, fields = {}, body = '') => {
  const f = { slug: 'index', kind: 'pitch', order: '1', summary: 'A summary.', ...fields };
  const block = Object.entries(f)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}:: ${v}`)
    .join('\n');
  return `## NN Page: ${name}\n${block}\n${body ? `\n${body}\n` : ''}`;
};
const doc = (...parts) => `${FM}${parts.join('\n')}`;

/** Build a temp domaiNN. `files` maps a kNNowledge file name to its content. */
function domain(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-model-'));
  fs.mkdirSync(path.join(dir, 'kNNowledge'));
  for (const [name, text] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, 'kNNowledge', name), text, 'utf8');
  }
  return dir;
}
const valid = (extra = {}) => ({
  'site_NN.md': doc(SITE),
  'pitch_site_NN.md': doc('# NN Page\n', page('Home')),
  ...extra,
});
const fails = (files, re) => {
  const dir = domain(files);
  assert.throws(() => loadSite(dir), (e) => e instanceof SiteError && re.test(e.message), `expected ${re}`);
};

test('loads the Site and a Page with verbatim body and preserved indentation', () => {
  const body = 'Intro line.\n\n```js\nif (x) {\n    run();\n}\n```';
  const m = loadSite(domain(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Install', { slug: 'install', kind: 'guide', order: '2' }, body)) })));
  assert.equal(m.site.name, 'Demo');
  assert.equal(m.site.tagline, 'A tagline.');
  assert.equal(m.site.base_url, 'https://example.com/next/');
  assert.deepEqual(m.pages.map((p) => p.slug), ['install', 'index']);
  const install = m.pages[0];
  assert.equal(install.name, 'Install');
  assert.equal(install.kind, 'guide');
  assert.equal(install.order, 2);
  assert.equal(install.summary, 'A summary.');
  assert.equal(install.body, body);
  assert.equal(install.file, 'kNNowledge/guide_site_NN.md');
  assert.equal(m.pages[1].body, '');
});

test('body line numbers point at the first body line', () => {
  const m = loadSite(domain(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Install', { slug: 'install', kind: 'guide' }, 'First.')) })));
  const text = fs.readFileSync(path.join(m.dir, m.pages[0].file), 'utf8').split('\n');
  assert.equal(text[m.pages[0].bodyLine - 1], 'First.');
});

test('a key:: line in prose is rejected with file:line', () => {
  const dir = domain(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Install', { slug: 'install', kind: 'guide' }, 'Hello.\n\nowner:: me')) }));
  const lines = fs.readFileSync(path.join(dir, 'kNNowledge/guide_site_NN.md'), 'utf8').split('\n');
  const n = lines.indexOf('owner:: me') + 1;
  assert.throws(() => loadSite(dir), (e) => e instanceof SiteError && e.file === 'kNNowledge/guide_site_NN.md' && e.line === n && /key::/.test(e.message));
});

test('a key:: line inside a code fence is rejected', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Install', { slug: 'install', kind: 'guide' }, '```text\nnote:: x\n```')) }), /guide_site_NN\.md:\d+:.*key::/);
});

test('a field after a blank line is not part of the field block and is rejected', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', '## NN Page: Install\nslug:: install\nkind:: guide\norder:: 1\n\nsummary:: late\n') }), /key::/);
});

test('duplicate element names in one document are rejected', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Same', { slug: 'a', kind: 'guide' }), page('Same', { slug: 'b', kind: 'guide' })) }), /duplicate.*Same/i);
});

test('duplicate slug across documents names both files', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Other', { kind: 'guide' })) }), /^(?=.*duplicate slug)(?=.*guide_site_NN.md)(?=.*pitch_site_NN.md)/s);
});

test('a malformed slug is rejected', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'Getting Started', kind: 'guide' })) }), /slug.*Getting Started/);
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'a--b', kind: 'guide' })) }), /slug.*a--b/);
});

test('a missing index slug is rejected', () => {
  fails({ 'site_NN.md': doc(SITE), 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide' })) }, /no Page has slug "index"/);
});

test('an unknown kind is rejected', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'blog' })) }), /kind.*blog/);
});

test('a non-integer order is rejected', () => {
  for (const order of ['1.5', 'first', '']) {
    fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide', order })) }), /order/);
  }
});

test('a relative or unterminated base_url is rejected', () => {
  for (const url of ['/next', 'https://example.com/next', 'example.com/']) {
    fails({ ...valid(), 'site_NN.md': doc(`# NN Site\n\n## NN Site: Demo\ntagline:: T.\nbase_url:: ${url}\n`) }, /base_url/);
  }
});

test('BOM and CRLF input equals the LF input', () => {
  const files = valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Install', { slug: 'install', kind: 'guide' }, 'Line one.\nLine two.')) });
  const plain = loadSite(domain(files));
  const crlf = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, `\uFEFF${v.replace(/\n/g, '\r\n')}`]));
  const messy = loadSite(domain(crlf));
  const strip = (m) => ({ ...m, dir: null });
  assert.deepEqual(strip(messy), strip(plain));
});

test('U+FFFD in a document fails naming the file', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide' }, 'bad \uFFFD char')) }), /guide_site_NN\.md.*U\+FFFD/);
});

test('non-ASCII text survives', () => {
  const m = loadSite(domain(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Ñandú', { slug: 'x', kind: 'guide' }, 'café')) })));
  assert.equal(m.pages[0].name, 'Ñandú');
  assert.equal(m.pages[0].body, 'café');
});

test('an unknown concept or a missing kNNowledge directory is rejected', () => {
  fails(valid({ 'x_site_NN.md': doc('# NN Section\n', '## NN Section: Y\nslug:: y\n') }), /Section/);
  assert.throws(() => loadSite(fs.mkdtempSync(path.join(os.tmpdir(), 'site-model-empty-'))), SiteError);
});

// 3.2a: what nn-core does not enforce

test('each missing required field is named in the error', () => {
  for (const field of ['kind', 'order', 'summary']) {
    fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide', [field]: null })) }), new RegExp(`missing.*${field}`, 'i'));
  }
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: null, kind: 'guide' })) }), /missing.*slug/i);
  for (const field of ['tagline', 'base_url']) {
    const lines = { tagline: 'tagline:: T.', base_url: 'base_url:: https://e.com/' };
    delete lines[field];
    fails({ ...valid(), 'site_NN.md': doc(`# NN Site\n\n## NN Site: Demo\n${Object.values(lines).join('\n')}\n`) }, new RegExp(`missing.*${field}`, 'i'));
  }
});

test('a second Site element is a singleton violation, in the same or another document', () => {
  fails({ ...valid(), 'site_NN.md': doc(SITE, '## NN Site: Two\ntagline:: T.\nbase_url:: https://e.com/\n') }, /site_NN\.md:\d+: Site is a singleton: second Site "Two"/);
  fails(valid({ 'other_site_NN.md': doc(SITE) }), /kNNowledge\/site_NN\.md:\d+: Site is a singleton: second Site "Demo" \(first at kNNowledge\/other_site_NN\.md:\d+\)/);
});

test('a domaiNN with no Site is rejected', () => {
  fails({ 'pitch_site_NN.md': doc('# NN Page\n', page('Home')) }, /exactly one Site element is required, found none/);
});

test('sources holds only [path@unit] tokens', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide', sources: 'see the README' })) }), /sources.*see the README/);
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide', sources: '[a.md@## h] trailing' })) }), /sources/);
  // nn-core reads ONE bracketed, comma-separated list; separate brackets would be read as one corrupt citation.
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide', sources: '[a.md@## h] [b.md@## k]' })) }), /sources.*comma/);
  const m = loadSite(domain(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide', sources: '[sources/a.md@## foo,sources/b.md@## bar baz]' })) })));
  assert.deepEqual(m.pages[0].sources, [
    { path: 'sources/a.md', unit: '## foo' },
    { path: 'sources/b.md', unit: '## bar baz' },
  ]);
  assert.deepEqual(m.pages[1].sources, []);
});

// 3.3 / 3.4: agreement with nn-upgrade's parseKnowledge on every seed document

test('loadSite agrees with parseKnowledge on every seed document', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { parseKnowledge } = createRequire(import.meta.url)(path.join(root, 'skills/nn-upgrade/scripts/lib/nn-core.generated.cjs'));
  const siteDir = path.join(root, 'site_NN');
  const model = loadSite(siteDir);
  const files = fs.readdirSync(path.join(siteDir, 'kNNowledge')).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 7, 'seed documents present');
  const mine = [model.site, ...model.pages].map((e) => [e.name, e.concept, e.slug ?? null, e.fields]);
  const theirs = [];
  for (const f of files) {
    const parsed = parseKnowledge(fs.readFileSync(path.join(siteDir, 'kNNowledge', f), 'utf8'));
    for (const [, els] of parsed.elements.entries()) {
      for (const el of els) {
        const fields = { ...el.rawFields };
        delete fields.slug;
        theirs.push([el.name, el.type, el.slugExplicit ? el.slug : null, fields]);
      }
    }
  }
  assert.ok(theirs.length >= 7);
  const key = (r) => `${r[1]}:${r[0]}`;
  assert.deepEqual([...mine].sort((a, b) => key(a).localeCompare(key(b))), theirs.sort((a, b) => key(a).localeCompare(key(b))));
});

test('a BOM before the very first heading is stripped (no frontmatter)', () => {
  const bom = String.fromCharCode(0xfeff);
  const bare = `## NN Page: Home\nslug:: index\nkind:: pitch\norder:: 1\nsummary:: S.\n`;
  const m = loadSite(domain({ 'site_NN.md': doc(SITE), 'pitch_site_NN.md': bom + bare.replace(/\n/g, '\r\n') }));
  assert.equal(m.pages[0].name, 'Home');
  assert.equal(m.pages[0].summary, 'S.');
});

test('a level-1 heading inside a body fails instead of truncating the Page', () => {
  const dir = domain(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide' }, 'Before.\n\n# Surprise\n\nAfter.')) }));
  const n = fs.readFileSync(path.join(dir, 'kNNowledge/guide_site_NN.md'), 'utf8').split('\n').indexOf('# Surprise') + 1;
  assert.throws(() => loadSite(dir), (e) => e instanceof SiteError && e.file === 'kNNowledge/guide_site_NN.md' && e.line === n && /level-1 heading/.test(e.message));
});

test('Page names are unique site-wide', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('Home', { slug: 'x', kind: 'guide' })) }), /^(?=.*duplicate Page name "Home")(?=.*pitch_site_NN\.md)(?=.*guide_site_NN\.md)/s);
});

test('a duplicate field key fails instead of overwriting', () => {
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', '## NN Page: X\nslug:: x\nkind:: guide\nkind:: legal\norder:: 1\nsummary:: S.\n') }), /guide_site_NN\.md:\d+: duplicate field "kind"/);
});

test('base_url rejects quotes, angle brackets, and backslashes', () => {
  for (const url of ['https://e.com/"x/', 'https://e.com/<x>/', `https://e.com/a${String.fromCharCode(92)}b/`]) {
    fails({ ...valid(), 'site_NN.md': doc(`# NN Site\n\n## NN Site: Demo\ntagline:: T.\nbase_url:: ${url}\n`) }, /base_url must be absolute/);
  }
});

test('unterminated frontmatter fails', () => {
  fails({ ...valid(), 'bad_site_NN.md': '---\nlevel: 3\n\n## NN Page: X\nslug:: x\n' }, /bad_site_NN\.md.*frontmatter/i);
});

test('only a bare fence closes a fence, as in the renderer', () => {
  // The "```js" line does not close the fence, so the fake heading and field stay body text and are rejected as key::.
  const body = '```text\n```js\n## NN Page: Ghost\nslug:: ghost\n```';
  fails(valid({ 'guide_site_NN.md': doc('# NN Page\n', page('X', { slug: 'x', kind: 'guide' }, body)) }), /key::/);
});
