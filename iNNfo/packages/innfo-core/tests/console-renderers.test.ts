import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const viewerAsset = join(
  here,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'workspace',
  'assets',
  'model_console.html',
)

const renderer = readFileSync(join(consoleDir, 'render-model-viewer.js'), 'utf8')
const asset = readFileSync(viewerAsset, 'utf8')

describe('model-viewer renderer packaging', () => {
  it('exposes a UMD global without module primitives', () => {
    expect(renderer).toContain('root.InnfoModelViewer')
    expect(renderer).toContain('module.exports')
    expect(renderer).toContain('RENDERER_VERSION')
    expect(renderer).not.toContain('type="module"')
    expect(renderer).not.toContain('importmap')
  })

  it('performs no network fetch of its own', () => {
    expect(renderer).not.toMatch(/fetch\s*\(/)
  })

  it('boots only on the model_viewer shell DOM', () => {
    expect(renderer).toContain("getElementById('doc-title')")
    expect(renderer).toContain("getElementById('rail')")
  })

  it('keeps the domain behaviors: markers, relations, matrices, hash routing', () => {
    // chip/conceptColor moved into InnfoUI; the viewer keeps these behaviors.
    for (const token of ['rel-list', 'matrix-block', 'hashchange', 'InnfoUI', 'ConceptPill', 'ElementCard']) {
      expect(renderer).toContain(token)
    }
  })
})

describe('model_viewer asset seam', () => {
  it('loads the renderer via static tags only (CDN, mirror, vendored)', () => {
    expect(asset).toContain('innfo-console.bundle.js')
    expect(asset).not.toContain('type="module"')
  })

  it('ships zero inline logic script blocks', () => {
    const inlineLogic = asset.match(/<script(?![^>]*src=)(?![^>]*application\/json)/g) || []
    expect(inlineLogic).toEqual([])
  })
})
