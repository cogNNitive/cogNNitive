#!/usr/bin/env node

/**
 * scripts/verify-drift-guard.test.js
 *
 * Plain-node tests for the Docs-Derived Facts Drift Guard added to
 * scripts/verify.js as step 7e (`checkDocsFactsDriftAtRef` /
 * `checkHandTypedFactsAtRef`). Builds a disposable git repo fixture, runs the
 * real generate-docs-facts.mjs CLI in write mode to produce a genuinely clean
 * committed state (exactly the way build-docs.mjs does before verify.js ever
 * runs), then asserts the guard is compared against `git show HEAD:<path>` —
 * never the working tree (design D5) — for both generated-region drift and
 * reintroduced hand-typed facts (spec docs-derived-facts, "CI Drift Guard").
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { checkDocsFactsDriftAtRef } = require('./verify.js');

const SCRIPTS_DIR = __dirname;
const GENERATE_DOCS_FACTS = path.join(SCRIPTS_DIR, 'generate-docs-facts.mjs');

const OPEN_MCP = '<!-- generated:mcp-tools (source: nn-mcp TOOL_REGISTRY; run node scripts/generate-docs-facts.mjs) -->';
const CLOSE_MCP = '<!-- /generated:mcp-tools -->';

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

/**
 * Builds a disposable git repo fixture with a genuinely clean committed
 * generated state: the dist input plus the mcp-tools target doc, seeded via
 * the generator's own write mode (never hand-crafted region bodies, so this
 * fixture cannot silently drift from what the generator actually produces).
 * @returns {string} the fixture repo root
 */
function buildFixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-drift-guard-'));

  const distDir = path.join(root, 'iNNfo', 'packages', 'nn-mcp', 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, 'server.js'),
    "export const toolDefinitions = [{ name: 'a', description: 'A' }, { name: 'b', description: 'B' }];\n",
    'utf-8',
  );

  // The hand-typed-fact scan reads docs/innfo + docs/skills; keep the scanned
  // tree present with safe content so the fixture mirrors the real repo layout.
  const innfoDir = path.join(root, 'docs', 'innfo');
  fs.mkdirSync(innfoDir, { recursive: true });
  fs.writeFileSync(path.join(innfoDir, 'llms-full.txt'), 'No hand-typed tool counts here.\n', 'utf-8');

  // design D4: the mcp-tools region is rendered into the nn-innfo skill's own
  // SKILL.md, so the skill ships an accurate tool inventory. The fixture must
  // pre-create that target with its region markers, as the real skill has.
  const nnInnfoSkillDir = path.join(root, 'skills', 'nn-innfo');
  fs.mkdirSync(nnInnfoSkillDir, { recursive: true });
  fs.writeFileSync(
    path.join(nnInnfoSkillDir, 'SKILL.md'),
    ['---', 'name: nn-innfo', '---', '# nn-innfo', '', '## Tools', '', OPEN_MCP, 'placeholder', CLOSE_MCP, ''].join('\n'),
    'utf-8',
  );

  // Write mode: produce a genuinely-correct generated state, the same way
  // build-docs.mjs does before verify.js ever runs (design D5).
  execFileSync(process.execPath, [GENERATE_DOCS_FACTS], { cwd: root, encoding: 'utf-8' });

  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'fixture@example.com']);
  git(root, ['config', 'user.name', 'Fixture']);
  git(root, ['config', 'core.autocrlf', 'false']);
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'clean fixture state']);

  return root;
}

function commitChange(root, message) {
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', message]);
}

/**
 * The guard's own script paths and the target repo being scanned are
 * deliberately independent (see verify.js's `scriptsDir` doc comment): this
 * fixture never duplicates generate-docs-facts.mjs / lib/docs-facts.mjs, it
 * just points the guard at the real, unmodified ones while checking the
 * disposable fixture repo.
 */
function checkFixture(root, ref) {
  return checkDocsFactsDriftAtRef(root, ref, { scriptsDir: SCRIPTS_DIR });
}

function main() {
  console.log('Running verify drift-guard tests...');

  // 1. Clean committed state passes both region checks and the hand-typed scan.
  {
    const root = buildFixtureRepo();
    try {
      const result = checkFixture(root, 'HEAD');
      assert.strictEqual(result.ok, true, `clean fixture must pass: ${JSON.stringify(result.failures)}`);
      console.log('✔ Clean committed state passes the drift guard');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // 2. A stale generated region committed at HEAD fails, naming the generator.
  {
    const root = buildFixtureRepo();
    try {
      const skillPath = path.join(root, 'skills', 'nn-innfo', 'SKILL.md');
      const stale = fs.readFileSync(skillPath, 'utf-8').replace('**2** tools', '**99** tools');
      fs.writeFileSync(skillPath, stale, 'utf-8');
      commitChange(root, 'introduce stale region');

      const result = checkFixture(root, 'HEAD');
      assert.strictEqual(result.ok, false, 'stale generated region at HEAD must fail the guard');
      assert.ok(
        result.failures.some((f) => f.includes('generate-docs-facts.mjs')),
        `failure must name the generator: ${JSON.stringify(result.failures)}`,
      );
      console.log('✔ Stale generated region committed at HEAD fails, naming the generator');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // 3. A reintroduced hand-typed literal committed at HEAD fails, naming the file/line.
  {
    const root = buildFixtureRepo();
    try {
      const llmsPath = path.join(root, 'docs', 'innfo', 'llms-full.txt');
      fs.writeFileSync(llmsPath, 'nn-mcp exposes seven semantic tools today.\n', 'utf-8');
      commitChange(root, 'reintroduce a hand-typed tool count');

      const result = checkFixture(root, 'HEAD');
      assert.strictEqual(result.ok, false, 'a reintroduced hand-typed literal at HEAD must fail the guard');
      assert.ok(
        result.failures.some((f) => f.includes('llms-full.txt') && f.includes('tool-count')),
        `failure must name the offending file and rule: ${JSON.stringify(result.failures)}`,
      );
      console.log('✔ Reintroduced hand-typed literal committed at HEAD fails, naming the file');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // 4. The guard is checked against HEAD, never the working tree (design D5):
  //    dirtying the tree without committing must NOT trip either check.
  {
    const root = buildFixtureRepo();
    try {
      const skillPath = path.join(root, 'skills', 'nn-innfo', 'SKILL.md');
      fs.writeFileSync(skillPath, fs.readFileSync(skillPath, 'utf-8').replace('**2** tools', '**99** tools'), 'utf-8');
      const llmsPath = path.join(root, 'docs', 'innfo', 'llms-full.txt');
      fs.writeFileSync(llmsPath, 'nn-mcp exposes seven semantic tools today.\n', 'utf-8');
      // Deliberately no commit: both changes are uncommitted working-tree dirt.

      const result = checkFixture(root, 'HEAD');
      assert.strictEqual(
        result.ok,
        true,
        `uncommitted working-tree changes must never affect a HEAD-scoped check: ${JSON.stringify(result.failures)}`,
      );
      console.log('✔ Uncommitted working-tree drift is ignored — the guard only ever reads HEAD');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  console.log('\nAll verify drift-guard tests passed successfully!');
}

main();
