#!/usr/bin/env node

/**
 * scripts/lib/git-visible.test.js
 *
 * Plain-node tests for the shared git-visible file selection.
 * Uses a disposable git repository fixture so the ignored/tracked distinction is
 * exercised against real git metadata, not a mock.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { collectGitVisible } = require('./git-visible.js');

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-visible-'));
  git('init', dir);
  fs.writeFileSync(path.join(dir, '.gitignore'), '*.log\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'tracked.txt'), 'tracked\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'ignored.log'), 'ignored\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'untracked.txt'), 'untracked\n', 'utf8');
  git('add tracked.txt .gitignore', dir);
  return dir;
}

function has(visible, dir, name) {
  return visible.has(path.resolve(dir, name).replace(/\\/g, '/'));
}

function main() {
  console.log('Running git-visible unit tests...');

  // 1. Tracked + nonignored untracked files are visible; gitignored is excluded.
  {
    const dir = makeRepo();
    try {
      const visible = collectGitVisible(dir);
      assert.ok(visible, 'expected a visible set inside a git checkout');
      assert.ok(has(visible, dir, 'tracked.txt'), 'tracked file must be visible');
      assert.ok(has(visible, dir, '.gitignore'), 'tracked .gitignore must be visible');
      assert.ok(has(visible, dir, 'untracked.txt'), 'nonignored untracked file must be visible');
      assert.ok(!has(visible, dir, 'ignored.log'), 'gitignored file must be excluded');
      console.log('✔ tracked + nonignored untracked included, ignored excluded');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 2. Git unavailable -> null, so callers keep their filesystem fallback.
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-visible-nogit-'));
    try {
      const visible = collectGitVisible(dir, {
        runGit: () => {
          throw new Error('git unavailable');
        },
      });
      assert.strictEqual(visible, null, 'missing git metadata must yield null');
      console.log('✔ no-git fallback returns null');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log('All git-visible unit tests passed successfully!');
}

main();
