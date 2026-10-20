// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
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
      original: 'A',
      proposed: 'new',
    },
  ]

  it('renders one card per draft with the anatomy and a Discard control', () => {
    const onDelete = vi.fn()
    const list = UI.DraftList({ drafts, byId }, { onDelete })
    expect(comp(list)).toBe('draft-list')
    const rows = list.querySelectorAll('li[data-draft-id]')
    expect(rows.length).toBe(2)
    expect(rows[0].getAttribute('data-change-state')).toBe('unsent')
    expect(rows[0].querySelector('.innfo-change-card-title')!.textContent).toContain('Comment')
    expect(rows[0].querySelector('.innfo-change-card-note')!.textContent).toBe('still valid')
    expect(rows[1].querySelector('.innfo-change-card-title')!.textContent).toContain('Edit')
    expect(rows[1].querySelector('.innfo-change-card-diff')!.textContent).toBe('A \u2192 new')
    expect(list.querySelector('select')).toBeNull()
    expect(list.querySelector('[data-innfo-component="status-badge"]')).not.toBeNull()
    const dis = rows[0].querySelector('.innfo-change-discard') as HTMLButtonElement
    dis.click()
    expect(onDelete).toHaveBeenCalledWith('fb-001')
  })

  it('renders no citation icon without onCitation, so a dead icon never appears', () => {
    const list = UI.DraftList({
      drafts: [
        { id: 'fb-8', element_id: 'el-a', kind: 'comment', base_hash: 'h1', comment: 'c', sources: 'sources/a.md' },
      ],
      byId,
    })
    expect(list.querySelector('[data-innfo-component="citation-icon"]')).toBeNull()
    expect(list.querySelector('.innfo-change-card-source')!.textContent).toBe('sources/a.md')
  })

  it('renders no Discard control without onDelete (the export preview)', () => {
    const list = UI.DraftList({ drafts, byId })
    expect(list.querySelector('.innfo-change-discard')).toBeNull()
    expect(list.querySelectorAll('li[data-draft-id]').length).toBe(2)
  })

  it('marks target changed on hash mismatch and on a missing element (stale token)', () => {
    const list = UI.DraftList({ drafts, byId })
    const rows = list.querySelectorAll('li[data-draft-id]')
    expect(rows[0].hasAttribute('data-target-changed')).toBe(false)
    expect(rows[1].hasAttribute('data-target-changed')).toBe(true)
    expect(rows[1].querySelector('.innfo-change-card-stale')!.textContent).toBe('target changed')

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

describe('InnfoUI.ChangeHistory', () => {
  const byId = { 'goal-1': { id: 'goal-1', name: 'Goal 1', hash: 'h' } }
  const changes = [
    {
      path: 'changes/m_ana_1_changes_NN.md',
      status: 'partially_applied',
      author: 'ana',
      appliedAt: '2026-10-02T12:00:00Z',
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'm@goal-1&owner',
          from: 'Ana',
          to: 'Bea',
          author: 'ana',
          status: 'applied',
        },
        {
          id: 'c-02',
          op: 'update_field',
          target: 'm@goal-1&owner',
          from: 'Bea',
          to: 'C',
          status: 'conflict',
          resolution: 'PRECONDITION_FAILED: from mismatch',
        },
        { id: 'c-03', op: 'comment', target: 'm@goal-1&note', status: 'proposed' },
      ],
    },
  ]

  it('renders Applied and Not applied cards, skips other blocks, no StatusBadge', () => {
    const history = UI.ChangeHistory({ changes, byId }, {})
    const cards = history.querySelectorAll('li[data-innfo-component="change-card"]')
    expect(cards.length).toBe(2)
    expect(cards[0].getAttribute('data-change-state')).toBe('applied')
    expect(cards[0].querySelector('.innfo-change-card-state')!.textContent).toBe('Applied')
    expect(cards[0].querySelector('.innfo-change-card-title')!.textContent).toBe(
      'Edit `owner` of `Goal 1`',
    )
    expect(cards[0].querySelector('.innfo-change-card-state')!.getAttribute('title')).toBe(
      'Recorded in the domain.',
    )
    expect(cards[0].querySelector('.innfo-change-card-diff')!.textContent).toBe('Ana \u2192 Bea')
    expect(cards[0].querySelector('.innfo-change-card-context')!.textContent).toBe(
      'ana · 2026-10-02T12:00:00Z · Applied',
    )
    expect(cards[1].getAttribute('data-change-state')).toBe('not-applied')
    expect(cards[1].querySelector('.innfo-change-card-state')!.textContent).toBe('Not applied')
    expect(cards[1].querySelector('.innfo-change-card-resolution')!.textContent).toContain(
      'PRECONDITION_FAILED',
    )
    expect(history.querySelector('[data-innfo-component="status-badge"]')).toBeNull()
  })

  it('falls back to the slug in the title when the element is unknown', () => {
    const history = UI.ChangeHistory({ changes, byId: {} }, {})
    expect(history.querySelector('.innfo-change-card-title')!.textContent).toBe(
      'Edit `owner` of `goal-1`',
    )
  })

  it('renders evidence sources as a clickable citation on applied and unsent cards', () => {
    const onCitation = vi.fn()
    const withSource = [
      {
        status: 'applied',
        changes: [
          {
            id: 'c-09',
            op: 'update_field',
            target: 'm@goal-1&owner',
            from: 'A',
            to: 'B',
            sources: 'sources/report.pdf#p3',
            status: 'applied',
          },
        ],
      },
    ]
    const history = UI.ChangeHistory({ changes: withSource, byId }, { onCitation })
    const cite = history.querySelector(
      '.innfo-change-card-source [data-innfo-component="citation-icon"]',
    ) as HTMLButtonElement
    expect(cite).not.toBeNull()
    expect(history.querySelector('.innfo-change-card-source')!.textContent).toContain(
      'sources/report.pdf#p3',
    )
    cite.click()
    expect(onCitation).toHaveBeenCalledWith('sources/report.pdf#p3')

    const onDraftCitation = vi.fn()
    const list = UI.DraftList(
      {
        drafts: [
          { id: 'fb-9', element_id: 'goal-1', kind: 'comment', base_hash: 'h', comment: 'c', sources: 'sources/a.md' },
        ],
        byId,
      },
      { onCitation: onDraftCitation },
    )
    ;(list.querySelector('[data-innfo-component="citation-icon"]') as HTMLButtonElement).click()
    expect(onDraftCitation).toHaveBeenCalledWith('sources/a.md')
  })

  it('falls back to the changeset resolution when the block carries none', () => {
    const history = UI.ChangeHistory(
      {
        changes: [
          {
            status: 'conflict',
            resolution: 'VALIDATION_FAILED: bad',
            changes: [{ id: 'c-01', op: 'update_field', target: 'm@goal-1&owner', status: 'conflict' }],
          },
        ],
        byId,
      },
      {},
    )
    expect(history.querySelector('.innfo-change-card-resolution')!.textContent).toContain(
      'VALIDATION_FAILED',
    )
  })

  it('offers Revert only for an applied update_field block', () => {
    const onRevert = vi.fn()
    const history = UI.ChangeHistory({ changes, byId }, { onRevert })
    const reverts = history.querySelectorAll('.innfo-change-revert')
    expect(reverts.length).toBe(1)
    ;(reverts[0] as HTMLButtonElement).click()
    expect(onRevert).toHaveBeenCalledWith(changes[0].changes[0])

    const other = UI.ChangeHistory(
      {
        changes: [
          {
            status: 'applied',
            changes: [{ id: 'x', op: 'rename_element', target: 'm@goal-1', status: 'applied' }],
          },
        ],
        byId,
      },
      { onRevert },
    )
    expect(other.querySelector('.innfo-change-revert')).toBeNull()
  })

  it('Go to element calls onGoTo and hostile text stays inert', () => {
    const onGoTo = vi.fn()
    const history = UI.ChangeHistory({ changes, byId }, { onGoTo })
    const go = history.querySelector('.innfo-change-goto') as HTMLButtonElement
    go.click()
    expect(onGoTo).toHaveBeenCalledWith('goal-1')

    const hostile = UI.ChangeHistory(
      {
        changes: [
          {
            status: 'applied',
            changes: [
              {
                id: 'x',
                op: 'update_field',
                target: 'm@e&f',
                from: '<img src=x onerror="window.__pwned2=true">',
                to: '',
                status: 'applied',
              },
            ],
          },
        ],
        byId,
      },
      {},
    )
    expect(hostile.querySelector('img')).toBeNull()
    expect((globalThis as any).__pwned2).toBeUndefined()
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
    const count = UI.StatusBadge({ status: 'local', count: 2 })
    expect(comp(count)).toBe('status-badge')
    expect(count.getAttribute('data-status')).toBe('local')
    expect(count.textContent).toBe('2')

    const labelled = UI.StatusBadge({ status: 'local', count: 1, label: 'Unsent', title: '1 unsent' })
    expect(labelled.getAttribute('data-status')).toBe('local')
    expect(labelled.textContent).toBe('Unsent')
    expect(labelled.getAttribute('title')).toBe('1 unsent')
  })

  it('defaults the title to what the state means and what to do next', () => {
    const b = UI.StatusBadge({ status: 'local' })
    expect(b.getAttribute('title')).toBe(
      'Only in your browser. Export it and give it to the agent.',
    )
  })

  it('ships no styling for the retired statuses', () => {
    const source = readFileSync(join(consoleDir, 'ui-kit.js'), 'utf8')
    expect(source).not.toMatch(
      /innfo-status-badge\[data-status=(pending|applied|rejected|stale|conflict|proposed)\]/,
    )
    expect(source).toContain('innfo-status-badge[data-status=local]')
  })

  it('rejects the retired statuses', () => {
    for (const s of ['applied', 'proposed', 'conflict', 'nonsense']) {
      expect(() => UI.StatusBadge({ status: s })).toThrow(/unknown status/)
    }
  })
})

describe('InnfoUI.ElementCard applied history', () => {
  it('renders no lineage pill and no meta strip', () => {
    const card = UI.ElementCard({
      id: 'e',
      name: 'E',
      fields: [],
      history: [{ id: 'c-01', author: 'ana', status: 'applied' }],
    })
    expect(card.querySelector('.innfo-lineage-pill')).toBeNull()
    expect(card.querySelector('.innfo-card-meta-strip')).toBeNull()
  })

  it('keeps the applied history in the modal Lineage tab', () => {
    const history = [{ author: 'ana', timestamp: '2026-10-02T12:00:00Z', notes: 'Set the owner' }]
    const card = UI.ElementCard({ id: 'e', name: 'E', fields: [], history })
    expect(card.querySelector('.innfo-lineage-pill')).toBeNull()

    // The review controller opens the modal with the element's history, on the Lineage tab.
    const modal = UI.EditModal(
      { title: 'E', fieldName: 'owner', type: 'string', value: 'Bea', history, startTab: 'history' },
      {},
    )
    const lineage = modal.querySelector('.innfo-modal-tab-panel[data-tab="history"]') as HTMLElement
    expect(lineage.style.display).toBe('block')
    expect(lineage.textContent).toContain('Author: ana')
    expect(lineage.textContent).toContain('Set the owner')
    expect(modal.querySelector('.innfo-modal-tab-panel[data-tab="edit"]')).not.toBeNull()
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
