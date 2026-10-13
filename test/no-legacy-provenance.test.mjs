import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * S2c grep guard: the retired provenance surface (verdict ledger, feedback JSON
 * export, reconcile procedure, Agent Modification block builder, orphan
 * change-log) MUST appear nowhere in shipped code, tests, docs or skills,
 * outside write-once `_V_x-y-z_` files, `openspec/` (the spec layer is synced by
 * `openspec archive`) and frozen test fixtures.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const SYMBOLS = [
  /feedback-ledger/,
  /feedbackState/,
  /evaluate_feedback_items/,
  /record_feedback_verdict/,
  /feedback\.schema\.json/,
  /reconcile_feedback/,
  /agentModification/,
  /AGENT_MODIFICATION_CONCEPT/,
  /change-log\.js/,
]

// Files that legitimately name a retired symbol to pin its ABSENCE.
const ABSENCE_PINS = new Set([
  'test/no-legacy-provenance.test.mjs',
  'test/console-export.test.mjs',
  'iNNfo/packages/innfo-core/tests/console-payload-builder.test.ts',
  'iNNfo/packages/innfo-core/tests/exports.test.ts',
  'iNNfo/packages/innfo-core/tests/naming/contract.test.ts',
  'iNNfo/packages/innfo-mcp/src/server.spec.ts',
])

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'temp', '.verify-logs', 'openspec', '_samples_nn'])
const SKIP_PREFIXES = [
  'test/fixtures/',
  'iNNfo/packages/innfo-core/tests/fixtures/',
  'iNNfo/packages/innfo-core/tests/legacy/',
]
const WRITE_ONCE = /_V_\d+-\d+-\d+/
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip|mp4|webm|svg)$/i

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.agents') {
      if (entry.isDirectory()) continue
    }
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walk(abs)
    } else if (entry.isFile()) {
      yield abs
    }
  }
}

test('no retired provenance symbol survives outside specs, write-once files and frozen fixtures', () => {
  const offenders = []
  for (const abs of walk(ROOT)) {
    const rel = relative(ROOT, abs).split('\\').join('/')
    if (ABSENCE_PINS.has(rel)) continue
    if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) continue
    if (WRITE_ONCE.test(rel)) continue
    if (BINARY_EXT.test(rel)) continue
    let text
    try {
      if (statSync(abs).size > 2_000_000) continue
      text = readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    if (text.includes('\u0000')) continue
    for (const re of SYMBOLS) {
      if (re.test(text)) {
        offenders.push(`${rel} → ${re}`)
        break
      }
    }
  }
  assert.deepEqual(offenders, [], `retired provenance symbols found:\n${offenders.join('\n')}`)
})
