import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The integrity modules are re-exported from `browser.ts`, so they must stay
 * free of Node built-ins, `require`, and `fetch`. Guard it statically — a
 * forbidden import here would break the browser bundle.
 */
const MODULES = ['./versionStatus.ts', './report.ts']

const FORBIDDEN: Array<[RegExp, string]> = [
  [/from\s+['"]node:/, "import from 'node:*'"],
  [/from\s+['"](fs|path|url|crypto|os|http|https)['"]/, 'import from a Node core module'],
  [/\brequire\s*\(/, 'require() call'],
  [/\bimport\s*\(/, 'dynamic import()'],
  [/\bfetch\s*\(/, 'fetch() call'],
]

describe('integrity module purity', () => {
  it.each(MODULES)('%s has no Node / network imports', (rel) => {
    const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8')
    for (const [pattern, label] of FORBIDDEN) {
      expect(pattern.test(src), `${rel} must not contain ${label}`).toBe(false)
    }
  })
})
