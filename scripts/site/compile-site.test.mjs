import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { run, MARKER_FILE, MARKER_TEXT } from './compile-site.mjs';
import { loadSite } from './lib/site-model.mjs';

const require = createRequire(import.meta.url);
const { writeOnce, cognitivize } = require('../../skills/nn-sources/scripts/lib/nn-core.generated.cjs');

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const SEED = path.join(REPO, 'site_NN');
const ASSETS = 'specs/bluepriNNts/site/assets';

const made = [];
const tmp = (label) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `site-compile-${label}-`));
  made.push(dir);
  return dir;
};
after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const FM = '---\nlevel: 3\nparent_spec:\n  name: "site"\n  url: "specs/bluepriNNts/site/spec_NN.md"\nknowledge_version: "V_0-1-0"\ntitle: "T"\n---\n\n';
const siteDoc = (name = 'Demo', fields = {}) => {
  const f = { tagline: 'A tagline.', base_url: 'https://example.com/next/', ...fields };
  return `${FM}# NN Site\n\n## NN Site: ${name}\n${Object.entries(f).map(([k, v]) => `${k}:: ${v}`).join('\n')}\n`;
};
const page = (name, fields = {}, body = '') => {
  const f = { slug: 'index', kind: 'pitch', order: '1', summary: 'A summary.', ...fields };
  const block = Object.entries(f).map(([k, v]) => `${k}:: ${v}`).join('\n');
  return `## NN Page: ${name}\n${block}\n${body ? `\n${body}\n` : ''}`;
};
const pageDoc = (...pages) => `${FM}# NN Page\n\n${pages.join('\n')}`;

/** A minimal domaiNN with the real shell and CSS. `docs` maps kNNowledge file names to text. */
function fixture(docs = {}, site = siteDoc()) {
  const dir = tmp('dom');
  fs.mkdirSync(path.join(dir, 'kNNowledge'), { recursive: true });
  fs.cpSync(path.join(SEED, ASSETS), path.join(dir, ASSETS), { recursive: true });
  const all = { 'site_NN.md': site, 'pitch_site_NN.md': pageDoc(page('Home')), ...docs };
  for (const [name, text] of Object.entries(all)) fs.writeFileSync(path.join(dir, 'kNNowledge', name), text, 'utf8');
  return dir;
}

async function compile(domainDir, outDir = tmp('out')) {
  const logs = [];
  const code = await run({ domainDir, outDir, log: (m) => logs.push(String(m)) });
  return { code, logs, out: outDir, text: logs.join('\n') };
}

/** Relative path -> content for every file under `dir`, sorted. */
function tree(dir) {
  const out = {};
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r);
      else out[r] = fs.readFileSync(path.join(dir, r), 'utf8');
    }
  };
  walk('');
  return out;
}
const read = (out, name) => fs.readFileSync(path.join(out, name), 'utf8');
const navOf = (html) => /<nav[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
const plainNav = (html) => navOf(html).replace(' aria-current="page"', '');

// ---- 4.1 pages, shell, navigation ---------------------------------------------------------

test('writes a flat <slug>.html per Page with title, description and a relative stylesheet', async () => {
  const dir = fixture({
    'guide_site_NN.md': pageDoc(page('Install', { slug: 'install', kind: 'guide', summary: 'How to install.' }, 'Run it.')),
  });
  const { code, out } = await compile(dir);
  assert.equal(code, 0);
  assert.deepEqual(Object.keys(tree(out)).sort(), [MARKER_FILE, 'index.html', 'install.html', 'llms.txt', 'site.css', 'sitemap.xml']);
  const html = read(out, 'install.html');
  assert.match(html, /<title>Install<\/title>/);
  assert.match(html, /<meta name="description" content="How to install\.">/);
  assert.match(html, /<link rel="stylesheet" href="site\.css">/);
  assert.match(html, /<p>Run it\.<\/p>/);
  assert.doesNotMatch(html, /(?:href|src)="(?:\/|https?:)[^"]*site\.css/);
});

test('shared stylesheet is copied verbatim from the bluepriNNt assets', async () => {
  const { out } = await compile(fixture());
  const css = fs.readFileSync(path.join(SEED, ASSETS, 'site.css'), 'utf8').replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
  assert.equal(read(out, 'site.css'), css);
});

test('navigation: fixed kind order, then order, then slug; empty groups omitted; same on every page', async () => {
  const dir = fixture({
    'guide_site_NN.md': pageDoc(
      page('Guide B', { slug: 'b', kind: 'guide', order: '2' }),
      page('Guide A', { slug: 'a', kind: 'guide', order: '2' }),
      page('Guide First', { slug: 'z-first', kind: 'guide', order: '1' }),
    ),
    'legal_site_NN.md': pageDoc(page('Legal', { slug: 'legal', kind: 'legal' })),
    'tutorial_site_NN.md': pageDoc(page('Tour', { slug: 'tour', kind: 'tutorial' })),
  });
  const { code, out } = await compile(dir);
  assert.equal(code, 0);
  const nav = navOf(read(out, 'index.html'));
  const hrefs = [...nav.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, ['index.html', 'tour.html', 'z-first.html', 'a.html', 'b.html', 'legal.html']);
  assert.doesNotMatch(nav, /Concepts|Reference/);
  for (const f of ['tour.html', 'a.html', 'legal.html']) assert.equal(plainNav(read(out, f)), plainNav(read(out, 'index.html')));
});

test('navigation entries show the title and the summary', async () => {
  const dir = fixture({ 'guide_site_NN.md': pageDoc(page('Install', { slug: 'install', kind: 'guide', summary: 'Install in one step.' })) });
  const { out } = await compile(dir);
  assert.match(navOf(read(out, 'index.html')), /<a href="install\.html">Install<\/a>[\s\S]*Install in one step\./);
});

test('header shows the site name and tagline; the home link is relative', async () => {
  const { out } = await compile(fixture({}, siteDoc('Demo Site', { tagline: 'Short and sweet.' })));
  const html = read(out, 'index.html');
  assert.match(html, /<a href="index\.html"[^>]*>Demo Site<\/a>/);
  assert.match(html, /Short and sweet\./);
});

test('non-ASCII content survives without U+FFFD', async () => {
  const dir = fixture({ 'pitch_site_NN.md': pageDoc(page('Home', {}, 'Ñandú y café, 日本語.')) });
  const { out } = await compile(dir);
  const html = read(out, 'index.html');
  assert.match(html, /Ñandú y café, 日本語\./);
  assert.ok(!html.includes('\uFFFD'));
});

test('a BOM and CRLF input compiles to the same bytes as plain LF', async () => {
  const lf = fixture({ 'pitch_site_NN.md': pageDoc(page('Home', {}, 'Line one.\n\nLine two.')) });
  const crlf = fixture({ 'pitch_site_NN.md': `\uFEFF${pageDoc(page('Home', {}, 'Line one.\n\nLine two.')).replace(/\n/g, '\r\n')}` });
  assert.deepEqual(tree((await compile(crlf)).out), tree((await compile(lf)).out));
});

test('U+FFFD in a source document fails and names the file', async () => {
  const dir = fixture({ 'pitch_site_NN.md': pageDoc(page('Home', {}, 'Broken \uFFFD text.')) });
  const { code, text } = await compile(dir);
  assert.equal(code, 1);
  assert.match(text, /pitch_site_NN\.md/);
});

test('slot values are not re-expanded (single pass)', async () => {
  const dir = fixture({ 'pitch_site_NN.md': pageDoc(page('Home', {}, 'Literal {{nav}} and {{sources}} stay text.')) });
  const { out } = await compile(dir);
  const html = read(out, 'index.html');
  assert.match(html, /Literal \{\{nav\}\} and \{\{sources\}\} stay text\./);
  assert.equal((html.match(/<nav/g) ?? []).length, 1);
});

test('the seed domaiNN compiles: one file per Page plus css, sitemap and llms.txt', async () => {
  const { code, out } = await compile(SEED);
  assert.equal(code, 0);
  const pages = loadSite(SEED).pages;
  assert.equal(Object.keys(tree(out)).length, pages.length + 4);
  for (const p of pages) assert.ok(fs.existsSync(path.join(out, `${p.slug}.html`)), p.slug);
  assert.ok(fs.existsSync(path.join(out, 'index.html')));
});

test('all Page-to-Page links in the seed output resolve to written files', async () => {
  const { out } = await compile(SEED);
  const files = new Set(Object.keys(tree(out)));
  for (const [f, html] of Object.entries(tree(out))) {
    if (!f.endsWith('.html')) continue;
    for (const m of html.matchAll(/href="([^"#?]+)"/g)) {
      if (/^https?:/.test(m[1])) continue;
      assert.ok(files.has(m[1]), `${f} links to missing ${m[1]}`);
    }
  }
});

// ---- 4.2 sitemap, llms.txt, determinism ---------------------------------------------------

test('sitemap.xml lists every Page under base_url, with no lastmod', async () => {
  const dir = fixture({ 'guide_site_NN.md': pageDoc(page('Install', { slug: 'install', kind: 'guide' })) });
  const { out } = await compile(dir);
  const xml = read(out, 'sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, 2);
  for (const l of locs) assert.ok(l.startsWith('https://example.com/next/'), l);
  assert.ok(locs.includes('https://example.com/next/install.html'));
  assert.doesNotMatch(xml, /lastmod/);
});

test('llms.txt has the title, the tagline and one line per Page with its summary', async () => {
  const dir = fixture({ 'guide_site_NN.md': pageDoc(page('Install', { slug: 'install', kind: 'guide', summary: 'Install in one step.' })) });
  const { out } = await compile(dir);
  const txt = read(out, 'llms.txt');
  assert.match(txt, /^# Demo\n/);
  assert.match(txt, /> A tagline\./);
  assert.match(txt, /\[Install\]\(https:\/\/example\.com\/next\/install\.html\): Install in one step\./);
  assert.equal(txt.split('\n').filter((l) => l.startsWith('- [')).length, 2);
});

test('no markdown file is emitted', async () => {
  const { out } = await compile(SEED);
  assert.deepEqual(Object.keys(tree(out)).filter((f) => f.endsWith('.md')), []);
});

test('output files use LF and a single trailing newline', async () => {
  const { out } = await compile(SEED);
  for (const [f, text] of Object.entries(tree(out))) {
    assert.ok(!text.includes('\r'), `${f} has CR`);
    assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'), `${f} trailing newline`);
  }
});

test('rerunning gives byte-identical output', async () => {
  const dir = fixture();
  const a = tree((await compile(dir)).out);
  const b = tree((await compile(dir)).out);
  assert.deepEqual(a, b);
});

test('output is path-independent: the same domaiNN in two places compiles identically', async () => {
  const one = fixture();
  const two = tmp('copy');
  fs.cpSync(one, two, { recursive: true });
  assert.deepEqual(tree((await compile(one)).out), tree((await compile(two)).out));
});

test('compilation reads nothing outside the domaiNN directory', async () => {
  const dir = fixture();
  const out = tmp('out');
  const root = fs.realpathSync(dir);
  const outside = [];
  const originals = {};
  for (const name of ['readFileSync', 'readdirSync', 'statSync', 'lstatSync', 'existsSync', 'openSync']) {
    originals[name] = fs[name];
    fs[name] = function patched(p, ...rest) {
      if (typeof p === 'string' || p instanceof URL) {
        const abs = path.resolve(p instanceof URL ? fileURLToPath(p) : p);
        const rel = path.relative(root, abs);
        const inside = !rel.startsWith('..') && !path.isAbsolute(rel);
        const inOut = !path.relative(out, abs).startsWith('..');
        const inTmpDomain = !path.relative(dir, abs).startsWith('..');
        if (!inside && !inOut && !inTmpDomain) outside.push(`${name}:${abs}`);
      }
      return originals[name].call(this, p, ...rest);
    };
  }
  try {
    assert.equal((await compile(dir, out)).code, 0);
  } finally {
    Object.assign(fs, originals);
  }
  assert.deepEqual(outside, []);
});

test('output is written only under outDir', async () => {
  const dir = fixture();
  const parent = tmp('parent');
  const out = path.join(parent, 'site');
  assert.equal((await compile(dir, out)).code, 0);
  assert.deepEqual(fs.readdirSync(parent), ['site']);
  assert.deepEqual(fs.readdirSync(path.join(dir)).sort(), ['kNNowledge', 'specs']);
});

// ---- 4.3 failure behavior ----------------------------------------------------------------

test('an invalid Page exits 1 and leaves the previous output byte-identical', async () => {
  const dir = fixture();
  const out = tmp('out');
  assert.equal((await compile(dir, out)).code, 0);
  const before = tree(out);
  fs.writeFileSync(path.join(dir, 'kNNowledge', 'pitch_site_NN.md'), pageDoc(page('Home', {}, '| a | b |')), 'utf8');
  const { code, text } = await compile(dir, out);
  assert.equal(code, 1);
  assert.match(text, /pitch_site_NN\.md:\d+/);
  assert.deepEqual(tree(out), before);
});

test('a failing first run does not create outDir', async () => {
  const dir = fixture({ 'pitch_site_NN.md': pageDoc(page('Home', {}, '[[Nope]]')) });
  const out = path.join(tmp('parent'), 'fresh');
  assert.equal((await compile(dir, out)).code, 1);
  assert.ok(!fs.existsSync(out));
});

test('a removed Page disappears from the output on the next successful run', async () => {
  const dir = fixture({ 'guide_site_NN.md': pageDoc(page('Old', { slug: 'old', kind: 'guide' })) });
  const out = tmp('out');
  await compile(dir, out);
  assert.ok(fs.existsSync(path.join(out, 'old.html')));
  fs.rmSync(path.join(dir, 'kNNowledge', 'guide_site_NN.md'));
  assert.equal((await compile(dir, out)).code, 0);
  assert.ok(!fs.existsSync(path.join(out, 'old.html')));
  assert.doesNotMatch(read(out, 'sitemap.xml'), /old\.html/);
});

test('only the given directory is removed; siblings and parents survive', async () => {
  const dir = fixture();
  const parent = tmp('parent');
  fs.mkdirSync(path.join(parent, 'keep'));
  fs.writeFileSync(path.join(parent, 'keep', 'x.txt'), 'x');
  fs.writeFileSync(path.join(parent, 'note.txt'), 'n');
  const out = path.join(parent, 'site');
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, MARKER_FILE), MARKER_TEXT);
  fs.writeFileSync(path.join(out, 'stale.txt'), 's');
  assert.equal((await compile(dir, out)).code, 0);
  assert.ok(!fs.existsSync(path.join(out, 'stale.txt')));
  assert.equal(fs.readFileSync(path.join(parent, 'keep', 'x.txt'), 'utf8'), 'x');
  assert.equal(fs.readFileSync(path.join(parent, 'note.txt'), 'utf8'), 'n');
});

test('refuses an outDir that is, or contains, the domaiNN, and deletes nothing', async () => {
  const dir = fixture();
  const before = tree(dir);
  for (const out of [dir, path.dirname(dir), path.join(dir, 'kNNowledge')]) {
    const { code, text } = await compile(dir, out);
    assert.equal(code, 1, out);
    assert.match(text, /outDir/);
  }
  assert.deepEqual(tree(dir), before);
});

test('a missing shell slot fails before any output is written', async () => {
  const dir = fixture();
  const shell = path.join(dir, ASSETS, 'shell.html');
  fs.writeFileSync(shell, fs.readFileSync(shell, 'utf8').replace('{{nav}}', ''), 'utf8');
  const out = path.join(tmp('parent'), 'fresh');
  const { code, text } = await compile(dir, out);
  assert.equal(code, 1);
  assert.match(text, /shell\.html/);
  assert.match(text, /\{\{nav\}\}/);
  assert.ok(!fs.existsSync(out));
});

test('an unknown shell slot fails', async () => {
  const dir = fixture();
  const shell = path.join(dir, ASSETS, 'shell.html');
  fs.writeFileSync(shell, `${fs.readFileSync(shell, 'utf8')}{{mystery}}\n`, 'utf8');
  const { code, text } = await compile(dir);
  assert.equal(code, 1);
  assert.match(text, /\{\{mystery\}\}/);
});

// ---- escaping ----------------------------------------------------------------------------

test('every emitted value is escaped (HTML, XML and text injection payloads)', async () => {
  const dir = fixture(
    {
      'pitch_site_NN.md': pageDoc(page('Home <i>x</i>', { summary: 'S "q" <script>alert(1)</script> & more' }, 'Body.')),
      'guide_site_NN.md': pageDoc(page('Weird ] [name](x) <b>', { slug: 'weird', kind: 'guide', summary: 'ok' })),
    },
    siteDoc('Site <img src=x onerror=alert(1)> &', {
      tagline: 'Tag <script>t()</script> "x" & y',
      base_url: 'https://example.com/a?x=1&y=2/(p)/',
    }),
  );
  const { code, out } = await compile(dir);
  assert.equal(code, 0);
  for (const f of ['index.html', 'weird.html']) {
    const html = read(out, f);
    assert.doesNotMatch(html, /<script|<img|<i>|<b>/, f);
    assert.doesNotMatch(html, /onerror=alert\(1\)>/);
  }
  const home = read(out, 'index.html');
  assert.match(home, /content="S &quot;q&quot; &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; more"/);
  assert.match(home, /<title>Home &lt;i&gt;x&lt;\/i&gt;<\/title>/);
  assert.match(home, /Site &lt;img src=x onerror=alert\(1\)&gt; &amp;/);
  const xml = read(out, 'sitemap.xml');
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;)/);
  assert.match(xml, /a\?x=1&amp;y=2\/\(p\)\/weird\.html/);
  const txt = read(out, 'llms.txt');
  assert.ok(txt.includes('[Weird \\] \\[name\\](x) <b>]('), txt);
  assert.ok(txt.includes('%28p%29/weird.html)'), txt);
});

// ---- 4.6 citation policy ------------------------------------------------------------------

const T1 = () => new Date('2026-01-02T03:04:05Z');
const T2 = () => new Date('2026-01-03T03:04:05Z');
const CITED = 'sources/import/code-facts/mcp-tools_20260102T030405Z.md';

async function addMember(dir, text, now) {
  const r = await writeOnce(dir, { dir: 'sources/import/code-facts', key: 'mcp-tools', ext: 'md' }, text, { now });
  await cognitivize(dir, r.path, { now });
  return r.path;
}
const citing = (value) => ({
  'reference_site_NN.md': pageDoc(page('Reference', { slug: 'reference', kind: 'reference', sources: value }, 'See sources.')),
});

test('a current citation is listed in the sources slot', async () => {
  const dir = fixture(citing(`[${CITED}@## innfo_validate]`));
  assert.equal(await addMember(dir, '## innfo_validate\nChecks a model.\n', T1), CITED);
  const { code, out, logs } = await compile(dir);
  assert.equal(code, 0, logs.join('\n'));
  const html = read(out, 'reference.html');
  assert.match(html, /class="sources"/);
  assert.ok(html.includes(CITED) && html.includes('## innfo_validate'));
  assert.doesNotMatch(read(out, 'index.html'), /class="sources"/);
});

test('a citation to a missing file fails with the citation in the message', async () => {
  const dir = fixture(citing('[sources/import/code-facts/nope_20260102T030405Z.md@## x]'));
  const { code, text } = await compile(dir);
  assert.equal(code, 1);
  assert.match(text, /nope_20260102T030405Z\.md/);
});

test('a citation to a missing heading fails', async () => {
  const dir = fixture(citing(`[${CITED}@## no_such_tool]`));
  await addMember(dir, '## innfo_validate\nChecks a model.\n', T1);
  const { code, text } = await compile(dir);
  assert.equal(code, 1);
  assert.match(text, /no_such_tool/);
});

test('superseded: warns naming the Page and citation, still exits 0 and writes output', async () => {
  const dir = fixture(citing(`[${CITED}@## innfo_validate]`));
  await addMember(dir, '## innfo_validate\nChecks a model.\n', T1);
  await addMember(dir, '## innfo_validate\nChecks a model, better.\n', T2);
  const { code, text, out } = await compile(dir);
  assert.equal(code, 0, text);
  assert.match(text, /warning/i);
  assert.match(text, /Reference/);
  assert.ok(text.includes('mcp-tools_20260102T030405Z.md'));
  assert.ok(fs.existsSync(path.join(out, 'reference.html')));
});

test('unresolved in the latest member: fails naming the Page and citation, writes nothing', async () => {
  const dir = fixture(citing(`[${CITED}@## innfo_validate]`));
  await addMember(dir, '## innfo_validate\nChecks a model.\n', T1);
  await addMember(dir, '## something_else\nNew.\n', T2);
  const out = path.join(tmp('parent'), 'fresh');
  const { code, text } = await compile(dir, out);
  assert.equal(code, 1);
  assert.match(text, /Reference/);
  assert.ok(text.includes('innfo_validate'));
  assert.ok(!fs.existsSync(out));
});

test('a stale sidecar hash fails naming the member, even when uncited', async () => {
  const dir = fixture();
  const member = await addMember(dir, '## innfo_validate\nChecks a model.\n', T1);
  fs.writeFileSync(path.join(dir, member), '## innfo_validate\nEdited in place.\n', 'utf8');
  const { code, text } = await compile(dir);
  assert.equal(code, 1);
  assert.ok(text.includes(member), text);
});

test('a citation that is not a [path@unit] token fails in the model, with file:line', async () => {
  const dir = fixture(citing('see the README'));
  const { code, text } = await compile(dir);
  assert.equal(code, 1);
  assert.match(text, /reference_site_NN\.md:\d+/);
});

// ---- 4.8 freshness -----------------------------------------------------------------------

test('committed docs/next/ matches a fresh compile of site_NN/', async () => {
  const committed = path.join(REPO, 'docs', 'next');
  assert.ok(fs.existsSync(committed), 'docs/next/ is missing: run `node scripts/site/compile-site.mjs`');
  const { code, out } = await compile(SEED);
  assert.equal(code, 0);
  const fresh = tree(out);
  const have = tree(committed);
  assert.deepEqual(Object.keys(have), Object.keys(fresh), 'docs/next/ file set is stale: run `node scripts/site/compile-site.mjs` and commit the result');
  for (const f of Object.keys(fresh)) {
    assert.equal(have[f], fresh[f], `docs/next/${f} is stale: run \`node scripts/site/compile-site.mjs\` and commit the result`);
  }
});

// ---- review follow-up: safe deletion, links, accessibility ---------------------------------

test('refuses a non-empty outDir without the marker and leaves it untouched', async () => {
  const dir = fixture();
  const parent = tmp('docs');
  fs.mkdirSync(path.join(parent, 'innfo'));
  fs.writeFileSync(path.join(parent, 'innfo', 'x.txt'), 'x');
  fs.writeFileSync(path.join(parent, 'manifest.md'), 'm');
  const before = tree(parent);
  const { code, text } = await compile(dir, parent);
  assert.equal(code, 1);
  assert.match(text, /outDir/);
  assert.ok(text.includes(MARKER_FILE), text);
  assert.deepEqual(tree(parent), before);
});

test('an empty or missing outDir is fine; a dir with the marker is replaced', async () => {
  const dir = fixture();
  const empty = tmp('empty');
  assert.equal((await compile(dir, empty)).code, 0);
  assert.equal(read(empty, MARKER_FILE), MARKER_TEXT);
  const marked = tmp('marked');
  fs.writeFileSync(path.join(marked, MARKER_FILE), MARKER_TEXT);
  fs.writeFileSync(path.join(marked, 'old.html'), 'old');
  assert.equal((await compile(dir, marked)).code, 0);
  assert.ok(!fs.existsSync(path.join(marked, 'old.html')));
  assert.ok(fs.existsSync(path.join(marked, 'index.html')));
});

test('an outDir that is a link is replaced by a real directory and the target survives', async () => {
  const dir = fixture();
  const target = tmp('target');
  fs.writeFileSync(path.join(target, MARKER_FILE), MARKER_TEXT);
  fs.writeFileSync(path.join(target, 'keep.txt'), 'keep');
  const link = path.join(tmp('parent'), 'next');
  fs.symlinkSync(target, link, 'junction');
  const { code, text } = await compile(dir, link);
  assert.equal(code, 0, text);
  assert.ok(!fs.lstatSync(link).isSymbolicLink());
  assert.ok(fs.existsSync(path.join(link, 'index.html')));
  assert.equal(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8'), 'keep');
  assert.ok(!fs.existsSync(path.join(target, 'index.html')));
});

test('a multi-line summary cannot reach llms.txt: the continuation line is body, not summary', async () => {
  const dir = fixture({
    'pitch_site_NN.md': pageDoc('## NN Page: Home\nslug:: index\nkind:: pitch\norder:: 1\nsummary:: First line.\nSecond line.\n'),
  });
  const { code, out } = await compile(dir);
  assert.equal(code, 0);
  const txt = read(out, 'llms.txt');
  assert.match(txt, /index\.html\): First line\.\n/);
  assert.doesNotMatch(txt, /Second line/);
  assert.equal(txt.split('\n').filter((l) => l.startsWith('- [')).length, 1);
  assert.match(read(out, 'index.html'), /<p>Second line\.<\/p>/);
});

test('every page has a skip link to the main region', async () => {
  const { out } = await compile(fixture());
  const html = read(out, 'index.html');
  assert.match(html, /<a href="#main" class="skip-link">Skip to content<\/a>/);
  assert.match(html, /<main id="main">/);
});

test('only the active page carries aria-current in the navigation', async () => {
  const dir = fixture({ 'guide_site_NN.md': pageDoc(page('Install', { slug: 'install', kind: 'guide' })) });
  const { out } = await compile(dir);
  const nav = navOf(read(out, 'install.html'));
  assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(nav, /<a href="install\.html" aria-current="page">Install<\/a>/);
  assert.doesNotMatch(navOf(read(out, 'index.html')), /<a href="install\.html" aria-current/);
});
