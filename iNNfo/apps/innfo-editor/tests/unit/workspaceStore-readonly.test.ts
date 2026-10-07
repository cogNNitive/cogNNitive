import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore, READ_ONLY_KNOWLEDGE_ERROR } from '../../src/stores/workspaceStore'
import { useKnowledgeStore } from '../../src/stores/knowledgeStore'
import { buildFakeTree } from '../helpers/fakeFs'

describe('Phase 6: Vue Editor Read-Only Guard (Decision D18)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('6.1.1 saveActiveFile throws error with D18 message when active document is Level 3 model', async () => {
    const workspaceStore = useWorkspaceStore()
    const knowledgeStore = useKnowledgeStore()

    const rootId = 'kNNowledge/Model_NN.md'
    knowledgeStore.setGraph(
      {
        [rootId]: {
          id: rootId,
          name: 'Model',
          parentId: null,
          childIds: [],
          kind: 'root',
          type: 'document',
          fields: {
            level: { value: 3 },
          },
          markers: {},
          relationships: [],
          rawSections: {},
          rawContent: '---\nlevel: 3\nspec_version: "V_0-3-0"\n---\n# NN Test\n',
          source: { path: rootId },
        },
      },
      [rootId],
    )

    const handle = buildFakeTree('workspace', {
      kNNowledge: {
        'Model_NN.md': '---\nlevel: 3\nspec_version: "V_0-3-0"\n---\n# NN Test\n',
      },
    })
    workspaceStore.handle = handle

    expect(workspaceStore.isReadOnlyActiveDocument).toBe(true)
    await expect(workspaceStore.saveActiveFile()).rejects.toThrow(READ_ONLY_KNOWLEDGE_ERROR)
  })

  it('6.1.2 saveActiveFileWithVersionBump throws error with D18 message for Level 3 models', async () => {
    const workspaceStore = useWorkspaceStore()
    const knowledgeStore = useKnowledgeStore()

    const rootId = 'kNNowledge/Model_NN.md'
    knowledgeStore.setGraph(
      {
        [rootId]: {
          id: rootId,
          name: 'Model',
          parentId: null,
          childIds: [],
          kind: 'root',
          type: 'document',
          fields: {
            level: { value: 3 },
          },
          markers: {},
          relationships: [],
          rawSections: {},
          rawContent: '---\nlevel: 3\nspec_version: "V_0-3-0"\n---\n# NN Test\n',
          source: { path: rootId },
        },
      },
      [rootId],
    )

    const handle = buildFakeTree('workspace', {
      kNNowledge: {
        'Model_NN.md': '---\nlevel: 3\nspec_version: "V_0-3-0"\n---\n# NN Test\n',
      },
    })
    workspaceStore.handle = handle

    await expect(
      workspaceStore.saveActiveFileWithVersionBump('patch', rootId),
    ).rejects.toThrow(READ_ONLY_KNOWLEDGE_ERROR)
  })

  it('6.1.3 Level 1 specifications and Level 2 templates save normally without error', async () => {
    const workspaceStore = useWorkspaceStore()
    const knowledgeStore = useKnowledgeStore()

    const rootId = 'specs/bluepriNNts/business/spec_NN.md'
    const initialContent = '---\nlevel: 2\nspec_version: "V_0-3-0"\ntitle: "Business Template"\n---\n# NN Test\n'
    knowledgeStore.setGraph(
      {
        [rootId]: {
          id: rootId,
          name: 'business_spec',
          parentId: null,
          childIds: [],
          kind: 'root',
          type: 'document',
          fields: {
            level: { value: 2 },
          },
          markers: {},
          relationships: [],
          rawSections: {},
          rawContent: initialContent,
          source: { path: rootId },
        },
      },
      [rootId],
    )

    const handle = buildFakeTree('workspace', {
      specs: {
        bluepriNNts: {
          business: {
            'spec_NN.md': initialContent,
          },
        },
      },
    })
    workspaceStore.handle = handle

    expect(workspaceStore.isReadOnlyActiveDocument).toBe(false)
    knowledgeStore.markDirty(rootId)

    // Save should succeed without throwing D18 error
    await expect(workspaceStore.saveActiveFile()).resolves.not.toThrow()
  })
})
