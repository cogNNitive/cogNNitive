import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { parseFrontmatter } from '@cognnitive/nn-core'
import type { SpecCache } from '@cognnitive/nn-core'
import { collectWorkspaceDiagnostics, filterDiagnosticsForModel, fingerprint } from './validate'
import { validateKnowledge } from './mutate'

vi.mock('@cognnitive/nn-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cognnitive/nn-core')>()
  return {
    ...actual,
    recursiveParse: vi.fn(actual.recursiveParse),
  }
})

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-validate')
const specsDir = join(rootDir, 'specs')
const modelsDir = join(rootDir, 'kNNowledge')

const blueprint_name = 'linked_test_V_0-1-0'

const TEMPLATE_CONTENT = [
  '---',
  'spec_version: "V_0-1-0"',
  'level: 2',
  'title: "Local Linked Test Template"',
  'parent_spec:',
  '  name: "iNNfo_V_0-1-0"',
  '  url: "https://example.com/iNNfo_V_0-1-0_NN.md"',
  '---',
  '',
  '# NN Concept Definition',
  '',
  '## NN Concept Definition: Roles',
  'icon:: user',
  'type:: list',
  '',
  '# NN Field Definition',
  '',
  '## NN Field Definition: linked',
  'concept:: Roles',
  'type:: reference',
  'description:: Cross-model link field.',
  '',
].join('\n')

function modelContent(title: string, body: string): string {
  return [
    '---',
    'level: 3',
    `title: "${title}"`,
    'knowledge_version: "V_0-1-0"',
    'parent_spec:',
    `  name: "${blueprint_name}"`,
    '  url: "https://example.com/linked_test_V_0-1-0_NN.md"',
    '---',
    '',
    '# NN Roles',
    '',
    body,
  ].join('\n')
}

function workspaceContent(): string {
  return [
    '---',
    'spec_version: "V_0-1-0"',
    'level: 3',
    'knowledge_version: "V_0-0-1"',
    'title: "Workspace Model"',
    'parent_spec:',
    '  name: "linked_test_V_0-1-0"',
    '  url: "https://example.com/linked_test_V_0-1-0_NN.md"',
    '---',
    '',
    '# NN kNNowledge',
    '## NN kNNowledge: Alpha',
    'path:: kNNowledge/alpha_V_0-1-0_linked_test_NN.md',
    '',
    '## NN kNNowledge: Beta',
    'path:: kNNowledge/beta_V_0-1-0_linked_test_NN.md',
    '',
  ].join('\n')
}

async function writeWorkspace(): Promise<{ alphaPath: string; betaPath: string }> {
  await mkdir(specsDir, { recursive: true })
  await mkdir(modelsDir, { recursive: true })
  await writeFile(join(specsDir, `${blueprint_name}_NN.md`), TEMPLATE_CONTENT, 'utf-8')
  await writeFile(
    join(specsDir, 'iNNfo_V_0-1-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-1-0"',
      'level: 1',
      'title: "Local iNNfo Spec"',
      'parent_spec:',
      '  name: "defiNNe_V_0-1-0"',
      '  url: "https://example.com/defiNNe_V_0-1-0_NN.md"',
      '---',
    ].join('\n'),
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNe_V_0-1-0_NN.md'),
    ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "Local defiNNe Spec"', '---'].join('\n'),
    'utf-8',
  )
  const alphaPath = join(modelsDir, 'alpha_V_0-1-0_linked_test_NN.md')
  const betaPath = join(modelsDir, 'beta_V_0-1-0_linked_test_NN.md')
  await writeFile(
    alphaPath,
    modelContent(
      'Alpha',
      '## NN Roles: RoleA\nlinked:: beta_V_0-1-0_linked_test@ghost-element\n',
    ),
    'utf-8',
  )
  await writeFile(betaPath, modelContent('Beta', '## NN Roles: RoleB\n'), 'utf-8')
  await writeFile(join(rootDir, 'domaiNN_NN.md'), workspaceContent(), 'utf-8')
  return { alphaPath, betaPath }
}

function buildCache(): SpecCache {
  return {
    specs: new Map([
      [
        blueprint_name,
        {
          name: blueprint_name,
          level: 2,
          parentName: 'iNNfo_V_0-1-0',
          parentUrl: 'https://example.com/iNNfo_V_0-1-0_NN.md',
          frontmatter: parseFrontmatter(TEMPLATE_CONTENT)!,
          rawContent: TEMPLATE_CONTENT,
        },
      ],
    ]),
    chain: [blueprint_name],
  }
}

describe('collectWorkspaceDiagnostics / filterDiagnosticsForModel (AD-4 split)', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(rootDir, { recursive: true })
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('filterDiagnosticsForModel keeps only diagnostics whose path names the model', async () => {
    const { alphaPath, betaPath } = await writeWorkspace()
    const diagnostics = [
      { path: alphaPath, message: 'alpha diag', severity: 'error' as const },
      { path: betaPath, message: 'beta diag', severity: 'warning' as const },
      {
        path: `${alphaPath}#elements.Roles.RoleA.fields.linked`,
        message: 'alpha ref',
        severity: 'error' as const,
      },
    ]
    const filtered = filterDiagnosticsForModel(diagnostics, rootDir, alphaPath)
    expect(filtered.map((d) => d.message)).toEqual(['alpha diag', 'alpha ref'])
  })

  it('filterDiagnosticsForModel matches the workspace-relative forward-slashed path too', async () => {
    const { alphaPath } = await writeWorkspace()
    const relative = alphaPath.replace(rootDir + '\\', '').replace(/\\/g, '/')
    const diagnostics = [
      { path: relative, message: 'relative diag', severity: 'warning' as const },
      {
        path: `${relative}#elements.Roles.RoleA.fields.linked`,
        message: 'relative ref',
        severity: 'error' as const,
      },
    ]
    expect(filterDiagnosticsForModel(diagnostics, rootDir, alphaPath)).toHaveLength(2)
  })

  it('filterDiagnosticsForModel returns [] for an unrelated model and never mutates input', async () => {
    const { alphaPath, betaPath } = await writeWorkspace()
    const diagnostics = [{ path: alphaPath, message: 'alpha', severity: 'error' as const }]
    const snapshot = JSON.stringify(diagnostics)
    const filtered = filterDiagnosticsForModel(diagnostics, rootDir, betaPath)
    expect(filtered).toEqual([])
    expect(JSON.stringify(diagnostics)).toBe(snapshot)
  })

  it('collectWorkspaceDiagnostics returns unfiltered cross-model diagnostics for the whole tree with ONE recursiveParse', async () => {
    await writeWorkspace()
    const { recursiveParse: parseSpy } = await import('@cognnitive/nn-core')
    const diagnostics = await collectWorkspaceDiagnostics(rootDir, buildCache())
    expect(parseSpy).toHaveBeenCalledTimes(1)
    const crossModel = diagnostics.find((d) => d.message.includes('REF_ELEMENT_NOT_FOUND'))
    expect(crossModel).toBeDefined()
    expect(crossModel!.path).toContain('alpha_V_0-1-0_linked_test_NN.md')
  })

  it('collectWorkspaceDiagnostics tolerates a null cache (no schema, no abort)', async () => {
    await writeWorkspace()
    const diagnostics = await collectWorkspaceDiagnostics(rootDir, null)
    expect(Array.isArray(diagnostics)).toBe(true)
  })

  it('validateKnowledge(workspace: true) composes the split and still filters to the requested model', async () => {
    await writeWorkspace()
    const alpha = await validateKnowledge(
      rootDir,
      'alpha_V_0-1-0_linked_test',
      undefined,
      undefined,
      true,
    )
    const beta = await validateKnowledge(
      rootDir,
      'beta_V_0-1-0_linked_test',
      undefined,
      undefined,
      true,
    )
    const alphaOwned = alpha.errors.some((e) =>
      e.message.includes('REF_ELEMENT_NOT_FOUND'),
    )
    const betaOwned = beta.errors.some((e) => e.message.includes('REF_ELEMENT_NOT_FOUND'))
    expect(alphaOwned).toBe(true)
    expect(betaOwned).toBe(false)
  })

  describe('knowledge-unit pointers in workspace mode', () => {
    async function writeUnitWorkspace(): Promise<void> {
      await mkdir(modelsDir, { recursive: true })
      await mkdir(join(rootDir, 'sources', 'import'), { recursive: true })
      await writeFile(
        join(rootDir, 'sources', 'import', 'metricas_q3.csv'),
        'cliente_id,segmento\n101,Enterprise\n102,SMB\n',
        'utf-8',
      )
      await writeFile(
        join(modelsDir, 'gamma_V_0-1-0_linked_test_NN.md'),
        modelContent(
          'Gamma',
          '## NN Roles: RoleC\nsources:: sources/import/metricas_q3.csv@999\n\n## NN Roles: RoleD\nsources:: sources/import/metricas_q3.csv@101\n',
        ),
        'utf-8',
      )
      await writeFile(
        join(rootDir, 'domaiNN_NN.md'),
        [
          '---',
          'spec_version: "V_0-1-0"',
          'level: 3',
          'knowledge_version: "V_0-0-1"',
          'title: "Unit Workspace"',
          'parent_spec:',
          '  name: "linked_test_V_0-1-0"',
          '  url: "https://example.com/linked_test_V_0-1-0_NN.md"',
          '---',
          '',
          '# NN kNNowledge',
          '## NN kNNowledge: Gamma',
          'path:: kNNowledge/gamma_V_0-1-0_linked_test_NN.md',
          '',
        ].join('\n'),
        'utf-8',
      )
    }

    it('surfaces an unknown CSV row-id error while valid pointers stay silent', async () => {
      await writeUnitWorkspace()
      const diagnostics = await collectWorkspaceDiagnostics(rootDir, buildCache())
      const rowErr = diagnostics.find((d) => d.message.includes('@999'))
      expect(rowErr).toBeDefined()
      expect(rowErr!.severity).toBe('error')
      const validRef = diagnostics.find((d) => d.message.includes('@101'))
      expect(validRef).toBeUndefined()
    })
  })
})

const MISSING_PARENT_CONTENT = [
  '---',
  'level: 3',
  'title: "MissingParent"',
  'knowledge_version: "V_0-1-0"',
  'parent_spec:',
  '  name: "missing_V_0-1-0"',
  '  url: "https://example.com/missing_V_0-1-0_NN.md"',
  '---',
  '',
  '# NN Roles',
  '',
  '## NN Roles: RoleA',
  '',
].join('\n')

describe('baseline differential MCP plumbing (validator-robustness 4.3)', () => {
  const baselinePath = join(rootDir, 'baseline.json')
  const BACKLOG = 'https://example.com/backlog'
  const origCache = process.env.INNFO_CACHE_DIR

  beforeEach(async () => {
    // Hermetic temp cache: the OS temp dir is shared across test files/runs,
    // so resolution here must never see entries fetched by other suites.
    process.env.INNFO_CACHE_DIR = join(rootDir, 'isolated-cache')
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(rootDir, { recursive: true })
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  })

  afterEach(async () => {
    if (origCache !== undefined) process.env.INNFO_CACHE_DIR = origCache
    else delete process.env.INNFO_CACHE_DIR
    await rm(rootDir, { recursive: true, force: true })
  })

  it('Regression blocked: a new error absent from the baseline surfaces and fails validation', async () => {
    await writeFile(
      baselinePath,
      JSON.stringify({
        version: 1,
        backlog: BACKLOG,
        entries: [
          { path: 'stale', code: 'STALE_CODE', fingerprint: 'stale::stale::STALE_CODE::gone' },
        ],
      }),
      'utf-8',
    )

    const result = await validateKnowledge(
      rootDir,
      undefined,
      MISSING_PARENT_CONTENT,
      undefined,
      undefined,
      {
        baselinePath,
      },
    )

    // The PARENT_RESOLUTION_FAILED error is new: it MUST surface (gate fails).
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('[PARENT_RESOLUTION_FAILED]'))).toBe(true)
    expect(result.suppressedCount).toBe(0)
    // The unmatched baseline entry is reported without failing validation.
    expect(result.staleEntries).toHaveLength(1)
    expect(result.warnings.some((w) => w.code === 'BASELINE_STALE')).toBe(true)
  })

  it('Known error suppressed with backlog link (triangulation)', async () => {
    const before = await validateKnowledge(rootDir, undefined, MISSING_PARENT_CONTENT)
    // An unresolvable parent surfaces twice: core [PARENT_RESOLUTION_FAILED]
    // plus the MCP resolution-detail error. Both are known → both baselined.
    expect(before.errors.length).toBeGreaterThan(0)
    await writeFile(
      baselinePath,
      JSON.stringify({
        version: 1,
        backlog: BACKLOG,
        entries: before.errors.map((e) => ({
          path: e.filePath ?? '',
          code: e.code ?? '',
          fingerprint: fingerprint(e),
        })),
      }),
      'utf-8',
    )

    const result = await validateKnowledge(
      rootDir,
      undefined,
      MISSING_PARENT_CONTENT,
      undefined,
      undefined,
      {
        baselinePath,
      },
    )

    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
    expect(result.suppressedCount).toBe(before.errors.length)
    expect(result.backlog).toBe(BACKLOG)
    expect(result.summary).toContain(String(before.errors.length))
    expect(result.summary).toContain(BACKLOG)
  })

  it('Missing baseline means full output (triangulation)', async () => {
    const result = await validateKnowledge(
      rootDir,
      undefined,
      MISSING_PARENT_CONTENT,
      undefined,
      undefined,
      {
        baselinePath: join(rootDir, 'does-not-exist.json'),
      },
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('[PARENT_RESOLUTION_FAILED]'))).toBe(true)
    expect(result.suppressedCount).toBe(0)
    expect(result.staleEntries).toEqual([])
    expect(result.backlog).toBeNull()
  })

  it('Info diagnostics surface in warnings (triangulation): BOM warns without failing', async () => {
    const result = await validateKnowledge(rootDir, undefined, '\uFEFF' + MISSING_PARENT_CONTENT)

    const bom = result.warnings.find((w) => w.code === 'BOM_WARNING')
    expect(bom).toBeDefined()
    expect(bom!.severity).toBe('info')
  })
})

describe('baseline single shared implementation (robustness-coda 1.3)', () => {
  it('consumers share one implementation with the core barrel', async () => {
    const core = await import('@cognnitive/nn-core')
    const mcp = await import('./validate')
    expect(typeof core.fingerprint).toBe('function')
    expect(mcp.fingerprint).toBe(core.fingerprint)
    expect(mcp.loadBaseline).toBe(core.loadBaseline)
    expect(mcp.diffNewOnly).toBe(core.diffNewOnly)
    expect(mcp.normalizeBaselinePath).toBe(core.normalizeBaselinePath)
  })

  it('fingerprints are byte-identical after consolidation', async () => {
    const core = await import('@cognnitive/nn-core')
    const mcp = await import('./validate')
    const diag = {
      path: 'elements.Task',
      message: 'Concept  "Task"  is not defined in template',
      severity: 'error' as const,
      code: 'UNKNOWN_CONCEPT',
      filePath: 'kNNowledge\\team_NN.md',
    }
    expect(mcp.fingerprint(diag)).toBe(core.fingerprint(diag))
    expect(mcp.fingerprint(diag)).toBe(
      'kNNowledge/team_NN.md::elements.Task::UNKNOWN_CONCEPT::Concept "Task" is not defined in template',
    )
  })
})

const EVIDENCE_CHANGESET = (changes: string) =>
  [
    '---',
    'spec_version: "V_0-1-0"',
    'level: 3',
    'parent_spec:',
    '  name: changes',
    '  url: "https://example.com/changes/spec_NN.md"',
    'blueprint_version: "0.1.0"',
    'status: applied',
    'author: "lucas"',
    'applied_at: "2026-10-10T12:00:00.000Z"',
    '---',
    '',
    '# NN Change',
    '',
    changes,
  ].join('\n')

describe('EVIDENCE_UNKNOWN (change-provenance)', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(rootDir, { recursive: true })
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  async function writeChanges(changes: string): Promise<void> {
    await mkdir(join(rootDir, 'changes'), { recursive: true })
    await writeFile(
      join(rootDir, 'changes', 'temp_agent_20261010T120000Z_changes_NN.md'),
      EVIDENCE_CHANGESET(changes),
      'utf-8',
    )
  }

  it('warns once per applied change with unknown or missing evidence, naming change, author and target', async () => {
    await writeWorkspace()
    await writeChanges(
      [
        '## NN Change: c-01',
        'op:: update_field',
        'target:: Alpha@RoleA&linked',
        'to:: decision',
        'author:: ana',
        'evidence:: unknown',
        '',
        '## NN Change: c-02',
        'op:: update_field',
        'target:: Alpha@RoleA&other',
        'to:: x',
        '',
        '## NN Change: c-03',
        'op:: update_field',
        'target:: Alpha@RoleA&skipped',
        'to:: y',
        'status:: conflict',
        'evidence:: unknown',
      ].join('\n'),
    )

    const diagnostics = await collectWorkspaceDiagnostics(rootDir, buildCache())
    const unknown = diagnostics.filter((d) => d.code === 'EVIDENCE_UNKNOWN')
    expect(unknown).toHaveLength(2)
    expect(unknown[0].severity).toBe('warning')
    expect(unknown[0].message).toContain('c-01')
    expect(unknown[0].message).toContain('ana')
    expect(unknown[0].message).toContain('Alpha@RoleA&linked')
    expect(unknown[1].message).toContain('c-02')
    expect(unknown[0].path.replace(/\\/g, '/')).toContain('alpha_V_0-1-0_linked_test_NN.md')
  })

  it('reports all 130 unknown changes of an LC_programas-like domain', async () => {
    await writeWorkspace()
    const changes = Array.from({ length: 130 }, (_, i) =>
      [
        `## NN Change: c-${String(i + 1).padStart(3, '0')}`,
        'op:: update_field',
        `target:: Alpha@RoleA&f${i + 1}`,
        'to:: x',
        'evidence:: unknown',
      ].join('\n'),
    ).join('\n\n')
    await writeChanges(changes)

    const diagnostics = await collectWorkspaceDiagnostics(rootDir, buildCache())
    expect(diagnostics.filter((d) => d.code === 'EVIDENCE_UNKNOWN')).toHaveLength(130)
  })
})
