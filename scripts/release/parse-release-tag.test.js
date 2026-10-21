/**
 * scripts/release/parse-release-tag.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseReleaseTag, TagValidationError } = require('./parse-release-tag.js');

test('parseReleaseTag accepts valid tags for each allowed key', () => {
  assert.deepEqual(parseReleaseTag('skills-v2.10.0'), {
    key: 'skills',
    version: '2.10.0',
    tag: 'skills-v2.10.0',
  });
  assert.deepEqual(parseReleaseTag('blueprints-v0.20.0'), {
    key: 'blueprints',
    version: '0.20.0',
    tag: 'blueprints-v0.20.0',
  });
  assert.deepEqual(parseReleaseTag('nn-mcp-v0.12.0'), {
    key: 'nn-mcp',
    version: '0.12.0',
    tag: 'nn-mcp-v0.12.0',
  });
  assert.deepEqual(parseReleaseTag('nn-console-v0.3.0'), {
    key: 'nn-console',
    version: '0.3.0',
    tag: 'nn-console-v0.3.0',
  });
});

test('parseReleaseTag rejects unknown key', () => {
  assert.throws(
    () => parseReleaseTag('tools-v1.0.0'),
    (err) => err instanceof TagValidationError && /unknown release key/i.test(err.message)
  );
});

test('parseReleaseTag rejects malformed versions', () => {
  const invalid = ['skills-v2.10', 'skills-2.10.0', 'skills-v2.10.0-rc.1', 'skills-v', 'v1.0.0'];
  for (const tag of invalid) {
    assert.throws(
      () => parseReleaseTag(tag),
      (err) => err instanceof TagValidationError,
      `Expected ${tag} to be rejected`
    );
  }
});

test('parseReleaseTag validates annotated tag and ancestor-of-main git state', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-tag-test-'));
  t.after(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {}
  });

  const git = (args) =>
    execFileSync('git', args, {
      cwd: tmp,
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

  git(['init', '-b', 'main']);
  git(['config', 'user.name', 'Test']);
  git(['config', 'user.email', 'test@example.com']);

  fs.writeFileSync(path.join(tmp, 'file.txt'), 'initial\n');
  git(['add', 'file.txt']);
  git(['commit', '-m', 'initial commit']);

  // Create annotated tag on main
  git(['tag', '-a', 'skills-v2.10.0', '-m', 'release skills-v2.10.0']);

  // Valid annotated tag on main passes git checks
  const res = parseReleaseTag('skills-v2.10.0', { repoRoot: tmp, mainBranch: 'main' });
  assert.equal(res.key, 'skills');
  assert.equal(res.version, '2.10.0');

  // Lightweight tag is rejected
  git(['tag', 'blueprints-v0.20.0']);
  assert.throws(
    () => parseReleaseTag('blueprints-v0.20.0', { repoRoot: tmp, mainBranch: 'main' }),
    (err) => err instanceof TagValidationError && /annotated/i.test(err.message)
  );

  // Tag not on main is rejected
  git(['checkout', '-b', 'feature-branch']);
  fs.writeFileSync(path.join(tmp, 'feature.txt'), 'feature\n');
  git(['add', 'feature.txt']);
  git(['commit', '-m', 'feature commit']);
  git(['tag', '-a', 'nn-mcp-v0.12.0', '-m', 'release nn-mcp-v0.12.0']);

  // Return to main so feature-branch commit is not on main
  git(['checkout', 'main']);
  assert.throws(
    () => parseReleaseTag('nn-mcp-v0.12.0', { repoRoot: tmp, mainBranch: 'main' }),
    (err) => err instanceof TagValidationError && /ancestor|not reachable/i.test(err.message)
  );
});
