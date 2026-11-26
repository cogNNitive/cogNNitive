#!/usr/bin/env node
/**
 * scripts/release/channel-drift.test.js
 *
 * A merged fix sat unused while the install kept running old code, because merging to `main`
 * publishes nothing and nothing compared the published manifest with `main`. These tests pin
 * the check that does: a fixture where main moves ahead of the pinned commit fails, naming
 * the artifact and both commits, and a re-tagged pin fails too (the commit is the pin).
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { checkChannelDrift, isReleased, parseManifestEntries } = require('./channel-drift.js')

const PINNED = 'a'.repeat(40)
const MAIN = 'b'.repeat(40)

const manifest = (ref, commit = PINNED) => `---
channel: "stable"
agent-bootstrap:
  version: "2.0"
  entrypoint: "domaiNN_NN.md"
  skills:
    - name: nn-conntent
      repo: cogNNitive/cogNNitive-web
      path: skills/nn-conntent
      version: "V_0-1-0"
      ref: "${ref}"
      commit: "${commit}"
  blueprints:
    - name: coNNtent
      repo: cogNNitive/cogNNitive-web
      path: iNNfo/specs/bluepriNNts/coNNtent
      version: "V_0-100-1"
      ref: "blueprints-v0.100.1"
      commit: "${PINNED}"
`

const git = (map) => (args) => {
  const key = args.join(' ')
  if (Object.hasOwn(map, key)) {
    const value = map[key]
    if (value instanceof Error) throw value
    return value
  }
  // Any tag not named in the fixture still resolves to the recorded pin, so a test that is
  // about drift is not also about tags.
  return args[0] === 'rev-parse' ? `${PINNED}\n` : '0\n'
}

test('an artifact whose main moved ahead of the pin fails, naming artifact and both commits', () => {
  const runGit = git({
    [`rev-list --count ${PINNED}..${MAIN} -- skills/nn-conntent`]: '3\n',
    'rev-parse skills-v4.10.0^{commit}': `${PINNED}\n`,
  })
  const { problems } = checkChannelDrift({
    manifestText: manifest('skills-v4.10.0'),
    mainSha: MAIN,
    runGit,
  })
  const drift = problems.find((p) => p.artifact === 'nn-conntent')
  assert.ok(drift, `expected a problem for nn-conntent, got ${JSON.stringify(problems)}`)
  assert.equal(drift.kind, 'ahead')
  assert.match(drift.message, new RegExp(`${PINNED}`))
  assert.match(drift.message, new RegExp(`${MAIN}`))
  assert.match(drift.message, /3 commit\(s\) ahead/)
})

test('a current pin raises nothing', () => {
  const runGit = git({
    [`rev-list --count ${PINNED}..${MAIN} -- skills/nn-conntent`]: '0\n',
    'rev-parse skills-v4.10.0^{commit}': `${PINNED}\n`,
  })
  const { problems, released } = checkChannelDrift({
    manifestText: manifest('skills-v4.10.0'),
    mainSha: MAIN,
    runGit,
  })
  assert.equal(released, 2)
  assert.deepEqual(problems, [])
})

test('a re-tagged ref fails even when main is at the pin: the commit is what installs resolve', () => {
  const moved = 'c'.repeat(40)
  const runGit = git({
    [`rev-list --count ${PINNED}..${PINNED} -- skills/nn-conntent`]: '0\n',
    'rev-parse skills-v4.10.0^{commit}': `${moved}\n`,
  })
  const { problems } = checkChannelDrift({
    manifestText: manifest('skills-v4.10.0'),
    mainSha: PINNED,
    runGit,
  })
  const retag = problems.find((p) => p.kind === 'retagged')
  assert.ok(retag, `expected a retagged problem, got ${JSON.stringify(problems)}`)
  assert.match(retag.message, /the pin moved/)
})

test('a released entry with no immutable commit is reported, not skipped', () => {
  const runGit = git({})
  const { problems } = checkChannelDrift({
    manifestText: manifest('skills-v4.10.0', 'main'),
    mainSha: MAIN,
    runGit,
  })
  assert.ok(problems.some((p) => p.kind === 'unpinned' && p.artifact === 'nn-conntent'))
})

test('a preview entry pinned to main is not a released artifact', () => {
  const entries = parseManifestEntries(manifest('main'))
  assert.equal(entries.length, 2)
  assert.equal(isReleased(entries[0]), false)
  assert.equal(isReleased(entries[1]), true)
})
