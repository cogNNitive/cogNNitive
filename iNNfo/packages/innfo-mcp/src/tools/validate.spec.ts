import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { parseFrontmatter } from '@cognnitive/innfo-core'
import type { SpecCache } from '@cognnitive/innfo-core'
import { collectWorkspaceDiagnostics, filterDiagnosticsForModel } from './validate'
import { validateModel } from './mutate'

vi.mock('@cognnitive/innfo-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cognnitive/innfo-core')>()
  return {
    ...actual,
    recursiveParse: vi.fn(actual.recursiveParse),
  }
})

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-validate')
const specsDir = join(rootDir, 'specs')
const modelsDir = join(rootDir, 'models')

const TEMPLATE_NAME = 'linked_test_V_0-1-0'

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
    'model_version: "V_0-1-0"',
    'parent_spec:',
    `  name: "${TEMPLATE_NAME}"`,
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
    'model_version: "V_0-0-1"',
    'title: "Workspace Model"',
    'parent_spec:',
    '  name: "linked_test_V_0-1-0"',
    '  url: "https://example.com/linked_test_V_0-1-0_NN.md"',
    '---',
    '',
    '# NN Models',
    '## NN Models: Alpha',
    'path:: models/alpha_V_0-1-0_linked_test_NN.md',
    '',
    '## NN Models: Beta',
    'path:: models/beta_V_0-1-0_linked_test_NN.md',
    '',
  ].join('\n')
}

async function writeWorkspace(): Promise<{ alphaPath: string; betaPath: string }> {
  await mkdir(specsDir, { recursive: true })
  await mkdir(modelsDir, { recursive: true })
  await writeFile(join(specsDir, `${TEMPLATE_NAME}_NN.md`), TEMPLATE_CONTENT, 'utf-8')
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
      '## NN Roles: RoleA\nlinked:: [[beta_V_0-1-0_linked_test :: GhostElement]]\n',
    ),
    'utf-8',
  )
  await writeFile(betaPath, modelContent('Beta', '## NN Roles: RoleB\n'), 'utf-8')
  await writeFile(join(rootDir, 'workspace_01.md'), workspaceContent(), 'utf-8')
  return { alphaPath, betaPath }
}

function buildCache(): SpecCache {
  return {
    specs: new Map([
      [
        TEMPLATE_NAME,
        {
          name: TEMPLATE_NAME,
          level: 2,
          parentName: 'iNNfo_V_0-1-0',
          parentUrl: 'https://example.com/iNNfo_V_0-1-0_NN.md',
          frontmatter: parseFrontmatter(TEMPLATE_CONTENT)!,
          rawContent: TEMPLATE_CONTENT,
        },
      ],
    ]),
    chain: [TEMPLATE_NAME],
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
      { path: `${alphaPath}#elements.Roles.RoleA.fields.linked`, message: 'alpha ref', severity: 'error' as const },
    ]
    const filtered = filterDiagnosticsForModel(diagnostics, rootDir, alphaPath)
    expect(filtered.map((d) => d.message)).toEqual(['alpha diag', 'alpha ref'])
  })

  it('filterDiagnosticsForModel matches the workspace-relative forward-slashed path too', async () => {
    const { alphaPath } = await writeWorkspace()
    const relative = alphaPath.replace(rootDir + '\\', '').replace(/\\/g, '/')
    const diagnostics = [
      { path: relative, message: 'relative diag', severity: 'warning' as const },
      { path: `${relative}#elements.Roles.RoleA.fields.linked`, message: 'relative ref', severity: 'error' as const },
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
    const { recursiveParse: parseSpy } = await import('@cognnitive/innfo-core')
    const diagnostics = await collectWorkspaceDiagnostics(rootDir, buildCache())
    expect(parseSpy).toHaveBeenCalledTimes(1)
    const crossModel = diagnostics.find((d) => d.message.includes('Dangling cross-model reference'))
    expect(crossModel).toBeDefined()
    expect(crossModel!.path).toContain('alpha_V_0-1-0_linked_test_NN.md')
  })

  it('collectWorkspaceDiagnostics tolerates a null cache (no schema, no abort)', async () => {
    await writeWorkspace()
    const diagnostics = await collectWorkspaceDiagnostics(rootDir, null)
    expect(Array.isArray(diagnostics)).toBe(true)
  })

  it('validateModel(workspace: true) composes the split and still filters to the requested model', async () => {
    await writeWorkspace()
    const alpha = await validateModel(rootDir, 'alpha_V_0-1-0_linked_test', undefined, undefined, true)
    const beta = await validateModel(rootDir, 'beta_V_0-1-0_linked_test', undefined, undefined, true)
    const alphaOwned = alpha.errors.some((e) => e.message.includes('Dangling cross-model reference'))
    const betaOwned = beta.errors.some((e) => e.message.includes('Dangling cross-model reference'))
    expect(alphaOwned).toBe(true)
    expect(betaOwned).toBe(false)
  })
})