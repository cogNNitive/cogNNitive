import { describe, it, expect } from 'vitest'
import {
  diffNewOnly,
  fingerprint,
  loadBaseline,
  normalizeBaselinePath,
  type ValidationBaseline,
} from './baseline'

const KNOWN = {
  path: 'elements.Task',
  message: 'Concept "Task" is not defined in template',
  severity: 'error' as const,
  code: 'UNKNOWN_CONCEPT',
  filePath: 'models/team_NN.md',
}

function baselineWith(entryFingerprints: string[]): ValidationBaseline {
  return {
    version: 1,
    backlog: 'https://example.com/backlog/validator-noise',
    entries: entryFingerprints.map((fp, i) => ({
      path: `models/file${i}_NN.md`,
      code: 'UNKNOWN_CONCEPT',
      fingerprint: fp,
    })),
  }
}

describe('validation baseline differential (validator-robustness Unit 1)', () => {
  it('surfaces a new error absent from the baseline in the main output', () => {
    const baseline = baselineWith([fingerprint(KNOWN)])
    const fresh = {
      path: 'elements.Other',
      message: 'Something entirely new broke',
      severity: 'error' as const,
      code: 'OTHER_CODE',
      filePath: 'models/team_NN.md',
    }
    const diff = diffNewOnly([KNOWN, fresh], baseline)
    expect(diff.newErrors).toEqual([fresh])
    expect(diff.suppressedCount).toBe(1)
  })

  it('suppresses a known error matching a baseline entry', () => {
    const baseline = baselineWith([fingerprint(KNOWN)])
    const diff = diffNewOnly([KNOWN], baseline)
    expect(diff.newErrors).toEqual([])
    expect(diff.suppressedCount).toBe(1)
    expect(diff.staleEntries).toEqual([])
  })

  it('reports a stale baseline entry without failing the diff', () => {
    const baseline = baselineWith([fingerprint(KNOWN)])
    const diff = diffNewOnly([], baseline)
    expect(diff.newErrors).toEqual([])
    expect(diff.suppressedCount).toBe(0)
    expect(diff.staleEntries).toEqual(baseline.entries)
  })

  it('returns full output when no baseline exists', () => {
    expect(loadBaseline(null)).toBeNull()
    expect(loadBaseline(undefined)).toBeNull()
    const diff = diffNewOnly([KNOWN], null)
    expect(diff.newErrors).toEqual([KNOWN])
    expect(diff.suppressedCount).toBe(0)
    expect(diff.staleEntries).toEqual([])
  })

  it('loads a versioned baseline file with backlog link and entries', () => {
    const raw = JSON.stringify({
      version: 1,
      backlog: 'https://example.com/backlog/validator-noise',
      entries: [{ path: 'models/team_NN.md', code: 'UNKNOWN_CONCEPT', fingerprint: 'fp-1' }],
    })
    expect(loadBaseline(raw)).toEqual({
      version: 1,
      backlog: 'https://example.com/backlog/validator-noise',
      entries: [{ path: 'models/team_NN.md', code: 'UNKNOWN_CONCEPT', fingerprint: 'fp-1' }],
    })
  })

  it('rejects a present-but-malformed baseline instead of silently showing everything', () => {
    expect(() => loadBaseline('not json')).toThrow()
    expect(() => loadBaseline(JSON.stringify({ version: 2, backlog: 'x', entries: [] }))).toThrow()
    expect(() =>
      loadBaseline(JSON.stringify({ version: 1, backlog: 'x', entries: [{ path: 'a' }] })),
    ).toThrow()
  })

  it('normalizes backslash paths so Windows and POSIX fingerprints match', () => {
    expect(normalizeBaselinePath('models\\team_NN.md')).toBe('models/team_NN.md')
    const windows = fingerprint({ ...KNOWN, filePath: 'models\\team_NN.md' })
    const posix = fingerprint({ ...KNOWN, filePath: 'models/team_NN.md' })
    expect(windows).toBe(posix)
  })

  it('distinguishes errors by code when path and message are identical', () => {
    const baseline = baselineWith([fingerprint(KNOWN)])
    const sameLocationNewCode = { ...KNOWN, code: 'RENAMED_CODE' }
    const diff = diffNewOnly([sameLocationNewCode], baseline)
    expect(diff.newErrors).toEqual([sameLocationNewCode])
    expect(diff.suppressedCount).toBe(0)
  })

  it('pins path, code, and message in a stable readable fingerprint', () => {
    expect(fingerprint(KNOWN)).toBe(
      'models/team_NN.md::elements.Task::UNKNOWN_CONCEPT::Concept "Task" is not defined in template',
    )
    expect(fingerprint({ ...KNOWN, code: undefined })).toBe(
      'models/team_NN.md::elements.Task::::Concept "Task" is not defined in template',
    )
  })
})
