#!/usr/bin/env node
/**
 * scripts/lib/publish-concurrency.test.js
 *
 * One concurrency group for everything that writes `cogNNitive-web`.
 *
 * Evidence: run 45843892753. `publish-web` (ci.yml) and `release (<tag>)` (release.yml)
 * both push `main` in the mirror under different groups — `publish-web` and `release` —
 * so they ran concurrently and `git pull --rebase` could not replay the publish commit
 * over the release's push (`b8ac825..d12da67`).
 *
 * The test binds the check to the publisher command, not to a job name, so renaming a
 * job cannot silently drop it out of the group. GitHub cannot be asked from here whether
 * it really queues them; what can be pinned is that the two writers agree on one name.
 */

const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.join(__dirname, '..', '..')
const CI = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml')
const RELEASE = path.join(REPO_ROOT, '.github', 'workflows', 'release.yml')

/** Names of the commands that push to the mirror repository. */
const PUBLISHERS = ['scripts/publish-web.mjs', 'run-release.js']

/**
 * Splits a workflow into its jobs: `{ name, lines }`, keyed by the 2-space job key.
 *
 * @param {string} text
 * @returns {Array<{ name: string, lines: string[] }>}
 */
function jobsOf(text) {
  const lines = text.split(/\r?\n/)
  const jobs = []
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(lines[i])
    if (!m) continue
    let end = lines.length
    for (let j = i + 1; j < lines.length; j++) {
      if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[j])) {
        end = j
        break
      }
    }
    jobs.push({ name: m[1], lines: lines.slice(i + 1, end) })
  }
  return jobs
}

/**
 * Reads `concurrency.group` from a job block, ignoring falsy non-matches and comments.
 *
 * @param {string[]} lines
 * @returns {string|null}
 */
function concurrencyGroupOf(lines) {
  const start = lines.findIndex((l) => /^ {4}concurrency:\s*$/.test(l))
  if (start === -1) return null
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^ {6}group:\s*(.+?)\s*$/.exec(lines[i])
    if (m) return m[1].replace(/^["']|["']$/g, '').trim()
    // Any line indented less than the group key ends the block.
    if (lines[i].trim() !== '' && !/^ {6,}/.test(lines[i])) return null
  }
  return null
}

/**
 * Reads `concurrency.cancel-in-progress` from a job block as written.
 *
 * @param {string[]} lines
 * @returns {string|null}
 */
function cancelInProgressOf(lines) {
  for (const line of lines) {
    const m = /^ {6}cancel-in-progress:\s*(.+?)\s*$/.exec(line)
    if (m) return m[1]
  }
  return null
}

/**
 * Every job in a workflow that runs a publisher command.
 *
 * @param {string} file
 * @returns {Array<{ file: string, name: string, group: string|null, cancel: string|null }>}
 */
function publisherJobs(file) {
  const text = fs.readFileSync(file, 'utf8')
  return jobsOf(text)
    .filter((job) => PUBLISHERS.some((cmd) => job.lines.some((l) => l.includes(cmd))))
    .map((job) => ({
      file: path.basename(file),
      name: job.name,
      group: concurrencyGroupOf(job.lines),
      cancel: cancelInProgressOf(job.lines),
    }))
}

function testBothPublishersAreFound() {
  const found = [...publisherJobs(CI), ...publisherJobs(RELEASE)]
  const files = found.map((j) => j.file)
  assert.ok(files.includes('ci.yml'), 'the publish-web job must be found in ci.yml')
  assert.ok(files.includes('release.yml'), 'the release job must be found in release.yml')
  console.log(`PASS: both publishers found (${found.map((j) => `${j.file}#${j.name}`).join(', ')})`)
}

function testPublishersShareOneGroup() {
  const found = [...publisherJobs(CI), ...publisherJobs(RELEASE)]
  const groups = [...new Set(found.map((j) => j.group))]

  for (const job of found) {
    assert.ok(
      job.group,
      `${job.file}#${job.name} publishes to the mirror without a concurrency group`,
    )
  }
  assert.strictEqual(
    groups.length,
    1,
    `every job that writes cogNNitive-web must share one concurrency group, found: ${groups.join(', ')}`,
  )
  assert.strictEqual(groups[0], 'publish-cognnitive-web')
  console.log(`PASS: one shared group across ${found.length} publishers — ${groups[0]}`)
}

function testNoPublisherUsesTheOldPerWorkflowGroup() {
  const found = [...publisherJobs(CI), ...publisherJobs(RELEASE)]
  for (const job of found) {
    assert.notStrictEqual(
      job.group,
      'publish-web',
      `${job.file}#${job.name} still uses the old ci-only group`,
    )
    assert.notStrictEqual(
      job.group,
      'release',
      `${job.file}#${job.name} still uses the old release-only group`,
    )
  }
  console.log('PASS: the old per-workflow groups are gone')
}

function testNothingInterruptsARunningPublish() {
  const found = [...publisherJobs(CI), ...publisherJobs(RELEASE)]
  for (const job of found) {
    assert.strictEqual(
      job.cancel,
      'false',
      `${job.file}#${job.name} must set cancel-in-progress: false — a cancelled push is a half-written mirror`,
    )
  }
  console.log('PASS: no publisher cancels a running push')
}

function testGroupIsCaseInsensitiveStable() {
  // GitHub treats group names case-insensitively; two spellings would still collide but
  // would read as two groups to a human. Keep one spelling.
  const found = [...publisherJobs(CI), ...publisherJobs(RELEASE)]
  const lowered = new Set(found.map((j) => j.group.toLowerCase()))
  assert.strictEqual(lowered.size, 1, 'the group name must not be spelled two ways')
  console.log('PASS: the group name has one spelling')
}

function runAll() {
  try {
    testBothPublishersAreFound()
    testPublishersShareOneGroup()
    testNoPublisherUsesTheOldPerWorkflowGroup()
    testNothingInterruptsARunningPublish()
    testGroupIsCaseInsensitiveStable()
    console.log('\nAll publish-concurrency tests passed!')
  } catch (err) {
    console.error(`\npublish-concurrency tests FAILED: ${err.message}`)
    console.error(err.stack)
    process.exit(1)
  }
}

runAll()
