/**
 * scripts/release/publish-decision.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { decidePublish, PublishDecisionError } = require('./publish-decision.js');

test('decidePublish AD-3 Row 1: No tag, web main HEAD equals staged key paths -> Tag HEAD with no commit', () => {
  const result = decidePublish({
    tagExists: false,
    headTreeMatches: true,
    stagedManifestMatches: false,
  });

  assert.equal(result.action, 'TAG_HEAD');
  assert.equal(result.needCommit, false);
  assert.equal(result.needTag, true);
  assert.equal(result.needManifest, true);
});

test('decidePublish AD-3 Row 2: No tag, key paths differ -> Commit, push, then tag', () => {
  const result = decidePublish({
    tagExists: false,
    headTreeMatches: false,
    stagedManifestMatches: false,
  });

  assert.equal(result.action, 'COMMIT_AND_TAG');
  assert.equal(result.needCommit, true);
  assert.equal(result.needTag, true);
  assert.equal(result.needManifest, true);
});

test('decidePublish AD-3 Row 3: Tag exists, tree equals staged key paths -> Skip commit and tag', () => {
  const result = decidePublish({
    tagExists: true,
    tagTreeMatches: true,
    stagedManifestMatches: false,
  });

  assert.equal(result.action, 'SKIP_CONTENT');
  assert.equal(result.needCommit, false);
  assert.equal(result.needTag, false);
  assert.equal(result.needManifest, true);
});

test('decidePublish AD-3 Row 4: Tag exists, tree differs -> FAIL (divergent tag never moved)', () => {
  assert.throws(
    () =>
      decidePublish({
        tagExists: true,
        tagTreeMatches: false,
        stagedManifestMatches: false,
      }),
    (err) =>
      err instanceof PublishDecisionError &&
      /divergent|already exists.*differs|cannot be moved/i.test(err.message)
  );
});

test('decidePublish AD-3 Row 5: Versioned CDN file exists with different bytes -> FAIL', () => {
  assert.throws(
    () =>
      decidePublish({
        tagExists: false,
        versionedCdnConflict: true,
      }),
    (err) =>
      err instanceof PublishDecisionError &&
      /versioned CDN|different bytes|append-only/i.test(err.message)
  );
});

test('decidePublish AD-3 Row 6: Staged manifest is byte-equal to published one -> Skip M', () => {
  const result = decidePublish({
    tagExists: true,
    tagTreeMatches: true,
    stagedManifestMatches: true,
  });

  assert.equal(result.needCommit, false);
  assert.equal(result.needTag, false);
  assert.equal(result.needManifest, false);
});
