import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { discoverTransitiveAssets, listBlueprintProcedures } from './spec'

/**
 * Scope-aware procedure listing (L2.3b). The precedence lives in nn-core `resolveProcedures`;
 * these tests pin the MCP contract around it: the `path` input, the entry shape, the floor
 * (bluepriNNt package procedures) and the root `procedures/` folder, and the absence of any
 * silent drop. Synthetic data only: the nn-core `scoped-portfolio` fixture plus a throwaway
 * bluepriNNt package written into a scratch copy.
 *
 * Entry shape of the scoped listing, pinned here:
 *   { id, source_kind: 'scope' | 'blueprint' | 'model', source, doc, status: 'selected' | 'shadowed',
 *     shadowed_by?, slots, fork_of?, warnings }
 * `source` is the scope path ('' is the root, as in `explain`) or `bluepriNNt:<package>` for the floor.
 */
const FIXTURES = resolve(import.meta.dirname!, '..', '..', '..', 'nn-core', 'tests', 'fixtures')
const FIX = join(FIXTURES, 'scoped-portfolio')

const P1 = 'programs/alpha/projects/p1/p1_NN.md'
const P1_SCOPE = 'programs/alpha/projects/p1'
const ROOT_DOC = 'portfolio_settings_NN.md'
const FLOOR = 'bluepriNNt:settings'

interface Listed {
  id: string
  source_kind: 'scope' | 'blueprint' | 'model'
  source: string
  doc: string
  status: 'selected' | 'shadowed'
  shadowed_by?: string
  slots: Array<{ name: string; kind: string; required: boolean; step?: string }>
  fork_of?: { procedure: string; scope: string; version: string }
  warnings: Array<{ code: string }>
}

type Scoped = { ok: true; procedures: Listed[] } | { ok: false; code: string; detail: string; searched?: string[] }

let scratch: string
let isolated: { globalDir: string; skillsDir: string }

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'nn-procedures-scope-')))
  // The package resolver falls back to the user's home: point both tiers at empty folders.
  isolated = { globalDir: join(scratch, 'global'), skillsDir: join(scratch, 'skills') }
  mkdirSync(isolated.globalDir)
  mkdirSync(isolated.skillsDir)
})

afterAll(() => rmSync(scratch, { recursive: true, force: true }))

const procDoc = (title: string): string => `---\nlevel: 3\ntitle: "${title}"\nknowledge_version: "V_0-1-0"\n---\n\n# NN Procedure\n`

/** A throwaway copy of the portfolio with a `settings` package that ships two procedures (the floor). */
function portfolioWithFloor(): string {
  const dir = join(scratch, `portfolio-${Math.random().toString(36).slice(2)}`)
  cpSync(FIX, dir, { recursive: true })
  const pkg = join(dir, 'specs', 'bluepriNNts', 'settings')
  mkdirSync(join(pkg, 'procedures'), { recursive: true })
  writeFileSync(join(pkg, 'spec_NN.md'), '---\nlevel: 2\nspec_version: "V_0-1-0"\n---\n')
  writeFileSync(join(pkg, 'procedures', 'status-report_procedures_NN.md'), procDoc('Status Report (floor)'))
  writeFileSync(join(pkg, 'procedures', 'floor-only_procedures_NN.md'), procDoc('Floor Only'))
  return dir
}

/** Calls the listing with a scope path (the `path` input and the package options are what L2.3b adds). */
async function listAt(dir: string, path: string): Promise<Scoped> {
  const call = listBlueprintProcedures as unknown as (root: string, opts: unknown, pkg: unknown) => Promise<Scoped>
  return call(dir, { path }, isolated)
}

function okList(r: Scoped): Listed[] {
  expect(r).toMatchObject({ ok: true })
  if (!r.ok) throw new Error(`expected a listing, got ${r.code}`)
  return r.procedures
}

const pick = (list: Listed[], id: string): Listed[] => list.filter((e) => e.id === id)

describe('listBlueprintProcedures({ path }): scoped listing', () => {
  it('lists selected and shadowed entries for the p1 scope with slots, fork record and ORIGINAL_ADVANCED', async () => {
    const list = okList(await listAt(portfolioWithFloor(), P1))

    const report = pick(list, 'status-report')
    expect(report).toHaveLength(3)
    const selected = report.find((e) => e.status === 'selected')!
    expect(selected).toMatchObject({ source_kind: 'scope', source: P1_SCOPE })
    expect(selected.slots.map((s) => s.name)).toEqual(['audience', 'format', 'post_step'])
    // A slot names its step by the step element's slug, never by display name (L2.5.4).
    expect(selected.slots.find((s) => s.name === 'post_step')?.step).toBe('compile-health-dashboard')
    expect(selected.fork_of).toEqual({ procedure: 'status-report', scope: '', version: 'V_0-1-0' })
    expect(selected.warnings.map((w) => w.code)).toContain('ORIGINAL_ADVANCED')

    const shadowed = report.filter((e) => e.status === 'shadowed')
    expect(shadowed.map((e) => [e.source_kind, e.source, e.shadowed_by])).toEqual(
      expect.arrayContaining([
        ['scope', '', P1_SCOPE],
        ['blueprint', FLOOR, P1_SCOPE],
      ]),
    )
    expect(shadowed).toHaveLength(2)
  })

  it('lists the procedures of every scope of the chain and none of a sibling scope', async () => {
    const list = okList(await listAt(portfolioWithFloor(), P1))
    const review = pick(list, 'alpha-review')
    expect(review).toHaveLength(1)
    expect(review[0]).toMatchObject({ status: 'selected', source_kind: 'scope', source: 'programs/alpha' })
    expect(pick(list, 'beta-only')).toEqual([])
  })

  it('reports every procedure found: selected plus shadowed equals the definitions in the chain', async () => {
    const list = okList(await listAt(portfolioWithFloor(), P1))
    // status-report x3 (p1, root, floor) + alpha-review + floor-only
    expect(list).toHaveLength(5)
    expect(list.every((e) => e.status === 'selected' || e.status === 'shadowed')).toBe(true)
    expect(list.filter((e) => e.status === 'selected').map((e) => e.id).sort()).toEqual(['alpha-review', 'floor-only', 'status-report'])
  })

  it('takes the floor procedures from the bluepriNNt package named by the scope', async () => {
    const list = okList(await listAt(portfolioWithFloor(), P1))
    const floorOnly = pick(list, 'floor-only')
    expect(floorOnly).toHaveLength(1)
    expect(floorOnly[0]).toMatchObject({ status: 'selected', source_kind: 'blueprint', source: FLOOR })
  })

  it('lists the root procedures/ folder as the root scope, and the floor shadowed by it', async () => {
    const list = okList(await listAt(portfolioWithFloor(), ROOT_DOC))
    const report = pick(list, 'status-report')
    expect(report).toHaveLength(2)
    expect(report.find((e) => e.status === 'selected')).toMatchObject({
      source_kind: 'scope',
      source: '',
      doc: 'procedures/status-report_procedures_NN.md',
    })
    expect(report.find((e) => e.status === 'shadowed')).toMatchObject({ source_kind: 'blueprint', source: FLOOR, shadowed_by: '' })
    // Scopes below the context are not offered from the root.
    expect(pick(list, 'alpha-review')).toEqual([])
  })

  it('lists the root procedures even when there is no bluepriNNt package (no floor)', async () => {
    const list = okList(await listAt(FIX, P1))
    expect(pick(list, 'status-report').map((e) => [e.status, e.source])).toEqual(
      expect.arrayContaining([
        ['selected', P1_SCOPE],
        ['shadowed', ''],
      ]),
    )
    expect(list.some((e) => e.source_kind === 'blueprint')).toBe(false)
  })

  it('returns a structured NO_DOMAIN_ROOT error with searched for a path outside any domaiNN', async () => {
    const dir = join(scratch, 'no-domain')
    mkdirSync(join(dir, 'docs'), { recursive: true })
    writeFileSync(join(dir, 'docs', 'x_NN.md'), '---\ntitle: x\n---\n')
    const r = await listAt(dir, 'docs/x_NN.md')
    expect(r).toMatchObject({ ok: false, code: 'NO_DOMAIN_ROOT' })
    if (r.ok) throw new Error('unreachable')
    expect(Array.isArray(r.searched)).toBe(true)
    expect(r.searched!.length).toBeGreaterThan(0)
    // No silent fallback to the unscoped result.
    expect(r).not.toHaveProperty('procedures')
  })
})

describe('listBlueprintProcedures({ path }): invalid path', () => {
  it.each([[''], [42], [null], [{}], [['a']]])('returns a structured INVALID_ARGUMENT for path %j and never throws', async (path) => {
    const call = listBlueprintProcedures as unknown as (root: string, opts: unknown, pkg: unknown) => Promise<Scoped>
    const r = await call(FIX, { path }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    expect(r).not.toHaveProperty('procedures')
  })
})

describe('listBlueprintProcedures({ path }): warnings per entry', () => {
  /** A portfolio whose chain carries a bad fill (alpha), a duplicate-slot root definition and a malformed slot list. */
  function portfolioWithFindings(): string {
    const dir = join(scratch, `findings-${Math.random().toString(36).slice(2)}`)
    cpSync(FIX, dir, { recursive: true })
    // alpha fills a slot status-report does not declare: the supplier scope is alpha, the subject is p1's definition.
    const alpha = join(dir, 'programs', 'alpha', 'alpha_NN.md')
    writeFileSync(alpha, readFileSync(alpha, 'utf-8').replace('    audience:', '    bogus: 1\n    audience:'))
    // The shadowed root definition declares a slot twice.
    writeFileSync(
      join(dir, 'procedures', 'status-report_procedures_NN.md'),
      '---\nlevel: 3\nknowledge_version: "V_0-1-0"\nslots:\n  - { name: dup, kind: value }\n  - { name: dup, kind: value }\n---\n\n# NN Procedure\n',
    )
    // A procedure whose slots declaration is malformed.
    writeFileSync(join(dir, 'programs', 'alpha', 'procedures', 'bad-slots_procedures_NN.md'), '---\nlevel: 3\nslots: "oops"\n---\n\n# NN Procedure\n')
    return dir
  }

  const codes = (e: Listed): string[] => e.warnings.map((w) => w.code)

  it('attaches a fill error to the selected entry although its scope is the supplier', async () => {
    const list = okList(await listAt(portfolioWithFindings(), P1))
    const selected = pick(list, 'status-report').find((e) => e.status === 'selected')!
    expect(codes(selected)).toContain('UNKNOWN_SLOT')
  })

  it('attaches loader findings (INVALID_SLOT_DECL) to the entry they are about', async () => {
    const list = okList(await listAt(portfolioWithFindings(), P1))
    const bad = pick(list, 'bad-slots')
    expect(bad).toHaveLength(1)
    expect(codes(bad[0])).toContain('INVALID_SLOT_DECL')
  })

  it('gives a shadowed entry the findings of its own definition and keeps them off the winner', async () => {
    const list = okList(await listAt(portfolioWithFindings(), P1))
    const report = pick(list, 'status-report')
    const root = report.find((e) => e.status === 'shadowed' && e.source === '')!
    expect(codes(root)).toContain('DUPLICATE_SLOT')
    const selected = report.find((e) => e.status === 'selected')!
    expect(codes(selected)).not.toContain('DUPLICATE_SLOT')
  })

  it('keeps the top-level diagnostics complete', async () => {
    const r = (await listAt(portfolioWithFindings(), P1)) as unknown as { ok: true; diagnostics: Array<{ code: string }> }
    const all = r.diagnostics.map((d) => d.code)
    expect(all).toEqual(expect.arrayContaining(['UNKNOWN_SLOT', 'DUPLICATE_SLOT', 'INVALID_SLOT_DECL']))
  })
})

describe('listBlueprintProcedures without a path', () => {
  /** `base` and `child` (parent_spec -> base) both ship `base-check`; `base` also ships `parent-only`. */
  function chainRoot(): string {
    const dir = join(scratch, `chain-${Math.random().toString(36).slice(2)}`)
    const pkgs = join(dir, 'specs', 'bluepriNNts')
    const base = join(pkgs, 'base', 'V_0-1-0')
    const child = join(pkgs, 'child', 'V_0-1-0')
    for (const d of [join(base, 'procedures'), join(child, 'procedures')]) mkdirSync(d, { recursive: true })
    writeFileSync(join(base, 'spec_NN.md'), '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "Base"\n---\n')
    writeFileSync(join(base, 'procedures', 'base-check_procedures_NN.md'), procDoc('Base Check (base)'))
    writeFileSync(join(base, 'procedures', 'parent-only_procedures_NN.md'), procDoc('Parent Only'))
    writeFileSync(
      join(child, 'spec_NN.md'),
      '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "Child"\nparent_spec:\n  name: "base"\n  url: "specs/bluepriNNts/base/V_0-1-0/spec_NN.md"\n---\n',
    )
    writeFileSync(join(child, 'procedures', 'base-check_procedures_NN.md'), procDoc('Base Check (child)'))
    return dir
  }

  it('behaves as before for the winners and marks every entry with a status', async () => {
    const { procedures } = await listBlueprintProcedures(chainRoot(), { blueprint_name: 'child' })
    const winners = procedures.filter((p) => (p as unknown as Listed).status === 'selected')
    expect(winners.map((p) => [p.id, p.source_template]).sort()).toEqual([
      ['base-check', 'child'],
      ['parent-only', 'base'],
    ])
  })
})

describe('discoverTransitiveAssets: no silent drop', () => {
  it('reports the parent definition of a clashing id as shadowed, naming the winner', async () => {
    const dir = join(scratch, `chain-drop-${Math.random().toString(36).slice(2)}`)
    const pkgs = join(dir, 'specs', 'bluepriNNts')
    const base = join(pkgs, 'base', 'V_0-1-0')
    const child = join(pkgs, 'child', 'V_0-1-0')
    for (const d of [join(base, 'procedures'), join(child, 'procedures')]) mkdirSync(d, { recursive: true })
    writeFileSync(join(base, 'spec_NN.md'), '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "Base"\n---\n')
    writeFileSync(join(base, 'procedures', 'base-check_procedures_NN.md'), procDoc('Base Check (base)'))
    writeFileSync(join(base, 'procedures', 'parent-only_procedures_NN.md'), procDoc('Parent Only'))
    writeFileSync(
      join(child, 'spec_NN.md'),
      '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "Child"\nparent_spec:\n  name: "base"\n  url: "specs/bluepriNNts/base/V_0-1-0/spec_NN.md"\n---\n',
    )
    writeFileSync(join(child, 'procedures', 'base-check_procedures_NN.md'), procDoc('Base Check (child)'))

    const { procedures } = await discoverTransitiveAssets(dir, { blueprint_name: 'child' })
    const found = procedures as unknown as Array<{ id: string; source_template: string; status: string; shadowed_by?: string }>

    const clash = found.filter((p) => p.id === 'base-check')
    expect(clash.map((p) => [p.source_template, p.status, p.shadowed_by])).toEqual(
      expect.arrayContaining([
        ['child', 'selected', undefined],
        ['base', 'shadowed', 'child'],
      ]),
    )
    // Three procedures exist in the two packages; three entries are reported.
    expect(found).toHaveLength(3)
  })

  it('reports a second frontmatter entry with the same id and another path inside one package', async () => {
    const dir = join(scratch, `dup-id-${Math.random().toString(36).slice(2)}`)
    const pkg = join(dir, 'specs', 'bluepriNNts', 'solo', 'V_0-1-0')
    mkdirSync(join(pkg, 'procedures'), { recursive: true })
    writeFileSync(
      join(pkg, 'spec_NN.md'),
      '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "Solo"\nprocedures:\n  - { id: twin, name: "Twin A", path: "procedures/twin-a.md" }\n  - { id: twin, name: "Twin B", path: "procedures/twin-b.md" }\n  - { id: twin, name: "Twin A again", path: "procedures/twin-a.md" }\n---\n',
    )
    const { procedures } = await discoverTransitiveAssets(dir, { blueprint_name: 'solo' })
    const found = procedures as unknown as Array<{ id: string; path: string; status: string }>
    expect(found.map((p) => [p.path, p.status]).sort()).toEqual([
      ['procedures/twin-a.md', 'selected'],
      ['procedures/twin-b.md', 'shadowed'],
    ])
  })

  it('still merges the frontmatter entry and the on-disk document of the same file', async () => {
    const dir = join(scratch, `same-file-${Math.random().toString(36).slice(2)}`)
    const pkg = join(dir, 'specs', 'bluepriNNts', 'solo', 'V_0-1-0')
    mkdirSync(join(pkg, 'procedures'), { recursive: true })
    writeFileSync(
      join(pkg, 'spec_NN.md'),
      '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "Solo"\nprocedures:\n  - { id: one, name: "One", path: "procedures/one_procedures_NN.md" }\n---\n',
    )
    writeFileSync(join(pkg, 'procedures', 'one_procedures_NN.md'), procDoc('One'))
    const { procedures } = await discoverTransitiveAssets(dir, { blueprint_name: 'solo' })
    expect(procedures.filter((p) => p.id === 'one')).toHaveLength(1)
  })

  it('applies the one procedure-document rule on disk: catalogs, specs and unsuffixed documents are not procedures (L2.5.2)', async () => {
    const dir = join(scratch, `one-rule-${Math.random().toString(36).slice(2)}`)
    const pkg = join(dir, 'specs', 'bluepriNNts', 'solo', 'V_0-1-0')
    mkdirSync(join(pkg, 'procedures'), { recursive: true })
    writeFileSync(join(pkg, 'spec_NN.md'), '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "Solo"\n---\n')
    for (const name of ['real_procedures_NN.md', 'procedures_NN.md', 'spec_NN.md', 'apply_feedback_NN.md', 'notes.md']) {
      writeFileSync(join(pkg, 'procedures', name), procDoc('Doc'))
    }
    const { procedures } = await discoverTransitiveAssets(dir, { blueprint_name: 'solo' })
    expect(procedures.map((p) => [p.id, p.path])).toEqual([['real', 'procedures/real_procedures_NN.md']])
  })
})
