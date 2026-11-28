/**
 * scripts/release/run-release.test.js
 */

const { test, before, after } = require('node:test');
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

const INITIAL_MANIFEST = `---
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

const SKILL_MD = '---\nname: nn-router\nversion: "2.10.0"\ndescription: Router v2.10.0\n---\n# Router';

const SOURCE_YAML = `version: "1.0.0"
entrypoint: nn-router
skills:
  - name: nn-router
    repo: cogNNitive/cogNNitive-web
    path: skills/nn-router
    ref_key: skills
    description: Router
blueprints: []
workflows: []`;

/**
 * The seed repos (web bare + web seed + monorepo with the tagged release) are built
 * ONCE here; each test clones the tree via `fs.cpSync` (design D3) instead of
 * re-running git init/commit/push for every test.
 */
let TEMPLATE = null;

before(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'run-release-tpl-'));
  const monorepo = path.join(tmp, 'monorepo');
  const webBare = path.join(tmp, 'web.git');
  const webSeed = path.join(tmp, 'web-seed');
  fs.mkdirSync(monorepo);
  fs.mkdirSync(webBare);
  fs.mkdirSync(webSeed);

  // Web bare repo with an initial manifest commit.
  createGitRepo(webBare, true);
  const webGit = createGitRepo(webSeed);
  fs.mkdirSync(path.join(webSeed, 'docs', 'use'), { recursive: true });
  fs.writeFileSync(path.join(webSeed, 'docs', 'use', 'manifest.md'), INITIAL_MANIFEST);
  webGit(['add', '.']);
  webGit(['commit', '-m', 'initial web state']);
  webGit(['remote', 'add', 'origin', webBare]);
  webGit(['push', '-u', 'origin', 'main']);

  // Monorepo with the skill and the annotated release tag.
  const monoGit = createGitRepo(monorepo);
  fs.mkdirSync(path.join(monorepo, 'skills', 'nn-router'), { recursive: true });
  fs.mkdirSync(path.join(monorepo, 'manifest'), { recursive: true });
  fs.writeFileSync(path.join(monorepo, 'skills', 'nn-router', 'SKILL.md'), SKILL_MD);
  fs.writeFileSync(path.join(monorepo, 'manifest', 'source.yaml'), SOURCE_YAML);
  fs.writeFileSync(path.join(monorepo, 'manifest', 'body.md'), '# Authored Body from manifest/body.md\n');
  monoGit(['add', '.']);
  monoGit(['commit', '-m', 'feat: update router to 2.10.0']);
  monoGit(['tag', '-a', 'skills-v2.10.0', '-m', 'release skills-v2.10.0']);

  TEMPLATE = { tmp, monorepo, webBare };
});

after(() => {
  if (TEMPLATE) {
    try { fs.rmSync(TEMPLATE.tmp, { recursive: true, force: true }); } catch {}
  }
});

/** Per-test clone of the pristine template. */
function cloneFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'run-release-test-'));
  fs.cpSync(TEMPLATE.tmp, tmp, { recursive: true });
  return { tmp, monorepo: path.join(tmp, 'monorepo'), webBare: path.join(tmp, 'web.git') };
}

test('runRelease happy path: publishes content commit C, mirror tag, and manifest commit M', async (t) => {
  const fx = cloneFixture();
  t.after(() => {
    try { fs.rmSync(fx.tmp, { recursive: true, force: true }); } catch {}
  });

  // Run release
  const result = await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: fx.monorepo,
    remoteUrl: fx.webBare,
    validator: async () => true, // stubbed validator
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(result.tag, 'skills-v2.10.0');
  assert.equal(result.key, 'skills');
  assert.equal(result.version, '2.10.0');
  assert.ok(result.contentSha);

  // Verify web repo now has the mirror tag and the updated manifest
  const checkClone = path.join(fx.tmp, 'web-check');
  execFileSync('git', ['clone', fx.webBare, checkClone], { stdio: 'ignore' });
  const checkGit = (args) => execFileSync('git', args, { cwd: checkClone, encoding: 'utf8' }).trim();
  const webTags = checkGit(['tag', '-l']);
  assert.ok(webTags.includes('skills-v2.10.0'), 'Mirror tag must exist in web repo');

  const publishedManifest = fs.readFileSync(path.join(checkClone, 'docs', 'use', 'manifest.md'), 'utf8');
  assert.ok(publishedManifest.includes('skills-v2.10.0'), 'Published manifest must reference new tag');
  assert.ok(publishedManifest.includes('# Authored Body from manifest/body.md'), 'Published manifest must include authored body from manifest/body.md');
  assert.ok(fs.existsSync(path.join(checkClone, 'docs', 'use', 'manifests', 'skills-v2.10.0.md')), 'Snapshot must exist');
});

test('runRelease idempotent re-run on same tag creates no new commits', async (t) => {
  const fx = cloneFixture();
  t.after(() => {
    try { fs.rmSync(fx.tmp, { recursive: true, force: true }); } catch {}
  });

  // First run
  await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: fx.monorepo,
    remoteUrl: fx.webBare,
    validator: async () => true,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  // Second run on same tag
  const secondResult = await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: fx.monorepo,
    remoteUrl: fx.webBare,
    validator: async () => true,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(secondResult.action, 'SKIP_CONTENT');
});

test('runRelease dry-run writes nothing to remote', async (t) => {
  const fx = cloneFixture();
  t.after(() => {
    try { fs.rmSync(fx.tmp, { recursive: true, force: true }); } catch {}
  });

  const dryResult = await runRelease({
    tag: 'skills-v2.10.0',
    repoRoot: fx.monorepo,
    remoteUrl: fx.webBare,
    dryRun: true,
    validator: async () => true,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(dryResult.dryRun, true);

  // Verify webBare has no tag
  const checkClone = path.join(fx.tmp, 'web-check');
  execFileSync('git', ['clone', fx.webBare, checkClone], { stdio: 'ignore' });
  const checkGit = (args) => execFileSync('git', args, { cwd: checkClone, encoding: 'utf8' }).trim();
  const tags = checkGit(['tag', '-l']);
  assert.equal(tags, '');
});

test('runRelease blueprint release stamps release_tag on catalog.json', async (t) => {
  const fx = cloneFixture();
  t.after(() => {
    try { fs.rmSync(fx.tmp, { recursive: true, force: true }); } catch {}
  });

  // Setup blueprint catalog in monorepo
  const catDir = path.join(fx.monorepo, 'iNNfo', 'specs', 'bluepriNNts');
  fs.mkdirSync(catDir, { recursive: true });
  fs.writeFileSync(
    path.join(catDir, 'catalog.json'),
    JSON.stringify({
      generator: 'test',
      blueprints: {
        procedures: { name: 'procedures', release_tag: 'blueprints-v0.40.0' },
      },
    }, null, 2) + '\n'
  );

  // A distributable unit beside the catalog: it carries the version the accumulator must record.
  const unitDir = path.join(catDir, 'procedures');
  fs.mkdirSync(unitDir, { recursive: true });
  fs.writeFileSync(path.join(unitDir, 'spec_NN.md'), '---\nlevel: 2\nblueprint_version: "V_0-6-1"\n---\n# procedures\n');
  fs.writeFileSync(
    path.join(unitDir, 'blueprint.json'),
    JSON.stringify({
      name: 'procedures',
      version: 'V_0-6-1',
      format_version: 'V_0-5-0',
      distribution_url: 'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures',
    }, null, 2) + '\n'
  );

  // Update source.yaml with blueprint
  fs.writeFileSync(
    path.join(fx.monorepo, 'manifest', 'source.yaml'),
    `version: "1.0.0"\nentrypoint: nn-router\nskills: []\nblueprints:\n  - name: procedures\n    repo: cogNNitive/cogNNitive-web\n    path: iNNfo/specs/bluepriNNts/procedures/spec_NN.md\n    ref_key: blueprints\nworkflows: []`
  );

  // Commit and tag blueprints-v0.50.0 in monorepo
  const monoGit = (args) => execFileSync('git', args, { cwd: fx.monorepo, encoding: 'utf8' }).trim();
  monoGit(['add', '.']);
  monoGit(['commit', '-m', 'feat(blueprints): release blueprints-v0.50.0']);
  monoGit(['tag', '-a', 'blueprints-v0.50.0', '-m', 'release blueprints-v0.50.0']);

  const result = await runRelease({
    tag: 'blueprints-v0.50.0',
    repoRoot: fx.monorepo,
    remoteUrl: fx.webBare,
    validator: async () => true,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
  });

  assert.equal(result.tag, 'blueprints-v0.50.0');

  // Verify web repo has stamped catalog.json
  const checkClone = path.join(fx.tmp, 'web-check-bp');
  execFileSync('git', ['clone', fx.webBare, checkClone], { stdio: 'ignore' });
  const publishedCat = JSON.parse(
    fs.readFileSync(path.join(checkClone, 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json'), 'utf8')
  );
  assert.equal(publishedCat.blueprints.procedures.release_tag, 'blueprints-v0.50.0');

  // The accumulator C3 needs: one entry, naming the tag and a commit whose tree carries
  // that version. `verifyCommit` reads `<commit>/…/blueprint.json`, so the entry must not
  // name the tag, and the file must survive in the mirror rather than be treated as debris.
  const versions = JSON.parse(
    fs.readFileSync(path.join(checkClone, 'iNNfo', 'specs', 'bluepriNNts', 'procedures', 'versions.json'), 'utf8')
  );
  assert.equal(versions.versions.length, 1);
  assert.equal(versions.versions[0].version, 'V_0-6-1');
  assert.equal(versions.versions[0].tag, 'blueprints-v0.50.0');
  assert.match(versions.versions[0].commit, /^[0-9a-f]{40}$/);

  // The named commit really carries that version, in this repository.
  const verifyGit = (args) => execFileSync('git', args, { cwd: checkClone, encoding: 'utf8' }).trim();
  const atCommit = verifyGit(['show', `${versions.versions[0].commit}:iNNfo/specs/bluepriNNts/procedures/blueprint.json`]);
  assert.equal(JSON.parse(atCommit).version, 'V_0-6-1');
});
