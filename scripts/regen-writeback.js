'use strict'

/**
 * scripts/regen-writeback.js
 *
 * The `regen` lane's entry point on `main` (`.github/workflows/ci.yml`). Runs the pass that
 * writes back pending versions and regenerates derived artifacts, then lands the result on the
 * branch — retrying on the one rejection that is safe to retry (the branch moved).
 *
 * Split out of the workflow because the push is what races: two merges landing minutes apart
 * each start a run whose checkout is the commit that trigger saw, and the first run's generated
 * commit is behind by the time it is pushed. Inline, that rejection aborted the job with
 * `set -euo pipefail`, which skipped `auto-tag` and `release` and left the release lane quiet
 * with nothing to say so. See scripts/lib/regen-writeback.js for the retry contract.
 */

const { execFileSync } = require('node:child_process')
const { writeBack } = require('./lib/regen-writeback.js')

const repoRoot = __dirname

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

function main() {
  const result = writeBack({
    cwd: repoRoot,
    regenerate,
    log: (message) => console.log(`regen: ${message}`),
  })

  if (result.status === 'exhausted') {
    console.error(`regen: could not land the write-back after ${result.attempts} attempt(s)`)
    console.error(result.error)
    process.exit(1)
  }

  if (result.status === 'no-change') {
    console.log('regen: no derived artifact and no pending version moved')
    return
  }

  console.log(`regen: landed ${result.sha} on main in ${result.attempts} attempt(s)`)
}

main()
