#!/usr/bin/env node
'use strict'

/**
 * scripts/pr-overlap.mjs
 *
 * "Is somebody else already editing what I am editing?" answered from the open pull
 * requests, not from a file an agent has to remember to write.
 *
 * `openspec/claims/` asked for that discipline at the moment of the first edit and got
 * it twice in thirty PRs: the harness creates the worktree automatically, so the claim
 * was one more thing the agent had to remember in a flow it does not control. The open
 * PRs already carry the answer — `gh pr list --json files` lists exactly the paths every
 * live branch touches — so this reads them and compares.
 *
 *   node scripts/pr-overlap.mjs [--base origin/main] [--prs <file>] [--branch <name>] [--json]
 *
 * `--prs` takes the JSON that `gh pr list --state open --json number,headRefName,files`
 * writes; without it the command runs `gh` itself. `--paths` reads the changed paths from
 * a file instead of `git diff`, which is what the tests use.
 *
 * Exit codes: 0 no hand-written overlap (a mechanical one is reported and allowed),
 * 1 a hand-written file is shared with an open branch, 2 nothing could be verified.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { sharedArtifactLabel, toPosix } = require('./lib/shared-artifacts.js')

/**
 * Reads `--flag value` pairs and `--flag` switches.
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const flags = { base: 'origin/main', prs: null, branch: null, paths: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') flags.json = true
    else if (arg === '--base') flags.base = argv[++i]
    else if (arg === '--prs') flags.prs = argv[++i]
    else if (arg === '--branch') flags.branch = argv[++i]
    else if (arg === '--paths') flags.paths = argv[++i]
    else if (arg === '--help' || arg === '-h') flags.help = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return flags
}

/** @param {string[]} args */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/**
 * The paths this branch changes, relative to the merge base with `base`.
 * `--diff-filter=d` drops deletions: a path somebody else owns is not a collision
 * just because this branch removed its copy.
 *
 * @param {string} base
 * @returns {string[]}
 */
function changedPaths(base) {
  return git(['diff', '--name-only', '--diff-filter=d', `${base}...HEAD`])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * The open PRs, from a file or from `gh`.
 * @param {string | null} file
 * @returns {Array<{ number: number, headRefName: string, files: Array<{ path: string } | string> }>}
 */
function openPullRequests(file) {
  const raw = file
    ? readFileSync(file, 'utf8')
    : execFileSync(
        'gh',
        ['pr', 'list', '--state', 'open', '--limit', '200', '--json', 'number,headRefName,files'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
  return JSON.parse(raw)
}

/** @param {Array<{ path: string } | string>} files */
const filePaths = (files) =>
  (files ?? []).map((entry) => toPosix(typeof entry === 'string' ? entry : entry.path))

/**
 * Partitions a set of path/PR collisions into the ones that need a conversation and the
 * ones that a rebase plus `npm run regen` already resolves.
 *
 * @param {string[]} myPaths
 * @param {Array<{ number: number, headRefName: string, files: Array<{ path: string } | string> }>} prs
 * @param {string} branch
 */
function compare(myPaths, prs, branch) {
  const mine = new Set(myPaths.map(toPosix))
  /** @type {Map<string, { label: string | null, prs: number[] }>} */
  const hits = new Map()

  for (const pr of prs) {
    if (pr.headRefName === branch) continue
    for (const path of filePaths(pr.files)) {
      if (!mine.has(path)) continue
      const entry = hits.get(path) ?? { label: sharedArtifactLabel(path), prs: [] }
      if (!entry.prs.includes(pr.number)) entry.prs.push(pr.number)
      hits.set(path, entry)
    }
  }

  const all = [...hits.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  return {
    mechanical: all.filter(([, entry]) => entry.label !== null),
    blocking: all.filter(([, entry]) => entry.label === null),
  }
}

const usage = `usage: node scripts/pr-overlap.mjs [--base <ref>] [--prs <file>] [--branch <name>] [--paths <file>] [--json]

  Compares this branch's changed paths with every open PR's files.
  Exit 0: no hand-written overlap.  Exit 1: a hand-written file is shared.  Exit 2: not verified.`

function main() {
  const flags = parseArgs(process.argv.slice(2))
  if (flags.help) {
    console.log(usage)
    return 0
  }

  let branch = flags.branch
  let myPaths
  try {
    branch = branch ?? git(['rev-parse', '--abbrev-ref', 'HEAD'])
    myPaths = flags.paths
      ? readFileSync(flags.paths, 'utf8')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      : changedPaths(flags.base)
  } catch (err) {
    console.error(`pr-overlap: cannot read this branch's changes: ${err.message}`)
    return 2
  }

  let prs
  try {
    prs = openPullRequests(flags.prs)
  } catch (err) {
    console.error(
      `pr-overlap: cannot read the open pull requests, so nothing was verified (${err.message}).\n` +
        'fix: gh pr list --state open --json number,headRefName,files > temp/prs.json',
    )
    return 2
  }

  const others = prs.filter((pr) => pr.headRefName !== branch)
  const { mechanical, blocking } = compare(myPaths, prs, branch)

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          branch,
          base: flags.base,
          paths_checked: myPaths.length,
          open_prs: others.map((pr) => pr.number),
          mechanical: mechanical.map(([path, entry]) => ({
            path,
            label: entry.label,
            prs: entry.prs,
          })),
          blocking: blocking.map(([path, entry]) => ({ path, prs: entry.prs })),
        },
        null,
        2,
      ),
    )
    return blocking.length > 0 ? 1 : 0
  }

  console.log(
    `pr-overlap: ${myPaths.length} path(s) on ${branch} vs ${others.length} other open PR(s) (base ${flags.base})`,
  )
  if (others.length === 0) {
    console.log('  no other open PR: nothing can collide.')
    return 0
  }
  if (mechanical.length > 0) {
    console.log('')
    console.log('  MECHANICAL — regenerate after the rebase, no coordination needed:')
    for (const [path, entry] of mechanical) {
      console.log(`    ${path}  (${entry.label})  <- ${entry.prs.map((n) => `#${n}`).join(', ')}`)
    }
  }
  if (blocking.length > 0) {
    console.log('')
    console.log('  BLOCKING — another live branch edits the same hand-written file:')
    for (const [path, entry] of blocking) {
      console.log(`    ${path}  <- ${entry.prs.map((n) => `#${n}`).join(', ')}`)
    }
    console.log('')
    console.log('  Land one of them first, or add your work to that branch instead of a second PR.')
    return 1
  }
  console.log('')
  console.log('  no hand-written overlap.')
  return 0
}

process.exitCode = main()
