import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InnfoConsole } from './helpers/console-boot.mjs'

describe('S1c: export filename uses the model slug', () => {
  it('composeExport succeeds for a model with a human title', () => {
    const state = {
      modelTitle: 'Ghost Busters Model',
      modelId: 'Ghost Busters Model',
      modelVersion: 'V_1-0-0',
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
    const res = InnfoConsole.composeExport(state, 'jane')
    assert.equal(res.ok, true, JSON.stringify(res.errors))
    assert.match(res.filename, /^ghost-busters-model_V_1-0-0_jane_feedback_/)
    assert.match(res.changesetFilename, /^ghost-busters-model_jane_/)
  })

  it('prefers an explicit model_slug over the title', () => {
    const state = {
      modelTitle: 'Ghost Busters Model',
      modelSlug: 'ghost-busters',
      modelVersion: 'V_1-0-0',
      store: { drafts: () => [] },
    }
    const res = InnfoConsole.composeExport(state, 'jane')
    assert.equal(res.ok, true, JSON.stringify(res.errors))
    assert.match(res.filename, /^ghost-busters_V_1-0-0_/)
  })
})
