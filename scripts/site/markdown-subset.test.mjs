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
  rejects('[x](//evil.example.com)', 10, /not allowed/);
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
    const stripped = out
      .replace(/<\/?(p|h3|h4|ol|li|pre|code|strong|em)( class="language-[\w+-]+")?>/g, '')
      .replace(/<a href="[^"<>]*">|<\/a>/g, '');
    assert.ok(out.includes('<p>') || out.includes('<h3>'), p.slug);
    assert.ok(!/[<>]/.test(stripped), `${p.slug}: unexpected markup left: ${stripped.match(/.{0,20}[<>].{0,20}/)}`);
  }
});

const ch = (code) => String.fromCharCode(code);
const CTRL = /control|invalid character/i;

test('C0/C1 control characters before the scheme cannot smuggle a javascript: link', () => {
  for (const code of [0x00, 0x01, 0x09, 0x7f, 0x85]) {
    rejects(`[x](${ch(code)}javascript:alert(1))`, 10, CTRL);
  }
});

test('backslash and absolute-path hrefs are rejected', () => {
  rejects(`[x](${ch(92)}${ch(92)}evil.com)`, 10, CTRL);
  rejects(`[x](/${ch(92)}evil.com)`, 10, CTRL);
  rejects('[x](/abs/path.html)', 10, /not allowed/);
  rejects('[x](//evil.com)', 10, /not allowed/);
});

test('hrefs are a positive allowlist: https, fragment, query, or a safe relative path', () => {
  assert.equal(
    render('[a](#top) [b](?q=1) [c](../x/y.html#z) [d](https://a.com/p?x=1&y=2)'),
    '<p><a href="#top">a</a> <a href="?q=1">b</a> <a href="../x/y.html#z">c</a> <a href="https://a.com/p?x=1&amp;y=2">d</a></p>',
  );
  rejects('[x](vbscript:x)', 10, /not allowed/);
  rejects('[x](java%0ascript:x)', 10, /not allowed/);
});

test('attribute breakout attempts are rejected or escaped', () => {
  rejects('[x](https://a.com/"onmouseover=alert(1))', 10, /not allowed/);
  assert.equal(render('[a"onmouseover=](https://a.com/)'), '<p><a href="https://a.com/">a&quot;onmouseover=</a></p>');
});

test('links outside the strict form fail closed', () => {
  rejects('[x](https://a.com "title")', 10, CTRL);
  rejects('[x](https://a.com/a_(b))', 10, /not allowed/);
  rejects('see [y](unfinished', 10, /malformed link/);
});

test('ordered lists must be numbered 1, 2, 3 in sequence', () => {
  rejects('1. a\n1. b', 11, /numbered 1, 2, 3/);
  rejects('2. a', 10, /numbered 1, 2, 3/);
  rejects('1. a\n2. b\n4. c', 12, /numbered 1, 2, 3/);
  assert.equal(render('1. a\n2. b\n\n1. c'), '<ol>\n<li>a</li>\n<li>b</li>\n</ol>\n<ol>\n<li>c</li>\n</ol>');
});

test('stray asterisks are not emphasis', () => {
  assert.equal(render('a * b * c and 2 * 3 * 4'), '<p>a * b * c and 2 * 3 * 4</p>');
  assert.equal(render('*em* and **strong**'), '<p><em>em</em> and <strong>strong</strong></p>');
});
