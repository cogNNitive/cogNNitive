/**
 * nn-video-script/test/no-phantom-providers.test.mjs
 *
 * The phantom providers `elevenlabs` / `edge-tts` (an enum value and an API-key
 * check with no request path) are deleted from the engine. Until S3 folds the
 * last fallback literal, `scripts/lib/tts-options.mjs` is the only allowed
 * exception.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHANTOM = /elevenlabs|edge-tts|edge_tts/i;
const ALLOWED = new Set(['scripts/lib/tts-options.mjs', 'test/no-phantom-providers.test.mjs']);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(mjs|js|cjs|md|json|html)$/i.test(entry.name)) out.push(full);
  }
}

test('no phantom TTS provider survives in the skill (except the S3-owned fallback)', () => {
  const files = [];
  walk(SKILL_DIR, files);
  const offenders = [];
  for (const file of files) {
    const rel = path.relative(SKILL_DIR, file).split(path.sep).join('/');
    if (ALLOWED.has(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (PHANTOM.test(text)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `phantom provider references remain: ${offenders.join(', ')}`);
});
