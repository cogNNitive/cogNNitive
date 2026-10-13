import { describe, it, expect } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(
  here,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'console',
  'innfo-runtime.js',
)

// nodeRequire aliases Node's require so the browser-first UMD bundle loads in tests.
const nodeRequire = createRequire(import.meta.url)

interface RuntimeNaming {
  slugify: (value: string) => string
}

function loadNaming(): RuntimeNaming {
  return nodeRequire(runtimePath) as RuntimeNaming
}

describe('slugify (export identifier to changeset author slug)', () => {
  it('lowercases and hyphenates a human identifier', () => {
    expect(loadNaming().slugify('Round 2 Review')).toBe('round-2-review')
  })

  it('collapses separators and strips edge hyphens', () => {
    expect(loadNaming().slugify('  Client -- feedback!! ')).toBe('client-feedback')
  })

  it('falls back to "feedback" for empty identifiers', () => {
    expect(loadNaming().slugify('')).toBe('feedback')
    expect(loadNaming().slugify('!!!')).toBe('feedback')
  })
})
