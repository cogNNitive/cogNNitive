// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const uiKitPath = join(consoleDir, 'ui-kit.js')
const sinkJsPath = join(import.meta.dirname!, 'fixtures', 'console-kitchen-sink', 'kitchen-sink.js')

const UI = req(uiKitPath) as any

// Components implemented in slice b (c1/c2/f extend this list).
const IMPLEMENTED = ['concept-pill', 'element-pill', 'marker-chip', 'status-badge']

describe('console ui-kit kitchen sink', () => {
  it('the fixture boots offline with no fetch and no module system', () => {
    const js = readFileSync(sinkJsPath, 'utf8')
    expect(js).not.toContain('fetch(')
    const html = readFileSync(join(import.meta.dirname!, 'fixtures', 'console-kitchen-sink', 'index.html'), 'utf8')
    expect(html).not.toContain('type="module"')
    expect(html).toContain('ui-kit.js')
  })

  it('renders every implemented data-innfo-component under both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      const root = document.createElement('main')
      root.setAttribute('data-theme', theme)
      document.body.appendChild(root)
      // Mirror kitchen-sink.js build() without executing the DOMContentLoaded boot.
      root.appendChild(UI.ConceptPill({ id: 'c', label: 'C', index: 0, count: 1 }))
      root.appendChild(UI.ElementPill({ id: 'e', label: 'E', origin: 'agent' }))
      root.appendChild(UI.MarkerChip({ id: 'm', label: 'M', kind: 'field', value: 'v' }))
      root.appendChild(UI.StatusBadge({ status: 'pending', count: 2 }))
      for (const name of IMPLEMENTED) {
        expect(
          root.querySelector(`[data-innfo-component=${name}]`),
          `${name} must render under data-theme="${theme}"`,
        ).toBeTruthy()
      }
    }
  })
})
