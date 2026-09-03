/**
 * Tests for Phase F — File System Operations:
 *   - useFileSystem composable (scan, read, guard)
 *   - useUrlDocLoader composable (fetch + parse)
 *   - workspaceStore.loadFromUrl, backupEnabled, backup on save
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useModelStore } from '../../src/stores/modelStore'
import { useUiStore } from '../../src/stores/uiStore'
import {
  isFileSystemAccessSupported,
  scanDirectory,
  readFileContent,
  connectDirectory,
} from '../../src/composables/useFileSystem'
import { useUrlDocLoader } from '../../src/composables/useUrlDocLoader'
import { buildFakeTree } from '../helpers/fakeFs'

// ── Fixture: minimal valid FORMAT markdown ──

const validFormatMd = `---
spec_version: "V_0-1-1"
spec_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Test Model"
---

# _NN Business summary

This is a test model.
`

// ── isFileSystemAccessSupported ──

describe('isFileSystemAccessSupported()', () => {
  beforeEach(() => {
    delete (window as any).showDirectoryPicker
  })

  it('returns false when window.showDirectoryPicker is absent', () => {
    expect(isFileSystemAccessSupported()).toBe(false)
  })

  it('returns true when window.showDirectoryPicker exists', () => {
    ;(window as any).showDirectoryPicker = () => Promise.resolve({} as any)
    expect(isFileSystemAccessSupported()).toBe(true)
  })
})

// ── scanDirectory ──

describe('scanDirectory()', () => {
  it('scans a flat directory and returns all entries', async () => {
    const handle = buildFakeTree('root', {
      'file1.md': '# Hello',
      'file2.md': '# World',
    })

    const result = await scanDirectory(handle)

    expect(result.errors).toEqual([])
    expect(result.files).toHaveLength(2)
    expect(result.files.map((f) => f.name)).toEqual(['file1.md', 'file2.md'])
    expect(result.files.every((f) => f.kind === 'file')).toBe(true)
  })

  it('scans nested directories recursively', async () => {
    const handle = buildFakeTree('root', {
      'doc.md': '# Doc',
      sub: {
        'nested.md': '# Nested',
        deep: {
          'deep.md': '# Deep',
        },
      },
    })

    const result = await scanDirectory(handle)

    expect(result.errors).toEqual([])
    // Returns both files AND directory entries
    expect(result.files.length).toBeGreaterThanOrEqual(3)
    const names = result.files.map((f) => f.name)
    expect(names).toContain('doc.md')
    expect(names).toContain('nested.md')
    expect(names).toContain('deep.md')
    // Also contains directory entries
    expect(names).toContain('sub')
    expect(names).toContain('deep')
  })

  it('limits recursion depth', async () => {
    const handle = buildFakeTree('root', {
      l1: {
        l2: {
          l3: {
            'deep.md': '# Deep',
          },
        },
      },
    })

    const result = await scanDirectory(handle, 2)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('Max depth')
  })
})

// ── readFileContent ──

describe('readFileContent()', () => {
  it('reads text content from a file handle', async () => {
    const handle = buildFakeTree('root', {
      'test.md': validFormatMd,
    })

    for await (const [, entry] of handle.entries()) {
      const content = await readFileContent(entry as any)
      expect(content).toBe(validFormatMd)
      return
    }
  })
})

// ── connectDirectory ──

describe('connectDirectory()', () => {
  it('returns true for a basic handle', async () => {
    const handle = buildFakeTree('root', { 'a.md': 'a' })
    const result = await connectDirectory(handle)
    expect(result).toBe(true)
  })
})

// ── useUrlDocLoader ──

describe('useUrlDocLoader.fetch()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('returns error when fetch fails', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Network failure'))

    const loader = useUrlDocLoader()
    const result = await loader.fetch('https://example.com/model.md')

    expect(result.error).toBe('Network failure')
    expect(Object.keys(result.nodes)).toHaveLength(0)
  })

  it('returns error on non-ok HTTP response', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
    } as Response)

    const loader = useUrlDocLoader()
    const result = await loader.fetch('https://example.com/model.md')

    expect(result.error).toContain('HTTP 404')
  })

  it('parses valid FORMAT markdown into nodes', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(validFormatMd),
    } as Response)

    const loader = useUrlDocLoader()
    const result = await loader.fetch('https://example.com/TestModel_V_1-0-0_business_NN.md')

    expect(result.error).toBeNull()
    expect(result.sourceUrl).toBe('https://example.com/TestModel_V_1-0-0_business_NN.md')
    expect(result.rootIds).toHaveLength(1)

    const rootId = result.rootIds[0]
    expect(rootId).toBe('TestModel_V_1-0-0_business_NN')
    expect(result.nodes[rootId]).toBeDefined()
    expect(result.nodes[rootId].kind).toBe('root')
    expect(result.nodes[rootId].fields.spec_version).toBeDefined()
    expect(result.nodes[rootId].fields.spec_version.value).toBe('V_0-1-1')
  })

  it('loadIntoStore populates modelStore', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(validFormatMd),
    } as Response)

    const loader = useUrlDocLoader()
    const result = await loader.loadIntoStore(
      'https://example.com/TestModel_V_1-0-0_business_NN.md',
    )

    expect(result.error).toBeNull()

    const modelStore = useModelStore()
    expect(modelStore.rootIds).toHaveLength(1)
    expect(Object.keys(modelStore.nodes).length).toBeGreaterThan(0)
  })

  it('does not populate modelStore on parse error', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not valid format markdown'),
    } as Response)

    // This should still parse (parseModel doesn't throw on invalid content,
    // it returns empty elements etc.)
    const loader = useUrlDocLoader()
    const result = await loader.loadIntoStore('https://example.com/test.md')

    // parseModel handles non-FORMAT content gracefully
    expect(result.error).toBeNull()
    const modelStore = useModelStore()
    expect(modelStore.rootIds).toHaveLength(0)
  })
})

// ── workspaceStore.loadFromUrl ──

describe('workspaceStore.loadFromUrl()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('loads a model from URL and sets hasParsed without handle', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(validFormatMd),
    } as Response)

    const store = useWorkspaceStore()
    await store.loadFromUrl('https://example.com/TestModel_V_1-0-0_business_NN.md')

    expect(store.hasParsed).toBe(true)
    expect(store.handle).toBeNull()
    expect(store.hasHandle).toBe(false)
    expect(store.sourceUrl).toBe('https://example.com/TestModel_V_1-0-0_business_NN.md')
    expect(store.parseCount).toBe(1)
  })

  it('sets error and throws on network failure', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Network failure'))

    const store = useWorkspaceStore()
    await expect(store.loadFromUrl('https://example.com/model.md')).rejects.toThrow(
      'Network failure',
    )
    expect(store.error).toContain('Network failure')
  })
})

// ── workspaceStore backup ──

describe('workspaceStore backup', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('backupEnabled defaults to true', () => {
    const store = useWorkspaceStore()
    expect(store.backupEnabled).toBe(true)
  })

  it('enableBackup toggles the flag', () => {
    const store = useWorkspaceStore()
    store.enableBackup(false)
    expect(store.backupEnabled).toBe(false)
    store.enableBackup(true)
    expect(store.backupEnabled).toBe(true)
  })

  it('disableBackup sets flag to false', () => {
    const store = useWorkspaceStore()
    store.disableBackup()
    expect(store.backupEnabled).toBe(false)
  })

  it('backup is created on save when backupEnabled', async () => {
    const handle = buildFakeTree('workspace', {
      'Doc_V_1-0-0_business_NN.md': validFormatMd,
    })

    const store = useWorkspaceStore()
    await store.open(handle)

    const modelStore = useModelStore()
    modelStore.markDirty(modelStore.rootIds[0])

    // Spy on the backup method
    const backupSpy = vi.spyOn(store as any, '_createBackup')

    await store.saveActiveFile()

    // Backup was called
    expect(backupSpy).toHaveBeenCalledTimes(1)
  })

  it('backup is NOT created when backupEnabled is false', async () => {
    const handle = buildFakeTree('workspace', {
      'Doc_V_1-0-0_business_NN.md': validFormatMd,
    })

    const store = useWorkspaceStore()
    await store.open(handle)
    store.disableBackup()

    const modelStore = useModelStore()
    modelStore.markDirty(modelStore.rootIds[0])

    const backupSpy = vi.spyOn(store as any, '_createBackup')

    await store.saveActiveFile()

    expect(backupSpy).not.toHaveBeenCalled()
  })
})

// ── workspaceStore.reset ──

describe('workspaceStore.reset()', () => {
  it('clears sourceUrl and backupEnabled', () => {
    const store = useWorkspaceStore()
    store.sourceUrl = 'https://example.com/model.md'
    store.backupEnabled = false
    store.reset()

    expect(store.sourceUrl).toBeNull()
    expect(store.backupEnabled).toBe(true)
  })
})

// ── Save Workspace Without Handle (Phase 2 & 4 tests) ──

import SaveWorkspaceModal from '../../src/components/layout/SaveWorkspaceModal.vue'

describe('SaveWorkspaceModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    delete (window as any).showDirectoryPicker
  })

  it('renders instructions in English when showSaveWorkspaceModal is true', () => {
    const uiStore = useUiStore()
    uiStore.setShowSaveWorkspaceModal(true)

    const wrapper = mount(SaveWorkspaceModal)
    expect(wrapper.text()).toContain('Save Workspace')
    expect(wrapper.text()).not.toContain('Guardar Espacio de Trabajo')
    expect(wrapper.text()).toContain('Documents')
    expect(wrapper.text()).not.toContain('Documentos')
  })

  it('triggers showDirectoryPicker and writes files, transitioning store state', async () => {
    const uiStore = useUiStore()
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()

    uiStore.setShowSaveWorkspaceModal(true)
    workspaceStore.sourceUrl = 'https://example.com/MyModel_V_1-0-0_business_NN.md'

    modelStore.rootIds = ['MyModel_V_1-0-0_business_NN']
    modelStore.nodes = {
      'MyModel_V_1-0-0_business_NN': {
        id: 'MyModel_V_1-0-0_business_NN',
        name: 'MyModel',
        parentId: null,
        childIds: [],
        type: 'document',
        fields: {},
        markers: {},
        relationships: [],
        rawSections: {},
        source: { path: 'https://example.com/MyModel_V_1-0-0_business_NN.md' },
        rawContent: validFormatMd,
      } as any,
    }

    const tree: any = {}
    const mockDirectoryHandle = buildFakeTree('my-local-workspace', tree)

    ;(window as any).showDirectoryPicker = vi.fn().mockResolvedValue(mockDirectoryHandle)

    const wrapper = mount(SaveWorkspaceModal)
    const saveButton = wrapper.find('button.bg-primary')
    expect(saveButton.exists()).toBe(true)

    await saveButton.trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect((window as any).showDirectoryPicker).toHaveBeenCalled()
    expect(tree['MyModel_V_1-0-0_business_NN.md']).toContain('title: "Test Model"')
    expect(tree['MyModel_V_1-0-0_business_NN.md']).toContain(
      'url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"',
    )
    expect(tree['Open iNNfo Editor.html']).toContain('refresh')
    expect(tree['README.md']).toContain('Workspace Instructions')

    expect(workspaceStore.hasHandle).toBe(true)
    expect(workspaceStore.handle?.name).toBe('my-local-workspace')
    expect(uiStore.showSaveWorkspaceModal).toBe(false)
  })
})
