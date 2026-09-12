import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const templatesDir = join(here, '..', '..', '..', 'specs', 'templates')

const assets = {
  master: join(templatesDir, 'business', 'assets', 'master.html'),
  viewer: join(templatesDir, 'business', 'assets', 'model_viewer.html'),
  timeline: join(templatesDir, 'metrics', 'assets', 'timeline.html'),
}

// Markers that would indicate a duplicated inline copy of the shared runtime.
// Static <script src="...innfo-runtime.js"> tags are REQUIRED (not markers).
const INLINE_RUNTIME_MARKERS = [
  'INNFO_RUNTIME_INLINE',
  'innfo-runtime-inline',
  'window.InnfoConsole=',
  'window.InnfoConsole =',
]

function readAsset(path: string): string {
  return readFileSync(path, 'utf8')
}

describe.each([
  ['master', assets.master],
  ['viewer', assets.viewer],
  ['timeline', assets.timeline],
])('%s console asset', (_name, path) => {
  it('declares an innfo-config block with a needs[] capability list', () => {
    const html = readAsset(path)
    expect(html).toContain('id="innfo-config"')
    const match = html.match(/<script[^>]*id="innfo-config"[^>]*>([\s\S]*?)<\/script>/)
    expect(match).not.toBe(null)
    const config = JSON.parse((match as RegExpMatchArray)[1]) as { needs: string[] }
    expect(Array.isArray(config.needs)).toBe(true)
    expect(config.needs.length).toBeGreaterThan(0)
  })

  it('loads a shared runtime via static script tags', () => {
    const html = readAsset(path)
    expect(html).toMatch(/innfo-(runtime|console\.bundle)\.js/)
    expect(html).not.toContain('type="module"')
  })

  it('ships no duplicated inline runtime block', () => {
    const html = readAsset(path)
    for (const marker of INLINE_RUNTIME_MARKERS) {
      expect(html).not.toContain(marker)
    }
  })
})

describe('viewer slot payloads', () => {
  it('keeps the #innfo-schema and #innfo-model slots', () => {
    const html = readAsset(assets.viewer)
    expect(html).toContain('id="innfo-schema"')
    expect(html).toContain('id="innfo-model"')
  })
})

describe('master slot payloads', () => {
  it('keeps the innfo-model-data slot', () => {
    const html = readAsset(assets.master)
    expect(html).toContain('id="innfo-model-data"')
  })
})

// The timeline asset is a template blue-print shell: it declares the shared
// console bundle (innfo-console.bundle.js), NOT the legacy innfo-runtime.js,
// and carries the two blueprint JSON slots. Inline dashboard engine markers
// (MODEL_DATA/FORMULAS/DEPS/SERIES/SEASON as code) must not survive.
describe('timeline slot payloads', () => {
  it('boots the shared console bundle (not the legacy innfo-runtime.js)', () => {
    const html = readAsset(assets.timeline)
    expect(html).toContain('innfo-console.bundle.js')
    expect(html).not.toContain('innfo-runtime.js')
  })

  it('keeps the innfo-schema and innfo-model blueprint slots', () => {
    const html = readAsset(assets.timeline)
    expect(html).toContain('id="innfo-schema"')
    expect(html).toContain('id="innfo-model"')
  })

  it('ships no inline dashboard engine blocks', () => {
    const html = readAsset(assets.timeline)
    for (const marker of [
      'const MODEL_DATA',
      'const FORMULAS',
      'const DEPS',
      'const SERIES',
      'const SEASON',
      'new uPlot',
    ]) {
      expect(html).not.toContain(marker)
    }
  })
})
