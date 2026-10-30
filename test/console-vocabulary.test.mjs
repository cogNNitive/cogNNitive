import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')

const SOURCES = ['ui-kit.js', 'review.js', 'studio.js', 'nn-runtime.js']
const BANNED = [/provenance/i, /traceability/i, /grounding/i]

describe('console vocabulary', () => {
  it('uses only Source / Citation / Lineage (no provenance / traceability / grounding)', () => {
    for (const file of SOURCES) {
      const text = readFileSync(join(consoleDir, file), 'utf-8')
      for (const re of BANNED) {
        assert.doesNotMatch(text, re, `${file} must not use ${re}`)
      }
    }
  })

  it('labels the element modal tab "Changes"', () => {
    const ui = readFileSync(join(consoleDir, 'ui-kit.js'), 'utf-8')
    assert.match(ui, /'Changes'/)
    assert.doesNotMatch(ui, /History & Provenance/)
  })
})
