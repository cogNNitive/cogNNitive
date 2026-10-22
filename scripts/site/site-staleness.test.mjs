import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkStaleness, run } from './site-staleness.mjs';
import { run as importFacts } from './import-code-facts.mjs';

const require = createRequire(import.meta.url);
const { checkScanImpact } = require('../../skills/nn-sources/scripts/lib/impact-checker.js');

const SCRIPT = fileURLToPath(new URL('./site-staleness.mjs', import.meta.url));
const DIR = 'sources/import/code-facts';
const T1 = () => new Date('2026-01-02T03:04:05Z');
const T2 = () => new Date('2026-01-03T03:04:05Z');
const MEMBER1 = `${DIR}/mcp-tools_20260102T030405Z.md`;

const made = [];
after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const FM = '---\nlevel: 3\nparent_spec:\n  name: "site"\n  url: "specs/bluepriNNts/site/spec_NN.md"\nknowledge_version: "V_0-1-0"\ntitle: "T"\n---\n\n';
const pageDoc = (sources) =>
  `${FM}# NN Page\n\n## NN Page: Reference\nslug:: reference\nkind:: reference\norder:: 1\nsummary:: S.\nsources:: ${sources}\n\nBody.\n`;

const SKILLS = [{ name: 'nn', description: 'Front controller.', requires: [] }];
const toolsOf = (...names) => names.map((name) => ({ name, description: `Does ${name}.` }));

/** A temp domaiNN whose only Page cites `unit` in the first `mcp-tools` member. */
async function domain(unit = '## a_tool') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-stale-'));
  made.push(dir);
  fs.mkdirSync(path.join(dir, 'kNNowledge'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'kNNowledge', 'reference_site_NN.md'), pageDoc(`[${MEMBER1}@${unit}]`), 'utf8');
  await importFacts({ domainDir: dir, facts: { tools: toolsOf('a_tool', 'b_tool'), skills: SKILLS }, now: T1 });
  return dir;
}
const importTools = (dir, tools, now) => importFacts({ domainDir: dir, facts: { tools, skills: SKILLS }, now });

function capture() {
  const out = [];
  return { out, log: (m) => out.push(String(m)) };
}

// First: establish what the shared impact checker reports in this layout.
test('checkScanImpact reports superseded for a header-unit citation that still resolves', async () => {
  const dir = await domain('## a_tool');
  await importTools(dir, toolsOf('a_tool', 'b_tool', 'c_tool'), T2);
  const families = checkScanImpact(dir);
  const statuses = families.flatMap((f) => f.affectedModels.map((m) => m.status));
  assert.deepEqual(statuses, ['superseded']);
});

test('checkScanImpact reports unresolved_in_latest when the heading is gone', async () => {
  const dir = await domain('## a_tool');
  await importTools(dir, toolsOf('b_tool'), T2);
  const statuses = checkScanImpact(dir).flatMap((f) => f.affectedModels.map((m) => m.status));
  assert.deepEqual(statuses, ['unresolved_in_latest']);
});

// ---- checkStaleness ---------------------------------------------------------------------

test('current citations are clean: no findings, exit 0', async () => {
  const dir = await domain();
  assert.deepEqual(checkStaleness(dir), { superseded: [], unresolved: [], staleHashes: [] });
  const { out, log } = capture();
  assert.equal(run({ domainDir: dir, log }), 0);
  assert.match(out.join('\n'), /no stale/i);
});

test('superseded is flagged with page and citation but exits 0', async () => {
  const dir = await domain();
  await importTools(dir, toolsOf('a_tool', 'b_tool', 'c_tool'), T2);
  const found = checkStaleness(dir);
  assert.equal(found.unresolved.length, 0);
  assert.equal(found.superseded.length, 1);
  assert.equal(found.superseded[0].page, 'Reference');
  assert.equal(found.superseded[0].status, 'superseded');
  assert.ok(found.superseded[0].citation.includes('mcp-tools_20260102T030405Z.md'));
  assert.ok(found.superseded[0].file.endsWith('reference_site_NN.md'));
  const { out, log } = capture();
  assert.equal(run({ domainDir: dir, log }), 0);
  assert.match(out.join('\n'), /superseded/);
  assert.match(out.join('\n'), /Reference/);
});

test('unresolved_in_latest is flagged and exits 1', async () => {
  const dir = await domain();
  await importTools(dir, toolsOf('b_tool'), T2);
  const found = checkStaleness(dir);
  assert.equal(found.superseded.length, 0);
  assert.deepEqual(found.unresolved.map((f) => [f.page, f.status]), [['Reference', 'unresolved_in_latest']]);
  const { out, log } = capture();
  assert.equal(run({ domainDir: dir, log }), 1);
  assert.match(out.join('\n'), /unresolved_in_latest/);
});

test('--json prints valid JSON listing page, citation and status; exit code follows the findings', async () => {
  const dir = await domain();
  await importTools(dir, toolsOf('b_tool'), T2);
  const res = spawnSync(process.execPath, [SCRIPT, '--json', '--domain', dir], { encoding: 'utf8' });
  assert.equal(res.status, 1, res.stderr);
  const json = JSON.parse(res.stdout);
  assert.equal(json.unresolved[0].page, 'Reference');
  assert.equal(json.unresolved[0].status, 'unresolved_in_latest');
  assert.ok(json.unresolved[0].citation.includes('@## a_tool'));
  assert.deepEqual(json.superseded, []);
});

test('--json on a clean domaiNN is valid JSON and exits 0', async () => {
  const dir = await domain();
  const res = spawnSync(process.execPath, [SCRIPT, '--json', '--domain', dir], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(JSON.parse(res.stdout), { superseded: [], unresolved: [], staleHashes: [] });
});

test('a member edited in place is reported as a stale hash and exits 1', async () => {
  const dir = await domain();
  fs.appendFileSync(path.join(dir, MEMBER1), '## sneaky\nEdited.\n');
  const found = checkStaleness(dir);
  assert.deepEqual(found.staleHashes, [MEMBER1]);
  const { out, log } = capture();
  assert.equal(run({ domainDir: dir, log }), 1);
  assert.match(out.join('\n'), /mcp-tools_20260102T030405Z\.md/);
});

test('end to end: import changed facts creating member 2, then the citing Page is flagged', async () => {
  const dir = await domain();
  assert.equal(run({ domainDir: dir, log: () => {} }), 0);
  const second = await importTools(dir, toolsOf('a_tool', 'b_tool', 'd_tool'), T2);
  assert.equal(second.groups['mcp-tools'].status, 'written');
  assert.deepEqual(checkStaleness(dir).superseded.map((f) => f.page), ['Reference']);
});

test('a domaiNN with no sources is clean', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-stale-empty-'));
  made.push(dir);
  assert.deepEqual(checkStaleness(dir), { superseded: [], unresolved: [], staleHashes: [] });
});

// ---- gate: the committed domaiNN must not carry stale citations --------------------------

const REAL = fileURLToPath(new URL('../../site_NN/', import.meta.url));

test('the committed site_NN/ has no unresolved_in_latest citation and no stale hash (superseded allowed)', () => {
  const found = checkStaleness(REAL);
  assert.deepEqual(found.unresolved, []);
  assert.deepEqual(found.staleHashes, []);
});

test('the gate goes red on a copy of site_NN/ whose newest member no longer has the cited headings', async () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'site-gate-'));
  made.push(copy);
  fs.cpSync(REAL, copy, { recursive: true });
  await importFacts({ domainDir: copy, facts: { tools: [{ name: 'only_tool', description: 'x' }], skills: SKILLS }, now: () => new Date('2099-01-01T00:00:00Z') });
  const found = checkStaleness(copy);
  assert.ok(found.unresolved.length >= 1);
  assert.equal(run({ domainDir: copy, log: () => {} }), 1);
});
