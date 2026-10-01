/**
 * scripts/release/restore-cdn-bundles.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { restoreCdnBundles } = require('./restore-cdn-bundles.js');

function createGitRepo(dir, isBare = false) {
  const git = (args) =>
    execFileSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
    }).trim();

  if (isBare) {
    execFileSync('git', ['init', '--bare', '-b', 'main', dir], { stdio: 'ignore' });
  } else {
    execFileSync('git', ['init', '-b', 'main', dir], { stdio: 'ignore' });
    git(['config', 'user.name', 'Test']);
    git(['config', 'user.email', 'test@example.com']);
  }
  return git;
}

test('restoreCdnBundles restores previously deleted versioned bundles from history', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-cdn-test-'));
  t.after(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  });

  const webBare = path.join(tmp, 'web.git');
  const webSeed = path.join(tmp, 'web-seed');
  fs.mkdirSync(webBare);
  fs.mkdirSync(webSeed);

  createGitRepo(webBare, true);
  const webGit = createGitRepo(webSeed);

  // 1. Commit a versioned bundle v0.10.0
  const bundlePath = path.join(webSeed, 'docs', 'innfo', 'cdn', 'innfo-mcp-v0.10.0.bundle.js');
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  fs.writeFileSync(bundlePath, 'console.log("bundle v0.10.0");');
  webGit(['add', '.']);
  webGit(['commit', '-m', 'publish v0.10.0 bundle']);

  // 2. Delete the bundle (simulating old prune behavior)
  fs.rmSync(bundlePath);
  webGit(['add', '-A']);
  webGit(['commit', '-m', 'prune site and accidentally delete v0.10.0 bundle']);
  webGit(['remote', 'add', 'origin', webBare]);
  webGit(['push', '-u', 'origin', 'main']);

  // 3. Run restoreCdnBundles
  const result = await restoreCdnBundles({
    remoteUrl: webBare,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(result.committed, true);
  assert.ok(result.restored.some((p) => p.includes('innfo-mcp-v0.10.0.bundle.js')));

  // 4. Verify web repo now has the restored bundle back on main
  const checkClone = path.join(tmp, 'web-check');
  execFileSync('git', ['clone', webBare, checkClone], { stdio: 'ignore' });
  const restoredFile = path.join(checkClone, 'docs', 'innfo', 'cdn', 'innfo-mcp-v0.10.0.bundle.js');
  assert.ok(fs.existsSync(restoredFile), 'Restored bundle must exist on web main');
  assert.equal(fs.readFileSync(restoredFile, 'utf8'), 'console.log("bundle v0.10.0");');
});
