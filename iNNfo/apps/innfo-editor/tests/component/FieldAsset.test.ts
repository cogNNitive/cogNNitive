import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FieldAsset from '../../src/shared/widgets/FieldAsset.vue'
import { useKnowledgeStore } from '../../src/stores/knowledgeStore'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import type { KnowledgeNode } from '../../src/model/types'

const FILE = { size: 10, lastModified: 0, text: async () => '' }
const FILE_HANDLE = { getFile: async () => FILE }

interface MockDir {
  getDirectoryHandle(name: string): Promise<MockDir>
  getFileHandle(name: string): Promise<typeof FILE_HANDLE>
  entries(): AsyncGenerator<[string, { kind: 'file' | 'directory' }]>
}

function makeDir(tree: Record<string, 'file' | MockDir>): MockDir {
  return {
    async getDirectoryHandle(name: string) {
      const node = tree[name]
      if (node && node !== 'file') return node
      throw new Error(`No directory: ${name}`)
    },
    async getFileHandle(name: string) {
      if (tree[name] === 'file') return FILE_HANDLE
      throw new Error(`No file: ${name}`)
    },
    async *entries() {
      for (const [name, node] of Object.entries(tree)) {
        yield [name, { kind: node === 'file' ? 'file' : 'directory' }] as const
      }
    },
  }
}

function makeNode(id: string, value: string, assets: string[]): KnowledgeNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    storageMode: 'FILE',
    type: 'Evidence',
    slug: 'evidencia-faltan',
    fields: { image: { value, editAttribution: { author: { kind: 'system', id: 'parser' }, timestamp: '2024-01-01T00:00:00.000Z' } } },
    markers: {},
    relationships: [],
    rawSections: {},
    assets,
    source: { path: 'kNNowledge/AveDelParaiso_V_0-1-0_visual-catalog_NN.md' },
  }
}

describe('FieldAsset — resolves nested canonical asset paths', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:resolved') })
  })

  it('uses the parser-resolved node.assets path when the raw value has a subfolder', async () => {
    const knowledgeStore = useKnowledgeStore()
    knowledgeStore.setGraph(
      {
        EV: makeNode('EV', 'evidence/IMG_1.jpg', [
          'kNNowledge/assets/evidencia-faltan/evidence/IMG_1.jpg',
        ]),
      },
      ['EV'],
    )

    const ws = useWorkspaceStore()
    ws.handle = makeDir({
      kNNowledge: makeDir({
        assets: makeDir({
          'evidencia-faltan': makeDir({
            evidence: makeDir({ 'IMG_1.jpg': 'file' }),
          }),
        }),
      }),
    }) as never

    const wrapper = mount(FieldAsset, {
      props: {
        modelValue: 'evidence/IMG_1.jpg',
        widgetType: 'image',
        nodeId: 'EV',
        fieldKey: 'image',
        readonly: true,
      },
    })
    await flushPromises()

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('blob:resolved')
  })

  it('falls back to the raw value when node.assets does not match', async () => {
    const knowledgeStore = useKnowledgeStore()
    knowledgeStore.setGraph(
      { EV: makeNode('EV', 'evidence/missing.jpg', []) },
      ['EV'],
    )

    const ws = useWorkspaceStore()
    ws.handle = makeDir({}) as never

    const wrapper = mount(FieldAsset, {
      props: {
        modelValue: 'evidence/missing.jpg',
        widgetType: 'image',
        nodeId: 'EV',
        fieldKey: 'image',
        readonly: true,
      },
    })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.get('img').attributes('src')).toBe('evidence/missing.jpg')
  })
})
