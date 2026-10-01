#!/usr/bin/env node
/**
 * scripts/lib/publish-web.test.js
 *
 * End-to-end integration tests for the publish-web workflow using a local bare repo.
 */

const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runPublish } = require('./publish-web.js');
const { PublishError } = require('./publish-web-git.js');

function mkTmpDir(prefix = 'publish-e2e-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function initBareRepo(dir) {
  // --initial-branch=main makes the bare repo's default branch match the real
  // GitHub target (main), so `git clone --depth 1` fetches main instead of an
  // unborn `master` — otherwise the subsequent `push origin HEAD:main` is
  // rejected as non-fast-forward on hosts where init.defaultBranch is master.
  execFileSync('git', ['init', '--bare', '--initial-branch=main', dir], { stdio: 'ignore' });
}

function initInitialCommit(bareRepoUrl, initFiles = {}) {
  const tmp = mkTmpDir('git-init-');
  try {
    execFileSync('git', ['clone', bareRepoUrl, tmp], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Test Setup'], { cwd: tmp, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@setup.com'], { cwd: tmp, stdio: 'ignore' });
    execFileSync('git', ['checkout', '-b', 'main'], { cwd: tmp, stdio: 'ignore' });

    for (const [rel, content] of Object.entries(initFiles)) {
      const full = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    }

    execFileSync('git', ['add', '.'], { cwd: tmp, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: tmp, stdio: 'ignore' });
    execFileSync('git', ['push', 'origin', 'main'], { cwd: tmp, stdio: 'ignore' });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function testFullPublishAndPreserveNojekyll() {
  const bareDir = mkTmpDir('bare-repo-');
  initBareRepo(bareDir);
  initInitialCommit(bareDir, {
    'docs/index.html': '<h1>Initial Site</h1>',
    'docs/.nojekyll': '',
  });

  const repoRoot = mkTmpDir('source-repo-');
  fs.mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'docs', 'index.html'), '<h1>Updated Site</h1>', 'utf8');

  // Distribution file
  fs.mkdirSync(path.join(repoRoot, 'skills', 'test-skill'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'skills', 'test-skill', 'SKILL.md'), '# Test', 'utf8');

  const tmpRoot = mkTmpDir('tmp-root-');
  const silentLogger = { log: () => {} };

  const result = await runPublish(
    {
      repoRoot,
      docsRoot: path.join(repoRoot, 'docs'),
      targetRepo: 'test/repo',
      token: 'fake_secret_token',
      distributionPaths: ['skills/test-skill'],
    },
    {
      tmpRoot,
      remoteUrl: bareDir,
      logger: silentLogger,
    }
  );

  assert.strictEqual(result.published, true);

  // Verify what was pushed to the bare repo
  const verifyClone = mkTmpDir('verify-clone-');
  try {
    execFileSync('git', ['clone', bareDir, verifyClone], { stdio: 'ignore' });
    assert.strictEqual(
      fs.readFileSync(path.join(verifyClone, 'docs', 'index.html'), 'utf8'),
      '<h1>Updated Site</h1>'
    );
    assert.ok(fs.existsSync(path.join(verifyClone, 'docs', '.nojekyll')), '.nojekyll must be preserved in repo');
    assert.ok(fs.existsSync(path.join(verifyClone, 'skills', 'test-skill', 'SKILL.md')));
  } finally {
    fs.rmSync(verifyClone, { recursive: true, force: true });
    fs.rmSync(bareDir, { recursive: true, force: true });
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log('PASS: runPublish updates site, preserves .nojekyll, and pushes distribution paths');
}

async function testIdenticalArtifactIsNoOp() {
  const bareDir = mkTmpDir('bare-repo-');
  initBareRepo(bareDir);
  initInitialCommit(bareDir, {
    'docs/index.html': '<h1>Identical</h1>',
    'docs/.nojekyll': '',
  });

  const repoRoot = mkTmpDir('source-repo-');
  fs.mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'docs', 'index.html'), '<h1>Identical</h1>', 'utf8');

  const tmpRoot = mkTmpDir('tmp-root-');
  const silentLogger = { log: () => {} };

  const result = await runPublish(
    {
      repoRoot,
      docsRoot: path.join(repoRoot, 'docs'),
      targetRepo: 'test/repo',
      token: 'fake_secret_token',
      skipDistribution: true,
    },
    {
      tmpRoot,
      remoteUrl: bareDir,
      logger: silentLogger,
    }
  );

  assert.strictEqual(result.staged, false);
  assert.strictEqual(result.siteDiff.identical, true);

  fs.rmSync(bareDir, { recursive: true, force: true });
  fs.rmSync(repoRoot, { recursive: true, force: true });
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  console.log('PASS: identical artifact is a no-op with no commit created');
}

async function testGuardFailureCreatesNoTempDir() {
  const repoRoot = mkTmpDir('source-repo-');
  fs.mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'docs', 'index.html'), 'OK', 'utf8');
  fs.writeFileSync(path.join(repoRoot, 'docs', '.env'), 'LEAK=true', 'utf8');

  const tmpRoot = mkTmpDir('tmp-root-');
  const silentLogger = { log: () => {} };

  await assert.rejects(
    async () => {
      await runPublish(
        {
          repoRoot,
          docsRoot: path.join(repoRoot, 'docs'),
          targetRepo: 'test/repo',
          token: 'token123',
        },
        {
          tmpRoot,
          logger: silentLogger,
        }
      );
    },
    (err) => {
      assert.ok(err.message.includes('docs/.env'));
      return true;
    }
  );

  const filesInTmp = fs.readdirSync(tmpRoot);
  assert.strictEqual(filesInTmp.length, 0, 'tmpRoot must remain completely empty on guard failure');

  fs.rmSync(repoRoot, { recursive: true, force: true });
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  console.log('PASS: guard failure rejects before creating any temp directory');
}

async function runAll() {
  try {
    await testFullPublishAndPreserveNojekyll();
    await testIdenticalArtifactIsNoOp();
    await testGuardFailureCreatesNoTempDir();
    console.log('\nAll publish-web integration tests passed! ✨');
  } catch (err) {
    console.error(`\npublish-web tests FAILED: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

runAll();
