'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  ACCEPTED_TYPES,
  parseConventionalSubject,
  subjectOf,
  NonConventionalCommitError,
  assertConventionalCommits,
} = require('./conventional-commit.js')

test('every accepted type parses, because a plan must not fail on a type it ships', () => {
  for (const type of ACCEPTED_TYPES) {
    const parsed = parseConventionalSubject(`${type}: do the thing`)
    assert.notStrictEqual(parsed, null, `${type}: should parse`)
    assert.strictEqual(parsed.type, type)
    assert.strictEqual(parsed.scope, null)
    assert.strictEqual(parsed.breaking, false)
    assert.strictEqual(parsed.description, 'do the thing')
  }
})

test('the scope and the breaking marker are read, in either combination', () => {
  assert.deepStrictEqual(parseConventionalSubject('feat(api): add an endpoint'), {
    type: 'feat',
    scope: 'api',
    breaking: false,
    description: 'add an endpoint',
  })
  assert.deepStrictEqual(parseConventionalSubject('feat!: drop v1'), {
    type: 'feat',
    scope: null,
    breaking: true,
    description: 'drop v1',
  })
  assert.deepStrictEqual(parseConventionalSubject('fix(api)!: drop v1'), {
    type: 'fix',
    scope: 'api',
    breaking: true,
    description: 'drop v1',
  })
})

test('a description may contain a colon, which is not a second type', () => {
  assert.deepStrictEqual(
    parseConventionalSubject('fix(console): read the row value: never a prompt'),
    {
      type: 'fix',
      scope: 'console',
      breaking: false,
      description: 'read the row value: never a prompt',
    },
  )
})

test('subjects that carry no bump are rejected', () => {
  const rejected = [
    'updated the skill', // no type at all
    'wip:foo: bar', // a session checkpoint shape, not `type: description`
    'Feat: capitalised type', // tooling reads a different type string
    'feat:missing the space', // `type(scope)?!?: ` needs the space
    'feat: ', // empty description
    'feat(): empty scope', // an empty scope is not a scope
    'feat(a b): spaced scope',
    'feat!(api): marker before the scope',
    'wip: a type nobody agreed to', // not in ACCEPTED_TYPES
    'Revert "feat: something"', // git revert writes this; it must be reworded to `revert: ...`
    '',
  ]
  for (const subject of rejected) {
    assert.strictEqual(
      parseConventionalSubject(subject),
      null,
      `${JSON.stringify(subject)} should be rejected`,
    )
  }
})

test('only the subject line is parsed, and the subject is the first line', () => {
  assert.strictEqual(subjectOf('fix(skills): a\n\nBREAKING CHANGE: b'), 'fix(skills): a')
  assert.strictEqual(subjectOf('one line only'), 'one line only')
  assert.strictEqual(subjectOf(''), '')
  assert.strictEqual(subjectOf(undefined), '')
})

test('a clean range passes the guard untouched', () => {
  assert.doesNotThrow(() =>
    assertConventionalCommits('skills', [
      { sha: 'a1', message: 'feat(skills): a' },
      { sha: 'a2', message: 'fix(skills): b\n\nBREAKING CHANGE: c' },
      { sha: 'a3', message: 'chore: d' },
    ]),
  )
})

test('the guard names the SHA, the subject and the accepted types, and lists every offender', () => {
  assert.throws(
    () =>
      assertConventionalCommits('skills', [
        { sha: 'aaaaaaa', message: 'one plain subject\n\nwith a body' },
        { sha: 'bbbbbbb', message: 'fix(skills): a good one' },
        { sha: 'ccccccc', message: 'another plain subject' },
      ]),
    (err) => {
      assert.strictEqual(err instanceof NonConventionalCommitError, true)
      assert.strictEqual(err.name, 'NonConventionalCommitError')
      assert.strictEqual(err.key, 'skills')
      assert.strictEqual(err.offenders.length, 2)
      assert.match(err.message, /aaaaaaa/)
      assert.match(err.message, /one plain subject/)
      assert.match(err.message, /ccccccc/)
      assert.match(err.message, /another plain subject/)
      assert.doesNotMatch(err.message, /bbbbbbb/)
      assert.match(err.message, /expected subject: type\(scope\)\?!/)
      for (const type of ACCEPTED_TYPES) assert.match(err.message, new RegExp(type))
      return true
    },
  )
})
