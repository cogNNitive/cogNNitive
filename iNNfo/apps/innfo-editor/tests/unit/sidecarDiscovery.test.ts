import { describe, it, expect } from 'vitest'
import { checkIsModel, classifyExplorerItem } from '../../src/utils/explorerClassify'
import { enumerateReconcilableModels } from '../../src/services/WorkspaceSyncService'
import { modelStemMatches } from '../../src/utils/knowledgeMatching'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

function doc(parent: string, title: string): string {
  return ['---', 'level: 3', 'parent_spec:', `  name: "${parent}"`, `title: "${title}"`, '---', '', '# Body'].join('\n')
}

describe('explorerClassify with sidecars', () => {
  const sidecar = {
    name: 'report.pdf_sidecar_NN.md',
    path: 'sources/import/report.pdf_sidecar_NN.md',
    kind: 'file' as const,
  }

  it('does not treat a sidecar as a model', () => {
    expect(checkIsModel(sidecar)).toBe(false)
  })

  it('classifies a sidecar by its folder like any other source file', () => {
    expect(classifyExplorerItem(sidecar)).toBe('source')
  })

  it('still classifies an ordinary _NN.md document as a model', () => {
    expect(
      checkIsModel({ name: 'Acme_business_NN.md', path: 'kNNowledge/Acme_business_NN.md', kind: 'file' }),
    ).toBe(true)
  })
})

describe('editor discovery parity with a seeded sidecar', () => {
  it('lists only the real model, like core discovery and MCP list_knowledge', async () => {
    const tree: FakeTree = {
      'domaiNN_NN.md': '# NN Models\n',
      kNNowledge: { 'Acme_business_NN.md': doc('business_V_0-2-0', 'Acme Business Model') },
      sources: {
        import: {
          'report.pdf_sidecar_NN.md': doc('sidecar', 'Report Sidecar'),
          'prices.csv_sidecar_NN.md': doc('business_V_0-2-0', 'Prices Sidecar'),
        },
      },
      staging: { 'Draft_business_NN.md': doc('business_V_0-2-0', 'Staged Draft') },
    }
    const root = buildFakeTree('root', tree)

    const discovered = await enumerateReconcilableModels(root, 'domaiNN_NN.md')

    expect(discovered.map((d) => d.path)).toEqual(['kNNowledge/Acme_business_NN.md'])
  })
})

describe('modelStemMatches', () => {
  it('matches a file stem to a model id through the contract stem', () => {
    expect(modelStemMatches('Acme_business_NN.md', 'business')).toBe(true)
    expect(modelStemMatches('Acme_business_NN.md', 'Acme_business')).toBe(true)
    expect(modelStemMatches('Acme_business_NN.md', 'projects')).toBe(false)
  })
})
