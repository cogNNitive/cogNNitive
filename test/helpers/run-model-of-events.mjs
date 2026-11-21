/**
 * The run model a list of events describes (design §3.1), for the tests that stage a run as
 * a list of events. The fold reads state; this is the inverse of the exporter's
 * `eventsOfRunModel`, kept in one place so every console suite reads a run the same way.
 */
export function runModelOfEvents(events, opts = {}) {
  const steps = {}
  const artifacts = {}
  const inputs = {}
  let state = opts.state || 'open'
  for (const e of Array.isArray(events) ? events : []) {
    if (e.kind === 'step_started') {
      steps[e.step] = { status: 'active', attempt: e.attempt ?? 1, inputs: e.inputs ?? {} }
    } else if (e.kind === 'step_waiting' && steps[e.step]) {
      steps[e.step] = { ...steps[e.step], status: 'waiting', waitingOn: e.value }
    } else if (e.kind === 'step_completed' && steps[e.step]) {
      steps[e.step] = {
        ...steps[e.step],
        status: 'done',
        ...(e.outcome !== undefined ? { outcome: e.outcome } : {}),
        ...(e.next !== undefined ? { next: e.next } : {}),
      }
    } else if (e.kind === 'step_failed' && steps[e.step]) {
      steps[e.step] = { ...steps[e.step], status: 'failed', failure: e.value }
    } else if (
      (e.kind === 'artifact_validated' ||
        e.kind === 'artifact_rejected' ||
        e.kind === 'artifact_produced') &&
      e.field
    ) {
      artifacts[e.field] = {
        kind: 'file',
        status: e.kind.slice('artifact_'.length),
        ...(e.value !== undefined ? { value: e.value } : {}),
        ...(e.rev !== undefined ? { rev: e.rev } : {}),
        ...(e.step !== undefined ? { step: e.step } : {}),
      }
    } else if (e.kind === 'input_recorded' && e.field) {
      inputs[e.field] = {
        ...(e.value !== undefined ? { value: e.value } : {}),
        ...(e.rev !== undefined ? { rev: e.rev } : {}),
      }
    } else if (e.kind === 'interrupted') {
      state = 'paused'
    } else if (e.kind === 'resumed') {
      state = 'open'
    } else if (e.kind === 'completed' || e.kind === 'failed' || e.kind === 'cancelled') {
      state = e.kind
    }
  }
  return {
    state,
    seq: 1,
    procedure: opts.procedure ?? '',
    defRev: opts.defRev ?? null,
    params: {},
    steps,
    artifacts,
    inputs,
    attempts: {},
  }
}
