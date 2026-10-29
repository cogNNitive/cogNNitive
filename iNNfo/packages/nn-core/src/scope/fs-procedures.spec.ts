import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findScopeChain } from './fs-chain.js'
import { loadChain } from './fs-layers.js'
import { loadScopeProcedures } from './fs-procedures.js'
import { resolveProcedures } from './procedures.js'
import type { ProcedureResolution } from './procedures.js'
import type { LoadedChain } from './resolve.js'
import type { ScopeChain } from './types.js'

const FIX = fileURLToPath(new URL('../../tests/fixtures/scoped-portfolio', import.meta.url))

function chainOf(path: string): ScopeChain {
  const result = findScopeChain(path)
  if (!result.ok) throw new Error(`expected a chain for ${path}, got ${result.code}`)
  return result.chain
}

function loadOk(chain: ScopeChain): LoadedChain {
  const r = loadChain(chain)
  if (!r.ok) throw new Error(`${r.code}: ${r.detail}`)
  return r.loaded
}

function resolved(path: string): { result: ProcedureResolution; load: ReturnType<typeof loadScopeProcedures> } {
  const chain = chainOf(path)
  const load = loadScopeProcedures(chain, loadOk(chain))
  return { result: resolveProcedures(load.loaded), load }
}

const effective = (r: ProcedureResolution, id: string) => {
  const found = r.procedures.find((p) => p.def.id === id)
  if (!found) throw new Error(`no procedure ${id}`)
  return found
}

describe('loadScopeProcedures over the scoped-portfolio fixture', () => {
  const p1Doc = join(FIX, 'programs', 'alpha', 'projects', 'p1', 'risks_NN.md')

  it('attaches the procedures of each scope with id, scope, document, version and slots', () => {
    const { load } = resolved(p1Doc)
    const [root, alpha, p1] = load.loaded.nodes
    expect(root.procedures).toEqual([
      {
        id: 'status-report',
        scope: '',
        doc: 'procedures/status-report_procedures_NN.md',
        version: 'V_0-2-0',
        slots: [
          { name: 'audience', kind: 'value', required: true },
          { name: 'format', kind: 'value', required: false, default: 'markdown' },
          { name: 'post_step', kind: 'procedure', required: false, step: 'Compile Health Dashboard' },
        ],
      },
    ])
    expect(alpha.procedures?.map((p) => [p.id, p.scope, p.slots])).toEqual([['alpha-review', 'programs/alpha', []]])
    expect(p1.procedures?.[0].forkOf).toEqual({ procedure: 'status-report', scope: '', version: 'V_0-1-0' })
    expect(load.diagnostics).toEqual([])
  })

  it('attaches the fills of each marker document', () => {
    const { load } = resolved(p1Doc)
    const [root, alpha, p1] = load.loaded.nodes
    expect(root.fills).toBeUndefined()
    expect(alpha.fills).toEqual({
      'status-report': { audience: 'steering committee', post_step: { procedure: 'alpha-review' } },
    })
    expect(p1.fills).toEqual({ 'status-report': { format: 'slides' } })
  })

  it('leaves a scope without a procedures folder or fills untouched', () => {
    const chain = chainOf(join(FIX, 'programs', 'legacy', 'projects', 'old', 'old_NN.md'))
    const { loaded } = loadScopeProcedures(chain, loadOk(chain))
    for (const node of loaded.nodes) {
      expect(Object.hasOwn(node, 'procedures')).toBe(false)
      expect(Object.hasOwn(node, 'fills')).toBe(false)
    }
    expect(loaded.floor).toBeNull()
  })

  it('composes the shared root procedure for a scope that only fills it', () => {
    const { result } = resolved(join(FIX, 'programs', 'alpha', 'status_NN.md'))
    const report = effective(result, 'status-report')
    expect(report.def.scope).toBe('')
    expect(report.bindings['audience']).toMatchObject({ value: 'steering committee', from: { scope: 'programs/alpha' } })
    expect(report.bindings['post_step']).toMatchObject({ value: { procedure: 'alpha-review' } })
    expect(report.bindings['format']).toMatchObject({ value: 'markdown', from: { scope: '' } })
    expect(result.diagnostics).toEqual([])
  })

  it('records the declared fork of a project and warns that the original advanced', () => {
    const { result } = resolved(p1Doc)
    const report = effective(result, 'status-report')
    expect(report.def.scope).toBe('programs/alpha/projects/p1')
    expect(report.def.forkOf?.version).toBe('V_0-1-0')
    expect(report.shadowed.map((s) => [s.scope, s.version])).toEqual([['', 'V_0-2-0']])
    expect(report.bindings['format']).toMatchObject({ value: 'slides', from: { scope: 'programs/alpha/projects/p1' } })
    expect(result.diagnostics.map((d) => [d.code, d.severity])).toEqual([['ORIGINAL_ADVANCED', 'warning']])
  })

  it('reports an undeclared shadow for the sibling program that redefines the procedure', () => {
    const { result } = resolved(join(FIX, 'programs', 'beta', 'status_NN.md'))
    expect(effective(result, 'status-report').def.scope).toBe('programs/beta')
    expect(result.diagnostics.map((d) => [d.code, d.scope])).toEqual([['UNDECLARED_SHADOW', 'programs/beta']])
  })

  it('reports the unfilled required slot at the root', () => {
    const { result } = resolved(join(FIX, 'portfolio_settings_NN.md'))
    expect(result.diagnostics.map((d) => d.code)).toEqual(['REQUIRED_SLOT_UNFILLED'])
  })

  it('does not offer the procedures of a sibling scope', () => {
    const alpha = resolved(join(FIX, 'programs', 'alpha', 'status_NN.md')).result.procedures.map((p) => p.def.id)
    const beta = resolved(join(FIX, 'programs', 'beta', 'status_NN.md')).result.procedures.map((p) => p.def.id)
    expect(alpha).toEqual(['alpha-review', 'status-report'])
    expect(beta).toEqual(['beta-only', 'status-report'])
  })

  it('produces plain JSON', () => {
    const { load } = resolved(p1Doc)
    expect(JSON.parse(JSON.stringify(load))).toStrictEqual(load)
  })
})

describe('loadScopeProcedures over a temporary tree', () => {
  let base: string

  beforeEach(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'nn-scope-procs-')))
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
  const procedureDoc = (frontmatter: string) => `---\nlevel: 3\ntitle: "p"\n${frontmatter}---\n# NN Procedure\n`
  const load = (start: string) => {
    const chain = chainOf(start)
    return loadScopeProcedures(chain, loadOk(chain))
  }

  it('reports INVALID_SLOT_DECL for a malformed slot and keeps the valid ones', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write(
      'acme/procedures/p_procedures_NN.md',
      procedureDoc(
        'slots:\n  - { name: ok, kind: value, required: true }\n  - { name: bad, kind: sideways, required: true }\n  - "just text"\n',
      ),
    )
    const { loaded, diagnostics } = load(write('acme/a_NN.md', '# NN Note\n'))
    expect(loaded.nodes[0].procedures?.[0].slots).toEqual([{ name: 'ok', kind: 'value', required: true }])
    expect(diagnostics.map((d) => [d.code, d.severity, d.procedure, d.scope])).toEqual([
      ['INVALID_SLOT_DECL', 'error', 'p', ''],
      ['INVALID_SLOT_DECL', 'error', 'p', ''],
    ])
  })

  it('reports INVALID_FORK_RECORD and treats the procedure as unforked', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/procedures/p_procedures_NN.md', procedureDoc('fork_of: { procedure: p }\n'))
    const { loaded, diagnostics } = load(write('acme/a_NN.md', '# NN Note\n'))
    expect(loaded.nodes[0].procedures?.[0].forkOf).toBeUndefined()
    expect(diagnostics.map((d) => [d.code, d.procedure])).toEqual([['INVALID_FORK_RECORD', 'p']])
  })

  it('derives the id from the filename and takes only `_procedures_NN.md` documents', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/procedures/Draft_Scene_procedures_NN.md', procedureDoc(''))
    write('acme/procedures/notes_NN.md', procedureDoc(''))
    write('acme/procedures/readme.md', '# readme\n')
    const { loaded } = load(write('acme/a_NN.md', '# NN Note\n'))
    expect(loaded.nodes[0].procedures?.map((p) => [p.id, p.version, p.doc])).toEqual([
      ['draft-scene', null, 'procedures/Draft_Scene_procedures_NN.md'],
    ])
  })

  it('passes a slot default through JSON normalisation like every other value', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/procedures/p_procedures_NN.md', procedureDoc('slots:\n  - { name: s, kind: value, required: false, default: .inf }\n'))
    const { loaded } = load(write('acme/a_NN.md', '# NN Note\n'))
    const slot = loaded.nodes[0].procedures?.[0].slots[0]
    expect(slot?.default).toBe('Infinity')
    const r = JSON.parse(JSON.stringify(loaded))
    expect(r).toStrictEqual(loaded)
  })
})
