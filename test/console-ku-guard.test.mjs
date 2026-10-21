import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const consoleDir = join(root, 'iNNfo', 'specs', 'bluepriNNts', 'console')

// The legacy builders and component ids are deleted without aliases.
const LEGACY = [
  'concept-pill',
  'element-pill',
  'marker-chip',
  'qud-chip',
  'ku-badge',
  'field-row',
  'UI.Table',
  'ConceptPill',
  'ElementPill',
  'MarkerChip',
  'QudChip',
  'KuBadge',
  'KuActions',
]

function consoleSources() {
  return readdirSync(consoleDir)
    .filter((f) => f.endsWith('.js') && f !== 'nn-console.bundle.js')
    .map((f) => join(consoleDir, f))
}

function viewSources() {
  const base = join(root, 'iNNfo', 'specs', 'bluepriNNts')
  const out = []
  for (const family of readdirSync(base, { withFileTypes: true })) {
    if (!family.isDirectory()) continue
    const assets = join(base, family.name, 'assets')
    try {
      for (const f of readdirSync(assets)) {
        if (/^console-view-.*\.js$/.test(f)) out.push(join(assets, f))
      }
    } catch {
      /* no assets dir */
    }
  }
  return out
}

describe('Ku static guard', () => {
  it('has no legacy builders or component ids in console sources or repo views', () => {
    const offenders = []
    for (const file of [...consoleSources(), ...viewSources()]) {
      const text = readFileSync(file, 'utf8')
      for (const token of LEGACY) {
        if (text.includes(token)) offenders.push(`${file}: ${token}`)
      }
    }
    assert.deepEqual(offenders, [])
  })

  it('pins data-ku-exempt to the frozen reason set', () => {
    const reasons = ['metamodel-svg', 'chart', 'numeric-aggregate', 'csv-subunit-label']
    const seen = new Set()
    for (const file of [...consoleSources(), ...viewSources()]) {
      const text = readFileSync(file, 'utf8')
      const re = /data-ku-exempt=["']([^"']+)["']/g
      let m
      while ((m = re.exec(text))) seen.add(m[1])
    }
    for (const reason of seen) assert.ok(reasons.includes(reason), `unknown exempt reason: ${reason}`)
  })
})
