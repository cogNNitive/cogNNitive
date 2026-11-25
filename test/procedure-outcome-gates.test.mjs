import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { openSession } from './helpers/nn-mcp-session.mjs'

const reconcile = 'reconcile_artifact_feedback_procedures_NN.md'
const upgrade = 'upgrade_and_migrate_legacy_workspace_procedures_NN.md'
const procedures = {
  [reconcile]: `bluepriNNts/workspace/procedures/${reconcile}`,
  [upgrade]: `bluepriNNts/workspace/procedures/${upgrade}`,
}

/** A session with the two procedures, and the runner calls the scenarios share. */
async function open() {
  const session = await openSession({ procedures })
  const ok = async (name, args) => {
    const result = await session.call(name, args)
    assert.equal(result.ok, true, JSON.stringify(result))
    return result
  }
  const start = (file, run) => ok('procedure_start', { procedure: `procedures/${file}`, run })
  const record = (run, action, args = {}) => ok('procedure_record', { run, action, ...args })
  const refused = (run, action, args = {}) =>
    session.call('procedure_record', { run, action, ...args })
  // An artifact two branches produce is reported from the step that ran: `step` names it.
  const deliver = (run, field, step) =>
    record(run, 'artifact', {
      field,
      ...(step ? { step } : {}),
      fact: 'validated',
      rev: createHash('sha256').update(`${run}:${field}`).digest('hex'),
    })
  /** Starts a step, records the outputs it was given, and completes it. */
  const complete = async (run, step, { outcome, deliver: fields = [] } = {}) => {
    await record(run, 'start', { step })
    for (const field of fields) await deliver(run, field)
    return record(run, 'complete', { step, ...(outcome ? { outcome } : {}) })
  }
  const state = async (run) => (await ok('procedure_state', { run })).state
  return { session, start, record, refused, deliver, complete, state }
}

const intake = [
  ['step-0-dual-emission-deliverable-generation', ['review-scaffold-deliverable']],
  // Steps 1 to 3 hand work to the next step through scratch artifacts (system_temp or
  // session_context): nothing a reader of the run needs, so none is asked for.
  ['step-1-forensic-ingestion-and-attribution-extraction', []],
  ['step-2-lineage-and-upstream-dependency-mapping', []],
  ['step-3-four-layer-discrepancy-triaging', []],
]

test(
  'Reconcile Artifact Feedback branches on the intent decision and gates the deliverable',
  { timeout: 120_000 },
  async () => {
    const { session, start, record, refused, deliver, complete, state } = await open()
    try {
      // An editorial cut changes this document only: the upstream models are never mutated.
      await start(reconcile, 'editorial')
      for (const [step, fields] of intake) await complete('editorial', step, { deliver: fields })
      await record('editorial', 'start', { step: 'step-4-user-intent-decision-gate' })
      const noDecision = await refused('editorial', 'complete', {
        step: 'step-4-user-intent-decision-gate',
        outcome: 'editorial-cut',
      })
      assert.equal(noDecision.code, 'MISSING_OUTPUT')
      assert.equal(noDecision.missing[0].slug, 'user-reconciliation-decisions')
      await deliver('editorial', 'user-reconciliation-decisions')
      const cut = await record('editorial', 'complete', {
        step: 'step-4-user-intent-decision-gate',
        outcome: 'editorial-cut',
      })
      assert.equal(cut.state.currentStep, 'record-editorial-cut')
      await complete('editorial', 'record-editorial-cut')
      await record('editorial', 'start', {
        step: 'step-6-artifact-sanitization-and-lineage-registration',
      })
      const absent = await refused('editorial', 'complete', {
        step: 'step-6-artifact-sanitization-and-lineage-registration',
      })
      assert.equal(absent.code, 'MISSING_OUTPUT')
      assert.equal(absent.missing[0].slug, 'published-final-deliverable')
      await deliver('editorial', 'published-final-deliverable')
      await record('editorial', 'complete', {
        step: 'step-6-artifact-sanitization-and-lineage-registration',
      })
      await record('editorial', 'finish', { outcome: 'completed' })
      const done = await state('editorial')
      assert.equal(done.status, 'completed')
      assert.equal(done.steps['step-5-upstream-model-and-template-mutation'].status, 'off_path')
      assert.notEqual(done.artifacts['updated-domain-model'].status, 'validated')

      // A changed domain reality mutates the models first, and that step owns its output.
      await start(reconcile, 'changed')
      for (const [step, fields] of intake) await complete('changed', step, { deliver: fields })
      await record('changed', 'start', { step: 'step-4-user-intent-decision-gate' })
      await deliver('changed', 'user-reconciliation-decisions')
      const wrong = await refused('changed', 'complete', {
        step: 'step-4-user-intent-decision-gate',
        outcome: 'domain-changed',
        next: 'record-editorial-cut',
      })
      assert.equal(wrong.code, 'INVALID_TRANSITION')
      const before = await state('changed')
      const mutate = await record('changed', 'complete', {
        step: 'step-4-user-intent-decision-gate',
        outcome: 'domain-changed',
      })
      assert.equal(mutate.state.currentStep, 'step-5-upstream-model-and-template-mutation')
      assert.equal(before.currentStep, 'step-4-user-intent-decision-gate')
      await record('changed', 'start', { step: 'step-5-upstream-model-and-template-mutation' })
      const unvalidated = await refused('changed', 'complete', {
        step: 'step-5-upstream-model-and-template-mutation',
      })
      assert.equal(unvalidated.code, 'MISSING_OUTPUT')
      assert.equal(unvalidated.missing[0].slug, 'updated-domain-model')
    } finally {
      await session.close()
    }
  },
)

test(
  'Upgrade a Workspace takes the restore path when validation fails and gates the backup',
  { timeout: 120_000 },
  async () => {
    const { session, start, record, refused, deliver, complete, state } = await open()
    try {
      const route = (run, outcome) => complete(run, 'route-by-the-preflight-verdict', { outcome })
      // Nothing is written before the backup exists: its step cannot close without it.
      await start(upgrade, 'rejected-upgrade')
      await route('rejected-upgrade', 'upgrade-available')
      await record('rejected-upgrade', 'start', { step: 'back-up-before-upgrade' })
      const noBackup = await refused('rejected-upgrade', 'complete', {
        step: 'back-up-before-upgrade',
      })
      assert.equal(noBackup.code, 'MISSING_OUTPUT')
      assert.equal(noBackup.missing[0].slug, 'verified-backup')
      await deliver('rejected-upgrade', 'verified-backup')
      await record('rejected-upgrade', 'complete', { step: 'back-up-before-upgrade' })
      // The impact report is informational: a clean diff asks no mapping question.
      await complete('rejected-upgrade', 'analyze-upgrade-impact')
      // A failed validation restores the backup, and the run cannot pass for a success.
      await record('rejected-upgrade', 'start', { step: 'rehydrate-and-validate' })
      const mismatch = await refused('rejected-upgrade', 'complete', {
        step: 'rehydrate-and-validate',
        outcome: 'invalid',
        next: 'confirm-validated-workspace',
      })
      assert.equal(mismatch.code, 'INVALID_TRANSITION')
      const restoring = await record('rejected-upgrade', 'complete', {
        step: 'rehydrate-and-validate',
        outcome: 'invalid',
      })
      assert.equal(restoring.state.currentStep, 'restore-from-backup')
      await complete('rejected-upgrade', 'restore-from-backup')
      const failed = await record('rejected-upgrade', 'finish', { outcome: 'failed' })
      assert.equal(failed.state.status, 'failed')
      assert.notEqual(
        (await state('rejected-upgrade')).artifacts['validated-canonical-workspace'].status,
        'validated',
      )

      // A valid result must record the workspace it validated before the run closes.
      await start(upgrade, 'upgrade')
      await route('upgrade', 'upgrade-available')
      await complete('upgrade', 'back-up-before-upgrade', { deliver: ['verified-backup'] })
      await complete('upgrade', 'analyze-upgrade-impact')
      await complete('upgrade', 'rehydrate-and-validate', { outcome: 'valid' })
      await record('upgrade', 'start', { step: 'confirm-validated-workspace' })
      const absent = await refused('upgrade', 'complete', { step: 'confirm-validated-workspace' })
      assert.equal(absent.code, 'MISSING_OUTPUT')
      assert.equal(absent.missing[0].slug, 'validated-canonical-workspace')
      await deliver('upgrade', 'validated-canonical-workspace', 'confirm-validated-workspace')
      await record('upgrade', 'complete', { step: 'confirm-validated-workspace' })
      await record('upgrade', 'finish', { outcome: 'completed' })
      const done = await state('upgrade')
      assert.equal(done.status, 'completed')
      assert.equal(done.steps['restore-from-backup'].status, 'off_path')
    } finally {
      await session.close()
    }
  },
)
