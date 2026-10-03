#!/usr/bin/env node

/**
 * scripts/lib/lineage-drift-guard.test.js
 *
 * Plain-node tests for the lineage drift guard. The seeded edit is applied to a
 * temporary copy of the committed fixture, so the repo stays untouched.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { checkLineageDriftGuard, FIXTURE_DOMAIN, GUARD_FIXTURE_ROOT } = require('./lineage-drift-guard.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_ABS = path.join(REPO_ROOT, FIXTURE_DOMAIN);

function copyFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lineage-drift-guard-'));
  fs.cpSync(FIXTURE_ABS, dir, { recursive: true });
  return dir;
}

function recordOf(dir) {
  return path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith('_cogNNitive_NN.md')));
}

function main() {
  console.log('Running lineage-drift-guard unit tests...');

  // 1. The committed fixture is in sync and the guard passes over it.
  {
    const r = checkLineageDriftGuard({ repoRoot: REPO_ROOT });
    assert.strictEqual(r.ok, true, r.errors.join('; '));
  }
  console.log('✔ the committed fixture domaiNN passes');

  // 2. A seeded edit of a managed section turns the guard red, naming the fixture and the section.
  {
    const dir = copyFixture();
    try {
      const file = recordOf(dir);
      const text = fs.readFileSync(file, 'utf8');
      assert.ok(text.includes('version:: V1'), 'setup: the record lists a version line');
      fs.writeFileSync(file, text.replace('version:: V1', 'version:: V7'));
      const r = checkLineageDriftGuard({ repoRoot: REPO_ROOT, domainDir: dir });
      assert.strictEqual(r.ok, false, 'a drifted record must fail');
      assert.ok(r.errors.some((e) => e.includes('# NN Sources') && e.includes('V7')), r.errors.join('; '));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  console.log('✔ a seeded managed-section edit fails, naming the section');

  // 3. A journal edit is not drift.
  {
    const dir = copyFixture();
    try {
      const file = recordOf(dir);
      fs.appendFileSync(file, '\n## NN Procedures: scan @ 2026-10-03T00:00:00Z\ncommand:: scan\n');
      assert.strictEqual(checkLineageDriftGuard({ repoRoot: REPO_ROOT, domainDir: dir }).ok, true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  console.log('✔ a journal edit passes');

  // 4. The guard never writes: the fixture bytes are identical after a run.
  {
    const file = recordOf(FIXTURE_ABS);
    const before = fs.readFileSync(file);
    checkLineageDriftGuard({ repoRoot: REPO_ROOT });
    assert.ok(before.equals(fs.readFileSync(file)), 'the record must not change');
  }
  console.log('✔ the guard is read-only');

  // 5. A fixture without a record is an error: the guard would prove nothing.
  {
    const dir = copyFixture();
    try {
      fs.rmSync(recordOf(dir));
      const r = checkLineageDriftGuard({ repoRoot: REPO_ROOT, domainDir: dir });
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some((e) => /no lineage record/i.test(e)), r.errors.join('; '));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  console.log('✔ a fixture with no record fails the guard');

  // 6. Scope: only a committed core-tests fixture, never shipped content.
  {
    assert.ok(FIXTURE_DOMAIN.startsWith(GUARD_FIXTURE_ROOT));
    assert.ok(GUARD_FIXTURE_ROOT.startsWith('iNNfo/packages/innfo-core/tests/fixtures/'));
    assert.ok(!/_samples_nn|specs\/bluepriNNts/.test(FIXTURE_DOMAIN));
    const r = checkLineageDriftGuard({ repoRoot: REPO_ROOT, domainDir: path.join(REPO_ROOT, 'iNNfo', 'specs') });
    assert.strictEqual(r.ok, false, 'a domaiNN outside the core-tests fixtures must be refused');
    assert.ok(r.errors.some((e) => /fixtures/.test(e)), r.errors.join('; '));
  }
  console.log('✔ the guard refuses anything outside the core-tests fixtures');

  // 7. The CLI exits 0 on the clean fixture.
  {
    const res = spawnSync(process.execPath, [path.join(__dirname, 'lineage-drift-guard.js')], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0, res.stderr + res.stdout);
  }
  console.log('✔ the CLI exits 0 over the committed fixture');

  console.log('All lineage-drift-guard unit tests passed successfully!\n');
}

main();
