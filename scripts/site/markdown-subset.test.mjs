import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBody } from './lib/markdown-subset.mjs';
import { SiteError } from './lib/site-model.mjs';

const FILE = 'kNNowledge/guide_site_NN.md';
const pagesByName = new Map([['Install', { slug: 'install' }]]);
const render = (body) => renderBody(body, { file: FILE, line: 10, pagesByName });
const rejects = (body, atLine, re) =>
  assert.throws(
    () => render(body),
    (e) => e instanceof SiteError && e.file === FILE && e.line === atLine && re.test(e.message),
    `body ${JSON.stringify(body)} should fail at line ${atLine} with ${re}`,
  );

test('headings ### and #### become h3 and h4', () => {
  assert.equal(render('### One\n\n#### Two'), '<h3>One</h3>\n<h4>Two</h4>');
});

test('consecutive lines join into one paragraph, blank lines split paragraphs', () => {
  assert.equal(render('first line\nsecond line\n\nthird'), '<p>first line second line</p>\n<p>third</p>');
});

test('flat ordered lists render as ol', () => {
  assert.equal(render('1. one\n2. two & three'), '<ol>\n<li>one</li>\n<li>two &amp; three</li>\n</ol>');
});

test('a list ends at a blank line and a following paragraph is separate', () => {
  assert.equal(render('1. one\n\nafter'), '<ol>\n<li>one</li>\n</ol>\n<p>after</p>');
});

test('fenced code keeps indentation, escapes HTML and carries the language', () => {
  const out = render('```html\n<div>\n    a & b\n</div>\n```');
  assert.equal(out, '<pre><code class="language-html">&lt;div&gt;\n    a &amp; b\n&lt;/div&gt;</code></pre>');
  assert.equal(render('```\nplain\n```'), '<pre><code>plain</code></pre>');
});

test('inline code, bold, emphasis, and links render', () => {
  assert.equal(
    render('Use `a < b`, **bold**, *em* and [docs](https://example.com/a?x=1&y=2) or [local](other.html).'),
    '<p>Use <code>a &lt; b</code>, <strong>bold</strong>, <em>em</em> and <a href="https://example.com/a?x=1&amp;y=2">docs</a> or <a href="other.html">local</a>.</p>',
  );
});

test('[[Page]] links to the page slug', () => {
  assert.equal(render('See [[Install]] first.'), '<p>See <a href="install.html">Install</a> first.</p>');
});

test('text is HTML-escaped and non-ASCII survives', () => {
  assert.equal(render('Ñandú & "café" > ok'), '<p>Ñandú &amp; &quot;café&quot; &gt; ok</p>');
});

test('output is deterministic', () => {
  const body = '### A\n\n1. x\n\n```js\nlet a;\n```\n\nSee [[Install]].';
  assert.equal(render(body), render(body));
});

test('a [[Nope]] link to an unknown Page fails with file:line', () => {
  rejects('ok\n\nSee [[Nope]]', 12, /Nope/);
});

test('# and ## headings are rejected, deeper-than-#### too', () => {
  rejects('# Title', 10, /heading/i);
  rejects('text\n\n## Title', 12, /heading/i);
  rejects('##### Deep', 10, /heading/i);
});

test('tables, blockquotes, images, and raw HTML are rejected', () => {
  rejects('a\n| x | y |', 11, /table/i);
  rejects('> quote', 10, /blockquote/i);
  rejects('see ![alt](a.png)', 10, /image/i);
  rejects('<script>alert(1)</script>', 10, /html/i);
  rejects('ok\n\nsome <b>bold</b> text', 12, /html/i);
});

test('HTML and images inside inline code and fences are plain text', () => {
  assert.equal(render('Write `<b>` and `![x]`.'), '<p>Write <code>&lt;b&gt;</code> and <code>![x]</code>.</p>');
  assert.equal(render('```\n<b>\n```'), '<pre><code>&lt;b&gt;</code></pre>');
});

test('nested or indented list items and indented prose are rejected', () => {
  rejects('1. one\n   1. nested', 11, /indent|nested/i);
  rejects('1. one\n  - nested', 11, /indent|nested|list/i);
  rejects('text\n\n    indented', 12, /indent/i);
});

test('"- " and "* " lines are rejected, also inside fences', () => {
  rejects('- item', 10, /unordered|list/i);
  rejects('ok\n\n* item', 12, /unordered|list/i);
  rejects('```text\n- item\n```', 11, /unordered|list|nn-core/i);
  rejects('```text\nx\n* item\n```', 12, /unordered|list|nn-core/i);
});

test('key:: lines are rejected, also inside fences', () => {
  rejects('ok\n\nowner:: me', 12, /key::/);
  rejects('```text\nnote:: x\n```', 11, /key::/);
});

test('an unterminated fence is rejected at its opening line', () => {
  rejects('ok\n\n```js\ncode', 12, /unterminated/i);
});

test('javascript: and other non-https schemes are rejected, naming the scheme', () => {
  rejects('[x](javascript:alert(1))', 10, /javascript/);
  rejects('[x](data:text/html,hi)', 10, /data/);
  rejects('[x](http://example.com)', 10, /http/);
  rejects('[x](//evil.example.com)', 10, /protocol-relative|scheme/i);
});

test('every seed Page body renders within the subset', async () => {
  const { loadSite } = await import('./lib/site-model.mjs');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const model = loadSite(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'site_NN'));
  const byName = new Map(model.pages.map((p) => [p.name, p]));
  const withBody = model.pages.filter((p) => p.body);
  assert.ok(withBody.length >= 5);
  for (const p of withBody) {
    const out = renderBody(p.body, { file: p.file, line: p.bodyLine, pagesByName: byName });
    assert.ok(out.length > 0, p.slug);
    assert.ok(!/<(script|img|table)/.test(out), p.slug);
  }
});
