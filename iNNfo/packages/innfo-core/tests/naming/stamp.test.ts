import { describe, it, expect, afterEach } from 'vitest'
import { formatUtcStamp, nextStamp, checkPathBudget, formatMemberName } from '../../src/naming/contract.js'

describe('formatUtcStamp', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  it('formats an instant as YYYYMMDDTHHmmssZ', () => {
    expect(formatUtcStamp(new Date(Date.UTC(2026, 9, 2, 10, 15, 0)))).toBe('20261002T101500Z')
  })

  it('zero-pads every field', () => {
    expect(formatUtcStamp(new Date(Date.UTC(2026, 0, 3, 4, 5, 6)))).toBe('20260103T040506Z')
  })

  it('never uses local time (TZ=America/Santiago)', () => {
    process.env.TZ = 'America/Santiago'
    expect(formatUtcStamp(new Date('2026-10-02T23:30:00Z'))).toBe('20261002T233000Z')
  })

  it('spells the suffix before the extension', () => {
    const at = new Date('2026-10-02T10:15:00Z')
    expect(formatMemberName('balance', 'csv', nextStamp(at))).toBe('balance_20261002T101500Z.csv')
  })
})

describe('nextStamp', () => {
  const at = new Date('2026-10-02T10:15:00Z')

  it('starts at seq 1 when there is no latest member', () => {
    expect(nextStamp(at)).toEqual({ stamp: '20261002T101500Z', seq: 1 })
  })

  it('keeps seq 1 when the latest member is older', () => {
    expect(nextStamp(at, { stamp: '20261002T101459Z', seq: 1 })).toEqual({ stamp: '20261002T101500Z', seq: 1 })
  })

  it('bumps seq when the latest member shares the second', () => {
    expect(nextStamp(at, { stamp: '20261002T101500Z', seq: 1 })).toEqual({ stamp: '20261002T101500Z', seq: 2 })
    expect(nextStamp(at, { stamp: '20261002T101500Z', seq: 2 })).toEqual({ stamp: '20261002T101500Z', seq: 3 })
  })

  it('clamps to the latest stamp on a skewed (slow) clock and still sorts after it', () => {
    expect(nextStamp(at, { stamp: '20261002T101530Z', seq: 4 })).toEqual({ stamp: '20261002T101530Z', seq: 5 })
  })
})

describe('checkPathBudget', () => {
  it('accepts 259 characters on win32', () => {
    expect(checkPathBudget('C:\\' + 'a'.repeat(256), 'win32')).toEqual({ ok: true })
  })

  it('rejects 260 characters on win32 and names the limit', () => {
    const abs = 'C:\\' + 'a'.repeat(257)
    expect(abs.length).toBe(260)
    expect(checkPathBudget(abs, 'win32')).toEqual({ ok: false, limit: 259, length: 260 })
  })

  it('does not enforce the Windows limit elsewhere', () => {
    expect(checkPathBudget('/' + 'a'.repeat(400), 'linux')).toEqual({ ok: true })
    expect(checkPathBudget('/' + 'a'.repeat(400), 'darwin')).toEqual({ ok: true })
  })
})
