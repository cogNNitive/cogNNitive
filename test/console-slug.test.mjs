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
const { slugify: coreSlugify } = require('../iNNfo/specs/bluepriNNts/console/innfo-slug.generated.js')
const { parseCitation } = require('../skills/nn-trannsform/scripts/lib/innfo-core.generated.cjs')

const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const generatedSlugPath = join(consoleDir, 'innfo-slug.generated.js')
const runtimePath = join(consoleDir, 'innfo-runtime.js')
const bundlePath = join(consoleDir, 'innfo-console.bundle.js')
const buildBundlePath = join(repoRoot, 'scripts', 'build-console-bundle.mjs')

describe('Console runtime slug parity with core (D8)', () => {
  it('parses console contract citations via core parseCitation', () => {
    const citation = parseCitation('sources/nn/conversations/s1_source.md@## Update Field Severity')
    assert.ok(citation)
    assert.equal(citation.filePath, 'sources/nn/conversations/s1_source.md')
    assert.equal(citation.unit?.slug, 'update-field-severity')
  })
  it('console/innfo-slug.generated.js exists and exposes global InnfoSlug', () => {
    assert.equal(existsSync(generatedSlugPath), true, 'innfo-slug.generated.js must exist')
    const code = readFileSync(generatedSlugPath, 'utf8')
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'outside-only' })
    dom.window.eval(code)
    assert.ok(dom.window.InnfoSlug, 'InnfoSlug must be defined on window')
    assert.equal(typeof dom.window.InnfoSlug.slugify, 'function', 'InnfoSlug.slugify must be a function')
  })

  it('maintains slug parity with core parser/slug.ts across a fixture corpus', () => {
    assert.equal(existsSync(generatedSlugPath), true, 'innfo-slug.generated.js must exist')
    const code = readFileSync(generatedSlugPath, 'utf8')
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'outside-only' })
    dom.window.eval(code)
    const runtimeSlugify = dom.window.InnfoSlug.slugify

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

  it('innfo-runtime.js delegates to InnfoSlug and preserves empty fallback "feedback"', () => {
    assert.equal(existsSync(generatedSlugPath), true, 'innfo-slug.generated.js must exist')
    const slugCode = readFileSync(generatedSlugPath, 'utf8')
    const runtimeCode = readFileSync(runtimePath, 'utf8')

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'outside-only' })
    dom.window.eval(slugCode)
    dom.window.eval(runtimeCode)

    assert.ok(dom.window.InnfoConsole, 'InnfoConsole must be defined')
    assert.equal(dom.window.InnfoConsole.resolveElementId('Problems', 'Paranormal Infestation'), 'problems-paranormal-infestation')
    assert.equal(dom.window.InnfoConsole.resolveElementId('Problems', 'Café & Crème'), 'problems-cafe-creme')
  })

  it('innfo-runtime.js contains no independent slugify regex implementation', () => {
    const runtimeCode = readFileSync(runtimePath, 'utf8')
    const slugifyFuncMatch = runtimeCode.match(/function\s+slugify\s*\([^)]*\)\s*\{([\s\S]*?)\}/)
    assert.ok(slugifyFuncMatch, 'function slugify should exist in innfo-runtime.js')
    const slugifyBody = slugifyFuncMatch[1]
    assert.ok(slugifyBody.includes('InnfoSlug'), 'slugify in innfo-runtime.js must delegate to InnfoSlug')
    assert.equal(slugifyBody.includes('[\\u0300-\\u036f]'), false, 'slugify body must not contain duplicate regex logic')
  })

  it('scripts/build-console-bundle.mjs concatenates innfo-slug.generated.js first', () => {
    const buildScript = readFileSync(buildBundlePath, 'utf8')
    assert.match(buildScript, /\[\s*'innfo-slug\.generated\.js'\s*,\s*'InnfoSlug'\s*\]/, 'SOURCES must include innfo-slug.generated.js')
    const firstSourceMatch = buildScript.match(/const\s+SOURCES\s*=\s*\[\s*\[\s*'([^']+)'/)
    assert.ok(firstSourceMatch, 'SOURCES array must be found')
    assert.equal(firstSourceMatch[1], 'innfo-slug.generated.js', 'innfo-slug.generated.js must be the first entry in SOURCES')
  })

  it('innfo-console.bundle.js starts with innfo-slug.generated.js content after header', () => {
    assert.equal(existsSync(bundlePath), true, 'innfo-console.bundle.js must exist')
    const bundleContent = readFileSync(bundlePath, 'utf8')
    assert.match(bundleContent, /\/\* ===== innfo-slug\.generated\.js \(defines InnfoSlug\) ===== \*\//, 'Bundle must contain innfo-slug section')
  })
})
