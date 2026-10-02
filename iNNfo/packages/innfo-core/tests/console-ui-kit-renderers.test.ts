// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const kitPath = join(consoleDir, 'ui-kit.js')

const UI = req(kitPath) as any

const schema = {
  concepts: [
    { name: 'ParanormalThreat', weight: 1 },
    { name: 'ContainmentEquipment', weight: 5 },
  ],
}
const model = {
  meta: { title: 'GhostbustersModel', modelVersion: 'V_0-2-1' },
  elements: [
    {
      id: 'slimer',
      concept: 'ParanormalThreat',
      name: 'Slimer',
      description: 'A gluttonous ghost',
      fields: { owner: 'None' },
      markers: { Severity: 'high' },
      citations: { owner: [{ origin: 'agent', field: 'owner' }] },
    },
  ],
}

function mountViewerDom() {
  document.head.innerHTML = ''
  document.body.innerHTML = `
    <h1 id="doc-title"></h1>
    <div id="doc-meta"></div>
    <nav id="rail"></nav>
    <input id="search" />
    <div id="content"></div>
    <script type="application/json" id="innfo-schema">${JSON.stringify(schema)}</script>
    <script type="application/json" id="innfo-model">${JSON.stringify(model)}</script>
  `
}

describe('console ui-kit renderer migrations', () => {
  beforeEach(() => {
    ;(globalThis as any).InnfoUI = UI
    mountViewerDom()
  })

  it('the viewer composes ElementCard / MarkerChip / CitationIcon from the kit', () => {
    const viewer = req(join(consoleDir, 'render-model-viewer.js'))
    viewer.boot()
    const content = document.getElementById('content')!
    expect(content.querySelector('[data-innfo-component=element-card]')).toBeTruthy()
    expect(content.querySelector('[data-innfo-component=marker-chip]')).toBeTruthy()
    expect(content.querySelector('[data-innfo-component=citation-icon]')).toBeTruthy()
    expect(content.querySelector('table.fields')).toBeNull()
  })

  it('viewer no longer emits legacy chip / el-head classes', () => {
    const src = readFileSync(join(consoleDir, 'render-model-viewer.js'), 'utf8')
    expect(src).not.toContain("className = 'chip'")
    expect(src).not.toContain('el-head')
  })

  it('goal check: the viewer drops its legacy builders (c2.4)', () => {
    // Scope is the migrated viewer only; render-procedure-stepper.js is an
    // explicit non-goal and the runtime keeps its own unrelated COLORS map.
    const src = readFileSync(join(consoleDir, 'render-model-viewer.js'), 'utf8')
    for (const token of ["className = 'chip'", 'el-head', 'citationButtons', 'ORIGIN_VARIANT_ORDER']) {
      expect(src, `viewer must not contain ${token}`).not.toContain(token)
    }
    expect(src).not.toContain('var COLORS')
  })

  it('the viewer throws the D5 error when the kit is absent', () => {
    // Isolate the viewer in a fresh module registry with no InnfoUI.
    const isolated = createRequire(import.meta.url)
    const kitResolved = isolated.resolve(kitPath)
    const savedKit = isolated.cache[kitResolved]
    const savedGlobal = (globalThis as any).InnfoUI
    try {
      delete isolated.cache[kitResolved]
      ;(globalThis as any).InnfoUI = undefined
      ;(globalThis as any).window = globalThis
      ;(globalThis as any).window.InnfoUI = undefined
      delete (globalThis as any).InnfoConsole
      // Force the CJS branch to run the D5 guard.
      delete isolated.cache[isolated.resolve(join(consoleDir, 'render-model-viewer.js'))]
      // Stub the kit module to export nothing so factory gets a falsy UI.
      isolated.cache[kitResolved] = { id: kitResolved, filename: kitResolved, loaded: true, exports: undefined } as any
      expect(() => isolated(join(consoleDir, 'render-model-viewer.js'))).toThrow(/InnfoUI missing/i)
    } finally {
      isolated.cache[kitResolved] = savedKit
      ;(globalThis as any).InnfoUI = savedGlobal
    }
  })
})
