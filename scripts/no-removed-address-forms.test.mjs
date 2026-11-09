#!/usr/bin/env node

/**
 * scripts/no-removed-address-forms.test.mjs
 *
 * Gate: the retired address machinery must not come back into live code
 * (distributed-storage, design A3/A7, tasks.md S7c.1).
 *
 * The chain deleted title-based resolution, the stem-collision flip and the
 * changeset-by-heading citation. Tests and archived OpenSpec plans may still
 * name those forms (they assert their removal), so this gate scans production
 * sources only: it skips `*.test.*`, `*.spec.*`, `node_modules/`, `dist/`,
 * `bin/` and generated mirrors/bundles, which are rebuilt at release.
 *
 * Shape-based: `scripts/verify.js` discovers every `*.test.{js,mjs}` under
 * `scripts/`, so this file is picked up without an allowlist entry.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Production roots that could resolve an address. */
const ROOTS = [
  'iNNfo/packages/nn-core/src',
  'iNNfo/packages/nn-mcp/src',
  'skills',
  'scripts',
  'iNNfo/specs/bluepriNNts/console',
]

const CODE_EXT = new Set(['.ts', '.js', '.mjs', '.cjs'])
/** Directories that hold builds, dependencies or vendored code. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'bin', 'vendor', 'coverage', '.git'])
/** Generated files are rebuilt by their generator; never hand-checked here. */
const GENERATED_MARKERS = ['.generated.', '.bundle.', '.min.']

/** Identifiers and module names of the removed address machinery. */
const FORBIDDEN = [
  'QUALIFIED_REF_RE',
  'parseQualifiedRef',
  'titleToNodeIds',
  'fileNameToNodeIds',
  'nodeElementConcepts',
  'resolveTargetModel',
  'AMBIGUOUS_MODEL_ID',
  'findStemCollisions',
  'model-collisions',
  'stem-collision',
]

function isTestFile(name) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(name)
}

function isGenerated(name) {
  return GENERATED_MARKERS.some((marker) => name.includes(marker))
}

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...walk(path.join(dir, entry.name)))
      continue
    }
    if (!entry.isFile()) continue
    if (isTestFile(entry.name) || isGenerated(entry.name)) continue
    if (!CODE_EXT.has(path.extname(entry.name))) continue
    out.push(path.join(dir, entry.name))
  }
  return out
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function occurrences(text, needle) {
  const pattern = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
  return text.match(pattern)?.length ?? 0
}

const files = ROOTS.flatMap((root) => walk(path.join(ROOT, root)))

assert.ok(
  files.length > 50,
  `the gate must scan live sources, not an empty set (found ${files.length} files)`,
)

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/')
  const text = fs.readFileSync(file, 'utf8')
  for (const symbol of FORBIDDEN) {
    assert.strictEqual(
      occurrences(text, symbol),
      0,
      `${rel} still references the removed address machinery "${symbol}"`,
    )
  }
}

/**
 * A `@## NN Change:` citation must never be parsed. Messages may name the
 * removed form, and the console labels a Change unit with its document heading,
 * but no live code may test, match or split on it. A parser would call one of
 * the inspection methods below; a message assignment would not.
 */
const INSPECT = /\.(test|match|exec|startsWith|endsWith|includes|split|indexOf|search)\(|new RegExp/
for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/')
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  for (const [index, line] of lines.entries()) {
    if (!/@##\s*NN\s*Change/.test(line)) continue
    assert.doesNotMatch(
      line,
      INSPECT,
      `${rel}:${index + 1} parses a "@## NN Change:" citation; changesets are addressed by model id and slug`,
    )
  }
}

// An address resolves exactly through the domain index; a title is display-only.
for (const rel of [
  'iNNfo/packages/nn-core/src/address/parse.ts',
  'iNNfo/packages/nn-core/src/domain/index.ts',
]) {
  assert.doesNotMatch(
    read(rel),
    /\bbyName\b/,
    `${rel} must not resolve an address by title or display name`,
  )
}

console.log(
  `no-removed-address-forms: ${files.length} live source files clean of the removed address forms`,
)
