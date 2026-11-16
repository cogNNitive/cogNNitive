#!/usr/bin/env node

/**
 * scripts/claim-audit.mjs
 *
 * Answers one question about the repository as a whole: "which claims are still
 * live, and which ones are tombstones left behind by a land?" A claim is a live
 * lock. GitHub deletes the branch on merge and never the file, so the
 * `claim-release` workflow removes the claim at that moment; this audit is the
 * safety net for a run that failed, and it also catches a claim whose PR is
 * still open but whose file was removed by hand.
 *
 * `claim-check` answers "is my area taken right now?". This answers "is the
 * claims folder honest right now?" The two never overlap: this one takes no
 * area, reads every claim and judges each one by the state of its PR.
 *
 * Usage:
 *   gh pr list --state open --limit 1000 --json number > temp/prs.json
 *   node scripts/claim-audit.mjs --prs temp/prs.json
 *
 *   --root <dir>   repository root (default: parent of this script)
 *   --prs <file>   open PRs, gh shape: [{"number":672}]. Required: without it a
 *                  claim cannot be judged, and an audit that cannot judge must
 *                  not report success.
 *   --json         machine-readable result
 *   --warn-only    report released claims but exit 0. Used by CI, where a
 *                  tombstone is pre-existing debt on the base branch and must
 *                  not redden an unrelated pull request.
 *
 * Exit codes: 0 every claim is live, 1 at least one claim is released, 2 usage.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizePullRequests, readClaims } from './claim-check.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const COLLECT = 'gh pr list --state open --limit 1000 --json number > temp/prs.json'

/**
 * Splits the claims folder into the three states that decide the exit code. A
 * claim with no `pr:` is not debt: it may belong to a session whose PR has not
 * opened yet, and the audit has nothing to compare it against.
 */
export function auditClaims({ claims, pullRequests }) {
  const open = new Set(pullRequests.map((pr) => pr.number))
  const released = []
  const live = []
  const unverifiable = []

  for (const claim of claims) {
    if (!claim.pr) {
      unverifiable.push(claim)
      continue
    }
    if (open.has(claim.pr)) live.push(claim)
    else released.push(claim)
  }

  return { live, released, unverifiable }
}

function parseArgs(argv) {
  const options = {
    root: path.resolve(SCRIPT_DIR, '..'),
    prs: null,
    json: false,
    warnOnly: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') options.root = argv[++index]
    else if (arg === '--prs') options.prs = argv[++index]
    else if (arg === '--json') options.json = true
    else if (arg === '--warn-only') options.warnOnly = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else options.unknown = arg
  }
  return options
}

function loadPullRequests(root, explicit) {
  const file = path.isAbsolute(explicit) ? explicit : path.join(root, explicit)
  return normalizePullRequests(readJsonLoose(file))
}

/**
 * Reads the PR list the way a Windows shell writes it. PowerShell's `>` emits
 * UTF-16 with a BOM, so the documented collector command produces a file that a
 * plain JSON.parse rejects; the audit must not fail on the shell it documents.
 */
export function readJsonLoose(file) {
  const buffer = fs.readFileSync(file)
  const text =
    buffer.length > 1 && buffer[0] === 0xff && buffer[1] === 0xfe
      ? buffer.toString('utf16le')
      : buffer.toString('utf8')
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

function report(result) {
  const total = result.live.length + result.released.length + result.unverifiable.length
  const noun = total === 1 ? 'claim' : 'claims'
  const lines = [
    `claim-audit: ${total} ${noun}: ${result.live.length} live, ${result.released.length} released, ${result.unverifiable.length} without a PR`,
  ]
  for (const claim of result.released) {
    lines.push(
      `  ${claim.file}  released (PR #${claim.pr} is not open) — delete it, a claim is a lock and not a tombstone`,
    )
  }
  for (const claim of result.unverifiable) {
    lines.push(`  ${claim.file}  no PR yet — not judged until its PR opens`)
  }
  if (result.released.length === 0) lines.push('  no released claim')
  return lines.join('\n')
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help) {
    process.stdout.write(
      `usage: claim-audit --prs <file.json> [--root <dir>] [--json] [--warn-only]\n\ncollect: ${COLLECT}\n`,
    )
    return 0
  }
  if (options.unknown) {
    process.stderr.write(`claim-audit: unknown argument ${options.unknown}\n`)
    return 2
  }
  if (!options.prs) {
    process.stderr.write(`claim-audit: --prs is required. Collect it first:\n  ${COLLECT}\n`)
    return 2
  }

  const claims = readClaims(options.root)
  let pullRequests
  try {
    pullRequests = loadPullRequests(options.root, options.prs)
  } catch (error) {
    process.stderr.write(`claim-audit: cannot read --prs ${options.prs}: ${error.message}\n`)
    return 2
  }

  const result = auditClaims({ claims, pullRequests })
  const ok = result.released.length === 0

  if (options.json) {
    const payload = {
      ok,
      live: result.live.length,
      released: result.released.map((claim) => ({
        file: claim.file,
        slug: claim.slug,
        pr: claim.pr,
      })),
      unverifiable: result.unverifiable.map((claim) => ({ file: claim.file, slug: claim.slug })),
    }
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
  } else {
    process.stdout.write(`${report(result)}\n`)
    if (!ok) {
      process.stdout.write(
        'Delete the released claims with the change that landed them, then run this again.\n',
      )
    }
  }

  if (!ok && !options.warnOnly) return 1
  return 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  process.exitCode = main()
}
