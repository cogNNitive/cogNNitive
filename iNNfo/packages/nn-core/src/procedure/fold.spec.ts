import { describe, expect, it } from 'vitest'
import { foldRun, procedureGraph } from './index.js'
import type { RunEvent } from './index.js'
import { BUILD_MD, REPORT_MD, REVIEW_MD, parse } from './fixtures.js'

const review = procedureGraph(parse(REVIEW_MD))
const report = procedureGraph(parse(REPORT_MD))
const build = procedureGraph(parse(BUILD_MD))

const UNTIL_REVIEW: RunEvent[] = [
  { kind: 'started', actor: 'agent' },
  { kind: 'step_started', step: 'draft', attempt: 1 },
  { kind: 'artifact_validated', step: 'draft', field: 'draft-doc', value: 'draft.md', rev: 'd1' },
  { kind: 'step_completed', step: 'draft', next: 'review' },
  { kind: 'step_started', step: 'review', attempt: 1, inputs: { 'draft-doc': 'd1' } },
  { kind: 'step_waiting', step: 'review', value: 'human' },
]

describe('foldRun', () => {
  it('starts at the start step with nothing recorded', () => {
    const s = foldRun(review, [{ kind: 'started' }], { defRev: 'V_1-0-0' })
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

    const events: RunEvent[] = [
      ...UNTIL_REVIEW,
      { kind: 'step_completed', step: 'review', outcome: 'approve', next: 'publish' },
      { kind: 'step_started', step: 'publish', attempt: 1, inputs: { 'draft-doc': 'd1' } },
      { kind: 'artifact_validated', step: 'publish', field: 'published', value: 'out/draft.html', rev: 'p1' },
      { kind: 'step_completed', step: 'publish' },
    ]
    const done = foldRun(review, events, { defRev: 'V_1-0-0' })
    expect(done.path).toEqual(['draft', 'review', 'publish'])
    expect(done.currentStep).toBeNull()
    expect(done.canComplete).toBe(true)
    expect(done.steps.review).toMatchObject({ status: 'done', outcome: 'approve', next: 'publish' })
    expect(done.steps.rework.status).toBe('off_path')
    expect(done.artifacts.published).toMatchObject({ status: 'validated', rev: 'p1' })
    expect(done.status).toBe('open')

    const closed = foldRun(review, [...events, { kind: 'completed', actor: 'agent' }], { defRev: 'V_1-0-0' })
    expect(closed.status).toBe('completed')
  })

  it('decline: the decline branch ends the run and the other branch output is not required', () => {
    const s = foldRun(
      review,
      [
        ...UNTIL_REVIEW,
        { kind: 'step_completed', step: 'review', outcome: 'decline', next: 'rework' },
        { kind: 'step_started', step: 'rework', attempt: 1 },
        { kind: 'step_completed', step: 'rework' },
      ],
      { defRev: 'V_1-0-0' },
    )
    expect(s.path).toEqual(['draft', 'review', 'rework'])
    expect(s.steps.publish.status).toBe('off_path')
    expect(s.artifacts.published.status).toBe('not_required')
    expect(s.canComplete).toBe(true)
  })

  it('blocks a completion whose next is not one of the step targets', () => {
    const s = foldRun(review, [...UNTIL_REVIEW, { kind: 'step_completed', step: 'review', next: 'draft' }], {
      defRev: 'V_1-0-0',
    })
    expect(s.status).toBe('blocked')
    expect(s.currentStep).toBe('review')
    expect(s.blockedBy).toMatch(/draft/)
  })

  it('retry+stale: a failed step is retried, then a new input rev makes its output stale and reopens it', () => {
    const base: RunEvent[] = [
      { kind: 'started' },
      { kind: 'step_started', step: 'gather', attempt: 1 },
      { kind: 'artifact_validated', step: 'gather', field: 'brief', rev: 'b1' },
      { kind: 'step_completed', step: 'gather' },
      { kind: 'step_started', step: 'write', attempt: 1, inputs: { brief: 'b1' } },
      { kind: 'step_failed', step: 'write', value: 'exit 1' },
    ]
    const failed = foldRun(report, base, { defRev: 'V_1-0-0' })
    expect(failed.status).toBe('blocked')
    expect(failed.currentStep).toBe('write')
    expect(failed.steps.write).toMatchObject({ status: 'failed', attempt: 1, failure: 'exit 1' })

    const retried: RunEvent[] = [
      ...base,
      { kind: 'step_started', step: 'write', attempt: 2, inputs: { brief: 'b1' } },
      { kind: 'artifact_validated', step: 'write', field: 'report', rev: 'r1' },
      { kind: 'step_completed', step: 'write' },
    ]
    const ok = foldRun(report, retried, { defRev: 'V_1-0-0' })
    expect(ok.steps.write).toMatchObject({ status: 'done', attempt: 2 })
    expect(ok.currentStep).toBe('finish')
    expect(ok.allowedNext).toEqual([])
    expect(ok.stale).toEqual([])

    const s = foldRun(report, [...retried, { kind: 'artifact_validated', step: 'gather', field: 'brief', rev: 'b2' }], {
      defRev: 'V_1-0-0',
    })
    expect(s.stale).toEqual(['report'])
    expect(s.artifacts.report.status).toBe('stale')
    expect(s.reopened).toEqual(['write'])
    expect(s.steps.write.status).toBe('reopened')
    expect(s.currentStep).toBe('write')
    expect(s.status).toBe('open')
  })

  it('offers an artifact guard evaluated against the run', () => {
    const s = foldRun(
      report,
      [
        { kind: 'step_completed', step: 'gather' },
        { kind: 'step_started', step: 'write', attempt: 1 },
      ],
      { defRev: 'V_1-0-0' },
    )
    expect(s.allowedNext).toEqual([{ to: 'finish', guard: { kind: 'artifact', artifact: 'report', holds: false } }])
  })

  it('crash: an engine step started with no later event is a crash once the apply lock is free', () => {
    const events: RunEvent[] = [{ kind: 'started' }, { kind: 'step_started', step: 'build', attempt: 1 }]
    const crashed = foldRun(build, events, { defRev: 'V_1-0-0', lockFree: true })
    expect(crashed.crashed).toBe(true)
    expect(crashed.status).toBe('blocked')
    expect(crashed.currentStep).toBe('build')

    const running = foldRun(build, events, { defRev: 'V_1-0-0', lockFree: false })
    expect(running.crashed).toBe(false)
    expect(running.status).toBe('open')
    expect(running.steps.build.status).toBe('active')

    const later = foldRun(build, [...events, { kind: 'step_failed', step: 'build', value: 'exit 2' }], {
      defRev: 'V_1-0-0',
      lockFree: true,
    })
    expect(later.crashed).toBe(false)
  })

  it('drift: a pinned def_rev other than the definition rev drifts until a rebase accepts it', () => {
    const drifted = foldRun(review, [{ kind: 'started' }], { defRev: 'V_0-9-0' })
    expect(drifted.status).toBe('drifted')
    expect(drifted.drift).toEqual({ pinned: 'V_0-9-0', current: 'V_1-0-0' })

    const rebased = foldRun(review, [{ kind: 'started' }, { kind: 'rebased', value: 'V_1-0-0' }], { defRev: 'V_0-9-0' })
    expect(rebased.status).toBe('open')
    expect(rebased.drift).toBeNull()
  })

  it('computed values: a recorded input whose rev differs from the current one is stale', () => {
    const s = foldRun(
      build,
      [
        { kind: 'input_recorded', field: 'metrics@revenue', value: '10', rev: 'c1' },
        { kind: 'input_recorded', field: 'metrics@cost', value: '4', rev: 'c7' },
      ],
      { defRev: 'V_1-0-0', currentRevs: { 'metrics@revenue': 'c2', 'metrics@cost': 'c7' } },
    )
    expect(s.inputs['metrics@revenue']).toEqual({ value: '10', rev: 'c1' })
    expect(s.staleInputs).toEqual(['metrics@revenue'])
  })

  it('pause, cancel and terminal events', () => {
    expect(foldRun(build, [{ kind: 'interrupted' }], { defRev: 'V_1-0-0' })).toMatchObject({ status: 'waiting', paused: true })
    expect(foldRun(build, [{ kind: 'interrupted' }, { kind: 'resumed' }], { defRev: 'V_1-0-0' }).paused).toBe(false)
    expect(foldRun(build, [{ kind: 'cancelled' }], { defRev: 'V_0-0-1' }).status).toBe('cancelled')
  })
})
