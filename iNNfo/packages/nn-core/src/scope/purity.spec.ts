import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The fold and the chain builder are pure: the same input gives the same output with no
 * filesystem, clock or network. The `fs-*` files are the thin adapters, the only place
 * allowed to touch Node I/O. Guard it statically, the same way as the integrity modules.
 */
const PURE_MODULES = ['./types.ts', './chain.ts', './stem-collision.ts']

const FORBIDDEN: Array<[RegExp, string]> = [
  [/from\s+['"]node:/, "import from 'node:*'"],
  [/from\s+['"](fs|path|url|crypto|os|http|https)['"]/, 'import from a Node core module'],
  [/from\s+['"]\.\/(fs-[\w-]+|root)\.js['"]/, 'import of an fs adapter'],
  [/\brequire\s*\(/, 'require() call'],
  [/\bimport\s*\(/, 'dynamic import()'],
  [/\bfetch\s*\(/, 'fetch() call'],
  [/\bDate\.now\s*\(|\bnew Date\s*\(|\bMath\.random\s*\(/, 'clock or randomness'],
]

const dirUrl = new URL('./', import.meta.url)
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8')

describe('scope module purity', () => {
  it.each(PURE_MODULES)('%s has no Node I/O, adapter import, clock or randomness', (rel) => {
    const src = read(rel)
    for (const [pattern, label] of FORBIDDEN) {
      expect(pattern.test(src), `${rel} must not contain ${label}`).toBe(false)
    }
  })
})

/** The core names no consumer: tests and fixtures may, the module may not. */
const CONSUMER_VOCABULARY = /\b(video|series|projects?|programa)\b/i

describe('scope module genericity', () => {
  const sources = readdirSync(dirUrl)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'))
    .map((name) => `./${name}`)

  it('finds the module sources it is meant to guard', () => {
    expect(sources).toContain('./chain.ts')
    expect(sources).toContain('./fs-chain.ts')
  })

  it.each(sources)('%s contains no consumer vocabulary', (rel) => {
    const offending = read(rel)
      .split('\n')
      .map((text, i) => ({ text, line: i + 1 }))
      .filter(({ text }) => CONSUMER_VOCABULARY.test(text))
    expect(offending, `${rel} names a consumer concept`).toEqual([])
  })
})
