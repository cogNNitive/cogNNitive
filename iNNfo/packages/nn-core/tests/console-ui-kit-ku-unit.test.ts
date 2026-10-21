// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const UI = req(join(consoleDir, 'ui-kit.js')) as any

const KINDS: Array<[string, any, string, string]> = [
  ['domain', {}, 'container', 'domain'],
  ['document', { id: 'm' }, 'container', 'knowledge'],
  ['section', { model: 'm', concept: 'Goals' }, 'container', 'knowledge'],
  ['concept', { model: 'm', concept: 'Goals' }, 'structure', 'knowledge'],
  ['field', { model: 'm', concept: 'Goals', name: 'owner' }, 'structure', 'knowledge'],
  ['matrix', { model: 'm', name: 'Access' }, 'structure', 'knowledge'],
  ['element', { model: 'm', id: 'slimer', label: 'Slimer' }, 'content', 'knowledge'],
  ['value', { model: 'm', element: 'slimer', field: 'role', value: 'Trap' }, 'content', 'knowledge'],
  ['source', { model: 'm', path: 'sources/x.md' }, 'content', 'knowledge'],
]

describe('describeUnit', () => {
  it('derives nature, home and address for every kind', () => {
    for (const [kind, ref] of KINDS) {
      const d = UI.describeUnit(kind, ref, 0)
      expect(d.kind).toBe(kind)
      expect(typeof d.address).toBe('string')
      expect(d.address.length).toBeGreaterThan(0)
    }
    expect(UI.describeUnit('domain', {}).nature).toBe('container')
    expect(UI.describeUnit('domain', {}).home).toBe('domain')
    expect(UI.describeUnit('field', KINDS[4][1]).editability).toBe('structure')
    expect(UI.describeUnit('source', KINDS[8][1]).editability).toBe('none')
    expect(UI.describeUnit('element', KINDS[6][1]).editability).toBe('review')
  })

  it('throws a TypeError on an unknown kind', () => {
    expect(() => UI.describeUnit('unknown-kind', {})).toThrow(/unknown kind/)
  })
})

describe('Ku', () => {
  it('renders a ku-unit with kind/nature/home/address and an aria-label', () => {
    const wrap = UI.Ku('element', KINDS[6][1])
    const badge = wrap.querySelector('[data-innfo-component="ku-unit"]')!
    expect(badge.getAttribute('data-ku-kind')).toBe('element')
    expect(badge.getAttribute('data-ku-nature')).toBe('content')
    expect(badge.getAttribute('data-ku-home')).toBe('knowledge')
    expect(badge.getAttribute('data-ku-address')).toBeTruthy()
    expect(badge.getAttribute('aria-label')).toMatch(/content/)
    expect(badge.getAttribute('aria-label')).toMatch(/knowledge/)
  })

  it('always has an info action; edit only when editability is not none', () => {
    const content = UI.Ku('element', KINDS[6][1])
    expect(content.querySelector('[data-ku-action="info"]')).toBeTruthy()
    expect(content.querySelector('[data-ku-action="edit"]')).toBeTruthy()

    const container = UI.Ku('domain', {})
    expect(container.querySelector('[data-ku-action="info"]')).toBeTruthy()
    expect(container.querySelector('[data-ku-action="edit"]')).toBeNull()
  })

  it('keeps the action cluster outside the badge root', () => {
    const wrap = UI.Ku('element', KINDS[6][1])
    const badge = wrap.querySelector('[data-innfo-component="ku-unit"]')!
    expect(badge.querySelector('[data-ku-action]')).toBeNull()
    expect(wrap.querySelector('.innfo-ku-actions [data-ku-action="info"]')).toBeTruthy()
  })

  it('renders a block variant', () => {
    const body = document.createElement('pre')
    const wrap = UI.Ku('value', KINDS[7][1], { variant: 'block', body })
    const badge = wrap.querySelector('[data-innfo-component="ku-unit"]')!
    expect(badge.getAttribute('data-ku-variant')).toBe('block')
    expect(badge.contains(body)).toBe(true)
  })

  it('colors a tags value with tagSlot', () => {
    const d = UI.describeUnit('value', { model: 'm', element: 'e', field: 'tags', value: 'pricing' })
    expect(d.slot).toBe(UI.tagSlot('pricing'))
  })

  it('renders hostile text inert', () => {
    const wrap = UI.Ku('element', { model: 'm', id: 'x', label: '<img src=x onerror=alert(1)>' })
    expect(wrap.querySelector('img')).toBeNull()
    expect(wrap.textContent).toMatch(/<img src=x onerror=alert\(1\)>/)
  })
})

describe('KuInfoPanel', () => {
  it('renders an accessible dialog with the unit metadata', () => {
    const d = UI.describeUnit('field', KINDS[4][1])
    const dlg = UI.KuInfoPanel(d)
    expect(dlg.tagName.toLowerCase()).toBe('dialog')
    expect(dlg.getAttribute('role')).toBe('dialog')
    expect(dlg.textContent).toMatch(/structure/)
    expect(dlg.querySelector('h2')).toBeTruthy()
  })
})

describe('setUnitChanges', () => {
  it('paints and clears address-keyed pips without re-rendering the badge', () => {
    const wrap = UI.Ku('value', { model: 'm', element: 'slimer', field: 'owner', value: 'Egon' })
    document.body.appendChild(wrap)
    const badge = wrap.querySelector('[data-innfo-component="ku-unit"]') as HTMLElement
    const address = badge.getAttribute('data-ku-address')!

    UI.setUnitChanges(document, { [address]: 2 })
    expect(badge.getAttribute('data-ku-changes')).toBe('2')
    expect(wrap.querySelector('[data-innfo-component="ku-change-pip"]')!.textContent).toBe('2')

    UI.setUnitChanges(document, {})
    expect(badge.getAttribute('data-ku-changes')).toBeNull()
    expect(wrap.querySelector('[data-innfo-component="ku-change-pip"]')).toBeNull()

    wrap.remove()
  })
})
