import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HomeView from '../../src/views/HomeView.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'

const mockPush = vi.fn()
const mockReplace = vi.fn()
let mockRouteQuery: Record<string, string> = {}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useRoute: () => ({
    query: mockRouteQuery,
    hash: '',
  }),
}))

vi.mock('../../src/stores/historyStore', () => ({
  loadHistory: vi.fn().mockResolvedValue([]),
  addToHistory: vi.fn().mockResolvedValue(undefined),
  removeFromHistory: vi.fn().mockResolvedValue(undefined),
  clearHistory: vi.fn().mockResolvedValue(undefined),
  formatTimestamp: vi.fn().mockReturnValue('just now'),
  getStoredHandle: vi.fn().mockResolvedValue(null),
}))

describe('HomeView — does not auto-resume without explicit user selection or deep-link', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockReplace.mockReset()
    mockRouteQuery = {}
  })

  it('stays on HomeView and does not automatically reopen or navigate when landing on /', async () => {
    const workspaceStore = useWorkspaceStore()
    const fakeHandle = {
      kind: 'directory' as const,
      name: 'workspace',
      async *entries() {},
      async getFileHandle() {
        throw new Error('not found')
      },
      async getDirectoryHandle() {
        throw new Error('not found')
      },
      queryPermission: vi.fn().mockResolvedValue('granted'),
    }
    workspaceStore.recoverHandle = vi.fn().mockResolvedValue(fakeHandle)
    workspaceStore.open = vi.fn()

    shallowMount(HomeView)
    await flushPromises()

    expect(workspaceStore.open).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not auto-resume when a deep link is present but stays on expected flow', async () => {
    mockRouteQuery = { model: 'SomeModel' }
    const workspaceStore = useWorkspaceStore()
    workspaceStore.recoverHandle = vi.fn().mockResolvedValue(null)
    workspaceStore.open = vi.fn()

    shallowMount(HomeView)
    await flushPromises()

    expect(workspaceStore.open).not.toHaveBeenCalled()
  })
})
