import { describe, it, expect } from 'vitest'
import {
  classifyExplorerItem,
  checkIsArtifact,
  checkIsModel,
  checkIsSource,
} from '../../src/utils/explorerClassify'

describe('explorerClassify', () => {
  it('classifies artifacts/ files as artifact', () => {
    const item = { name: 'report.md', path: 'artifacts/report.md', kind: 'file' as const }
    expect(checkIsArtifact(item)).toBe(true)
    expect(classifyExplorerItem(item)).toBe('artifact')
  })

  it('classifies nested artifacts/ files as artifact', () => {
    const item = { name: 'summary.csv', path: 'artifacts/nested/summary.csv', kind: 'file' as const }
    expect(checkIsArtifact(item)).toBe(true)
    expect(classifyExplorerItem(item)).toBe('artifact')
  })

  it('does NOT classify the retired export/ folder as artifact (no fallback)', () => {
    const item = { name: 'report.md', path: 'export/report.md', kind: 'file' as const }
    expect(checkIsArtifact(item)).toBe(false)
    expect(classifyExplorerItem(item)).toBeNull()
  })

  it('classifies _NN.md files as model', () => {
    const item = { name: 'casestudy_NN.md', path: 'kNNowledge/casestudy_NN.md', kind: 'file' as const }
    expect(checkIsModel(item)).toBe(true)
    expect(classifyExplorerItem(item)).toBe('model')
  })

  it('classifies sources/ files as source', () => {
    const item = { name: 'interview.md', path: 'sources/nn/interview.md', kind: 'file' as const }
    expect(checkIsSource(item)).toBe(true)
    expect(classifyExplorerItem(item)).toBe('source')
  })

  it('returns null for directories and unclassified files', () => {
    expect(classifyExplorerItem({ name: 'artifacts', path: 'artifacts', kind: 'directory' })).toBeNull()
    expect(classifyExplorerItem({ name: 'readme.txt', path: 'docs/readme.txt', kind: 'file' })).toBeNull()
  })
})
