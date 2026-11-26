#!/usr/bin/env node
/**
 * scripts/lib/publish-web-diff-guard.test.js
 *
 * The refusal that would have stopped run 45843892753 before it deleted 405 files.
 */

const assert = require('node:assert')
const {
  DEFAULT_MAX_REMOVALS,
  assertNotDestructive,
  destructiveRemovals,
  preservedOnReplace,
  resolveMaxRemovals,
} = require('./publish-web-diff-guard.js')
const { DEFAULT_PRESERVE } = require('./publish-web-tree.js')
const { PublishError } = require('./publish-web-git.js')
const { RELEASE_OWNED_GLOBS } = require('../release/release-keys.js')

/** A concrete path for a single-segment `*` glob, so the samples come from the globs. */
function sampleForGlob(glob, fill = '1') {
  return glob.replace(/\*/g, fill)
}

const diff = (removed = [], added = [], modified = []) => ({
  added,
  modified,
  removed,
  identical: added.length === 0 && modified.length === 0 && removed.length === 0,
})

function testEmptyArtifactIsRefused() {
  // 405 removals out of an artifact that produced nothing: the observed failure.
  const removed = Array.from({ length: 405 }, (_, i) => `page-${i}.html`)
  assert.throws(
    () => assertNotDestructive({ siteDiff: diff(removed), sourceFileCount: 0 }),
    (err) => {
      assert.ok(err instanceof PublishError, 'a refusal must be a PublishError')
      assert.match(err.message, /has 0 files/)
      assert.match(err.message, /405/)
      assert.match(err.message, /Nothing was pushed/)
      return true
    },
  )
  console.log('PASS: a zero-file artifact is refused, naming the removal count')
}

function testEmptyArtifactIsRefusedEvenWithNothingToDelete() {
  // The mirror holds only preserved files, so the diff shows no real deletion. The
  // artifact is still empty, which is never a publish.
  assert.throws(
    () => assertNotDestructive({ siteDiff: diff(['CNAME']), sourceFileCount: 0 }),
    /has 0 files/,
  )
  console.log('PASS: an empty artifact is refused even when the target is nearly empty')
}

function testLargeRemovalIsRefused() {
  const removed = Array.from({ length: DEFAULT_MAX_REMOVALS + 1 }, (_, i) => `page-${i}.html`)
  assert.throws(
    () => assertNotDestructive({ siteDiff: diff(removed), sourceFileCount: 1 }),
    (err) => {
      assert.match(err.message, new RegExp(`would delete ${DEFAULT_MAX_REMOVALS + 1} file`))
      assert.match(err.message, new RegExp(`limit ${DEFAULT_MAX_REMOVALS}`))
      assert.match(err.message, /First removals: page-0\.html/)
      assert.match(err.message, /WEB_PUBLISH_MAX_REMOVALS/)
      return true
    },
  )
  console.log('PASS: a removal above the ceiling is refused with the count and a sample')
}

function testCeilingIsInclusive() {
  const removed = Array.from({ length: DEFAULT_MAX_REMOVALS }, (_, i) => `page-${i}.html`)
  const allowed = assertNotDestructive({ siteDiff: diff(removed), sourceFileCount: 10 })
  assert.strictEqual(allowed, DEFAULT_MAX_REMOVALS)
  console.log('PASS: exactly the ceiling is allowed')
}

function testNormalPublishPasses() {
  // Two renamed pages: the shape of a real publish.
  assert.doesNotThrow(() =>
    assertNotDestructive({
      siteDiff: diff(
        ['documentation/old.html', 'documentation/older.html'],
        ['documentation/new.html'],
      ),
      sourceFileCount: 172,
    }),
  )
  console.log('PASS: ordinary churn passes')
}

function testPreservedPathsAreNotCounted() {
  // `replaceSiteTree` restores these, so they are in `removed` on every publish yet
  // never deleted. Counting them would make each post-release publish look destructive.
  //
  // Derived from the artifacts' own declarations rather than copied: a hand-written
  // sample drifts from the globs the tree code actually applies.
  const preserved = [...DEFAULT_PRESERVE, ...RELEASE_OWNED_GLOBS.map((glob) => sampleForGlob(glob))]
  for (const rel of preserved) {
    assert.strictEqual(preservedOnReplace(rel), true, `${rel} must be treated as preserved`)
  }
  assert.deepStrictEqual(destructiveRemovals(diff(preserved)), [])

  // A hundred release-owned files plus one real deletion is still one deletion.
  const many = [
    ...Array.from({ length: 100 }, (_, i) =>
      sampleForGlob(RELEASE_OWNED_GLOBS[i % RELEASE_OWNED_GLOBS.length], String(i)),
    ),
    'documentation/retired.html',
  ]
  assert.doesNotThrow(() => assertNotDestructive({ siteDiff: diff(many), sourceFileCount: 172 }))
  console.log('PASS: release-owned and public-owned paths never count as destructive')
}

function testOverrideRaisesTheCeiling() {
  const removed = Array.from({ length: 120 }, (_, i) => `page-${i}.html`)
  assert.throws(() => assertNotDestructive({ siteDiff: diff(removed), sourceFileCount: 5 }))
  assert.strictEqual(
    assertNotDestructive({ siteDiff: diff(removed), sourceFileCount: 5, maxRemovals: 120 }),
    120,
  )
  console.log('PASS: an explicit ceiling allows a deliberate large deletion')
}

function testInvalidCeilingFailsLoudly() {
  assert.throws(() => resolveMaxRemovals('many'), /must be a non-negative number/)
  assert.throws(() => resolveMaxRemovals(-1), /must be a non-negative number/)
  assert.strictEqual(resolveMaxRemovals(undefined), DEFAULT_MAX_REMOVALS)
  assert.strictEqual(resolveMaxRemovals(''), DEFAULT_MAX_REMOVALS)
  console.log('PASS: a malformed ceiling is refused instead of ignored')
}

function runAll() {
  try {
    testEmptyArtifactIsRefused()
    testEmptyArtifactIsRefusedEvenWithNothingToDelete()
    testLargeRemovalIsRefused()
    testCeilingIsInclusive()
    testNormalPublishPasses()
    testPreservedPathsAreNotCounted()
    testOverrideRaisesTheCeiling()
    testInvalidCeilingFailsLoudly()
    console.log('\nAll publish-web diff-guard tests passed!')
  } catch (err) {
    console.error(`\npublish-web diff-guard tests FAILED: ${err.message}`)
    console.error(err.stack)
    process.exit(1)
  }
}

runAll()
