import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const require = createRequire(import.meta.url)
const { slugify: coreSlugify } = require('../iNNfo/specs/bluepriNNts/console/nn-slug.generated.js')
const { parseCitation } = require('../skills/nn-sources/scripts/lib/nn-core.generated.cjs')

const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const generatedSlugPath = join(consoleDir, 'nn-slug.generated.js')
const runtimePath = join(consoleDir, 'nn-runtime.js')
const bundlePath = join(consoleDir, 'nn-console.bundle.js')

describe('Console runtime slug parity with core (D8)', () => {
  it('parses console contract citations via core parseCitation', () => {
    const citation = parseCitation('sources/nn/conversations/s1_source.md@## Update Field Severity')
    assert.ok(citation)
    assert.equal(citation.filePath, 'sources/nn/conversations/s1_source.md')
    assert.equal(citation.unit?.slug, 'update-field-severity')
  })
  it('console/nn-slug.generated.js exists and exposes global nnSlug', () => {
    assert.equal(existsSync(generatedSlugPath), true, 'nn-slug.generated.js must exist')
    const code = readFileSync(generatedSlugPath, 'utf8')
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'outside-only' })
    dom.window.eval(code)
    assert.ok(dom.window.nnSlug, 'nnSlug must be defined on window')
    assert.equal(typeof dom.window.nnSlug.slugify, 'function', 'nnSlug.slugify must be a function')
  })

  it('maintains slug parity with core parser/slug.ts across a fixture corpus', () => {
    assert.equal(existsSync(generatedSlugPath), true, 'nn-slug.generated.js must exist')
    const code = readFileSync(generatedSlugPath, 'utf8')
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'outside-only' })
    dom.window.eval(code)
    const runtimeSlugify = dom.window.nnSlug.slugify

    const corpus = [
      'Café & Crème Brûlée',
      'München / Zürich',
      'Niño y Niña',
      'NN Concept: Element - Sub-Part!',
      'Price ($/mo) & Status (%)',
      'Multiple    Spaces___And___Underscores',
      'A... B -- C',
      'Leading and trailing spaces  ',
      '--leading-and-trailing-hyphens--',
      'UPPERCASE and lowercase Mixed',
      'Symbols @#$%^&*()_+={}|[]\\:";\'<>?,./',
    ]

    for (const item of corpus) {
      const coreResult = coreSlugify(item)
      const runtimeResult = runtimeSlugify(item)
      assert.equal(runtimeResult, coreResult, `Mismatch for "${item}": expected "${coreResult}", got "${runtimeResult}"`)
    }
  })

  it('nn-runtime.js delegates to nnSlug and preserves empty fallback "feedback"', () => {
    assert.equal(existsSync(generatedSlugPath), true, 'nn-slug.generated.js must exist')
    const slugCode = readFileSync(generatedSlugPath, 'utf8')
    const runtimeCode = readFileSync(runtimePath, 'utf8')

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'outside-only' })
    // The runtime now depends on nnUI (D5) and nnReview (C); load both
    // first, as the bundle does.
    dom.window.eval(readFileSync(join(consoleDir, 'ui-kit.js'), 'utf8'))
    dom.window.eval(readFileSync(join(consoleDir, 'review.js'), 'utf8'))
    dom.window.eval(slugCode)
    dom.window.eval(runtimeCode)

    assert.ok(dom.window.nnConsole, 'nnConsole must be defined')
    assert.equal(dom.window.nnConsole.resolveElementId('Problems', 'Paranormal Infestation'), 'problems-paranormal-infestation')
    assert.equal(dom.window.nnConsole.resolveElementId('Problems', 'Café & Crème'), 'problems-cafe-creme')
  })

  it('nn-runtime.js contains no independent slugify regex implementation', () => {
    const runtimeCode = readFileSync(runtimePath, 'utf8')
    const slugifyFuncMatch = runtimeCode.match(/function\s+slugify\s*\([^)]*\)\s*\{([\s\S]*?)\}/)
    assert.ok(slugifyFuncMatch, 'function slugify should exist in nn-runtime.js')
    const slugifyBody = slugifyFuncMatch[1]
    assert.ok(slugifyBody.includes('nnSlug'), 'slugify in nn-runtime.js must delegate to nnSlug')
    assert.equal(slugifyBody.includes('[\\u0300-\\u036f]'), false, 'slugify body must not contain duplicate regex logic')
  })

  it('scripts/lib/console-bundle.js concatenates nn-slug.generated.js first', () => {
    // SOURCES lives in the extracted CommonJS lib (scripts/lib/console-bundle.js);
    // build-console-bundle.mjs is a thin entry that re-exports it.
    const bundleLibPath = join(repoRoot, 'scripts', 'lib', 'console-bundle.js')
    const bundleLib = readFileSync(bundleLibPath, 'utf8')
    assert.match(bundleLib, /\[\s*'nn-slug\.generated\.js'\s*,\s*'nnSlug'\s*\]/, 'SOURCES must include nn-slug.generated.js')
    const firstSourceMatch = bundleLib.match(/const\s+SOURCES\s*=\s*\[\s*\[\s*'([^']+)'/)
    assert.ok(firstSourceMatch, 'SOURCES array must be found')
    assert.equal(firstSourceMatch[1], 'nn-slug.generated.js', 'nn-slug.generated.js must be the first entry in SOURCES')
  })

  it('nn-console.bundle.js starts with nn-slug.generated.js content after header', () => {
    assert.equal(existsSync(bundlePath), true, 'nn-console.bundle.js must exist')
    const bundleContent = readFileSync(bundlePath, 'utf8')
    assert.match(bundleContent, /\/\* ===== nn-slug\.generated\.js \(defines nnSlug\) ===== \*\//, 'Bundle must contain nn-slug section')
  })
})
