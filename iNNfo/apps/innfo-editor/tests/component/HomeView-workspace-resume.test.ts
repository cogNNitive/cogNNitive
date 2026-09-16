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

vi.mock('../../src/components/layout/SetupWizard.vue', () => ({
  default: {
    name: 'SetupWizard',
    template: '<div class="mock-setup-wizard"></div>',
  },
}))

vi.mock('../../src/stores/historyStore', () => ({
  loadHistory: vi.fn().mockResolvedValue([]),
  addToHistory: vi.fn().mockResolvedValue(undefined),
  removeFromHistory: vi.fn().mockResolvedValue(undefined),
  clearHistory: vi.fn().mockResolvedValue(undefined),
  formatTimestamp: vi.fn().mockReturnValue('just now'),
  getStoredHandle: vi.fn().mockResolvedValue(null),
}))

describe('HomeView — resumes the last workspace via workspaceStore.recoverHandle() (F-14)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockReplace.mockReset()
    mockRouteQuery = {}
  })

  it('silently reopens and navigates to /workspace when a recovered handle still has granted read permission', async () => {
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
    workspaceStore.open = vi.fn().mockImplementation(async () => {
      workspaceStore.hasParsed = true
    })

    shallowMount(HomeView)
    await flushPromises()

    expect(workspaceStore.recoverHandle).toHaveBeenCalled()
    expect(workspaceStore.open).toHaveBeenCalledWith(fakeHandle)
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/workspace' }),
    )
  })

  it('does NOT navigate when the recovered handle no longer has granted permission (no silent prompt)', async () => {
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
      queryPermission: vi.fn().mockResolvedValue('prompt'),
    }
    workspaceStore.recoverHandle = vi.fn().mockResolvedValue(fakeHandle)
    workspaceStore.open = vi.fn()

    shallowMount(HomeView)
    await flushPromises()

    expect(workspaceStore.recoverHandle).toHaveBeenCalled()
    expect(workspaceStore.open).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not attempt to resume when a deep link is present', async () => {
    mockRouteQuery = { model: 'SomeModel' }
    const workspaceStore = useWorkspaceStore()
    workspaceStore.recoverHandle = vi.fn().mockResolvedValue(null)

    shallowMount(HomeView)
    await flushPromises()

    // history is empty in this test setup so the deep-link model resolution
    // itself no-ops; recoverHandle must not be reached while hasDeepLink is true.
    expect(workspaceStore.recoverHandle).not.toHaveBeenCalled()
  })
})
