// Fail-closed markdown subset renderer for Page bodies. Anything outside the
// subset throws a SiteError carrying file:line; nothing is passed through raw.
import { KEY_LINE, SiteError } from './site-model.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => s.replace(/[&<>"']/g, (c) => ESC[c]);
const BULLET = /^\s*[-*]\s/;
const INLINE = /`([^`]+)`|\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*(.+?)\*/g;

export function renderBody(body, { file, line, pagesByName }) {
  const lines = body.split('\n');
  const fail = (i, msg) => { throw new SiteError(file, line + i, msg); };

  const checkHref = (href, i) => {
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href);
    if (scheme && scheme[1].toLowerCase() !== 'https') fail(i, `link scheme "${scheme[1]}:" is not allowed (https or relative only)`);
    if (href.startsWith('//')) fail(i, 'protocol-relative link is not allowed');
  };

  const inline = (text, i) => {
    let out = '';
    let last = 0;
    for (const m of text.matchAll(INLINE)) {
      out += esc(text.slice(last, m.index));
      last = m.index + m[0].length;
      if (m[1] !== undefined) out += `<code>${esc(m[1])}</code>`;
      else if (m[2] !== undefined) {
        const target = pagesByName.get(m[2]);
        if (!target) fail(i, `unknown Page link [[${m[2]}]]`);
        out += `<a href="${target.slug}.html">${esc(m[2])}</a>`;
      } else if (m[3] !== undefined) {
        checkHref(m[4], i);
        out += `<a href="${esc(m[4])}">${esc(m[3])}</a>`;
      } else if (m[5] !== undefined) out += `<strong>${inline(m[5], i)}</strong>`;
      else out += `<em>${inline(m[6], i)}</em>`;
    }
    return out + esc(text.slice(last));
  };

  const checkInline = (text, i) => {
    const plain = text.replace(/`[^`]*`/g, '');
    if (plain.includes('![')) fail(i, 'images are not supported');
    if (/<[a-zA-Z/!]/.test(plain)) fail(i, 'raw HTML is not supported');
  };

  const html = [];
  let para = [];
  let items = [];
  let paraStart = 0;
  const flush = () => {
    if (para.length) html.push(`<p>${inline(para.join(' '), paraStart)}</p>`);
    if (items.length) html.push(`<ol>\n${items.map(([t, i]) => `<li>${inline(t, i)}</li>`).join('\n')}\n</ol>`);
    para = [];
    items = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (KEY_LINE.test(l)) fail(i, `key:: line is not allowed in a body: "${l.trim()}"`);
    if (l.startsWith('```')) {
      flush();
      const lang = /^```([\w+-]*)\s*$/.exec(l);
      if (!lang) fail(i, 'invalid code fence');
      const open = i;
      const code = [];
      for (i++; i < lines.length && !/^```\s*$/.test(lines[i]); i++) {
        if (KEY_LINE.test(lines[i])) fail(i, `key:: line is not allowed inside a fence: "${lines[i].trim()}"`);
        if (BULLET.test(lines[i])) fail(i, 'unordered list line "- "/"* " is not allowed, even inside a fence (nn-core rejects it)');
        code.push(lines[i]);
      }
      if (i >= lines.length) fail(open, 'unterminated code fence');
      html.push(`<pre><code${lang[1] ? ` class="language-${lang[1]}"` : ''}>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (l.trim() === '') { flush(); continue; }
    if (/^\s/.test(l)) fail(i, 'indented or nested content is not supported');
    if (/^#{1,2}(\s|$)|^#{5,}/.test(l)) fail(i, 'only ### and #### headings are supported');
    if (BULLET.test(l)) fail(i, 'unordered list line "- "/"* " is not supported, use "1. "');
    if (l.startsWith('|')) fail(i, 'tables are not supported');
    if (l.startsWith('>')) fail(i, 'blockquotes are not supported');
    checkInline(l, i);
    const heading = /^(#{3,4})\s+(.+)$/.exec(l);
    const item = /^\d+\.\s+(.+)$/.exec(l);
    if (heading) {
      flush();
      html.push(`<h${heading[1].length}>${inline(heading[2], i)}</h${heading[1].length}>`);
    } else if (item) {
      if (para.length) flush();
      items.push([item[1], i]);
    } else {
      if (items.length) flush();
      if (!para.length) paraStart = i;
      para.push(l);
    }
  }
  flush();
  return html.join('\n');
}
