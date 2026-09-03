import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useModelStore } from '../../src/stores/modelStore'
import { buildFakeTree } from '../helpers/fakeFs'

const indexMd = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _NN index

* [[Doc_NN.md]]
`

const validFormatMd = `---
spec_version: "V_0-1-1"
spec_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Workspace Store Fixture"
---

# _NN Business summary

Fixture used to exercise workspaceStore.open() single-parse-pass behavior.
`

describe('workspaceStore.open()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('triggers exactly one parse pass into modelStore on the first open()', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_NN.md': validFormatMd })

    await workspaceStore.open(handle)

    expect(workspaceStore.parseCount).toBe(1)
    expect(workspaceStore.hasParsed).toBe(true)
    expect(Object.keys(modelStore.nodes).length).toBeGreaterThan(0)
  })

  it('does not trigger a second parse pass when open() is invoked twice', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_NN.md': validFormatMd })

    await workspaceStore.open(handle)
    await workspaceStore.open(handle)

    expect(workspaceStore.parseCount).toBe(1)
  })

  it('does not trigger a second parse pass on repeated route-navigation-like open() calls with the same handle', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_NN.md': validFormatMd })

    await workspaceStore.open(handle)
    // Simulate navigating between routes/nodes: nothing should re-invoke parsing.
    await workspaceStore.open(handle)
    await workspaceStore.open(handle)

    expect(workspaceStore.parseCount).toBe(1)
  })

  it('sets emptyFolderError and a detailed error when a _NN.md file fails to parse', async () => {
    const workspaceStore = useWorkspaceStore()
    const brokenModel =
      'X---\nspec_version: "V_0-2-0"\ntitle: "Broken"\n---\n\n# _NN Business summary\n\ntext'
    const handle = buildFakeTree('workspace', {
      'broken_V_1-0-0_business_NN.md': brokenModel,
    })

    await workspaceStore.open(handle)

    expect(workspaceStore.emptyFolderError).toBe(true)
    expect(workspaceStore.hasParsed).toBe(false)
    expect(workspaceStore.error).toContain('broken_V_1-0-0_business_NN.md')
    expect(workspaceStore.error).toContain('spec_version')
  })

  it('keeps a generic error when the folder is empty with no parse issues', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', {})

    await workspaceStore.open(handle)

    expect(workspaceStore.emptyFolderError).toBe(true)
    expect(workspaceStore.hasParsed).toBe(false)
    expect(workspaceStore.error).toBeNull()
  })

  it('updates source.path of all child nodes when performing a version bump', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()

    const rootId = 'Test_V_1-0-0_business_NN.md'
    modelStore.setGraph(
      {
        [rootId]: {
          id: rootId,
          name: 'Test_V_1-0-0_business',
          parentId: null,
          childIds: ['child-1'],
          kind: 'concept',
          type: 'root',
          fields: {},
          markers: {},
          relationships: [],
          rawSections: {},
          rawContent: '---\nmodel_version: "V_1-0-0"\n---\n# Test',
          source: { path: rootId },
        },
        'child-1': {
          id: 'child-1',
          name: 'Child 1',
          parentId: rootId,
          childIds: [],
          kind: 'element',
          type: 'WORK',
          fields: {},
          markers: {},
          relationships: [],
          rawSections: {},
          source: { path: rootId },
        },
      },
      [rootId],
    )

    const handle = buildFakeTree('workspace', {
      [rootId]: '---\nmodel_version: "V_1-0-0"\n---\n# Test',
    })

    workspaceStore.handle = handle

    await workspaceStore.saveActiveFileWithVersionBump('patch', rootId)

    const updatedRoot = modelStore.getNode(rootId)
    const updatedChild = modelStore.getNode('child-1')

    expect(updatedRoot?.source.path).toBe('Test_V_1-0-1_business_NN.md')
    expect(updatedChild?.source.path).toBe('Test_V_1-0-1_business_NN.md')
  })

  it('preserves directory path (e.g. models/) when performing a version bump', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()

    const rootId = 'models/arenzano_V_1-3-0_business_NN.md'
    modelStore.setGraph(
      {
        [rootId]: {
          id: rootId,
          name: 'arenzano_V_1-3-0_business',
          parentId: null,
          childIds: ['child-1'],
          kind: 'concept',
          type: 'root',
          fields: {},
          markers: {},
          relationships: [],
          rawSections: {},
          rawContent: '---\nmodel_version: "V_1-3-0"\n---\n# Arenzano',
          source: { path: rootId },
        },
        'child-1': {
          id: 'child-1',
          name: 'Child 1',
          parentId: rootId,
          childIds: [],
          kind: 'element',
          type: 'WORK',
          fields: {},
          markers: {},
          relationships: [],
          rawSections: {},
          source: { path: rootId },
        },
      },
      [rootId],
    )

    const handle = buildFakeTree('workspace', {
      models: {
        'arenzano_V_1-3-0_business_NN.md': '---\nmodel_version: "V_1-3-0"\n---\n# Arenzano',
      },
    })

    workspaceStore.handle = handle

    await workspaceStore.saveActiveFileWithVersionBump('patch', rootId)

    const updatedRoot = modelStore.getNode(rootId)
    const updatedChild = modelStore.getNode('child-1')

    expect(updatedRoot?.source.path).toBe('models/arenzano_V_1-3-1_business_NN.md')
    expect(updatedChild?.source.path).toBe('models/arenzano_V_1-3-1_business_NN.md')
  })

  it('saveActiveFile writes dirty nodes back to handle when driver is null', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()

    const rootId = 'Test_V_1-0-0_business_NN.md'
    modelStore.setGraph(
      {
        [rootId]: {
          id: rootId,
          name: 'Test_V_1-0-0_business',
          parentId: null,
          childIds: ['child-1'],
          kind: 'root',
          type: 'document',
          fields: {},
          markers: {},
          relationships: [],
          rawSections: {},
          rawContent: '---\nspec_version: "V_0-1-1"\ntitle: "Test Model"\n---\n# NN Business\n',
          source: { path: rootId },
        },
        'child-1': {
          id: 'child-1',
          name: 'Child 1',
          parentId: rootId,
          childIds: [],
          kind: 'element',
          type: 'Business',
          fields: {
            status: {
              value: 'Old Status',
              provenance: { author: { kind: 'user', id: 'test' }, timestamp: '' },
            },
          },
          markers: {},
          relationships: [],
          rawSections: {},
          source: { path: rootId },
        },
      },
      [rootId],
    )

    const handle = buildFakeTree('workspace', {
      [rootId]: '---\nspec_version: "V_0-1-1"\ntitle: "Test Model"\n---\n# NN Business\n',
    })

    workspaceStore.handle = handle

    // Modify status field value on the child node
    const child = modelStore.getNode('child-1')
    if (child) {
      child.fields['status'] = {
        value: 'New Status',
        provenance: { author: { kind: 'user', id: 'test' }, timestamp: '' },
      }
    }
    modelStore.markDirty('child-1') // This should also mark the root node dirty

    expect(modelStore.dirtyIds.has(rootId)).toBe(true)

    await workspaceStore.saveActiveFile()

    // Retrieve file content from handle to assert it was saved
    const fileHandle = await handle.getFileHandle(rootId)
    const file = await fileHandle.getFile()
    const text = await file.text()

    expect(text).toContain('New Status')
    expect(text).not.toContain('Old Status')
    expect(modelStore.dirtyIds.has(rootId)).toBe(false)
  })
})
