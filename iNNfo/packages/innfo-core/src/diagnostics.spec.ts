import { describe, it, expect } from 'vitest'
import { Diagnostics } from './diagnostics'

describe('Diagnostics accumulator', () => {
  it('routes add() by severity', () => {
    const d = new Diagnostics()
    d.add({ path: 'a', message: 'boom', severity: 'error' })
    d.add({ path: 'b', message: 'hmm', severity: 'warning' })
    expect(d.errors).toEqual([{ path: 'a', message: 'boom', severity: 'error' }])
    expect(d.warnings).toEqual([{ path: 'b', message: 'hmm', severity: 'warning' }])
    expect(d.valid).toBe(false)
  })

  it('error() / warn() construct and route', () => {
    const d = new Diagnostics()
    d.error('x', 'nope').warn('y', 'careful')
    expect(d.errors).toEqual([{ path: 'x', message: 'nope', severity: 'error' }])
    expect(d.warnings).toEqual([{ path: 'y', message: 'careful', severity: 'warning' }])
  })

  it('addAll routes each diagnostic by its own severity', () => {
    const d = new Diagnostics()
    d.addAll([
      { path: 'a', message: '1', severity: 'warning' },
      { path: 'b', message: '2', severity: 'error' },
      { path: 'c', message: '3', severity: 'warning' },
    ])
    expect(d.errors.map((e) => e.path)).toEqual(['b'])
    expect(d.warnings.map((w) => w.path)).toEqual(['a', 'c'])
  })

  it('addAsWarning demotes an error-severity diagnostic to a warning', () => {
    const d = new Diagnostics()
    d.addAsWarning({ path: 'label', message: 'drifted', severity: 'error' })
    expect(d.errors).toEqual([])
    expect(d.warnings).toEqual([{ path: 'label', message: 'drifted', severity: 'warning' }])
    expect(d.valid).toBe(true)
  })

  it('result() snapshots valid + both buckets', () => {
    const d = new Diagnostics()
    d.warn('a', 'x')
    expect(d.result()).toEqual({
      valid: true,
      errors: [],
      warnings: [{ path: 'a', message: 'x', severity: 'warning' }],
    })
  })

  it('is chainable', () => {
    const d = new Diagnostics()
      .error('a', '1')
      .warn('b', '2')
      .add({ path: 'c', message: '3', severity: 'error' })
    expect(d.errors).toHaveLength(2)
    expect(d.warnings).toHaveLength(1)
  })
})
