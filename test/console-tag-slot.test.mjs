import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')
const UI = require(join(consoleDir, 'ui-kit.js'))

describe('UI.tagSlot: deterministic tag color derivation', () => {
  it('exposes tagSlot function on UI kit', () => {
    assert.equal(typeof UI.tagSlot, 'function')
  })

  it('matches pinned golden vectors for canonical tag names', () => {
    const expected = {
      pricing: 10,
      ai: 4,
      core: 7,
      ops: 8,
      important: 10,
      verified: 6,
      shipped: 9,
      reviewed: 9,
      nominal: 12,
      warning: 4,
      critical: 5,
    }
    for (const [name, slot] of Object.entries(expected)) {
      assert.equal(UI.tagSlot(name), slot, `pinned slot for ${name}`)
    }
  })

  it('is case-insensitive and trims surrounding whitespace (valueKey)', () => {
    assert.equal(UI.tagSlot('Pricing'), UI.tagSlot('pricing'))
    assert.equal(UI.tagSlot('  AI  '), UI.tagSlot('ai'))
    assert.equal(UI.tagSlot('Core\n'), UI.tagSlot('core'))
  })

  it('covers the range 1..12 over 1,000 distinct names', () => {
    const seen = new Set()
    for (let i = 0; i < 1000; i++) {
      const slot = UI.tagSlot(`tag-name-${i}`)
      assert.ok(slot >= 1 && slot <= 12, `slot ${slot} must be in 1..12`)
      seen.add(slot)
    }
    // With 1,000 uniform FNV-1a hashes mod 12, all 12 slots should easily be populated
    assert.equal(seen.size, 12, 'all 12 slots should be populated across 1,000 tags')
  })
})
