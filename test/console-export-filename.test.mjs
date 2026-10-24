import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { nnConsole, MODEL, bootConsole, addCommentDraft } from './helpers/console-boot.mjs'

describe('S1c: export filename uses the model slug', () => {
  it('composeExport succeeds for a model with a human title', () => {
    const state = {
      modelTitle: 'Ghost Busters Model',
      modelId: 'Ghost Busters Model',
      modelVersion: 'V_1-0-0',
      meta: { changesBlueprintVersion: 'V_0-3-0' },
      store: {
        drafts: () => [
          {
            id: 'fb-001',
            kind: 'comment',
            element_id: 'ecto-1',
            concept: 'Fleet',
            element: 'Ecto-1',
            comment: 'check',
            base_hash: '0123456789abcdef',
          },
        ],
      },
    }
    const res = nnConsole.composeExport(state, 'jane')
    assert.equal(res.ok, true, JSON.stringify(res.errors))
    assert.match(res.changesetFilename, /^ghost-busters-model_jane_/)
    assert.equal(res.filename, undefined, 'no feedback JSON filename exists')
  })

  it('prefers an explicit knowledge_slug over the title', () => {
    const state = {
      modelTitle: 'Ghost Busters Model',
      modelSlug: 'ghost-busters',
      modelVersion: 'V_1-0-0',
      meta: { changesBlueprintVersion: 'V_0-3-0' },
      store: { drafts: () => [] },
    }
    const res = nnConsole.composeExport(state, 'jane')
    assert.equal(res.ok, true, JSON.stringify(res.errors))
    assert.match(res.changesetFilename, /^ghost-busters_jane_/)
  })

  const stateFor = (title) => ({
    modelTitle: title,
    modelId: title,
    modelVersion: 'V_1-0-0',
    meta: { changesBlueprintVersion: 'V_0-3-0' },
    store: { drafts: () => [] },
  })
  const modelPart = (res) => res.changesetFilename.split('_')[0]

  it('gives different non-Latin titles different valid filenames', () => {
    const a = nnConsole.composeExport(stateFor('幕府モデル'), 'jane')
    const b = nnConsole.composeExport(stateFor('موديل'), 'jane')
    assert.equal(a.ok, true, JSON.stringify(a.errors))
    assert.equal(b.ok, true, JSON.stringify(b.errors))
    assert.match(modelPart(a), /^[A-Za-z0-9-]+$/)
    assert.match(modelPart(b), /^[A-Za-z0-9-]+$/)
    assert.notEqual(modelPart(a), modelPart(b))
    assert.notEqual(a.changesetFilename.split('_')[0], b.changesetFilename.split('_')[0])
  })

  it('is deterministic for the same non-Latin title', () => {
    const a = nnConsole.composeExport(stateFor('幕府モデル'), 'jane')
    const b = nnConsole.composeExport(stateFor('幕府モデル'), 'jane')
    assert.equal(modelPart(a), modelPart(b))
    assert.match(modelPart(a), /^model-[0-9a-f]{8}$/)
  })
})

describe('S1c: boot maps meta.knowledge_slug to state.modelSlug', () => {
  it('names the downloaded feedback file after meta.knowledge_slug', () => {
    const saved = MODEL.meta
    MODEL.meta = { ...saved, knowledge_slug: 'ghost-busters-slug' }
    try {
      const { dom, document, res } = bootConsole()
      res.controller.enable()
      addCommentDraft(document)
      const downloads = []
      dom.window.HTMLAnchorElement.prototype.click = function () {
        if (this.download) downloads.push(this.download)
      }
      dom.window.URL.createObjectURL = () => 'blob:test'
      dom.window.URL.revokeObjectURL = () => {}
      globalThis.URL.createObjectURL = () => 'blob:test'
      globalThis.URL.revokeObjectURL = () => {}
      document.getElementById('nn-feedback-open').click()
      const identifier = document.querySelector('#nn-feedback-modal [data-nn="identifier"]')
      identifier.value = 'jane'
      identifier.dispatchEvent(new dom.window.Event('input'))
      document.querySelector('#nn-feedback-modal [data-nn="download-changeset"]').click()
      assert.equal(downloads.length, 1, 'one file downloaded')
      assert.match(downloads[0], /^ghost-busters-slug_jane_[0-9-]+_changes_NN\.md$/)
    } finally {
      MODEL.meta = saved
    }
  })
})
