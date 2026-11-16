#!/usr/bin/env node

/**
 * scripts/release-claim.mjs
 *
 * Deletes the claim of a branch that just landed. A claim is a live lock, not a
 * tombstone, and merging a pull request never removed it: GitHub deletes the
 * branch, never a file. This is what the `claim-release` workflow calls on
 * `pull_request: closed`, so the folder stays honest without anybody
 * remembering it.
 *
 * Usage:
 *   node scripts/release-claim.mjs --branch session/console-cli-input [--root <dir>] [--dry-run]
 *
 *   --branch <ref>  head branch of the merged pull request. Required.
 *   --root <dir>    repository root (default: parent of this script)
 *   --dry-run       name what would be removed, delete nothing
 *
 * Exit codes: 0 done or nothing to release, 2 usage error. Never 1: a claim
 * that is already gone is the expected case on a re-run, and a workflow that
 * fails on it teaches nobody anything.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readClaims } from './claim-check.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

/**
 * A claim names its branch in `branch:`; a bare claim falls back to the slug it
 * declares (or its filename), which is the branch suffix by format. Both are
 * compared without a trailing slash or a refs/heads prefix.
 */
export function claimsForBranch(claims, branch) {
  const target = String(branch)
    .replace(/^refs\/heads\//, '')
    .replace(/\/+$/, '')
  const slug = path.basename(target)
  return claims.filter((claim) => claim.branch === target || claim.slug === slug)
}

function parseArgs(argv) {
  const options = {
    root: path.resolve(SCRIPT_DIR, '..'),
    branch: null,
    dryRun: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') options.root = argv[++index]
    else if (arg === '--branch') options.branch = argv[++index]
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else options.unknown = arg
  }
  return options
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help) {
    process.stdout.write('usage: release-claim --branch <ref> [--root <dir>] [--dry-run]\n')
    return 0
  }
  if (options.unknown) {
    process.stderr.write(`release-claim: unknown argument ${options.unknown}\n`)
    return 2
  }
  if (!options.branch) {
    process.stderr.write('release-claim: --branch is required\n')
    return 2
  }

  const matched = claimsForBranch(readClaims(options.root), options.branch)
  if (matched.length === 0) {
    process.stdout.write(`release-claim: nothing to release for ${options.branch}\n`)
    return 0
  }

  for (const claim of matched) {
    const file = path.join(options.root, claim.file)
    const pr = claim.pr ? ` (PR #${claim.pr})` : ''
    if (options.dryRun) {
      process.stdout.write(`release-claim: would remove ${claim.file}${pr}\n`)
      continue
    }
    fs.rmSync(file, { force: true })
    process.stdout.write(`release-claim: removed ${claim.file}${pr}\n`)
  }
  return 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  process.exitCode = main()
}
