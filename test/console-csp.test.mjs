/**
 * test/console-csp.test.mjs
 *
 * The console shell must let a domain console show local media from `file://`: images
 * (pdf/thumbnail/base) and audio/video (animatic, delivery view). Capability
 * innfo-console-runtime; design D-C1; tasks 4a.1/4a.2.
 *
 * It also owns the hash half of that policy: the shell may authorize only the executable
 * inline scripts it actually ships, and `scripts/console-views.mjs` adds the hashes of the
 * bundle and views when it inlines them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHELL = path.join(ROOT, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'artifact_shell.html');

const cspOf = (html) => {
  const match = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html);
  return match ? match[1] : '';
};

/** Directives as a map of name → tokens. */
const directives = (csp) =>
  Object.fromEntries(
    csp
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...tokens] = part.split(/\s+/);
        return [name, tokens];
      }),
  );

test('the shell CSP allows file: images and local media', () => {
  const csp = directives(cspOf(fs.readFileSync(SHELL, 'utf8')));
  for (const token of ["'self'", 'file:', 'data:', 'blob:', 'https:']) {
    assert.ok(csp['img-src']?.includes(token), `img-src must allow ${token}`);
  }
  assert.ok(csp['media-src'], 'the shell must declare media-src');
  for (const token of ["'self'", 'file:', 'blob:']) {
    assert.ok(csp['media-src'].includes(token), `media-src must allow ${token}`);
  }
});

test('the shell keeps the default-src lockdown', () => {
  const csp = directives(cspOf(fs.readFileSync(SHELL, 'utf8')));
  assert.deepEqual(csp['default-src'], ["'none'"]);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  assert.deepEqual(csp['base-uri'], ["'none'"]);
});

/**
 * The sha256 a browser computes for every executable inline script: no `src`, and no
 * non-JavaScript `type`. JSON data islands and external scripts are not executed inline,
 * so they get no hash and must not have one.
 */
const executableInlineHashes = (html) => {
  const out = new Set();
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (m[2] === undefined) continue; // a comment
    if (/\ssrc\s*=/i.test(m[1])) continue;
    const type = /\stype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1]);
    const value = type ? (type[1] ?? type[2] ?? type[3]).trim().toLowerCase() : '';
    if (!['', 'text/javascript', 'application/javascript', 'module'].includes(value)) continue;
    const text = m[2].replace(/\r\n?/g, '\n').replace(/\0/g, '\uFFFD');
    out.add(createHash('sha256').update(text, 'utf8').digest('base64'));
  }
  return out;
};

/** The sha256 tokens of the directive that governs inline script elements. */
const scriptHashes = (csp) => {
  const map = directives(csp);
  const tokens = map['script-src-elem'] ?? map['script-src'] ?? [];
  return tokens.filter((token) => /^'sha256-[A-Za-z0-9+/=]+'$/.test(token)).map((token) => token.slice(8, -1));
};

test('the shell CSP authorizes exactly the inline scripts the shell ships', () => {
  const html = fs.readFileSync(SHELL, 'utf8');
  // Both directions: a token with no matching script authorizes nothing, and a script with
  // no token is blocked by the very policy that ships with it.
  assert.deepEqual(
    scriptHashes(cspOf(html)).sort(),
    [...executableInlineHashes(html)].sort(),
    'every sha256 token in the shell CSP must hash an executable inline script of the shell, and every executable inline script must have its token',
  );
});
