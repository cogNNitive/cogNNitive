// @vitest-environment node
import { it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { parseKnowledge, serializeKnowledge } from '../src/parser/index.js'
import { parseChangeset } from '../src/changeset/parser.js'
import { applyMutation } from '../src/mutate.js'
import { createConsoleEnv } from './helpers/console-review-env'

const require = createRequire(import.meta.url)
const runtime = require('../../../specs/bluepriNNts/console/nn-runtime.js')

it('exported prose and ordered list corrections round trip through the mutation engine', () => {
  const drafts = [
    { field: 'description', original: 'Old narration.', proposed: 'New narration.\n\nSecond paragraph.' },
    { field: 'presets', original: ['Warm'], proposed: ['Warm', 'Fast'] },
  ].map((draft, index) => ({ ...draft, id: 'c-' + index, kind: 'correction',
    element_id: 'episode@one', knowledge_id: 'episode', element_slug: 'one', concept: 'Scene' }))
  const result = runtime.composeChangesetExport({ modelId: 'episode', meta: { changesBlueprintVersion: 'V_0-9-0' },
    store: { drafts: () => drafts } }, 'Human reviewer')
  expect(result.ok).toBe(true)
  const changeset = parseChangeset(result.text)
  expect(changeset.changes[0].op).toBe('update_element_text')
  expect(changeset.changes[0].target).toBe('episode@one')
  expect(changeset.changes[0].from).toBe('Old narration.')
  const model = parseKnowledge('---\nlevel: 3\n---\n# NN Scene\n## NN Scene: One\nslug:: one\npresets:: [Warm]\n\nOld narration.\n')
  for (const change of changeset.changes) {
    const applied = applyMutation(model, change.op, { target: change.target, from: change.from, to: change.to })
    expect(applied.success, JSON.stringify(applied.errors)).toBe(true)
  }
  const serialized = serializeKnowledge(model)
  const scene = parseKnowledge(serialized).elements.get('Scene')![0]
  expect(scene.description).toBe('New narration.\n\nSecond paragraph.')
  expect(scene.fields.presets).toEqual(['Warm', 'Fast'])
  expect(serialized).not.toContain('description::')
  expect(serialized).not.toContain('narration::')
})

it('the standard field sheet also edits declared string lists through its shared draft store', () => {
  const env = createConsoleEnv()
  env.setup('<div id="nn-content"></div>')
  const { Review } = env.loadConsole()
  const store = Review.createDraftStore(env.localStorage, 'episode')
  const controller = Review.createReviewController(env.document, {
    store,
    meta: { modelId: 'episode' },
    elements: [{ id: 'episode@one', slug: 'one', modelId: 'episode', concept: 'Scene', name: 'One',
      hash: '0123456789abcdef', fields: { presets: ['Warm'], metadata: { nested: true } } }],
    schema: { fields: [{ concept: 'Scene', name: 'presets', type: 'select', multiple: true }] },
  })
  try {
    expect(controller.openEdit({ elementId: 'episode@one', field: 'presets', edit: true })).toBe(true)
    const modal = env.document.querySelector('.nn-edit-modal')!
    const input = modal.querySelector('[data-nn="chip-input"]') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = 'Fast'
    input.dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'Enter' }))
    ;(modal.querySelector('.nn-edit-btn-save') as HTMLButtonElement).click()
    expect(store.drafts()[0].proposed).toEqual(['Warm', 'Fast'])
    controller.openEdit({ elementId: 'episode@one', field: 'metadata', edit: true })
    const objectModal = [...env.document.querySelectorAll('.nn-edit-modal')].at(-1)!
    expect((objectModal.querySelector('.nn-edit-mode-btn') as HTMLButtonElement).disabled).toBe(true)
  } finally {
    controller.destroy()
    env.teardown()
  }
})
