#!/usr/bin/env node

/**
 * scripts/build-skill-shared-rules.mjs
 *
 * Renders the canonical `scripts/skill-shared-rules.md` into a
 * `generated:shared-rules` region inside each end-user skill's `SKILL.md`, so
 * the governance / conversation-lifecycle / citation / Informative Grace rules
 * are defined once and mirrored (the skills stay self-contained at runtime).
 *
 * Usage:
 *   node scripts/build-skill-shared-rules.mjs [--check] [--root <dir>]
 *
 *     (no flags)          write the rendered block into every target skill.
 *     --check             compare each render against the on-disk file; exit 1
 *                         when a block was hand-edited or is stale.
 *     --root <dir>        resolve `scripts/` and `skills/` relative to <dir>
 *                         (used by the hermetic fixture tests).
 *
 * Exit codes:
 *   0  every target was written (or, in --check, is up to date).
 *   1  --check: at least one block differs from its render.
 *   2  input failure: missing source, unknown rule id, or missing region markers.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { replaceRegion, normalizeOutput } from './lib/docs-facts.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')

const REGION = 'shared-rules'
const SOURCE_RELATIVE_PATH = path.join('scripts', 'skill-shared-rules.md')
const RULE_HEADING_RE = /^## rule:\s*(\S+)\s*$/gm
const REGION_HEADER = '### Shared Rules (generated — do not edit)'

/** Canonical rule ids, in source order. */
export const SECTION_IDS = [
  'governance',
  'conversation-lifecycle',
  'citation-taxonomy',
  'informative-grace',
]

/** Which rules each end-user skill renders. */
export const SKILL_SECTION_MAP = {
  nn: ['governance', 'conversation-lifecycle'],
  'nn-innfo': ['governance', 'conversation-lifecycle', 'citation-taxonomy', 'informative-grace'],
  'nn-sources': [
    'governance',
    'conversation-lifecycle',
    'citation-taxonomy',
    'informative-grace',
  ],
}

/**
 * Splits the canonical source on `## rule: <id>` headings.
 * @param {string} markdown
 * @returns {Record<string, string>} id → trimmed section body
 */
export function parseSections(markdown) {
  /** @type {Record<string, string>} */
  const sections = {}
  const matches = [...markdown.matchAll(RULE_HEADING_RE)]
  matches.forEach((match, index) => {
    const start = match.index + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index : markdown.length
    sections[match[1]] = markdown.slice(start, end).trim()
  })
  return sections
}

/**
 * Renders the mapped sections, in the given order, under one generated-block
 * header. Pure and deterministic; the same inputs always yield the same bytes.
 * @param {string[]} ids
 * @param {Record<string, string>} sections
 * @returns {string}
 * @throws {Error} when an id has no section in `sections`.
 */
export function renderSharedRules(ids, sections) {
  const bodies = ids.map((id) => {
    const body = sections[id]
    if (!body) throw new Error(`unknown shared rule id: ${id}`)
    return body
  })
  return `${REGION_HEADER}\n\n${bodies.join('\n\n')}`
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, log?: (msg: string) => void, logError?: (msg: string) => void }} [options]
 * @returns {number} exit code (2 > 1 > 0)
 */
export function run(argv, options = {}) {
  const { cwd = process.cwd(), log = console.log, logError = console.error } = options

  let check = false
  let rootArg = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') check = true
    else if (argv[i] === '--root') rootArg = argv[++i] ?? null
    else if (argv[i].startsWith('--root=')) rootArg = argv[i].slice('--root='.length)
  }

  const root = rootArg ? path.resolve(cwd, rootArg) : REPO_ROOT
  const sourcePath = path.join(root, SOURCE_RELATIVE_PATH)

  let sections
  try {
    sections = parseSections(fs.readFileSync(sourcePath, 'utf-8'))
  } catch (err) {
    logError(`FAIL: could not read shared rule source ${sourcePath}: ${err.message}`)
    return 2
  }

  let exitCode = 0
  for (const [skill, ids] of Object.entries(SKILL_SECTION_MAP)) {
    const targetPath = path.join(root, 'skills', skill, 'SKILL.md')
    if (!fs.existsSync(targetPath)) {
      logError(`FAIL: target skill not found: ${targetPath}`)
      exitCode = 2
      continue
    }

    let body
    try {
      body = renderSharedRules(ids, sections)
    } catch (err) {
      logError(`FAIL: ${err.message}`)
      return 2
    }

    let rendered
    try {
      rendered = normalizeOutput(replaceRegion(fs.readFileSync(targetPath, 'utf-8'), REGION, body))
    } catch (err) {
      logError(`FAIL: ${err.message} in ${targetPath}`)
      exitCode = 2
      continue
    }

    if (check) {
      const current = normalizeOutput(fs.readFileSync(targetPath, 'utf-8'))
      if (current === rendered) {
        log(`OK: ${targetPath} is up to date (${ids.length} rule(s))`)
      } else {
        logError(
          `FAIL: DRIFT — ${targetPath} differs from its generated render. Re-run without --check.`,
        )
        if (exitCode === 0) exitCode = 1
      }
      continue
    }

    fs.writeFileSync(targetPath, rendered, 'utf-8')
    log(`OK: wrote ${targetPath} (${ids.length} rule(s))`)
  }

  return exitCode
}

function main() {
  process.exit(run(process.argv.slice(2)))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
