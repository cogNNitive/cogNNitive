// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const UI = req(join(consoleDir, 'ui-kit.js')) as any

describe('InnfoUI.Table (declarative console view table builder)', () => {
  it('throws TypeError if data or columns is invalid', () => {
    expect(() => UI.Table(null)).toThrow(TypeError)
    expect(() => UI.Table({})).toThrow(TypeError)
    expect(() => UI.Table({ columns: 'not-array' })).toThrow(TypeError)
  })

  it('renders an empty state when rows is empty', () => {
    const table = UI.Table({
      columns: ['name', 'horas'],
      rows: [],
      emptyText: 'No hay programas disponibles',
    })
    expect(table.getAttribute('data-innfo-component')).toBe('table')
    const emptyCell = table.querySelector('.innfo-element-table-empty')
    expect(emptyCell).toBeTruthy()
    expect(emptyCell?.textContent).toContain('No hay programas disponibles')
  })

  it('renders columns and auto-formats cells with KuBadges and ElementPills', () => {
    const rows = [
      { id: 'prog-1', name: 'Bootcamp Fullstack', fields: { horas: 120, tutor: 'Lucas' } },
      { id: 'prog-2', name: 'Data Science', fields: { horas: 90, tutor: 'Ana' } },
    ]
    const table = UI.Table({
      columns: [
        { key: 'name', label: 'Programa', kind: 'element' },
        { key: 'horas', label: 'Horas', kind: 'field' },
        { key: 'tutor', label: 'Tutor', kind: 'cell' },
      ],
      rows,
    })

    const trs = table.querySelectorAll('tbody tr')
    expect(trs.length).toBe(2)

    // Element pill for name
    const pill = trs[0].querySelector('[data-innfo-component=element-pill]')
    expect(pill).toBeTruthy()
    expect(pill?.textContent).toContain('Bootcamp Fullstack')

    // Field badge for horas
    const fieldBadge = trs[0].querySelector('[data-ku-kind=field]')
    expect(fieldBadge).toBeTruthy()
    expect(fieldBadge?.textContent).toContain('120')

    // Cell badge for tutor
    const cellBadge = trs[0].querySelector('[data-ku-kind=cell]')
    expect(cellBadge).toBeTruthy()
    expect(cellBadge?.textContent).toContain('Lucas')
  })

  it('renders edit action when onEdit hook is provided', () => {
    const onEdit = vi.fn()
    const rows = [{ id: 'prog-1', name: 'Bootcamp Fullstack', fields: { horas: 120 } }]
    const table = UI.Table(
      {
        columns: ['name', 'horas'],
        rows,
      },
      { onEdit },
    )

    const editBtn = table.querySelector('button.innfo-review-anchor')
    expect(editBtn).toBeTruthy()
    editBtn?.dispatchEvent(new Event('click', { bubbles: true }))
    expect(onEdit).toHaveBeenCalledWith('prog-1')
  })
})

describe('InnfoUI.KpiGrid (declarative KPI summary builder)', () => {
  it('throws TypeError if items is invalid', () => {
    expect(() => UI.KpiGrid(null)).toThrow(TypeError)
    expect(() => UI.KpiGrid({})).toThrow(TypeError)
  })

  it('renders KPI cards with concept badges and values', () => {
    const grid = UI.KpiGrid({
      items: [
        { label: 'Total Programas', value: 12, concept: 'Programas', hint: 'Activos este trimestre' },
        { label: 'Horas Dictadas', value: '450 h', hint: 'Presenciales y online' },
      ],
    })
    expect(grid.getAttribute('data-innfo-component')).toBe('kpi-grid')
    const cards = grid.querySelectorAll('.innfo-kpi-card')
    expect(cards.length).toBe(2)
    expect(cards[0].querySelector('.innfo-kpi-value')?.textContent).toBe('12')
    expect(cards[0].querySelector('.innfo-kpi-hint')?.textContent).toBe('Activos este trimestre')
    expect(cards[1].querySelector('.innfo-kpi-value')?.textContent).toBe('450 h')
  })
})

describe('InnfoUI field badge CSS scoping', () => {
  it('does NOT enforce flex:1 1 16em on global .innfo-ku-badge[data-ku-kind=field]', () => {
    const css = UI.generateTokenCss()
    const lines = css.split('\n')
    // Global rule should NOT have flex:1 1 16em
    const globalFieldRule = lines.find((l: string) => l.startsWith('.innfo-ku-badge[data-ku-kind=field]{'))
    expect(globalFieldRule).toBeTruthy()
    expect(globalFieldRule).not.toContain('flex:1 1 16em')

    // Card-scoped rule DOES have flex:1 1 16em
    const cardFieldRule = lines.find((l: string) => l.includes('.innfo-card-fields') && l.includes('[data-ku-kind=field]'))
    expect(cardFieldRule).toBeTruthy()
    expect(cardFieldRule).toContain('flex:1 1 16em')
  })
})
