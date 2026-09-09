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

  it('info() records an informational diagnostic without affecting validity', () => {
    const d = new Diagnostics()
    d.info('format.bom', 'File starts with a byte-order mark; stripped before parsing')
    expect(d.errors).toEqual([])
    expect(d.warnings).toEqual([
      {
        path: 'format.bom',
        message: 'File starts with a byte-order mark; stripped before parsing',
        severity: 'info',
      },
    ])
    expect(d.valid).toBe(true)
  })

  it('info() preserves code, promptHint, and meta', () => {
    const d = new Diagnostics().info('format.bom', 'BOM stripped', {
      code: 'BOM_WARNING',
      promptHint: 'Save the file as UTF-8 without BOM.',
      meta: { stripped: true },
    })
    expect(d.warnings[0]).toMatchObject({
      path: 'format.bom',
      severity: 'info',
      code: 'BOM_WARNING',
      promptHint: 'Save the file as UTF-8 without BOM.',
      meta: { stripped: true },
    })
    expect(d.valid).toBe(true)
  })

  it('add() routes info severity to warnings preserving severity and validity', () => {
    const d = new Diagnostics()
    d.add({ path: 'a', message: 'notice', severity: 'info' })
    d.add({ path: 'b', message: 'boom', severity: 'error' })
    expect(d.errors.map((e) => e.path)).toEqual(['b'])
    expect(d.warnings).toEqual([{ path: 'a', message: 'notice', severity: 'info' }])
    expect(d.valid).toBe(false)
  })

  it('addAll routes info diagnostics to warnings without affecting validity alone', () => {
    const d = new Diagnostics()
    d.addAll([
      { path: 'a', message: 'notice-1', severity: 'info' },
      { path: 'b', message: 'notice-2', severity: 'info' },
    ])
    expect(d.errors).toEqual([])
    expect(d.warnings.map((w) => w.severity)).toEqual(['info', 'info'])
    expect(d.valid).toBe(true)
  })

  it('addAsWarning preserves code, promptHint, and meta', () => {
    const d = new Diagnostics()
    d.addAsWarning({
      path: 'matrices.M',
      message: 'label drifted',
      severity: 'error',
      code: 'MATRIX_LABEL_DRIFT',
      promptHint: 'Rename the label to match the template.',
      meta: { matrix: 'M' },
    })
    expect(d.errors).toEqual([])
    expect(d.warnings).toEqual([
      {
        path: 'matrices.M',
        message: 'label drifted',
        severity: 'warning',
        code: 'MATRIX_LABEL_DRIFT',
        promptHint: 'Rename the label to match the template.',
        meta: { matrix: 'M' },
      },
    ])
    expect(d.valid).toBe(true)
  })

  it('supports code, promptHint, and meta in warnings and errors', () => {
    const d = new Diagnostics().warn('parent_spec', 'Stale template cache', {
      code: 'TEMPLATE_CACHE_STALE',
      promptHint: 'Update template in specs/',
      meta: { canonicalUrl: 'https://example.com/spec.md' },
    })
    expect(d.warnings[0]).toMatchObject({
      path: 'parent_spec',
      message: 'Stale template cache',
      severity: 'warning',
      code: 'TEMPLATE_CACHE_STALE',
      promptHint: 'Update template in specs/',
      meta: { canonicalUrl: 'https://example.com/spec.md' },
    })
  })
})
