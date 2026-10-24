// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createConsoleEnv, consoleDir } from './helpers/console-review-env'

const env = createConsoleEnv()

const ELEMENTS = [
  { id: 'e1', concept: 'C', name: 'E1', slug: 'e1', hash: 'h1', fields: { owner: 'Bea' } },
]

const APPLIED = [
  {
    path: 'changes/m_ana_1_changes_NN.md',
    status: 'applied',
    author: 'ana',
    appliedAt: '2026-10-02T12:00:00Z',
    changes: [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'm@e1&owner',
        from: 'Ana',
        to: 'Bea',
        author: 'ana',
        status: 'applied',
      },
    ],
  },
]

function renderTab(state: any, onRefresh?: () => void): HTMLElement {
  const { Console } = env.loadConsole()
  Console.renderReviewTab(env.document, state, { needs: [] }, onRefresh)
  return env.document.getElementById('nn-tab-review') as HTMLElement
}

function addDraft(store: any) {
  store.addDraft({
    element_id: 'e1',
    concept: 'C',
    element: 'E1',
    base_hash: 'h1',
    kind: 'comment',
    comment: 'hi',
  })
}

describe('console-review-tab (one Changes tab)', () => {
  beforeEach(() => {
    env.setup('<!doctype html><html><body><div id="nn-tab-review"></div></body></html>')
    env.localStorage.clear()
  })

  afterEach(() => {
    env.teardown()
    vi.restoreAllMocks()
  })

  it('artifact_shell.html no longer carries legacy .nn-review-* CSS rules', () => {
    const shell = readFileSync(join(consoleDir, 'artifact_shell.html'), 'utf8')
    const styleBlocks = shell.match(/<style[\s\S]*?<\/style>/gi) || []
    const css = styleBlocks.join('\n')
    expect(css.includes('.nn-review-item')).toBe(false)
    expect(css.includes('.nn-review-stat')).toBe(false)
    expect(css.includes('.nn-review-list')).toBe(false)
  })

  it('renders the heading "Changes" and both sections through the kit', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    addDraft(store)
    const tab = renderTab({ store, elements: ELEMENTS, changes: APPLIED })
    expect(tab.querySelector('h2')!.textContent).toBe('Changes')
    // Unsent is above Applied.
    const sections = tab.querySelectorAll('section')
    const unsent = tab.querySelector('.nn-changes-unsent') as HTMLElement
    const applied = tab.querySelector('.nn-changes-applied') as HTMLElement
    expect(unsent.compareDocumentPosition(applied) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(unsent.querySelector('[data-nn-component="draft-list"]')).not.toBeNull()
    expect(applied.querySelector('[data-nn-component="change-history"]')).not.toBeNull()
    expect(sections.length).toBeGreaterThanOrEqual(2)
  })

  it('tops the Unsent list with the publication banner while it has items', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    addDraft(store)
    const tab = renderTab({ store, elements: ELEMENTS, changes: [] })
    const unsent = tab.querySelector('.nn-changes-unsent')!
    const banner = unsent.querySelector('[data-nn="publication-banner"]')!
    expect(banner).not.toBeNull()
    const list = unsent.querySelector('[data-nn-component="draft-list"]')!
    expect(banner.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.textContent).toContain('every console generated from this domain')
  })

  it('shows the publication message as a one-line note when Unsent is empty', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    const tab = renderTab({ store, elements: ELEMENTS, changes: [] })
    const note = tab.querySelector('[data-nn="publication-note"]')!
    expect(note).not.toBeNull()
    expect(note.textContent).toContain('every console generated from this domain')
    expect(tab.querySelector('[data-nn="publication-banner"]')).toBeNull()
  })

  it('renders the applied history newest first and an empty state per section', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    const newer = {
      status: 'applied',
      author: 'ana',
      appliedAt: '2026-10-03T00:00:00Z',
      changes: [
        { id: 'c-02', op: 'update_field', target: 'm@e1&owner', from: 'X', to: 'Y', status: 'applied' },
      ],
    }
    const older = {
      status: 'applied',
      author: 'ana',
      appliedAt: '2026-10-01T00:00:00Z',
      changes: [
        { id: 'c-01', op: 'update_field', target: 'm@e1&owner', from: 'A', to: 'B', status: 'applied' },
      ],
    }
    const tab = renderTab({ store, elements: ELEMENTS, changes: [newer, older] })
    const diffs = Array.from(tab.querySelectorAll('.nn-change-card-diff')).map(
      (n) => n.textContent,
    )
    expect(diffs).toEqual(['X \u2192 Y', 'A \u2192 B'])
    expect(tab.querySelector('.nn-review-empty')).not.toBeNull()
  })

  it('Revert adds one unsent update_field with the current hash and value', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    let refreshed = 0
    const tab = renderTab({ store, elements: ELEMENTS, changes: APPLIED }, () => {
      refreshed++
    })
    ;(tab.querySelector('.nn-change-revert') as HTMLButtonElement).click()
    expect(refreshed).toBe(1)
    const draft = store.drafts()[0]
    expect(draft).toMatchObject({
      element_id: 'e1',
      field: 'owner',
      original: 'Bea',
      proposed: 'Ana',
      base_hash: 'h1',
      kind: 'correction',
    })
  })

  it('Revert of an added field (no previous value) becomes a clear', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    const added = [
      {
        status: 'applied',
        author: 'ana',
        appliedAt: '2026-10-02T12:00:00Z',
        changes: [
          { id: 'c-02', op: 'update_field', target: 'm@e1&owner', to: 'Bea', status: 'applied' },
        ],
      },
    ]
    const tab = renderTab({ store, elements: ELEMENTS, changes: added })
    ;(tab.querySelector('.nn-change-revert') as HTMLButtonElement).click()
    expect(store.drafts()[0]).toMatchObject({
      element_id: 'e1',
      field: 'owner',
      original: 'Bea',
      proposed: '',
      kind: 'correction',
    })
  })

  it('opens the citation dialog when an evidence source is clicked', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    const dialog = env.document.createElement('dialog') as any
    dialog.id = 'nn-citation-dialog'
    dialog.showModal = vi.fn()
    env.document.body.appendChild(dialog)
    const cited = [
      {
        status: 'applied',
        author: 'ana',
        appliedAt: '2026-10-02T12:00:00Z',
        changes: [
          {
            id: 'c-03',
            op: 'update_field',
            target: 'm@e1&owner',
            from: 'Ana',
            to: 'Bea',
            sources: 'sources/report.pdf#p3',
            status: 'applied',
          },
        ],
      },
    ]
    const tab = renderTab({ store, elements: ELEMENTS, changes: cited })
    ;(tab.querySelector('.nn-change-card-source .cite-icon') as HTMLButtonElement).click()
    expect(dialog.showModal).toHaveBeenCalledTimes(1)
    // The source splits into a path and an anchor; nothing was checked, so no status is claimed.
    const labels = Array.from(dialog.querySelectorAll('dt')).map((n: any) => n.textContent)
    const values = Array.from(dialog.querySelectorAll('dd')).map((n: any) => n.textContent)
    expect(labels).toEqual(['Anchor', 'Path'])
    expect(values).toEqual(['p3', 'sources/report.pdf'])
    expect(dialog.querySelector('.nn-cite-status')).toBeNull()
    expect(dialog.textContent).not.toContain('resolved')
  })

  it('Go to element focuses the element card', () => {
    const { Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    const card = env.document.createElement('article')
    card.id = 'el-e1'
    let scrolled = false
    ;(card as any).scrollIntoView = () => {
      scrolled = true
    }
    env.document.body.appendChild(card)
    const tab = renderTab({ store, elements: ELEMENTS, changes: APPLIED })
    ;(tab.querySelector('.nn-change-goto') as HTMLButtonElement).click()
    expect(scrolled).toBe(true)
    expect(card.classList.contains('nn-highlight')).toBe(true)
  })
})
