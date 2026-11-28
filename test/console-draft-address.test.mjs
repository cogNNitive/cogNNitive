import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, addCommentDraft } from './helpers/console-boot.mjs'

// Two elements whose slugs are a suffix of each other. The decoration key used to fall
// back to `@<element_id>&<field>` and be resolved by suffix match, so a draft on `sop`
// could paint a badge on `review_sop`, or a different model's row.
const MODEL = {
  meta: {
    title: 'Two SoPs',
    modelId: 'ghost-busters',
    modelVersion: 'V_1-0-0',
    changesBlueprintVersion: 'V_0-3-0',
  },
  elements: [
    {
      id: 'sop',
      concept: 'Fleet',
      name: 'SOP',
      description: 'First.',
      fields: { tags: 'a' },
      hash: '1111111111111111',
    },
    {
      id: 'review_sop',
      concept: 'Fleet',
      name: 'Review SOP',
      description: 'Second.',
      fields: { tags: 'b' },
      hash: '2222222222222222',
    },
  ],
  matrices: [],
}

const STORE_KEY = 'nn-console:v4:ghost-busters'
const storedDrafts = (document) =>
  JSON.parse(document.defaultView.localStorage.getItem(STORE_KEY) || '{"drafts":[]}').drafts
const painted = (document) =>
  [...document.querySelectorAll('[data-nn-component="ku-unit"][data-ku-changes]')].map((b) =>
    b.getAttribute('data-ku-address'),
  )

describe('draft decoration resolves the exact unit address', () => {
  it('records the canonical address of a draft it saves', () => {
    const { document, res } = bootConsole({ model: MODEL })
    res.controller.enable()

    addCommentDraft(document)

    const drafts = storedDrafts(document)
    assert.equal(drafts.length, 1)
    assert.equal(
      drafts[0].address,
      'ghost-busters@sop&tags',
      'saveDraft computes the canonical address and the store keeps it',
    )
  })

  it('paints one badge for a draft, not every address that shares the suffix', () => {
    const { document, res } = bootConsole({ model: MODEL })
    res.controller.enable()

    addCommentDraft(document)

    assert.deepEqual(
      painted(document),
      ['ghost-busters@sop&tags'],
      'the draft targets the sop tags row and nothing else',
    )
  })

  it('derives the address of a stored draft that predates the field', () => {
    const { document, res } = bootConsole({
      model: MODEL,
      drafts: {
        drafts: [
          {
            id: 'fb-001',
            element_id: 'review_sop',
            knowledge_id: 'ghost-busters',
            element_slug: 'review_sop',
            field: 'tags',
            kind: 'comment',
            proposed: 'looks-wrong',
            base_hash: '2222222222222222',
          },
        ],
      },
    })
    res.controller.enable()

    assert.equal(storedDrafts(document)[0].address, 'ghost-busters@review_sop&tags')
  })

  it('paints nothing when no badge carries that address', () => {
    const { document, res } = bootConsole({
      model: MODEL,
      drafts: {
        drafts: [
          {
            id: 'fb-002',
            element_id: 'retired-sop',
            knowledge_id: 'ghost-busters',
            element_slug: 'retired-sop',
            field: 'tags',
            kind: 'comment',
            proposed: 'x',
            base_hash: '3333333333333333',
          },
        ],
      },
    })
    res.controller.enable()

    assert.deepEqual(painted(document), [])
  })
})
