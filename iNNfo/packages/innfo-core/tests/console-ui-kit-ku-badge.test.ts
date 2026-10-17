// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const UI = req(join(consoleDir, 'ui-kit.js')) as any

const comp = (root: HTMLElement) => root.getAttribute('data-innfo-component')

describe('InnfoUI.KuBadge', () => {
  it('renders ku-badge + data-ku-kind + the kind-specific hook for every kind', () => {
    const cases: Array<[string, any, string, string]> = [
      ['document', { kind: 'document', id: 'doc', label: 'Doc', index: 0 }, 'data-concept-id', 'doc'],
      ['concept', { kind: 'concept', id: 'c1', label: 'Revenue', index: 2 }, 'data-concept-id', 'c1'],
      ['element', { kind: 'element', id: 'slimer', label: 'Slimer', index: 1 }, 'data-element-id', 'slimer'],
      ['field', { kind: 'field', name: 'owner', value: 'Slimer' }, 'data-field', 'owner'],
      ['cell', { kind: 'cell', value: 'x' }, 'data-ku-kind', 'cell'],
      ['reference', { kind: 'reference', id: 'gozer', label: 'Gozer' }, 'data-element-id', 'gozer'],
    ]
    for (const [kind, data, attr, expected] of cases) {
      const badge = UI.KuBadge({ ...data, kind })
      expect(comp(badge)).toBe('ku-badge')
      expect(badge.getAttribute('data-ku-kind')).toBe(kind)
      expect(badge.getAttribute(attr)).toBe(expected)
    }
  })

  it('renders a field badge as name: value with data-field', () => {
    const badge = UI.KuBadge({ kind: 'field', name: 'owner', value: 'Slimer' })
    expect(badge.getAttribute('data-field')).toBe('owner')
    expect(badge.textContent).toContain('owner')
    expect(badge.textContent).toContain('Slimer')
  })

  it('renders field badge values unclipped (wrap instead of ellipsis)', () => {
    const fieldRule = UI.generateTokenCss()
      .split('\n')
      .find((l: string) => l.includes('[data-ku-kind=field] .innfo-ku-value'))
    expect(fieldRule).toBeTruthy()
    expect(fieldRule).toContain('white-space:normal')
    expect(fieldRule).toContain('text-overflow:clip')
    expect(fieldRule).not.toContain('ellipsis')
  })

  it('carries a concept slot and a tint token for concept/document badges', () => {
    const badge = UI.KuBadge({ kind: 'concept', id: 'c1', label: 'Revenue', index: 2 })
    expect(badge.getAttribute('data-concept-slot')).toBe('3')
    expect(UI.generateTokenCss()).toContain('--innfo-concept-3-bg')
  })

  it('element badge is non-interactive when it carries actions, a link otherwise', () => {
    const withAction = UI.KuBadge({ kind: 'element', id: 'x', label: 'X', index: 0 }, { onInfo: () => {} })
    expect(withAction.tagName).toBe('SPAN')
    const withHref = UI.KuBadge({ kind: 'reference', id: 'x', label: 'X' }, { href: '#el-x' })
    expect(withHref.tagName).toBe('A')
    expect(withHref.getAttribute('href')).toBe('#el-x')
  })

  it('renders a change pip only when changes > 0', () => {
    const withPip = UI.KuBadge({ kind: 'field', name: 'x', value: 'v', changes: 2 })
    expect(withPip.getAttribute('data-ku-changes')).toBe('2')
    expect(withPip.querySelector('[data-innfo-component=ku-change-pip]')!.textContent).toBe('2')
    const without = UI.KuBadge({ kind: 'field', name: 'x', value: 'v' })
    expect(without.querySelector('[data-innfo-component=ku-change-pip]')).toBeNull()
  })

  it('never nests an action inside an interactive root', () => {
    const badge = UI.KuBadge(
      { kind: 'element', id: 'x', label: 'X', index: 0 },
      { onInfo: () => {}, href: '#el-x' },
    )
    expect(badge.tagName).toBe('SPAN')
  })

  it('is inert text for an injected label', () => {
    const badge = UI.KuBadge({ kind: 'element', id: 'x', label: '<img src=x onerror=alert(1)>', index: 0 })
    expect(badge.querySelector('img')).toBeNull()
    expect(badge.textContent).toContain('<img')
  })

  it('throws TypeError naming KuBadge on invalid data', () => {
    expect(() => UI.KuBadge(null)).toThrow(TypeError)
    expect(() => UI.KuBadge(null)).toThrow(/KuBadge/)
  })
})

describe('InnfoUI.KuActions', () => {
  it('renders info always, edit only when a callback is given', () => {
    const infoOnly = UI.KuActions({}, { onInfo: () => {} })
    expect(comp(infoOnly)).toBe('ku-actions')
    expect(infoOnly.querySelector('[data-ku-action=info]')).toBeTruthy()
    expect(infoOnly.querySelector('[data-ku-action=edit]')).toBeNull()

    const onEdit = vi.fn()
    const both = UI.KuActions({}, { onInfo: () => {}, onEdit })
    both.querySelector('[data-ku-action=edit]')!.dispatchEvent(new Event('click', { bubbles: true }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onInfo on click', () => {
    const onInfo = vi.fn()
    const cluster = UI.KuActions({}, { onInfo })
    cluster.querySelector('[data-ku-action=info]')!.dispatchEvent(new Event('click', { bubbles: true }))
    expect(onInfo).toHaveBeenCalledTimes(1)
  })
})
