import { describe, expect, it } from 'vitest'
import { foldRun, procedureGraph } from './index.js'
import type { RunModel, StepRow } from './index.js'
import { BUILD_MD, LOOP_MD, REPORT_MD, REVIEW_MD, parse } from './fixtures.js'

const review = procedureGraph(parse(REVIEW_MD))
const report = procedureGraph(parse(REPORT_MD))
const build = procedureGraph(parse(BUILD_MD))
const loop = procedureGraph(parse(LOOP_MD))

const step = (over: Partial<StepRow> = {}): StepRow => ({
  status: 'pending',
  attempt: 0,
  inputs: {},
  ...over,
})

function run(over: Partial<RunModel> = {}): RunModel {
  return {
    state: 'open',
    seq: 1,
    procedure: 'review',
    defRev: 'V_1-0-0',
    params: {},
    steps: {},
    artifacts: {},
    inputs: {},
    attempts: {},
    ...over,
  }
}

/** The review procedure up to the decision step, waiting on a person. */
const UNTIL_REVIEW = run({
  steps: {
    draft: step({ status: 'done', attempt: 1 }),
    review: step({
      status: 'waiting',
      attempt: 1,
      inputs: { 'draft-doc': 'd1' },
      waitingOn: 'human',
    }),
  },
  artifacts: {
    'draft-doc': { kind: 'file', status: 'validated', rev: 'd1', value: 'draft.md', step: 'draft' },
  },
})

describe('foldRun', () => {
  it('starts at the start step with nothing recorded', () => {
    const s = foldRun(review, run(), { defRev: 'V_1-0-0' })
    expect(s.status).toBe('open')
    expect(s.currentStep).toBe('draft')
    expect(s.path).toEqual(['draft'])
    expect(s.steps.draft.status).toBe('pending')
    expect(s.artifacts['draft-doc'].status).toBe('expected')
  })

  it('approve: a decision step waits, offers its guarded targets, and takes the approve branch', () => {
    const waiting = foldRun(review, UNTIL_REVIEW, { defRev: 'V_1-0-0' })
    expect(waiting.status).toBe('waiting')
    expect(waiting.currentStep).toBe('review')
    expect(waiting.steps.review.status).toBe('waiting')
    expect(waiting.allowedNext).toEqual([
      { to: 'publish', guard: { kind: 'outcome', token: 'approve' } },
      { to: 'rework', guard: { kind: 'outcome', token: 'decline' } },
    ])

    const done = foldRun(
      review,
      run({
        steps: {
          draft: step({ status: 'done', attempt: 1 }),
          review: step({ status: 'done', attempt: 1, outcome: 'approve', next: 'publish' }),
          publish: step({ status: 'done', attempt: 1, inputs: { 'draft-doc': 'd1' } }),
        },
        artifacts: {
          'draft-doc': { kind: 'file', status: 'validated', rev: 'd1', step: 'draft' },
          published: { kind: 'file', status: 'validated', rev: 'p1', step: 'publish' },
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(done.path).toEqual(['draft', 'review', 'publish'])
    expect(done.currentStep).toBeNull()
    expect(done.canComplete).toBe(true)
    expect(done.steps.review).toMatchObject({ status: 'done', outcome: 'approve', next: 'publish' })
    expect(done.steps.rework.status).toBe('off_path')
    expect(done.artifacts.published).toMatchObject({ status: 'validated', rev: 'p1' })
    expect(done.status).toBe('open')

    const closed = foldRun(
      review,
      run({
        state: 'completed',
        steps: {
          draft: step({ status: 'done', attempt: 1 }),
          review: step({ status: 'done', attempt: 1, outcome: 'approve', next: 'publish' }),
          publish: step({ status: 'done', attempt: 1 }),
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(closed.status).toBe('completed')
  })

  it('decline: the decline branch ends the run and the other branch output is not required', () => {
    const s = foldRun(
      review,
      run({
        steps: {
          draft: step({ status: 'done', attempt: 1 }),
          review: step({ status: 'done', attempt: 1, outcome: 'decline', next: 'rework' }),
          rework: step({ status: 'done', attempt: 1 }),
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(s.path).toEqual(['draft', 'review', 'rework'])
    expect(s.steps.publish.status).toBe('off_path')
    expect(s.artifacts.published.status).toBe('not_required')
    expect(s.canComplete).toBe(true)
  })

  it('blocks a completion whose next is not one of the step targets', () => {
    const s = foldRun(
      review,
      run({
        steps: {
          draft: step({ status: 'done', attempt: 1 }),
          review: step({ status: 'done', attempt: 1, next: 'draft' }),
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(s.status).toBe('blocked')
    expect(s.currentStep).toBe('review')
    expect(s.blockedBy).toMatch(/draft/)
  })

  it('retry+stale: a failed step is retried, then a new input rev makes its output stale and reopens it', () => {
    const failed = foldRun(
      report,
      run({
        steps: {
          gather: step({ status: 'done', attempt: 1 }),
          write: step({ status: 'failed', attempt: 1, inputs: { brief: 'b1' }, failure: 'exit 1' }),
        },
        artifacts: { brief: { kind: 'file', status: 'validated', rev: 'b1', step: 'gather' } },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(failed.status).toBe('blocked')
    expect(failed.currentStep).toBe('write')
    expect(failed.steps.write).toMatchObject({ status: 'failed', attempt: 1, failure: 'exit 1' })

    const ok = foldRun(
      report,
      run({
        steps: {
          gather: step({ status: 'done', attempt: 1 }),
          write: step({ status: 'done', attempt: 2, inputs: { brief: 'b1' } }),
        },
        artifacts: {
          brief: { kind: 'file', status: 'validated', rev: 'b1', step: 'gather' },
          report: { kind: 'file', status: 'validated', rev: 'r1', step: 'write' },
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(ok.steps.write).toMatchObject({ status: 'done', attempt: 2 })
    expect(ok.currentStep).toBe('finish')
    expect(ok.allowedNext).toEqual([])
    expect(ok.stale).toEqual([])

    const s = foldRun(
      report,
      run({
        steps: {
          gather: step({ status: 'done', attempt: 1 }),
          write: step({ status: 'done', attempt: 2, inputs: { brief: 'b1' } }),
        },
        artifacts: {
          brief: { kind: 'file', status: 'validated', rev: 'b2', step: 'gather' },
          report: { kind: 'file', status: 'validated', rev: 'r1', step: 'write' },
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(s.stale).toEqual(['report'])
    expect(s.artifacts.report.status).toBe('stale')
    expect(s.reopened).toEqual(['write'])
    expect(s.steps.write.status).toBe('reopened')
    expect(s.currentStep).toBe('write')
    expect(s.status).toBe('open')
  })

  it('loop: a span the runner reopened walks back to its target, and its outputs are stale', () => {
    // The back-edge redraft -> review was taken: review and redraft are pending again with
    // their attempts kept, and the draft the redraft produced is no longer validated.
    const s = foldRun(
      loop,
      run({
        steps: {
          draft: step({ status: 'done', attempt: 1 }),
          review: step({ status: 'pending', attempt: 1 }),
          redraft: step({ status: 'pending', attempt: 1 }),
        },
        artifacts: {
          'draft-doc': { kind: 'file', status: 'produced', rev: 'd2', step: 'redraft' },
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(s.status).toBe('open')
    expect(s.currentStep).toBe('review')
    expect(s.path).toEqual(['draft', 'review'])
    expect(s.steps.review).toMatchObject({ status: 'pending', attempt: 1 })
    // Still reachable from the current step, so not off the path.
    expect(s.steps.redraft.status).toBe('pending')
    expect(s.steps.publish.status).toBe('pending')
    expect(s.artifacts['draft-doc'].status).toBe('stale')
    expect(s.stale).toEqual(['draft-doc'])
    expect(s.reopened).toEqual([])

    // Once the producer runs again, the artifact is the producer's to report: no longer stale.
    const again = foldRun(
      loop,
      run({
        steps: {
          draft: step({ status: 'done', attempt: 1 }),
          review: step({ status: 'done', attempt: 2, outcome: 'send-back', next: 'redraft' }),
          redraft: step({ status: 'active', attempt: 2 }),
        },
        artifacts: {
          'draft-doc': { kind: 'file', status: 'produced', rev: 'd2', step: 'redraft' },
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(again.currentStep).toBe('redraft')
    expect(again.steps.redraft).toMatchObject({ status: 'active', attempt: 2 })
    expect(again.artifacts['draft-doc'].status).toBe('produced')
    expect(again.stale).toEqual([])
  })

  it('loop: a back-edge recorded without reopening its span blocks the walk', () => {
    const s = foldRun(
      loop,
      run({
        steps: {
          draft: step({ status: 'done', attempt: 1 }),
          review: step({ status: 'done', attempt: 1, outcome: 'send-back', next: 'redraft' }),
          redraft: step({ status: 'done', attempt: 1, next: 'review' }),
        },
      }),
      { defRev: 'V_1-0-0' },
    )
    expect(s.status).toBe('blocked')
    expect(s.currentStep).toBe('review')
    expect(s.blockedBy).toMatch(/reached twice/)
  })

  it('offers an artifact guard evaluated against the run', () => {
    const s = foldRun(report, run({ steps: { gather: step({ status: 'done', attempt: 1 }) } }), {
      defRev: 'V_1-0-0',
    })
    expect(s.allowedNext).toEqual([
      { to: 'finish', guard: { kind: 'artifact', artifact: 'report', holds: false } },
    ])
  })

  it('crash: an active engine step whose holder is gone is a crash', () => {
    const active = run({ steps: { build: step({ status: 'active', attempt: 1 }) } })
    const crashed = foldRun(build, active, {
      defRev: 'V_1-0-0',
      activeStepIsStale: () => true,
    })
    expect(crashed.crashed).toBe(true)
    expect(crashed.status).toBe('blocked')
    expect(crashed.currentStep).toBe('build')

    const running = foldRun(build, active, {
      defRev: 'V_1-0-0',
      activeStepIsStale: () => false,
    })
    expect(running.crashed).toBe(false)
    expect(running.status).toBe('open')
    expect(running.steps.build.status).toBe('active')

    const later = foldRun(
      build,
      run({ steps: { build: step({ status: 'failed', attempt: 1, failure: 'exit 2' }) } }),
      { defRev: 'V_1-0-0', activeStepIsStale: () => true },
    )
    expect(later.crashed).toBe(false)
  })

  it('drift: a pinned def_rev other than the definition rev drifts until the pin is moved', () => {
    const drifted = foldRun(review, run({ defRev: 'V_0-9-0' }), { defRev: 'V_0-9-0' })
    expect(drifted.status).toBe('drifted')
    expect(drifted.drift).toEqual({ pinned: 'V_0-9-0', current: 'V_1-0-0' })

    // A rebase writes the new revision onto the header, so the next fold sees no drift.
    const rebased = foldRun(review, run({ defRev: 'V_1-0-0' }), { defRev: 'V_1-0-0' })
    expect(rebased.status).toBe('open')
    expect(rebased.drift).toBeNull()
  })

  it('computed values: a recorded input whose rev differs from the current one is stale', () => {
    const s = foldRun(
      build,
      run({
        inputs: {
          'metrics-revenue': { value: '10', rev: 'c1' },
          'metrics-cost': { value: '4', rev: 'c7' },
        },
      }),
      { defRev: 'V_1-0-0', currentRevs: { 'metrics-revenue': 'c2', 'metrics-cost': 'c7' } },
    )
    // The fold surfaces what the run recorded, and names the ones the caller's current rev
    // moved past: the computed value must be recomputed, the other stands.
    expect(s.inputs).toEqual({
      'metrics-revenue': { value: '10', rev: 'c1' },
      'metrics-cost': { value: '4', rev: 'c7' },
    })
    expect(s.staleInputs).toEqual(['metrics-revenue'])
  })

  it('pause, cancel and terminal states', () => {
    expect(foldRun(build, run({ state: 'paused' }), { defRev: 'V_1-0-0' })).toMatchObject({
      status: 'paused',
      paused: true,
    })
    expect(foldRun(build, run({ state: 'open' }), { defRev: 'V_1-0-0' }).paused).toBe(false)
    expect(foldRun(build, run({ state: 'cancelled' }), { defRev: 'V_0-0-1' }).status).toBe(
      'cancelled',
    )
  })
})
