/**
 * scripts/release/run-release.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runRelease } = require('./run-release.js');

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

test('runRelease happy path: publishes content commit C, mirror tag, and manifest commit M', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'run-release-test-'));
  t.after(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  });

  const monorepo = path.join(tmp, 'monorepo');
  const webBare = path.join(tmp, 'web.git');
  const webSeed = path.join(tmp, 'web-seed');
  fs.mkdirSync(monorepo);
  fs.mkdirSync(webBare);
  fs.mkdirSync(webSeed);

  // 1. Initialize web bare repo with initial commit and previous manifest
  createGitRepo(webBare, true);
  const webGit = createGitRepo(webSeed);
  fs.mkdirSync(path.join(webSeed, 'docs', 'use'), { recursive: true });
  const initialManifest = `---
title: "cogNNitive — Bootstrap manifest"
channel: "stable"
agent-bootstrap:
  version: "1.0.0"
  entrypoint: "nn-router"
  skills:
    - name: nn-router
      repo: cogNNitive/cogNNitive-web
      path: skills/nn-router
      version: "2.9.0"
      ref: "skills-v2.9.0"
      commit: "1111111111111111111111111111111111111111"
      description: Router
  blueprints: []
  workflows: []
---
# Manifest Body`;
  fs.writeFileSync(path.join(webSeed, 'docs', 'use', 'manifest.md'), initialManifest);
  webGit(['add', '.']);
  webGit(['commit', '-m', 'initial web state']);
  webGit(['remote', 'add', 'origin', webBare]);
  webGit(['push', '-u', 'origin', 'main']);

  // 2. Initialize monorepo with skill and annotated tag
  const monoGit = createGitRepo(monorepo);
  fs.mkdirSync(path.join(monorepo, 'skills', 'nn-router'), { recursive: true });
  fs.mkdirSync(path.join(monorepo, 'manifest'), { recursive: true });
  fs.writeFileSync(
    path.join(monorepo, 'skills', 'nn-router', 'SKILL.md'),
    '---\nname: nn-router\nversion: "2.10.0"\ndescription: Router v2.10.0\n---\n# Router'
  );
  fs.writeFileSync(
    path.join(monorepo, 'manifest', 'source.yaml'),
    `version: "1.0.0"
entrypoint: nn-router
skills:
  - name: nn-router
    repo: cogNNitive/cogNNitive-web
    path: skills/nn-router
    ref_key: skills
    description: Router
blueprints: []
workflows: []`
  );
  monoGit(['add', '.']);
  monoGit(['commit', '-m', 'feat: update router to 2.10.0']);
  monoGit(['tag', '-a', 'skills-v2.10.0', '-m', 'release skills-v2.10.0']);

  // 3. Run release
  const result = await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: monorepo,
    remoteUrl: webBare,
    validator: async () => true, // stubbed validator
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(result.tag, 'skills-v2.10.0');
  assert.equal(result.key, 'skills');
  assert.equal(result.version, '2.10.0');
  assert.ok(result.contentSha);

  // 4. Verify web repo now has the mirror tag and the updated manifest
  const checkClone = path.join(tmp, 'web-check');
  execFileSync('git', ['clone', webBare, checkClone], { stdio: 'ignore' });
  const checkGit = (args) => execFileSync('git', args, { cwd: checkClone, encoding: 'utf8' }).trim();
  const webTags = checkGit(['tag', '-l']);
  assert.ok(webTags.includes('skills-v2.10.0'), 'Mirror tag must exist in web repo');

  const publishedManifest = fs.readFileSync(path.join(checkClone, 'docs', 'use', 'manifest.md'), 'utf8');
  assert.ok(publishedManifest.includes('skills-v2.10.0'), 'Published manifest must reference new tag');
  assert.ok(fs.existsSync(path.join(checkClone, 'docs', 'use', 'manifests', 'skills-v2.10.0.md')), 'Snapshot must exist');
});

test('runRelease idempotent re-run on same tag creates no new commits', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'run-release-idempotent-'));
  t.after(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  });

  const monorepo = path.join(tmp, 'monorepo');
  const webBare = path.join(tmp, 'web.git');
  const webSeed = path.join(tmp, 'web-seed');
  fs.mkdirSync(monorepo);
  fs.mkdirSync(webBare);
  fs.mkdirSync(webSeed);

  createGitRepo(webBare, true);
  const webGit = createGitRepo(webSeed);
  fs.mkdirSync(path.join(webSeed, 'docs', 'use'), { recursive: true });
  fs.writeFileSync(path.join(webSeed, 'docs', 'use', 'manifest.md'), '---\nagent-bootstrap:\n  version: "1.0.0"\n  skills: []\n---\n# Base');
  webGit(['add', '.']);
  webGit(['commit', '-m', 'initial']);
  webGit(['remote', 'add', 'origin', webBare]);
  webGit(['push', '-u', 'origin', 'main']);

  const monoGit = createGitRepo(monorepo);
  fs.mkdirSync(path.join(monorepo, 'skills', 'nn-router'), { recursive: true });
  fs.mkdirSync(path.join(monorepo, 'manifest'), { recursive: true });
  fs.writeFileSync(path.join(monorepo, 'skills', 'nn-router', 'SKILL.md'), '---\nname: nn-router\nversion: "2.10.0"\n---\n# Skill');
  fs.writeFileSync(path.join(monorepo, 'manifest', 'source.yaml'), 'skills: [{ name: nn-router, repo: cogNNitive/cogNNitive-web, path: skills/nn-router, ref_key: skills }]');
  monoGit(['add', '.']);
  monoGit(['commit', '-m', 'feat']);
  monoGit(['tag', '-a', 'skills-v2.10.0', '-m', 'tag']);

  // First run
  await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: monorepo,
    remoteUrl: webBare,
    validator: async () => true,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  // Second run on same tag
  const secondResult = await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: monorepo,
    remoteUrl: webBare,
    validator: async () => true,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(secondResult.action, 'SKIP_CONTENT');
});

test('runRelease dry-run writes nothing to remote', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'run-release-dryrun-'));
  t.after(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  });

  const monorepo = path.join(tmp, 'monorepo');
  const webBare = path.join(tmp, 'web.git');
  const webSeed = path.join(tmp, 'web-seed');
  fs.mkdirSync(monorepo);
  fs.mkdirSync(webBare);
  fs.mkdirSync(webSeed);

  createGitRepo(webBare, true);
  const webGit = createGitRepo(webSeed);
  fs.mkdirSync(path.join(webSeed, 'docs', 'use'), { recursive: true });
  fs.writeFileSync(path.join(webSeed, 'docs', 'use', 'manifest.md'), '---\nagent-bootstrap:\n  skills: []\n---\n');
  webGit(['add', '.']);
  webGit(['commit', '-m', 'initial']);
  webGit(['remote', 'add', 'origin', webBare]);
  webGit(['push', '-u', 'origin', 'main']);

  const monoGit = createGitRepo(monorepo);
  fs.mkdirSync(path.join(monorepo, 'skills', 'nn-router'), { recursive: true });
  fs.mkdirSync(path.join(monorepo, 'manifest'), { recursive: true });
  fs.writeFileSync(path.join(monorepo, 'skills', 'nn-router', 'SKILL.md'), '---\nname: nn-router\nversion: "2.10.0"\n---\n');
  fs.writeFileSync(path.join(monorepo, 'manifest', 'source.yaml'), 'skills: [{ name: nn-router, repo: cogNNitive/cogNNitive-web, path: skills/nn-router, ref_key: skills }]');
  monoGit(['add', '.']);
  monoGit(['commit', '-m', 'feat']);
  monoGit(['tag', '-a', 'skills-v2.10.0', '-m', 'tag']);

  const dryResult = await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: monorepo,
    remoteUrl: webBare,
    dryRun: true,
    validator: async () => true,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(dryResult.dryRun, true);

  // Verify webBare has no tag
  const checkClone = path.join(tmp, 'web-check');
  execFileSync('git', ['clone', webBare, checkClone], { stdio: 'ignore' });
  const checkGit = (args) => execFileSync('git', args, { cwd: checkClone, encoding: 'utf8' }).trim();
  const tags = checkGit(['tag', '-l']);
  assert.equal(tags, '');
});
