// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const UI = req(join(consoleDir, 'ui-kit.js')) as any
const comp = (root: HTMLElement) => root.getAttribute('data-innfo-component')

describe('InnfoUI.DraftList', () => {
  const byId = { 'el-a': { id: 'el-a', hash: 'h1' }, 'el-b': { id: 'el-b', hash: 'h2' } }
  const drafts = [
    {
      id: 'fb-001',
      element_id: 'el-a',
      concept: 'C',
      kind: 'comment',
      base_hash: 'h1',
      comment: 'still valid',
    },
    {
      id: 'fb-002',
      element_id: 'el-b',
      concept: 'C',
      kind: 'correction',
      field: 'owner',
      base_hash: 'STALE',
      proposed: 'new',
    },
  ]

  it('renders two rows with kind, target, text and a delete button; no status control', () => {
    const onDelete = vi.fn()
    const list = UI.DraftList({ drafts, byId }, { onDelete })
    expect(comp(list)).toBe('draft-list')
    const rows = list.querySelectorAll('li[data-draft-id]')
    expect(rows.length).toBe(2)
    expect(rows[0].querySelector('.innfo-draft-kind')!.textContent).toBe('comment')
    expect(rows[1].querySelector('.innfo-draft-kind')!.textContent).toBe('correction')
    expect(rows[0].querySelector('.innfo-draft-text')!.textContent).toBe('still valid')
    expect(rows[1].querySelector('.innfo-draft-text')!.textContent).toBe('new')
    expect(list.querySelector('select')).toBeNull()
    expect(list.textContent).not.toContain('pending')
    const del = rows[0].querySelector('.innfo-draft-delete') as HTMLButtonElement
    del.click()
    expect(onDelete).toHaveBeenCalledWith('fb-001')
  })

  it('marks target changed on hash mismatch and on a missing element (stale token)', () => {
    const list = UI.DraftList({ drafts, byId })
    const rows = list.querySelectorAll('li[data-draft-id]')
    expect(rows[0].hasAttribute('data-target-changed')).toBe(false)
    expect(rows[1].hasAttribute('data-target-changed')).toBe(true)

    const missing = UI.DraftList({
      drafts: [{ id: 'fb-003', element_id: 'gone', kind: 'comment', base_hash: 'x', comment: 'c' }],
      byId,
    })
    expect(missing.querySelector('li[data-draft-id]')!.hasAttribute('data-target-changed')).toBe(true)
  })

  it('is inert to HTML in draft text (no <img onerror>)', () => {
    const list = UI.DraftList({
      drafts: [
        {
          id: 'fb-004',
          element_id: 'el-a',
          kind: 'comment',
          base_hash: 'h1',
          comment: '<img src=x onerror="window.__pwned=true">',
        },
      ],
      byId,
    })
    expect(list.querySelector('img')).toBeNull()
    expect((globalThis as any).__pwned).toBeUndefined()
  })
})

describe('InnfoUI.AnnotationPopover', () => {
  it('is a modal dialog with the requested kind options only', () => {
    const p = UI.AnnotationPopover({ label: 'owner', kinds: ['comment', 'delete'] }, {})
    expect(comp(p)).toBe('annotation-popover')
    expect(p.getAttribute('role')).toBe('dialog')
    expect(p.getAttribute('aria-modal')).toBe('true')
    expect(p.querySelector('[data-kind=correction]')).toBeNull()
    expect(p.querySelector('textarea, input[type=text]')).toBeNull()
  })

  it('shows the original read-only and a proposed input for a correction', () => {
    const p = UI.AnnotationPopover(
      { label: 'owner', kinds: ['comment', 'correction'], original: 'A' },
      {},
    )
    expect(p.querySelector('[data-kind=correction]')).toBeTruthy()
    const original = p.querySelector('.innfo-popover-original') as HTMLElement
    expect(original.textContent).toBe('A')
    expect(p.querySelector('textarea')).toBeTruthy()
  })

  it('saves the proposed value on Save', () => {
    const onSave = vi.fn()
    const p = UI.AnnotationPopover(
      { label: 'owner', kinds: ['correction'], original: 'A' },
      { onSave },
    )
    const ta = p.querySelector('textarea') as HTMLTextAreaElement
    ta.value = 'B'
    ;(p.querySelector('.innfo-popover-save') as HTMLButtonElement).click()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({ kind: 'correction', proposed: 'B' })
  })

  it('Escape calls onCancel once and never onSave', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const p = UI.AnnotationPopover({ label: 'owner', kinds: ['comment'] }, { onSave, onCancel })
    document.body.appendChild(p)
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('wraps Tab from the last focusable to the first and Shift+Tab backwards', () => {
    const p = UI.AnnotationPopover(
      { label: 'owner', kinds: ['comment', 'correction'], original: 'A' },
      {},
    )
    document.body.appendChild(p)
    const focusables = p.querySelectorAll<HTMLElement>('button, textarea, input, [tabindex]')
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    last.focus()
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(first)
    first.focus()
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(last)
  })
})

describe('InnfoUI.StatusBadge', () => {
  it('shows a bare count by default and a human label when asked', () => {
    const count = UI.StatusBadge({ status: 'applied', count: 2 })
    expect(comp(count)).toBe('status-badge')
    expect(count.getAttribute('data-status')).toBe('applied')
    expect(count.textContent).toBe('2')

    const labelled = UI.StatusBadge({ status: 'local', count: 1, label: 'Unsent', title: '1 unsent' })
    expect(labelled.getAttribute('data-status')).toBe('local')
    expect(labelled.textContent).toBe('Unsent')
    expect(labelled.getAttribute('title')).toBe('1 unsent')
  })

  it('accepts the local change state', () => {
    expect(() => UI.StatusBadge({ status: 'local' })).not.toThrow()
    expect(() => UI.StatusBadge({ status: 'nonsense' })).toThrow(/unknown status/)
  })
})

describe('InnfoUI.RailProgress', () => {
  it('shows pending/total and carries the counts as attributes', () => {
    const p = UI.RailProgress({ total: 4, pending: 2 })
    expect(comp(p)).toBe('rail-progress')
    expect(p.getAttribute('data-total')).toBe('4')
    expect(p.getAttribute('data-pending')).toBe('2')
    expect(p.getAttribute('data-revieweded')).toBeNull()
    expect(p.textContent).toContain('2/4')
    expect(p.getAttribute('title')).toContain('2 of 4 elements')
  })

  it('throws TypeError naming the component on a non-numeric total', () => {
    expect(() => UI.RailProgress({ total: 'x', pending: 0 })).toThrow(TypeError)
    expect(() => UI.RailProgress({ total: 'x', pending: 0 })).toThrow(/RailProgress/)
  })
})

describe('InnfoUI.Toast', () => {
  it('renders a dismissable, temp card with a title and a body', () => {
    const onClose = vi.fn()
    const t = UI.Toast({ title: 'Change recorded', body: 'Not applied yet.' }, { doc: document, onClose })
    expect(comp(t)).toBe('toast')
    expect(t.getAttribute('role')).toBe('status')
    expect(t.querySelector('.innfo-change-toast-title')!.textContent).toBe('Change recorded')
    expect(t.querySelector('.innfo-change-toast-text')!.textContent).toBe('Not applied yet.')
    ;(t.querySelector('.innfo-change-toast-close') as HTMLButtonElement).click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('review components purity', () => {
  it('creates independent nodes on each call with no shadow DOM', () => {
    const a = UI.DraftList({ drafts: [], byId: {} })
    const b = UI.DraftList({ drafts: [], byId: {} })
    expect(a).not.toBe(b)
    expect(a.shadowRoot).toBeNull()
    for (const name of ['AnnotationPopover', 'RailProgress', 'Toast']) {
      expect(UI[name]).toBeTypeOf('function')
    }
  })
})
