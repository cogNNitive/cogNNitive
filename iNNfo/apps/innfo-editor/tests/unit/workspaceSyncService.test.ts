import { describe, it, expect } from 'vitest'
import { OWNERSHIP_MARKER } from '@cognnitive/innfo-core'
import {
  enumerateReconcilableModels,
  reconcileWorkspaceManifest,
} from '../../src/services/WorkspaceSyncService'
import { buildFakeTree, readFakeTree, type FakeTree } from '../helpers/fakeFs'

function businessModel(title: string): string {
  return [
    '---',
    'level: 3',
    'parent_spec:',
    '  name: "business_V_0-2-0"',
    `title: "${title}"`,
    '---',
    '',
    '# NN Workspace',
    'placeholder',
  ].join('\n')
}

describe('WorkspaceSyncService: enumerateReconcilableModels', () => {
  it('discovers a level-3 model and excludes the manifest and cogNNitive-templated files', async () => {
    const tree: FakeTree = {
      'workspace_NN.md': ['# NN ModelRef', ''].join('\n'),
      'acme_business_NN.md': businessModel('Acme Business Model'),
      'acme_cogNNitive_NN.md': [
        '---',
        'level: 3',
        'parent_spec:',
        '  name: "cogNNitive_V_0-2-0"',
        '---',
      ].join('\n'),
    }
    const root = buildFakeTree('root', tree)

    const discovered = await enumerateReconcilableModels(root, 'workspace_NN.md')

    expect(discovered).toEqual([
      { path: 'acme_business_NN.md', name: 'Acme Business Model', template: 'business_V_0-2-0' },
    ])
  })
})

describe('WorkspaceSyncService: reconcileWorkspaceManifest', () => {
  it('writes the manifest back only when a mutating change was computed', async () => {
    const tree: FakeTree = {
      'workspace_NN.md': ['# NN ModelRef', ''].join('\n'),
      'acme_business_NN.md': businessModel('Acme Business Model'),
    }
    const root = buildFakeTree('root', tree)

    const result = await reconcileWorkspaceManifest(root)

    expect(result.written).toBe(true)
    expect(result.changes).toEqual([
      { kind: 'added', path: 'acme_business_NN.md', name: 'Acme Business Model' },
    ])
    const written = readFakeTree(tree, 'workspace_NN.md')
    expect(written).toContain('## NN ModelRef: Acme Business Model')
    expect(written).toContain(OWNERSHIP_MARKER)
  })

  it('does not write when nothing changed (no-op)', async () => {
    const manifest = [
      '# NN ModelRef',
      '',
      '## NN ModelRef: Acme Business Model',
      OWNERSHIP_MARKER,
      'path:: acme_business_NN.md',
      'template:: [[business_V_0-2-0]]',
      'status:: active',
      '',
    ].join('\n')
    const tree: FakeTree = {
      'workspace_NN.md': manifest,
      'acme_business_NN.md': businessModel('Acme Business Model'),
    }
    const root = buildFakeTree('root', tree)

    const result = await reconcileWorkspaceManifest(root)

    expect(result.written).toBe(false)
    expect(result.changes).toEqual([])
    expect(readFakeTree(tree, 'workspace_NN.md')).toBe(manifest)
  })

  it('returns a no-op result when no workspace manifest exists', async () => {
    const tree: FakeTree = { 'acme_business_NN.md': businessModel('Acme Business Model') }
    const root = buildFakeTree('root', tree)

    const result = await reconcileWorkspaceManifest(root)

    expect(result.written).toBe(false)
    expect(result.changes).toEqual([])
  })
})
