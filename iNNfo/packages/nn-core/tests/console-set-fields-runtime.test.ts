// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createConsoleEnv } from './helpers/console-review-env'
import { parseChangeset } from '../src/changeset/parser.js'
import { setFieldsEntries } from '../src/changeset/types.js'

/**
 * T6 (changes-compact-format): the console runtime reverts a field an applied
 * `set_fields` set, and its own changeset export emits `add_element` + ONE
 * `set_fields` for a new element's fields.
 */

const env = createConsoleEnv()

const ELEMENTS = [
  { id: 'e1', concept: 'C', name: 'E1', slug: 'e1', hash: 'h1', fields: { topics: 'ai', language: 'es' } },
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
        op: 'set_fields',
        target: 'm@e1',
        from: '{"language":"en"}',
        to: '{"topics":"ai","language":"es"}',
        status: 'applied',
      },
    ],
  },
]

function exportText(drafts: unknown[]): string {
  const { Console } = env.loadConsole()
  const composed = Console.composeChangesetExport(
    {
      modelTitle: 'M',
      modelId: 'm',
      meta: { changesBlueprintVersion: 'V_0-9-0' },
      store: { drafts: () => drafts },
    },
    'ana',
  )
  expect(composed.ok).toBe(true)
  return composed.text
}

const NEW_ELEMENT = {
  id: 'fb-001',
  element_id: 'new-1',
  knowledge_id: 'm',
  concept: 'C',
  element: 'Grow',
  element_slug: 'grow',
  kind: 'new',
}

describe('console runtime and set_fields', () => {
  beforeEach(() => {
    env.setup('<!doctype html><html><body><div id="nn-tab-review"></div></body></html>')
    env.localStorage.clear()
  })

  afterEach(() => {
    env.teardown()
    vi.restoreAllMocks()
  })

  it('Revert of one field set by set_fields adds one unsent correction for that field', () => {
    const { Console, Review } = env.loadConsole()
    const store = Review.createDraftStore(env.localStorage, 'm1')
    Console.renderReviewTab(env.document, { store, elements: ELEMENTS, changes: APPLIED }, { needs: [] })
    const tab = env.document.getElementById('nn-tab-review') as HTMLElement
    const reverts = tab.querySelectorAll('[data-nn="revert"]')
    expect(reverts.length).toBe(2)
    ;(reverts[1] as HTMLButtonElement).click()
    expect(store.drafts()).toHaveLength(1)
    expect(store.drafts()[0]).toMatchObject({
      element_id: 'e1',
      field: 'language',
      original: 'es',
      proposed: 'en',
      base_hash: 'h1',
      kind: 'correction',
    })
  })

  it('exports a new element with several fields as add_element plus ONE set_fields', () => {
    const text = exportText([{ ...NEW_ELEMENT, proposed: { owner: 'Ana', horizon: '2027 Q1' } }])
    const doc = parseChangeset(text)
    expect(doc.frontmatter.blueprint_version).toBe('V_0-9-0')
    expect(doc.changes.map((c) => c.op)).toEqual(['add_element', 'set_fields'])
    const setFields = doc.changes[1]!
    expect(setFields.target).toBe('m@grow')
    expect(setFields.from).toBeUndefined()
    expect(setFields.evidence).toBe('decision')
    expect(setFieldsEntries(setFields)).toEqual([
      { field: 'horizon', to: '2027 Q1' },
      { field: 'owner', to: 'Ana' },
    ])
  })

  it('exports a new element with one field, and an edited field, as update_field', () => {
    const one = parseChangeset(exportText([{ ...NEW_ELEMENT, proposed: { owner: 'Ana' } }]))
    expect(one.changes.map((c) => c.op)).toEqual(['add_element', 'update_field'])
    const edited = parseChangeset(
      exportText([
        {
          id: 'fb-002',
          element_id: 'e1',
          knowledge_id: 'm',
          concept: 'C',
          element: 'E1',
          element_slug: 'e1',
          base_hash: 'h1',
          kind: 'correction',
          field: 'topics',
          original: 'ai',
          proposed: 'ml',
        },
      ]),
    )
    expect(edited.changes.map((c) => c.op)).toEqual(['update_field'])
  })
})
