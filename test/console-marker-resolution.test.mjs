import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(resolve(here, '..'), 'iNNfo', 'specs', 'bluepriNNts', 'console')

const runtime = require(join(consoleDir, 'nn-runtime.js'))
const review = require(join(consoleDir, 'review.js'))

describe('review markers resolve to the model and matrix the author named', () => {
  describe('resolveKnowledgeModel', () => {
    it('resolves an unambiguous bare name', () => {
      const meta = { models: [{ id: 'acme-business', title: 'Acme', filePath: 'kNNowledge/Acme_business_NN.md' }] }
      assert.equal(runtime.resolveKnowledgeModel(meta, '[[Acme]]').id, 'acme-business')
    })

    it('prefers a full path over a bare name', () => {
      const meta = {
        models: [
          { id: 'other', title: 'Other', filePath: 'kNNowledge/Other_business_NN.md' },
          { id: 'acme', title: 'Acme', filePath: 'kNNowledge/Acme_business_NN.md' },
        ],
      }
      assert.equal(runtime.resolveKnowledgeModel(meta, 'kNNowledge/Acme_business_NN.md').id, 'acme')
    })

    it('refuses to guess when two models answer to the same bare name', () => {
      const meta = {
        models: [
          { id: 'acme_business', title: 'Ledger', filePath: 'kNNowledge/Ledger_business_NN.md' },
          { id: 'brand', title: 'Acme Business', filePath: 'kNNowledge/Acme_business_NN.md' },
        ],
      }
      assert.equal(runtime.resolveKnowledgeModel(meta, '[[Acme_business]]'), null, 'a name two models answer to resolves to nothing')
    })

    it('still resolves a nested path that names exactly one model', () => {
      const meta = {
        models: [
          { id: 'acme_business', title: 'Ledger', filePath: 'kNNowledge/Ledger_business_NN.md' },
          { id: 'brand', title: 'Acme Business', filePath: 'kNNowledge/archive/Acme_business_NN.md' },
        ],
      }
      assert.equal(
        runtime.resolveKnowledgeModel(meta, 'kNNowledge/archive/Acme_business_NN.md').id,
        'brand',
        'the path identifies the archived model',
      )
    })

    it('returns null for an unknown or empty value', () => {
      const meta = { models: [{ id: 'acme', title: 'Acme', filePath: 'kNNowledge/Acme_business_NN.md' }] }
      assert.equal(runtime.resolveKnowledgeModel(meta, '[[Nope]]'), null)
      assert.equal(runtime.resolveKnowledgeModel(meta, ''), null)
    })
  })

  describe('matrixCellDef', () => {
    const schema = {
      matrices: [
        { name: 'Metrics Dependencies', source: 'Metrics', target: 'Metrics', values: ['Includes'] },
        { name: 'Metrics Dependencies', source: 'Scenario', target: 'Stakeholders', values: ['Blocks'] },
      ],
    }

    it('breaks a same-named tie by the cell target concept', () => {
      const def = review.matrixCellDef(schema, 'Metrics Dependencies', 'Revenue', 'Stakeholders')
      assert.deepEqual(def.values, ['Blocks'])
    })

    it('falls back to the first declaration when no concept matches', () => {
      const def = review.matrixCellDef(schema, 'Metrics Dependencies', 'Revenue', 'Unknown Concept')
      assert.deepEqual(def.values, ['Includes'])
    })

    it('returns a single declaration and null when nothing declares the matrix', () => {
      const single = { matrices: [{ name: 'Only Matrix', target: 'Metrics', values: ['Includes'] }] }
      assert.equal(review.matrixCellDef(single, 'Only Matrix').name, 'Only Matrix')
      assert.equal(review.matrixCellDef(single, 'Absent Matrix'), null)
      assert.equal(review.matrixCellDef(null, 'Only Matrix'), null)
    })
  })
})
