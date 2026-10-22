import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderSnapshot, run } from './import-code-facts.mjs';

const require = createRequire(import.meta.url);
const { findStaleSources } = require('../../skills/nn-sources/scripts/lib/impact-checker.js');

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const DIR = 'sources/import/code-facts';

const made = [];
const tmpDomain = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-facts-'));
  made.push(dir);
  return dir;
};
after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const T1 = () => new Date('2026-01-02T03:04:05Z');
const T2 = () => new Date('2026-01-03T03:04:05Z');
const T3 = () => new Date('2026-01-04T03:04:05Z');

const FACTS = {
  tools: [
    { name: 'b_tool', description: 'Does B.' },
    { name: 'a_tool', description: 'Does A.' },
  ],
  skills: [
    { name: 'nn-sources', description: 'Ingest documents.', requires: ['nn-innfo', 'nn-preflight'] },
    { name: 'nn', description: 'Front controller.', requires: [] },
  ],
};
const CHANGED = { ...FACTS, tools: [...FACTS.tools, { name: 'c_tool', description: 'Does C.' }] };

/** Relative path -> sha256 for every file under `dir`. */
function hashes(dir) {
  const out = {};
  const walk = (rel) => {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r);
      else out[r] = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, r))).digest('hex');
    }
  };
  walk('');
  return out;
}

// ---- renderSnapshot ---------------------------------------------------------------------

test('renderSnapshot has one "## name" heading per entry, sorted by name', () => {
  const text = renderSnapshot('mcp-tools', FACTS.tools);
  const headings = text.split('\n').filter((l) => l.startsWith('## '));
  assert.deepEqual(headings, ['## a_tool', '## b_tool']);
  assert.match(text, /## a_tool\n[\s\S]*Does A\./);
});

test('renderSnapshot is stable under input reordering', () => {
  const reversed = [...FACTS.tools].reverse();
  assert.equal(renderSnapshot('mcp-tools', FACTS.tools), renderSnapshot('mcp-tools', reversed));
  const skillsReversed = FACTS.skills.map((s) => ({ ...s, requires: [...s.requires].reverse() })).reverse();
  assert.equal(renderSnapshot('skill-commands', FACTS.skills), renderSnapshot('skill-commands', skillsReversed));
});

test('renderSnapshot output is LF only, ends with one newline and carries no timestamp or path', () => {
  const text = renderSnapshot('skill-commands', FACTS.skills);
  assert.ok(!text.includes('\r'));
  assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
  assert.ok(!/\b20\d\d-\d\d-\d\d|[A-Za-z]:[\\/]|\/Users\//.test(text));
  assert.match(text, /requires: nn-innfo, nn-preflight/);
});

test('renderSnapshot keeps a multi-line description from creating extra headings', () => {
  const text = renderSnapshot('mcp-tools', [{ name: 'x', description: 'Line one.\n## sneaky\nLine two.' }]);
  assert.deepEqual(text.split('\n').filter((l) => l.startsWith('#')), ['## x']);
});

test('renderSnapshot rejects an unknown group and an empty entry list', () => {
  assert.throws(() => renderSnapshot('nope', FACTS.tools), /group/);
  assert.throws(() => renderSnapshot('mcp-tools', []), /no entries/);
});

// ---- run --------------------------------------------------------------------------------

test('run writes one member and one sidecar per group, named from the injected clock', async () => {
  const dir = tmpDomain();
  const result = await run({ domainDir: dir, facts: FACTS, now: T1 });
  assert.deepEqual(Object.keys(hashes(dir)).sort(), [
    `${DIR}/mcp-tools_20260102T030405Z.md`,
    `${DIR}/mcp-tools_20260102T030405Z.md_sidecar_NN.md`,
    `${DIR}/skill-commands_20260102T030405Z.md`,
    `${DIR}/skill-commands_20260102T030405Z.md_sidecar_NN.md`,
  ]);
  assert.deepEqual(Object.values(result.groups).map((g) => g.status), ['written', 'written']);
  assert.equal(result.groups['mcp-tools'].path, `${DIR}/mcp-tools_20260102T030405Z.md`);
  const member = fs.readFileSync(path.join(dir, result.groups['mcp-tools'].path), 'utf8');
  assert.equal(member, renderSnapshot('mcp-tools', FACTS.tools));
  const sidecar = fs.readFileSync(path.join(dir, `${DIR}/mcp-tools_20260102T030405Z.md_sidecar_NN.md`), 'utf8');
  assert.match(sidecar, /sha256: /);
  assert.match(sidecar, /size_bytes: /);
});

test('re-import with unchanged facts creates no file and reports unchanged, with different clocks', async () => {
  const dir = tmpDomain();
  await run({ domainDir: dir, facts: FACTS, now: T1 });
  const before = hashes(dir);
  for (const now of [T1, T2]) {
    const again = await run({ domainDir: dir, facts: FACTS, now });
    assert.deepEqual(Object.values(again.groups).map((g) => g.status), ['unchanged', 'unchanged']);
  }
  assert.deepEqual(hashes(dir), before);
});

test('changed facts create member 2 and leave member 1 and its sidecar byte-identical', async () => {
  const dir = tmpDomain();
  await run({ domainDir: dir, facts: FACTS, now: T1 });
  const before = hashes(dir);
  const result = await run({ domainDir: dir, facts: CHANGED, now: T2 });
  assert.equal(result.groups['mcp-tools'].status, 'written');
  assert.equal(result.groups['skill-commands'].status, 'unchanged');
  const after2 = hashes(dir);
  for (const [file, hash] of Object.entries(before)) assert.equal(after2[file], hash, file);
  assert.deepEqual(Object.keys(after2).filter((f) => !(f in before)).sort(), [
    `${DIR}/mcp-tools_20260103T030405Z.md`,
    `${DIR}/mcp-tools_20260103T030405Z.md_sidecar_NN.md`,
  ]);
});

test('the older member is not stale after a changed import (no in-place refresh)', async () => {
  const dir = tmpDomain();
  await run({ domainDir: dir, facts: FACTS, now: T1 });
  await run({ domainDir: dir, facts: CHANGED, now: T2 });
  const members = Object.keys(hashes(dir)).filter((f) => !f.includes('_sidecar_'));
  assert.equal(members.length, 3);
  assert.deepEqual(findStaleSources(dir, members), []);
});

test('a same-second changed import gets a -n suffix instead of overwriting', async () => {
  const dir = tmpDomain();
  await run({ domainDir: dir, facts: FACTS, now: T1 });
  const result = await run({ domainDir: dir, facts: CHANGED, now: T1 });
  assert.equal(result.groups['mcp-tools'].status, 'written');
  assert.notEqual(result.groups['mcp-tools'].path, `${DIR}/mcp-tools_20260102T030405Z.md`);
  assert.match(result.groups['mcp-tools'].path, /mcp-tools_20260102T030405Z-\d+\.md$/);
});

test('every written path is under sources/import/code-facts/', async () => {
  const dir = tmpDomain();
  await run({ domainDir: dir, facts: FACTS, now: T1 });
  await run({ domainDir: dir, facts: CHANGED, now: T3 });
  const files = Object.keys(hashes(dir));
  assert.ok(files.length >= 6);
  for (const f of files) assert.ok(f.startsWith(`${DIR}/`), f);
});

test('same facts in two different directories give byte-identical snapshots', async () => {
  const a = tmpDomain();
  const b = tmpDomain();
  const ra = await run({ domainDir: a, facts: FACTS, now: T1 });
  const rb = await run({ domainDir: b, facts: FACTS, now: T2 });
  assert.equal(
    fs.readFileSync(path.join(a, ra.groups['skill-commands'].path), 'utf8'),
    fs.readFileSync(path.join(b, rb.groups['skill-commands'].path), 'utf8'),
  );
});

test('run fails closed on malformed facts and writes nothing', async () => {
  const dir = tmpDomain();
  await assert.rejects(run({ domainDir: dir, facts: { tools: FACTS.tools }, now: T1 }), /skills/);
  await assert.rejects(run({ domainDir: dir, facts: { tools: [{ name: '', description: 'x' }], skills: FACTS.skills }, now: T1 }), /name/);
  assert.deepEqual(hashes(dir), {});
});

test('the import script does not touch the shared extractors or use importRaw', () => {
  const src = fs.readFileSync(path.join(REPO, 'scripts/site/import-code-facts.mjs'), 'utf8');
  assert.doesNotMatch(src, /importRaw/);
  assert.match(src, /writeOnce/);
  assert.match(src, /cognitivize/);
});
