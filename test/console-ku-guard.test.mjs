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

// Empty: the payload slot ids were the last `innfo` identifiers and now carry
// `nn-` too. The readers of artifacts that were already written keep a dual read
// (`nn-core/src/lineage/project.ts`, `scripts/export-console.mjs`), so the
// allowlist is no longer needed.
const PREFIX_ALLOWLIST = []

// A retired name is only reported when it stands alone. A prefixed name must not
// trip on the suffix it carries: `nn-field-row` contains `field-row`.
function wholeIdentifier(token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`)
}

// The LEGACY scan covers scripts: a retired builder id is a JS concern, and the
// stale selectors it would also find in the stylesheet (`concept-pill`,
// `element-pill`, `ku-badge`) are CSS hygiene, tracked separately.
function consoleScripts() {
  return readdirSync(consoleDir)
    .filter((f) => f.endsWith('.js') && f !== 'nn-console.bundle.js')
    .map((f) => join(consoleDir, f))
}

// The prefix check covers scripts AND stylesheets: a class renamed in the kit but
// left in the stylesheet is exactly how a dead block survives.
function consoleSources() {
  return readdirSync(consoleDir)
    .filter((f) => (f.endsWith('.js') || f.endsWith('.css')) && f !== 'nn-console.bundle.js')
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
    for (const file of [...consoleScripts(), ...viewSources()]) {
      const text = readFileSync(file, 'utf8')
      for (const token of LEGACY) {
        if (wholeIdentifier(token).test(text)) offenders.push(`${file}: ${token}`)
      }
    }
    assert.deepEqual(offenders, [])
  })

  it('reports a retired name only as a whole identifier', () => {
    assert.ok(wholeIdentifier('field-row').test('class="field-row"'), 'bare name is reported')
    assert.ok(wholeIdentifier('ku-badge').test('.ku-badge{'), 'bare class is reported')
    assert.equal(
      wholeIdentifier('field-row').test('class="nn-field-row"'),
      false,
      'a prefixed name is clean',
    )
    assert.equal(
      wholeIdentifier('ku-badge').test('.nn-ku-badge{'),
      false,
      'a prefixed class is clean',
    )
  })

  it('scans the console stylesheets too', () => {
    const sources = consoleSources()
    assert.ok(
      sources.some((f) => f.endsWith('nn-ui.css')),
      'nn-ui.css is scanned by the prefix check',
    )
  })

  it('has no retired innfo prefix outside the payload slot allowlist', () => {
    // Identifier forms only: `innfo-…`, `innfo:…` or an `Innfo…` global. A path
    // or URL segment (`docs/innfo/`, `cognnitive.com/innfo/`) is not an
    // identifier and is deliberately out of scope, as is a retired DISTRIBUTION
    // package name cited as data by the repo-wide guards.
    const RETIRED = /(?<![A-Za-z0-9_-])innfo[-:]|\bInnfo/
    const offenders = []
    for (const file of consoleSources()) {
      let text = readFileSync(file, 'utf8')
      for (const token of PREFIX_ALLOWLIST) text = text.split(token).join('')
      if (RETIRED.test(text)) offenders.push(file)
    }
    assert.deepEqual(offenders, [], 'console sources must carry the nn- prefix only')
  })

  it('pins data-ku-exempt to the frozen reason set', () => {
    const reasons = ['metamodel-svg', 'chart', 'numeric-aggregate', 'csv-subunit-label']
    const seen = new Set()
    for (const file of [...consoleScripts(), ...viewSources()]) {
      const text = readFileSync(file, 'utf8')
      const re = /data-ku-exempt=["']([^"']+)["']/g
      let m
      while ((m = re.exec(text))) seen.add(m[1])
    }
    for (const reason of seen) assert.ok(reasons.includes(reason), `unknown exempt reason: ${reason}`)
  })
})
