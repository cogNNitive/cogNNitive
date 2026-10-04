import { describe, it, expect } from 'vitest'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

// Task 3.3 — export → scan → Reconcile Feedback round-trip support on the sample:
// the feedback fixtures must validate against the console schema, the
// staleness check must block a stale base naming BOTH versions, and the
// procedure must run Reconcile Feedback instead of Version-And-Archive.
const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(
  here,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'console',
  'innfo-runtime.js',
)
const samplesDir = join(here, '..', '..', '..', 'specs', 'bluepriNNts', 'metrics', 'samples')
const procedurePath = join(
  here,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'metrics',
  'procedures',
  'create_timeline_procedures_NN.md',
)
const reconcileProcedurePath = join(
  here,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'workspace',
  'procedures',
  'reconcile_feedback_NN.md',
)
const nodeRequire = createRequire(import.meta.url)

interface ApplyFeedbackRuntime {
  validateFeedback(doc: unknown): { ok: boolean; errors: string[] }
  checkStaleness(feedbackVersion: string, liveVersion: string): { stale: boolean; report: string }
}

function loadRuntime(): ApplyFeedbackRuntime {
  return nodeRequire(runtimePath) as ApplyFeedbackRuntime
}

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(samplesDir, 'feedback', name), 'utf8'))
}

describe('feedback reconciliation: export fixture conforms to the console schema', () => {
  it('accepts the fresh round-1 export', () => {
    const result = loadRuntime().validateFeedback(
      fixture('Ghostbusters_V_0-1-0_round-1_feedback_20260911-120000.json'),
    )
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts the stale export (schema-valid but pinned to an old version)', () => {
    const result = loadRuntime().validateFeedback(
      fixture('Ghostbusters_V_0-0-9_stale_feedback_20260910-090000.json'),
    )
    expect(result.ok).toBe(true)
  })
})

describe('feedback reconciliation: staleness block (Spec: Stale feedback blocked)', () => {
  const runtime = loadRuntime()

  it('proceeds when feedback matches the live model version', () => {
    const result = runtime.checkStaleness('V_0-1-0', 'V_0-1-0')
    expect(result.stale).toBe(false)
    expect(result.report).toContain('V_0-1-0')
  })

  it('blocks naming BOTH versions when feedback is pinned to an older base', () => {
    const result = runtime.checkStaleness('V_0-0-9', 'V_0-1-0')
    expect(result.stale).toBe(true)
    expect(result.report).toContain('V_0-0-9')
    expect(result.report).toContain('V_0-1-0')
  })
})

describe('feedback reconciliation replaces the version-and-archive step', () => {
  it('create_timeline_NN.md runs Reconcile Feedback and never Version-And-Archive', () => {
    const procedure = readFileSync(procedurePath, 'utf8')
    expect(procedure).toContain('Reconcile Feedback')
    expect(procedure).not.toContain('Version And Archive')
  })

  it('create_timeline_NN.md encodes the Feedback Reconciliation sequence', () => {
    const procedure = readFileSync(procedurePath, 'utf8').toLowerCase()
    expect(procedure).toContain('staleness')
    expect(procedure).toContain('apply_change')
    expect(procedure).toContain('validate_knowledge')
    expect(procedure).toContain('record_feedback_verdict')
    expect(procedure).toContain('bump the patch version')
    expect(procedure).toContain('{model}_v_{version}_console.html')
  })

  it('points the Reconcile Feedback step at the reconcile_feedback procedure', () => {
    const procedure = readFileSync(procedurePath, 'utf8')
    expect(procedure).toContain('reconcile_feedback_NN.md')
    expect(readFileSync(reconcileProcedurePath, 'utf8')).toContain('Staleness')
  })
})

describe('repo-wide quarantine scan for retired feedback symbols', () => {
  const repoRoot = resolve(here, '..', '..', '..', '..')

  it('contains zero apply_feedback outside archive and kept fixtures', () => {
    let stdout = ''
    try {
      stdout = execSync('git grep -n "apply_feedback"', {
        cwd: repoRoot,
        encoding: 'utf-8',
      })
    } catch {
      stdout = ''
    }
    const lines = stdout.split('\n').filter(Boolean)
    const violations = lines.filter((line) => {
      if (line.includes('openspec/changes/archive/')) return false
      if (line.includes('openspec/specs/innfo-console-feedback/')) return false
      if (line.includes('openspec/changes/2026-10-01-console-feedback-roundtrip-completion/')) return false
      if (line.includes('CORE/tests/fixtures/simulacro-refactorizacion')) return false
      if (line.includes('CORE/tests/legacy/fixtures')) return false
      if (line.includes('fixtures/simulacro-refactorizacion')) return false
      if (line.includes('legacy/fixtures')) return false
      if (line.includes('document_sop_console')) return false
      if (line.includes('metrics-console-feedback.test.ts')) return false
      return true
    })
    expect(violations).toEqual([])
  })

  it('contains zero console-review-v1 outside archive and kept fixtures', () => {
    let stdout = ''
    try {
      stdout = execSync('git grep -n "console-review-v1"', {
        cwd: repoRoot,
        encoding: 'utf-8',
      })
    } catch {
      stdout = ''
    }
    const lines = stdout.split('\n').filter(Boolean)
    const violations = lines.filter((line) => {
      if (line.includes('openspec/changes/archive/')) return false
      if (line.includes('openspec/specs/innfo-console-feedback/')) return false
      if (line.includes('openspec/changes/2026-10-01-console-feedback-roundtrip-completion/')) return false
      if (line.includes('document_sop_console')) return false
      if (line.includes('Ghostbusters_V_0-2-0_procedures_console')) return false
      if (line.includes('metrics-console-feedback.test.ts')) return false
      return true
    })
    expect(violations).toEqual([])
  })

  it('contains zero session_label and un-prefixed knowledge_version in sample feedback and reconcile procedure', () => {
    const feedbackSamples = readdirSync(join(samplesDir, 'feedback')).filter((f) => f.endsWith('.json'))
    for (const f of feedbackSamples) {
      const raw = readFileSync(join(samplesDir, 'feedback', f), 'utf-8')
      expect(raw).not.toContain('session_label')
      const parsed = JSON.parse(raw)
      expect(parsed.meta.session_label).toBeUndefined()
      expect(parsed.meta.knowledge_version).toBeUndefined()
    }
    const proc = readFileSync(reconcileProcedurePath, 'utf-8')
    expect(proc).not.toContain('session_label')
  })
})
