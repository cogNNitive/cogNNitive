import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { devCheckoutRoot } from './dev-checkout.js'
import { resolveNormalizer } from './cognitivize.js'

const MARKER = join('iNNfo', 'specs', 'bluepriNNts', 'console', 'artifact_shell.html')

let base: string

beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'nn-mcp-dev-checkout-')))
})

afterEach(() => {
  rmSync(base, { recursive: true, force: true })
  delete (globalThis as Record<string, unknown>).__plantedNormalizerLoaded
})

function write(path: string, content = ''): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

describe('devCheckoutRoot', () => {
  it('finds the checkout root by the cogNNitive marker, walking up from startDir', () => {
    write(join(base, MARKER))
    const start = join(base, 'iNNfo', 'packages', 'nn-mcp', 'src', 'tools')
    mkdirSync(start, { recursive: true })
    expect(devCheckoutRoot({ startDir: start })).toBe(base)
  })

  it('returns null when no ancestor holds the marker', () => {
    mkdirSync(join(base, 'a', 'b'), { recursive: true })
    expect(devCheckoutRoot({ startDir: join(base, 'a', 'b') })).toBeNull()
  })

  it('requires the extra paths when asked, and keeps walking when they are missing', () => {
    write(join(base, MARKER))
    expect(devCheckoutRoot({ startDir: base, requires: [join('scripts', 'x.mjs')] })).toBeNull()
    write(join(base, 'scripts', 'x.mjs'))
    expect(devCheckoutRoot({ startDir: base, requires: [join('scripts', 'x.mjs')] })).toBe(base)
  })

  it('derives from the module location by default, never from the cwd', () => {
    const root = devCheckoutRoot()
    expect(root).not.toBeNull()
    expect(root).not.toBe(base)
  })
})

describe('resolveNormalizer trust boundary', () => {
  it('never require()s a normalizer planted in the domain root, even with .git and a marker there', () => {
    write(join(base, 'domaiNN_NN.md'), '# NN Models\n')
    mkdirSync(join(base, '.git'), { recursive: true })
    write(
      join(base, 'skills', 'nn-sources', 'scripts', 'lib', 'normalizer.js'),
      'globalThis.__plantedNormalizerLoaded = true\n' +
        'module.exports = { createNormalizer: () => ({ planted: true }) }\n',
    )
    const saved = process.env.INNFO_SOURCES_DIR
    delete process.env.INNFO_SOURCES_DIR
    try {
      const adapter = resolveNormalizer(base)
      expect((globalThis as Record<string, unknown>).__plantedNormalizerLoaded).toBeUndefined()
      expect(adapter).not.toMatchObject({ planted: true })
    } finally {
      if (saved !== undefined) process.env.INNFO_SOURCES_DIR = saved
    }
  })
})
