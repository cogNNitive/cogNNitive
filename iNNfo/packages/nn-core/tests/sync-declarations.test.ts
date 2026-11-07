import { describe, it, expect } from 'vitest'
import { readSynchronizations } from '../src/sync/declarations.js'

const catalog = (...blocks: string[]) =>
  [
    '---',
    'level: 3',
    'parent_spec:',
    '  name: "sources"',
    'knowledge_version: "V_0-1-0"',
    'title: "Sources"',
    '---',
    '',
    '# NN index',
    '',
    '* [[Synchronization]]',
    '',
    '# NN Synchronization',
    '',
    ...blocks,
  ].join('\n')

const block = (name: string, fields: Record<string, string>) =>
  [`## NN Synchronization: ${name}`, ...Object.entries(fields).map(([k, v]) => `${k}:: ${v}`), ''].join('\n')

describe('readSynchronizations', () => {
  it('returns the declared synchronizations', () => {
    const text = catalog(
      block('Organization', { alias: 'org', origin_uri: '../organization', kind: 'folder', state: 'active' }),
      block('Handbook', { alias: 'handbook', origin_uri: 'https://example.com/h.pdf', kind: 'file', state: 'paused' }),
    )
    expect(readSynchronizations(text)).toEqual({
      synchronizations: [
        { alias: 'org', origin: '../organization', kind: 'folder', state: 'active' },
        { alias: 'handbook', origin: 'https://example.com/h.pdf', kind: 'file', state: 'paused' },
      ],
      diagnostics: [],
    })
  })

  it('defaults state to active', () => {
    const text = catalog(block('Organization', { alias: 'org', origin_uri: '../o', kind: 'folder' }))
    expect(readSynchronizations(text).synchronizations[0].state).toBe('active')
  })

  it('reports a path-unsafe alias and does not return it', () => {
    const text = catalog(block('Bad', { alias: '../x', origin_uri: '../o', kind: 'folder' }))
    const { synchronizations, diagnostics } = readSynchronizations(text)
    expect(synchronizations).toEqual([])
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({ code: 'SYNC_ALIAS_INVALID', severity: 'error' })
    expect(diagnostics[0].path).toContain('alias')
  })

  it('reports a duplicate alias once and keeps the first declaration', () => {
    const text = catalog(
      block('One', { alias: 'org', origin_uri: '../a', kind: 'folder' }),
      block('Two', { alias: 'org', origin_uri: '../b', kind: 'folder' }),
    )
    const { synchronizations, diagnostics } = readSynchronizations(text)
    expect(synchronizations.map((s) => s.origin)).toEqual(['../a'])
    expect(diagnostics.map((d) => d.code)).toEqual(['SYNC_ALIAS_DUPLICATE'])
    expect(diagnostics[0].message).toContain('org')
  })

  it('returns nothing for a catalog without Synchronization elements', () => {
    expect(readSynchronizations(catalog())).toEqual({ synchronizations: [], diagnostics: [] })
  })
})
