// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const uiKitPath = join(consoleDir, 'ui-kit.js')

type InnfoUI = any

const UI = req(uiKitPath) as InnfoUI

const comp = (root: HTMLElement) => root.getAttribute('data-innfo-component')

describe('InnfoUI.ConceptPill', () => {
  it('renders data hooks, icon, label and count (no dot)', () => {
    // slot = (index mod 12) + 1, so index 1 -> slot 2
    const pill = UI.ConceptPill({ id: 'paranormal-threat', label: 'ParanormalThreat', index: 1, count: 3 })
    expect(comp(pill)).toBe('concept-pill')
    expect(pill.getAttribute('data-concept-id')).toBe('paranormal-threat')
    expect(pill.getAttribute('data-concept-slot')).toBe('2')
    expect(pill.querySelector('.innfo-concept-dot')).toBeNull()
    expect(pill.querySelector('.innfo-concept-pill-icon')).toBeTruthy()
    expect(pill.textContent).toContain('ParanormalThreat')
    expect(pill.querySelector('.innfo-concept-count')!.textContent).toBe(' (3)')
  })

  it('selects the slot from an explicit palette color (slot 2, CSS-token driven)', () => {
    const pill = UI.ConceptPill({ id: 'x', label: 'X', index: 14, color: 'violet' })
    expect(pill.getAttribute('data-concept-slot')).toBe('2')
    // The icon color is applied by CSS via --innfo-concept-<slot>, never inline.
    expect(UI.generateTokenCss()).toContain('[data-concept-slot="2"]')
  })

  it('maps grey to slot 12 and count without suffix if absent', () => {
    const pill = UI.ConceptPill({ id: 'x', label: 'X', index: 1, color: 'grey' })
    expect(pill.getAttribute('data-concept-slot')).toBe('12')
    expect(pill.querySelector('.innfo-concept-count')).toBeNull()
  })

  it('is a button that calls onSelect and is inert without one', () => {
    let called = 0
    const a = UI.ConceptPill({ id: 'x', label: 'X', index: 0 }, { onSelect: () => called++ })
    expect(a.tagName).toBe('BUTTON')
    a.click()
    expect(called).toBe(1)
    const b = UI.ConceptPill({ id: 'x', label: 'X', index: 0 })
    expect(b.tagName).toBe('SPAN')
  })

  it('throws TypeError naming the component on invalid data', () => {
    expect(() => UI.ConceptPill(null)).toThrow(TypeError)
    expect(() => UI.ConceptPill(null)).toThrow(/ConceptPill/)
  })

  it('uses no shadow DOM', () => {
    expect(UI.ConceptPill({ id: 'x', label: 'X', index: 0 }).shadowRoot).toBeNull()
  })
})

describe('InnfoUI.ElementPill', () => {
  it('renders data-element-id and an origin icon child', () => {
    const pill = UI.ElementPill({ id: 'slimer', label: 'Slimer', origin: 'agent' })
    expect(comp(pill)).toBe('element-pill')
    expect(pill.getAttribute('data-element-id')).toBe('slimer')
    expect(pill.querySelector('[data-origin=agent]')).toBeTruthy()
  })

  it('omits the origin icon when origin is absent', () => {
    const pill = UI.ElementPill({ id: 'x', label: 'X' })
    expect(pill.querySelector('[data-origin]')).toBeNull()
  })

  it('is an anchor when href is given, a button with onSelect, else a span', () => {
    const a = UI.ElementPill({ id: 'x', label: 'X' }, { href: '#el-x' })
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('#el-x')
    const b = UI.ElementPill({ id: 'x', label: 'X' }, { onSelect: () => {} })
    expect(b.tagName).toBe('BUTTON')
    expect(UI.ElementPill({ id: 'x', label: 'X' }).tagName).toBe('SPAN')
  })
})

describe('InnfoUI.StatusBadge', () => {
  it('renders data-status and text/aria from count', () => {
    const b = UI.StatusBadge({ status: 'applied', count: 4 })
    expect(comp(b)).toBe('status-badge')
    expect(b.getAttribute('data-status')).toBe('applied')
    expect(b.textContent).toBe('4')
    expect(b.getAttribute('aria-label')).toBe('4 applied')
  })

  it('falls back to the status as text and supports conflict/proposed', () => {
    const c = UI.StatusBadge({ status: 'conflict' })
    expect(c.textContent).toBe('conflict')
    expect(c.getAttribute('aria-label')).toBe('conflict')
    const p = UI.StatusBadge({ status: 'proposed' })
    expect(p.getAttribute('data-status')).toBe('proposed')
  })

  it('throws on unknown status', () => {
    expect(() => UI.StatusBadge({ status: 'bogus' })).toThrow(TypeError)
  })
})

describe('InnfoUI exports', () => {
  it('exposes slug, conceptSlot and ORIGIN_VARIANTS', () => {
    expect(typeof UI.slug).toBe('function')
    expect(UI.slug('Paranormal Threat')).toBe('paranormal-threat')
    expect(typeof UI.conceptSlot).toBe('function')
    expect(UI.conceptSlot({ index: 0 })).toBe(1)
    expect(UI.conceptSlot({ index: 12 })).toBe(1)
    expect(UI.conceptSlot({ index: 13 })).toBe(2)
    expect(Array.isArray(UI.ORIGIN_VARIANTS)).toBe(true)
    expect(UI.ORIGIN_VARIANTS).toEqual(['error', 'agent', 'human', 'reviewer', 'document'])
  })
})

describe('InnfoUI.icon', () => {
  const iconsPath = join(consoleDir, 'innfo-icons.js')

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an SVG for a built-in name', () => {
    expect(UI.icon('pin', 12)).toContain('<svg')
    expect(UI.icon('cite-agent', 12)).toContain('<svg')
  })

  it('falls back to a generic SVG for an unknown name instead of throwing', () => {
    // Without the lucide catalog loaded: inline help-circle fallback.
    const svg = UI.icon('no-such-icon', 20)
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="20"')
    expect(svg).toContain('innfo-icon')
  })

  it('resolves non-built-in names through the lucide catalog when it is loaded', () => {
    vi.stubGlobal('InnfoIcons', req(iconsPath))
    const svg = UI.icon('trash-2', 14)
    expect(svg).toContain('lucide-trash-2')
    expect(svg).toContain('innfo-icon')
  })
})
