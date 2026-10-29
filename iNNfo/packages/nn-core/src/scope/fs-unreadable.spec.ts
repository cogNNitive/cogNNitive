import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findScopeChain } from './fs-chain.js'
import { loadChain } from './fs-layers.js'
import { loadScopeProcedures } from './fs-procedures.js'
import { loadElementChain } from './fs-elements.js'
import type { ScopeChain } from './types.js'

/**
 * Read failures cannot be provoked portably with real files (permissions differ per OS),
 * so reads of any path containing `unreadable` are made to fail. The adapters must answer
 * with structured errors and never throw.
 */
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: ((path: unknown, ...rest: unknown[]) => {
      if (String(path).includes('unreadable')) throw new Error('EACCES: permission denied')
      return (actual.readFileSync as (...args: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readFileSync,
  }
})

describe('adapters never throw on a document that cannot be read', () => {
  let base: string
  beforeEach(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'nn-scope-io-')))
  })
  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  function write(rel: string, content: string): string {
    const path = join(base, rel)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content, 'utf-8')
    return path
  }

  it('findScopeChain reports UNREADABLE_DOCUMENT for a candidate marker it cannot read', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/g/unreadable_NN.md', '---\nscope: true\nisolate: true\n---\n')
    const r = findScopeChain(write('acme/g/a_NN.md', '# NN Note\n'))
    expect(r).toMatchObject({ ok: false, code: 'UNREADABLE_DOCUMENT', path: 'g/unreadable_NN.md' })
  })

  it('loadChain reports UNREADABLE_DOCUMENT with the domain-relative path', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/unreadable_NN.md', '---\nscope: true\n---\n')
    const chain: ScopeChain = {
      root: join(base, 'acme'),
      links: [{ dir: '', valuesDoc: 'unreadable_NN.md', kind: 'root', isolate: false }],
      cutAt: null,
    }
    expect(loadChain(chain)).toMatchObject({ ok: false, code: 'UNREADABLE_DOCUMENT', path: 'unreadable_NN.md' })
  })

  it('loadScopeProcedures reports UNREADABLE_DOCUMENT as a diagnostic and keeps the other procedures', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/procedures/unreadable_procedures_NN.md', '---\nlevel: 3\n---\n')
    write('acme/procedures/fine_procedures_NN.md', '---\nlevel: 3\n---\n')
    const found = findScopeChain(write('acme/a_NN.md', '# NN Note\n'))
    if (!found.ok) throw new Error(found.code)
    const loaded = loadChain(found.chain)
    if (!loaded.ok) throw new Error(loaded.code)
    const { loaded: withProcedures, diagnostics } = loadScopeProcedures(found.chain, loaded.loaded)
    expect(withProcedures.nodes[0].procedures?.map((p) => p.id)).toEqual(['fine'])
    expect(diagnostics.map((d) => [d.code, d.severity, d.procedure, d.scope])).toEqual([
      ['UNREADABLE_DOCUMENT', 'error', 'unreadable', ''],
    ])
  })

  it('loadElementChain with a null target propagates the failure instead of throwing', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/unreadable_NN.md', '---\nscope: true\n---\n')
    const r = loadElementChain(write('acme/a_NN.md', '# NN Note\n'), null)
    expect(r).toMatchObject({ ok: false, code: 'UNREADABLE_DOCUMENT' })
  })
})
