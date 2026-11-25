import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { openSession } from './helpers/nn-mcp-session.mjs'

const file = 'model_a_business_procedures_NN.md'
const procedures = { [file]: `bluepriNNts/business/procedures/${file}` }

test(
  'Modeling a Business sends every failed gate back to rework and gates the deliverable',
  { timeout: 120_000 },
  async () => {
    const session = await openSession({ procedures })
    const run = 'business'
    const ok = async (name, args) => {
      const result = await session.call(name, args)
      assert.equal(result.ok, true, JSON.stringify(result))
      return result
    }
    const record = (action, args = {}) => ok('procedure_record', { run, action, ...args })
    const refused = (action, args = {}) =>
      session.call('procedure_record', { run, action, ...args })
    const deliver = (field, step) =>
      record('artifact', {
        field,
        step,
        fact: 'validated',
        rev: createHash('sha256').update(`${step}:${field}`).digest('hex'),
      })
    /** Starts a step, records its outputs, completes it and returns the step the run moved to. */
    const walk = async (step, { outcome, outputs = [] } = {}) => {
      await record('start', { step })
      for (const field of outputs) await deliver(field, step)
      const done = await record('complete', { step, ...(outcome ? { outcome } : {}) })
      return done.state.currentStep
    }
    try {
      await ok('procedure_start', { procedure: `procedures/${file}`, run })

      // Close the Exchange: the segments carry the exchange the gate checks.
      assert.equal(
        await walk('name-the-segments-and-the-value-proposition', {
          outputs: ['customer-segments', 'balanced-exchange'],
        }),
        'close-the-exchange',
      )
      await record('start', { step: 'close-the-exchange' })
      // An open exchange can never be pushed forward to the capabilities.
      const forced = await refused('complete', {
        step: 'close-the-exchange',
        outcome: 'open',
        next: 'describe-the-capabilities',
      })
      assert.equal(forced.code, 'INVALID_TRANSITION', JSON.stringify(forced))
      const open = await record('complete', { step: 'close-the-exchange', outcome: 'open' })
      assert.equal(open.state.currentStep, 'close-the-open-segments')
      assert.equal(await walk('close-the-open-segments'), 'close-the-exchange')
      assert.equal(
        await walk('close-the-exchange', { outcome: 'closed' }),
        'describe-the-capabilities',
      )

      // Test the Analysis: unevidenced Keys go back for their validations.
      assert.equal(
        await walk('describe-the-capabilities', { outputs: ['keys-and-resources'] }),
        'test-the-analysis',
      )
      assert.equal(
        await walk('test-the-analysis', { outcome: 'unevidenced' }),
        'record-the-missing-validations',
      )
      assert.equal(await walk('record-the-missing-validations'), 'test-the-analysis')
      assert.equal(await walk('test-the-analysis', { outcome: 'evidenced' }), 'staff-the-model')

      assert.equal(
        await walk('staff-the-model', { outputs: ['organization-chart'] }),
        'quantify-the-model',
      )
      assert.equal(
        await walk('quantify-the-model', { outputs: ['measured-business'] }),
        'plan-the-delivery',
      )
      assert.equal(
        await walk('plan-the-delivery', { outputs: ['project-plan'] }),
        'review-the-model',
      )

      // Review the Model: an invalid model can complete the review, never the deliverable.
      assert.equal(
        await walk('review-the-model', { outcome: 'invalid' }),
        'fix-the-reported-diagnostics',
      )
      assert.equal(await walk('fix-the-reported-diagnostics'), 'review-the-model')
      assert.equal(
        await walk('review-the-model', { outcome: 'valid' }),
        'confirm-the-validated-model',
      )
      await record('start', { step: 'confirm-the-validated-model' })
      const absent = await refused('complete', { step: 'confirm-the-validated-model' })
      assert.equal(absent.code, 'MISSING_OUTPUT', JSON.stringify(absent))
      assert.equal(absent.missing[0].slug, 'validated-business-model')
      await deliver('validated-business-model', 'confirm-the-validated-model')
      await record('complete', { step: 'confirm-the-validated-model' })
      await record('finish', { outcome: 'completed' })
      const { state } = await ok('procedure_state', { run })
      assert.equal(state.status, 'completed')
      assert.equal(state.artifacts['validated-business-model'].status, 'validated')
    } finally {
      await session.close()
    }
  },
)
