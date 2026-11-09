/**
 * test/console-csp.test.mjs
 *
 * The console shell must let a domain console show local media from `file://`: images
 * (pdf/thumbnail/base) and audio/video (animatic, delivery view). Capability
 * innfo-console-runtime; design D-C1; tasks 4a.1/4a.2.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
