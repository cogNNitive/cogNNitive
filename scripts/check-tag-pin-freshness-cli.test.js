#!/usr/bin/env node

/**
 * scripts/check-tag-pin-freshness-cli.test.js
 *
 * Exit-code contract for the pre-push CLI wrapper
 * (scripts/check-tag-pin-freshness-cli.js): violation -> 1, clean -> 0,
 * unresolvable diff range -> 0 (skipped). Uses a disposable git repo
 * fixture, never the real checkout, so pass/fail cannot depend on ambient
 * git state.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

const CLI_PATH = path.join(__dirname, 'check-tag-pin-freshness-cli.js');

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-pin-freshness-cli-'));
  git('init', dir);
  git('config user.email "test@example.com"', dir);
  git('config user.name "Test"', dir);
  fs.writeFileSync(path.join(dir, 'README.md'), 'baseline\n', 'utf8');
  git('add README.md', dir);
  git('commit -m baseline', dir);
  git('tag base', dir);
  return dir;
}

function writeFile(dir, relPath, content) {
  const abs = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

function commitAll(dir, message) {
  git('add -A', dir);
  git(`commit -m "${message}"`, dir);
}

function runCli(args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: 'utf8' });
}

function main() {
  console.log('Running check-tag-pin-freshness-cli unit tests...');

  // 1. Usage error: missing --base/--head -> exit 2.
  {
    const res = runCli([]);
    assert.strictEqual(res.status, 2);
    assert.match(res.stderr, /Usage:/);
    console.log('✔ Missing arguments exits 2 with usage message');
  }

  // 2. Violation: skills/ changed without manifest re-pin -> exit 1.
  {
    const dir = makeRepo();
    try {
      writeFile(dir, 'skills/nn-example/SKILL.md', '---\nname: nn-example\n---\n');
      commitAll(dir, 'skills change without re-pin');
      const res = runCli(['--base', 'base', '--head', 'HEAD', '--repo-root', dir]);
      assert.strictEqual(res.status, 1);
      assert.match(res.stderr, /Tag\/pin freshness violation/);
      assert.match(res.stderr, /skills\//);
      console.log('✔ Violation exits 1 and prints the offending paths');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 3. Clean: skills/ changed AND manifest/source.yaml re-pinned -> exit 0.
  {
    const dir = makeRepo();
    try {
      writeFile(dir, 'skills/nn-example/SKILL.md', '---\nname: nn-example\n---\n');
      writeFile(dir, 'manifest/source.yaml', 'channels: {}\n');
      commitAll(dir, 'skills change with re-pin');
      const res = runCli(['--base', 'base', '--head', 'HEAD', '--repo-root', dir]);
      assert.strictEqual(res.status, 0);
      console.log('✔ Clean diff (re-pinned in the same commit) exits 0');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 4. Skipped: unresolvable diff range -> exit 0, notice on stderr, not a failure.
  {
    const dir = makeRepo();
    try {
      const res = runCli(['--base', 'origin/main', '--head', 'HEAD', '--repo-root', dir]);
      assert.strictEqual(res.status, 0);
      assert.match(res.stderr, /skipped/i);
      console.log('✔ Unresolvable diff range exits 0 (skipped), not a failure');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log('All check-tag-pin-freshness-cli unit tests passed successfully!');
}

main();
