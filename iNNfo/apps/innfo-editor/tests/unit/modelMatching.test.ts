import { describe, it, expect } from 'vitest'
import {
  normalizeModelPath,
  extractModelBasename,
  findMatchingModelNode,
} from '../../src/utils/modelMatching'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, path: string, name?: string): ModelNode {
  return {
    id,
    name: name || id,
    parentId: null,
    childIds: [],
    storageMode: 'FILE',
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path },
  }
}

describe('modelMatching utility', () => {
  it('normalizes paths, trims wikilinks and backslashes', () => {
    expect(normalizeModelPath('[[models/test.md]]')).toBe('models/test.md')
    expect(normalizeModelPath('models\\test_NN.md')).toBe('models/test_NN.md')
    expect(normalizeModelPath('  [[  models\\nested\\doc.md ]] ')).toBe('models/nested/doc.md')
  })

  it('extracts basename correctly', () => {
    expect(extractModelBasename('models/rehabilitacion_NN.md')).toBe('rehabilitacion_NN')
    expect(extractModelBasename('models\\nested\\rehabilitacion.md')).toBe('rehabilitacion')
    expect(extractModelBasename('[[rehabilitacion]]')).toBe('rehabilitacion')
  })

  it('finds matching node by Windows path against POSIX target', () => {
    const node = makeNode(
      'models/rehabilitacion_NN.md',
      'models\\rehabilitacion_reja_pozuelo_V_0-1-0_rejas_rehabilitacion_NN.md',
    )
    const match = findMatchingModelNode(
      [node],
      'models/rehabilitacion_reja_pozuelo_V_0-1-0_rejas_rehabilitacion_NN.md',
    )
    expect(match).toBeDefined()
    expect(match?.id).toBe(node.id)
  })

  it('finds matching node by basename when target has full path', () => {
    const node = makeNode('rehabilitacion_node', 'rehabilitacion_reja_pozuelo_V_0-1-0_rejas_rehabilitacion_NN.md')
    const match = findMatchingModelNode(
      [node],
      'models/rehabilitacion_reja_pozuelo_V_0-1-0_rejas_rehabilitacion_NN.md',
    )
    expect(match).toBeDefined()
  })

  it('finds matching node when target has wikilinks', () => {
    const node = makeNode('models/foo.md', 'models/foo.md', 'Foo Model')
    const match = findMatchingModelNode([node], '[[models/foo.md]]')
    expect(match).toBeDefined()
  })
})
