'use strict'

/**
 * scripts/regen-writeback.js
 *
 * The `regen` lane's entry point on `main` (`.github/workflows/ci.yml`). Runs the pass that
 * writes back pending versions and regenerates derived artifacts, then proposes the result on
 * the write-back branch — never on `main`, which is the point of the whole lane.
 *
 * Two things happen here and nowhere else:
 *  - the branch push and the pull-request decision, so a second push refreshes the pull request
 *    it already opened instead of failing on "a pull request for this branch already exists";
 *  - the job outputs (`pending`, `branch`), which `auto-tag` reads to decide whether it may tag
 *    yet. See scripts/lib/regen-writeback.js for the contract and why each branch of it exists.
 */

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const {
  WRITE_BACK_BASE,
  WRITE_BACK_BRANCH,
  WRITE_BACK_SUBJECT,
  planPullRequest,
  regenOutputs,
  writeBack,
} = require('./lib/regen-writeback.js')

/**
 * The repository root, not this file's directory.
 *
 * `run` resolves its script arguments and `writeBack` stages from `cwd`, so both need the root:
 * with `__dirname` the lane asked for `scripts/scripts/release/write-pending-versions.js` and
 * `git add -A` would have staged only what sits under `scripts/`.
 */
const repoRoot = path.resolve(__dirname, '..')

/**
 * Body of the write-back pull request.
 *
 * It states the one thing a maintainer has to do with it — merge it, then the tag follows — and
 * the one thing that must not happen — tagging while it is open.
 */
const PULL_REQUEST_BODY = [
  'Derived artifacts and the pending release versions belong to `main`, and `regen` no longer',
  'pushes them there: this pull request carries the write-back instead.',
  '',
  '- Every push to `main` rebuilds this branch from that tip, so this pull request is refreshed in',
  '  place rather than duplicated.',
  '- `auto-tag` is skipped while it is open (`regen` reports `pending=true`), because the tag must',
  '  point at the tree that carries the versions.',
  '- Merging it is the push that lets `regen` find nothing left to write and `auto-tag` plan and',
  '  tag that commit.',
  '',
  'Nothing here is hand-written: it is the output of `node scripts/regen-writeback.js`.',
].join('\n')

/** Runs a command in the repository, inheriting stdio so its output reaches the CI log. */
function run(command, args) {
  execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit', shell: false })
}

/**
 * Writes pending versions and regenerates every committed derived artifact.
 *
 * The order matters and is the documented bump flow: the version is written back before the tag
 * exists (version-agreement compares the tag against package.json, and the release copies the
 * tag's tree), and the lockfile is refreshed because it pins each workspace package's version.
 */
function regenerate() {
  run('node', ['scripts/release/write-pending-versions.js'])
  run('npm', ['run', 'sync:versions'])
  run('npm', ['install', '--package-lock-only'])
  run('npm', ['run', 'regen'])
}

/**
 * Runs one `gh` command and returns its trimmed stdout.
 *
 * `GH_TOKEN` comes from the workflow (`secrets.GITHUB_TOKEN`), and the token needs
 * `pull-requests: write` for the calls below. `gh` resolves the repository from the checkout.
 *
 * @param {string[]} args
 * @returns {string}
 */
function gh(args) {
  return execFileSync('gh', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

/**
 * The open pull request whose head is `branch`, or null.
 *
 * Read by head branch rather than by title: the title is also the commit subject, so matching on
 * it would find a merged pull request from an earlier cycle just as happily.
 *
 * @param {string} branch
 * @returns {number|null}
 */
function openPullRequestNumber(branch) {
  const raw = gh([
    'pr',
    'list',
    '--head',
    branch,
    '--state',
    'open',
    '--json',
    'number',
    '--limit',
    '1',
  ])
  const parsed = raw === '' ? [] : JSON.parse(raw)
  return Array.isArray(parsed) && parsed.length > 0 ? parsed[0].number : null
}

/**
 * Opens the write-back pull request and returns its number.
 *
 * A concurrent run can create it between the listing above and this call; GitHub answers that
 * with "a pull request for branch ... already exists", which is the state we wanted, so it is
 * resolved by listing again instead of failing the job. Any other failure still propagates: a
 * pending write-back with no pull request proposing it is exactly the silent stall the lane
 * exists to prevent.
 *
 * @param {string} branch
 * @returns {number|null}
 */
function createPullRequest(branch) {
  try {
    gh([
      'pr',
      'create',
      '--base',
      WRITE_BACK_BASE,
      '--head',
      branch,
      '--title',
      WRITE_BACK_SUBJECT,
      '--body',
      PULL_REQUEST_BODY,
    ])
  } catch (error) {
    const existing = openPullRequestNumber(branch)
    if (existing === null) throw error
    return existing
  }
  return openPullRequestNumber(branch)
}

/**
 * Appends the lane's outputs to `$GITHUB_OUTPUT` when running under GitHub Actions.
 *
 * Without the file (a local run) this is a no-op, which keeps the script runnable by hand for
 * the dry run the skill asks for.
 *
 * @param {{ pending: 'true'|'false', branch: string }} outputs
 */
function writeOutputs(outputs) {
  const file = process.env.GITHUB_OUTPUT
  if (file === undefined || file === '') return
  fs.appendFileSync(file, `pending=${outputs.pending}\nbranch=${outputs.branch}\n`)
}

function main() {
  const result = writeBack({
    cwd: repoRoot,
    base: WRITE_BACK_BASE,
    branch: WRITE_BACK_BRANCH,
    regenerate,
    log: (message) => console.log(`regen: ${message}`),
  })

  if (result.status === 'exhausted') {
    console.error(`regen: could not land the write-back after ${result.attempts} attempt(s)`)
    console.error(result.error)
    process.exit(1)
  }

  const hasPending = result.status === 'pushed'
  const outputs = regenOutputs({ hasPending, branch: WRITE_BACK_BRANCH })
  writeOutputs(outputs)

  if (!hasPending) {
    console.log('regen: nothing to write back; auto-tag may plan on this commit')
    return
  }

  // The open pull request is only worth a call when there is something to propose: `skip`
  // answers "no pending change" and "a stale pull request is still open" without one.
  const openNumber = result.replaced === null ? null : openPullRequestNumber(WRITE_BACK_BRANCH)
  const action = planPullRequest({ hasPending, openNumber })

  if (action === 'reuse') {
    console.log(
      `regen: pushed ${result.sha} to ${result.branch}; pull request #${openNumber} updated`,
    )
  } else {
    const number = createPullRequest(result.branch)
    console.log(
      `regen: pushed ${result.sha} to ${result.branch}; opened pull request ` +
        `${number === null ? '(number unknown)' : `#${number}`}`,
    )
  }

  console.log('regen: pending=true; auto-tag is skipped until this pull request lands')
}

main()
