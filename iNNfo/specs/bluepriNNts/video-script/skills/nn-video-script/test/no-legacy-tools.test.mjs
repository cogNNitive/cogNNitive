/**
 * nn-video-script/test/no-legacy-tools.test.mjs
 *
 * File-absence guard for tools removed by the legacy-stack cleanup. The clip
 * assembler (`assemble-video.mjs`) is gone; nothing in the skill references it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(mjs|js|cjs|md|json|html)$/i.test(entry.name)) out.push(full);
  }
}

test('the clip assembler is gone and nothing references it', () => {
  assert.equal(fs.existsSync(path.join(SKILL_DIR, 'scripts', 'assemble-video.mjs')), false);
  assert.equal(fs.existsSync(path.join(SKILL_DIR, 'test', 'assemble-video.test.mjs')), false);

  const files = [];
  walk(SKILL_DIR, files);
  const offenders = files
    .filter((f) => path.basename(f) !== 'no-legacy-tools.test.mjs')
    .filter((f) => /assemble-video/i.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(SKILL_DIR, f).split(path.sep).join('/'));
  assert.deepEqual(offenders, [], `references to assemble-video remain: ${offenders.join(', ')}`);
});
