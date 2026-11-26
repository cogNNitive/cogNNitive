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

async function testEmptyBuildLeavesMirrorUntouched() {
  // Run 45843892753: the docs build produced nothing and the publisher computed
  // "0 added, 0 modified, 405 removed". Only a rebase conflict stopped the deletion.
  const bareDir = mkTmpDir('bare-repo-');
  initBareRepo(bareDir);
  initInitialCommit(bareDir, {
    'docs/index.html': '<h1>Live Site</h1>',
    'docs/section/page.html': '<h1>Page</h1>',
    'docs/.nojekyll': '',
  });
  const before = execFileSync('git', ['-C', bareDir, 'rev-parse', 'main'], { encoding: 'utf8' }).trim();

  const repoRoot = mkTmpDir('source-repo-');
  // The build ran and produced an empty directory: the artifact exists, the site does not.
  fs.mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });

  const tmpRoot = mkTmpDir('tmp-root-');
  const silentLogger = { log: () => {} };

  await assert.rejects(
    async () => {
      await runPublish(
        {
          repoRoot,
          docsRoot: path.join(repoRoot, 'docs'),
          targetRepo: 'test/repo',
          token: 'fake_secret_token',
          skipDistribution: true,
        },
        { tmpRoot, remoteUrl: bareDir, logger: silentLogger }
      );
    },
    (err) => {
      assert.match(err.message, /has 0 files/, 'the refusal must name the empty artifact');
      assert.match(err.message, /Nothing was pushed/);
      return true;
    }
  );

  const after = execFileSync('git', ['-C', bareDir, 'rev-parse', 'main'], { encoding: 'utf8' }).trim();
  assert.strictEqual(after, before, 'the mirror must be byte-for-byte untouched');

  // And the files are still there, not merely the ref unchanged.
  const verifyClone = mkTmpDir('verify-clone-');
  try {
    execFileSync('git', ['clone', bareDir, verifyClone], { stdio: 'ignore' });
    assert.strictEqual(
      fs.readFileSync(path.join(verifyClone, 'docs', 'section', 'page.html'), 'utf8'),
      '<h1>Page</h1>'
    );
  } finally {
    fs.rmSync(verifyClone, { recursive: true, force: true });
    fs.rmSync(bareDir, { recursive: true, force: true });
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log('PASS: an empty build fails loudly and leaves the mirror untouched');
}

async function testLargeRemovalIsRefusedBeforePush() {
  // A partial artifact: the build emitted one page and lost the rest. Above the ceiling,
  // so it must refuse rather than publish a shrunken site.
  const bareDir = mkTmpDir('bare-repo-');
  initBareRepo(bareDir);
  const initial = { 'docs/.nojekyll': '' };
  for (let i = 0; i < 30; i++) initial[`docs/page-${i}.html`] = `<h1>${i}</h1>`;
  initInitialCommit(bareDir, initial);
  const before = execFileSync('git', ['-C', bareDir, 'rev-parse', 'main'], { encoding: 'utf8' }).trim();

  const repoRoot = mkTmpDir('source-repo-');
  fs.mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'docs', 'page-0.html'), '<h1>0</h1>', 'utf8');

  const tmpRoot = mkTmpDir('tmp-root-');
  const silentLogger = { log: () => {} };

  await assert.rejects(
    async () => {
      await runPublish(
        {
          repoRoot,
          docsRoot: path.join(repoRoot, 'docs'),
          targetRepo: 'test/repo',
          token: 'fake_secret_token',
          skipDistribution: true,
        },
        { tmpRoot, remoteUrl: bareDir, logger: silentLogger }
      );
    },
    (err) => {
      assert.match(err.message, /would delete 29 file/);
      return true;
    }
  );

  const after = execFileSync('git', ['-C', bareDir, 'rev-parse', 'main'], { encoding: 'utf8' }).trim();
  assert.strictEqual(after, before, 'the mirror must be untouched after a refused publish');

  fs.rmSync(bareDir, { recursive: true, force: true });
  fs.rmSync(repoRoot, { recursive: true, force: true });
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  console.log('PASS: a removal above the ceiling refuses before pushing');
}

async function testUpstreamRacePublishesNothingStale() {
  const bareDir = mkTmpDir('bare-repo-');
  initBareRepo(bareDir);
  initInitialCommit(bareDir, {
    'docs/index.html': '<h1>Site</h1>',
    'skills/raced/SKILL.md': 'v1',
  });

  // A second writer with its own clone of the same target repository, the way
  // release.yml publishes into cogNNitive-web under its own concurrency group.
  const rivalDir = mkTmpDir('rival-clone-');
  execFileSync('git', ['clone', bareDir, rivalDir], { stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Rival'], { cwd: rivalDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'rival@test.com'], { cwd: rivalDir, stdio: 'ignore' });

  const repoRoot = mkTmpDir('source-repo-');
  fs.mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'docs', 'index.html'), '<h1>Site</h1>', 'utf8');
  fs.mkdirSync(path.join(repoRoot, 'skills', 'raced'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'skills', 'raced', 'SKILL.md'), 'from-publish', 'utf8');

  const tmpRoot = mkTmpDir('tmp-root-');
  let rivalPushed = false;
  // The publish logs this once its tree is staged, which is the exact window in
  // which the two writers collide in production.
  const racingLogger = {
    log: (message) => {
      if (rivalPushed || typeof message !== 'string' || !message.includes('staged')) return;
      rivalPushed = true;
      fs.writeFileSync(path.join(rivalDir, 'skills', 'raced', 'SKILL.md'), 'from-release', 'utf8');
      execFileSync('git', ['commit', '-am', 'chore: rival publish'], { cwd: rivalDir, stdio: 'ignore' });
      execFileSync('git', ['push', 'origin', 'main'], { cwd: rivalDir, stdio: 'ignore' });
    },
  };

  try {
    await assert.rejects(
      async () => {
        await runPublish(
          {
            repoRoot,
            docsRoot: path.join(repoRoot, 'docs'),
            targetRepo: 'test/repo',
            token: 'fake_secret_token',
            distributionPaths: ['skills/raced'],
          },
          { tmpRoot, remoteUrl: bareDir, logger: racingLogger }
        );
      },
      (err) => {
        assert.ok(err instanceof PublishError, `expected PublishError, got ${err.name}: ${err.message}`);
        assert.ok(
          /nothing was published/i.test(err.message),
          `the failure must say nothing shipped, got: ${err.message}`
        );
        return true;
      }
    );
    assert.ok(rivalPushed, 'the rival push must have happened');

    // The newer content on the target must survive: a stale publish that rebases
    // its own bytes over it is worse than no publish at all.
    const verifyClone = mkTmpDir('verify-clone-');
    try {
      execFileSync('git', ['clone', bareDir, verifyClone], { stdio: 'ignore' });
      assert.strictEqual(
        fs.readFileSync(path.join(verifyClone, 'skills', 'raced', 'SKILL.md'), 'utf8'),
        'from-release'
      );
    } finally {
      fs.rmSync(verifyClone, { recursive: true, force: true });
    }

    console.log('PASS: an upstream race fails loudly and publishes nothing stale');
  } finally {
    fs.rmSync(bareDir, { recursive: true, force: true });
    fs.rmSync(rivalDir, { recursive: true, force: true });
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

async function runAll() {
  try {
    await testFullPublishAndPreserveNojekyll();
    await testIdenticalArtifactIsNoOp();
    await testGuardFailureCreatesNoTempDir();
    await testEmptyBuildLeavesMirrorUntouched();
    await testLargeRemovalIsRefusedBeforePush();
    await testUpstreamRacePublishesNothingStale();
    console.log('\nAll publish-web integration tests passed! ✨');
  } catch (err) {
    console.error(`\npublish-web tests FAILED: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

runAll();
