'use strict'

/**
 * scripts/release/conventional-commit.js
 *
 * The subject grammar `plan-auto-tags.js` needs in order to derive a version.
 *
 * A tag is a public contract — consumers resolve `nn-mcp-v0.49.2` and the manifest advertises
 * it — so the bump has to come from something a machine can read: `type(scope)!: description`.
 * An unreadable subject used to fall through to `patch`, which published a version nobody chose
 * and said nothing about it in the log. This module is the guard: the plan refuses to run
 * instead of guessing.
 *
 * Only the subject line is parsed. `BREAKING CHANGE:` in the footer is read by `bumpFor` from
 * the full message, and merge commits reach neither (`git log --no-merges`): their
 * `Merge pull request #NNN from ...` subject carries no bump and no intent.
 */

/**
 * Types that carry a defined bump. `feat` is minor; every other type is patch unless its
 * subject or footer marks it breaking. The list is the conventional-commit vocabulary the
 * repo actually writes — `wip:` is a session checkpoint and never lands on `main`.
 */
const ACCEPTED_TYPES = Object.freeze([
  'feat',
  'fix',
  'chore',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'revert',
])

/** `type(scope)!: description`, with the scope and the `!` marker optional. */
const SUBJECT = /^([a-z]+)(?:\(([^()\s]+)\))?(!)?: (.+)$/

/**
 * Parses one subject line.
 *
 * @param {string} subject the first line of a commit message
 * @returns {{ type: string, scope: string|null, breaking: boolean, description: string }|null}
 *   the parsed subject, or null when it is not `type(scope)?!?: description` over an accepted
 *   type — the caller decides what a null means, and the release plan treats it as fatal.
 */
function parseConventionalSubject(subject) {
  const match = SUBJECT.exec(subject.trim())
  if (!match) return null
  const [, type, scope, breaking, description] = match
  if (!ACCEPTED_TYPES.includes(type)) return null
  if (description.trim() === '') return null
  return {
    type,
    scope: scope ?? null,
    breaking: breaking === '!',
    description: description.trim(),
  }
}

/**
 * The subject of a full commit message: the first line, which is what git and every reader
 * call the subject. Kept here so the guard and its callers agree on the same definition.
 *
 * @param {string} message a full commit message from `git log --format=%B`
 * @returns {string}
 */
function subjectOf(message) {
  return (message ?? '').split('\n')[0].trim()
}

/** Raised by `assertConventionalCommits`: the plan cannot derive a bump from these subjects. */
class NonConventionalCommitError extends Error {
  /**
   * @param {string} key the release key whose change paths the commits touched
   * @param {Array<{ sha: string, subject: string }>} offenders every commit the plan refused
   */
  constructor(key, offenders) {
    const lines = offenders.map(({ sha, subject }) => `  ${sha}  ${JSON.stringify(subject)}`)
    super(
      [
        `release plan: ${offenders.length} commit(s) that touched "${key}" are not conventional commits:`,
        ...lines,
        '  expected subject: type(scope)?!?: description',
        `  accepted types: ${ACCEPTED_TYPES.join(', ')}`,
      ].join('\n'),
    )
    this.name = 'NonConventionalCommitError'
    this.key = key
    this.offenders = offenders
  }
}

/**
 * Refuses a key's plan when any commit in range has a subject the bump cannot be derived from.
 *
 * Every offender is listed, not only the first: the plan runs once per push, and reporting one
 * bad subject per push turns one correction into a queue of them.
 *
 * @param {string} key the release key being planned
 * @param {Array<{ sha: string, message: string }>} commits commits touching that key since its tag
 * @throws {NonConventionalCommitError} when at least one subject does not parse
 */
function assertConventionalCommits(key, commits) {
  const offenders = []
  for (const commit of commits) {
    const subject = subjectOf(commit.message)
    if (parseConventionalSubject(subject) === null) offenders.push({ sha: commit.sha, subject })
  }
  if (offenders.length > 0) throw new NonConventionalCommitError(key, offenders)
}

module.exports = {
  ACCEPTED_TYPES,
  parseConventionalSubject,
  subjectOf,
  NonConventionalCommitError,
  assertConventionalCommits,
}
