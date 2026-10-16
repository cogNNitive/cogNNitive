// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const uiKitPath = join(consoleDir, 'ui-kit.js')

const UI = req(uiKitPath) as any
const comp = (root: HTMLElement) => root.getAttribute('data-innfo-component')

const field = (name: string, value: string, extra: any = {}) => ({ name, value, ...extra })

describe('InnfoUI.ElementCard', () => {
  it('renders a card with head, name and 3 field rows', () => {
    const card = UI.ElementCard(
      {
        id: 'slimer',
        name: 'Slimer',
        conceptId: 'paranormal-threat',
        description: 'A gluttonous ghost',
        fields: [field('Field1', 'A'), field('Field2', 'B'), field('Field3', 'C')],
      },
    )
    expect(comp(card)).toBe('element-card')
    expect(card.getAttribute('data-element-id')).toBe('slimer')
    expect(card.getAttribute('data-concept-id')).toBe('paranormal-threat')
    expect(card.querySelector('.innfo-card-head [data-ku-kind=element]')!.textContent).toBe('Slimer')
    expect(card.querySelectorAll('[data-ku-kind=field]').length).toBe(3)
    expect(card.querySelector('.innfo-card-desc')!.textContent).toBe('A gluttonous ghost')
  })

  it('renders an empty fields list without throwing', () => {
    const card = UI.ElementCard({ id: 'x', name: 'X', fields: [] })
    expect(card.querySelectorAll('[data-ku-kind=field]').length).toBe(0)
  })

  it('renders markers as marker-chip', () => {
    const card = UI.ElementCard({
      id: 'x',
      name: 'X',
      markers: [{ id: 'm', label: 'M', kind: 'field', value: 'v' }],
      fields: [],
    })
    expect(comp(card.querySelector('[data-marker-id]') as HTMLElement)).toBe('marker-chip')
  })

  it('places opts.head in .innfo-card-head and opts.body in .innfo-card-body', () => {
    const head = document.createElement('span')
    head.textContent = 'extra-head'
    const body = document.createElement('span')
    body.textContent = 'extra-body'
    const card = UI.ElementCard({ id: 'x', name: 'X', fields: [] }, { head: [head], body: [body] })
    expect(card.querySelector('.innfo-card-head')!.contains(head)).toBe(true)
    expect(card.querySelector('.innfo-card-body')!.contains(body)).toBe(true)
  })

  it('toggles open with a collapsible control and aria-expanded', () => {
    const card = UI.ElementCard({ id: 'x', name: 'X', fields: [] }, { collapsible: true })
    const toggle = card.querySelector('button.innfo-card-toggle') as HTMLButtonElement
    expect(toggle).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(card.getAttribute('data-open')).toBe('false')
  })

  it('renders the dense bar: image chip and field count without duplicating headline field in body', () => {
    const card = UI.ElementCard({
      id: 'ecto-1',
      name: 'Ecto-1',
      fields: [
        field('photo', 'sources/ecto-1.png'),
        field('name', 'Ecto-1'),
        field('status', 'draft'),
        field('owner', 'Egon'),
        field('notes', 'x'),
      ],
    })
    const img = card.querySelector('.innfo-card-head img.innfo-card-thumb') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('sources/ecto-1.png')
    expect(card.querySelector('.innfo-card-facts')).toBeNull()
    expect(card.querySelector('.innfo-card-count')!.textContent).toBe('5 fields')
    const bodyFieldNames = [...card.querySelectorAll('.innfo-card-body [data-ku-kind="field"]')].map((n) =>
      n.getAttribute('data-field'),
    )
    expect(bodyFieldNames).toEqual(['photo', 'status', 'owner', 'notes'])
  })

  it('falls back to a dashed placeholder when no field value looks like an image', () => {
    const card = UI.ElementCard({ id: 'x', name: 'X', fields: [field('status', 'draft')] })
    expect(card.querySelector('.innfo-card-head img.innfo-card-thumb')).toBeNull()
    expect(card.querySelector('.innfo-card-thumb--empty')).toBeTruthy()
  })

  it('renders collapsed with open:false and opens from the toggle', () => {
    const card = UI.ElementCard({ id: 'x', name: 'X', fields: [field('a', 'b')] }, { open: false })
    expect(card.getAttribute('data-open')).toBe('false')
    const toggle = card.querySelector('button.innfo-card-toggle') as HTMLButtonElement
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    toggle.click()
    expect(card.getAttribute('data-open')).toBe('true')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('throws TypeError naming the component on invalid data', () => {
    expect(() => UI.ElementCard(null)).toThrow(TypeError)
    expect(() => UI.ElementCard(null)).toThrow(/ElementCard/)
  })
})

describe('InnfoUI.CitationIcon', () => {
  it('renders data-origin/data-field, an aria-label and stops propagation on click', () => {
    const onOpen = vi.fn()
    const parentHandler = vi.fn()
    const host = document.createElement('div')
    host.addEventListener('click', parentHandler)
    const icon = UI.CitationIcon({ variant: 'agent', field: 'owner' }, { onOpen })
    expect(comp(icon)).toBe('citation-icon')
    expect(icon.getAttribute('data-origin')).toBe('agent')
    expect(icon.getAttribute('data-field')).toBe('owner')
    expect(icon.getAttribute('aria-label')).toBe('Origin: owner')
    host.appendChild(icon)
    icon.click()
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(parentHandler).not.toHaveBeenCalled()
  })
})

describe('InnfoUI.FieldRow', () => {
  it('renders dt/dd, one CitationIcon per distinct origin in canonical order', () => {
    const row = UI.FieldRow({
      name: 'owner',
      value: 'Slimer',
      citations: [
        { origin: 'human', field: 'owner' },
        { origin: 'agent', field: 'owner' },
        { origin: 'human', field: 'owner' },
      ],
    })
    expect(comp(row)).toBe('ku-badge')
    expect(row.getAttribute('data-ku-kind')).toBe('field')
    expect(row.getAttribute('data-field')).toBe('owner')
    expect(row.querySelector('.innfo-ku-label')!.textContent).toContain('owner')
    const icons = [...row.querySelectorAll('[data-innfo-component=citation-icon]')]
    expect(icons.map((i) => (i as HTMLElement).getAttribute('data-origin'))).toEqual(['agent', 'human'])
  })

  it('renders an error citation first in the canonical order', () => {
    const row = UI.FieldRow({
      name: 'x',
      value: 'v',
      citations: [{ origin: 'document', field: 'x' }, { error: 'boom', field: 'x' }],
    })
    const icons = [...row.querySelectorAll('[data-innfo-component=citation-icon]')]
    expect((icons[0] as HTMLElement).getAttribute('data-origin')).toBe('error')
  })

  it('renders a ref as an ElementPill wired to onRef', () => {
    const onRef = vi.fn()
    const row = UI.FieldRow(
      { name: 'parent', value: 'Gozer', ref: { id: 'gozer', label: 'Gozer' } },
      { onRef },
    )
    const pill = row.querySelector('[data-innfo-component=element-pill]') as HTMLButtonElement
    expect(pill).toBeTruthy()
    expect(pill.getAttribute('data-element-id')).toBe('gozer')
    pill.click()
    expect(onRef).toHaveBeenCalledTimes(1)
  })

  it('throws TypeError naming the component on invalid data', () => {
    expect(() => UI.FieldRow(null)).toThrow(TypeError)
    expect(() => UI.FieldRow(null)).toThrow(/FieldRow/)
  })
})
