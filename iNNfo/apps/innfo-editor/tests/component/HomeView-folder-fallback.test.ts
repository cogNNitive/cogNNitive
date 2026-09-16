import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HomeView from '../../src/views/HomeView.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { addToHistory } from '../../src/stores/historyStore'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useRoute: () => ({ query: {}, hash: '' }),
}))

vi.mock('../../src/components/layout/SetupWizard.vue', () => ({
  default: { name: 'SetupWizard', template: '<div class="mock-setup-wizard"></div>' },
}))

vi.mock('../../src/stores/historyStore', () => ({
  loadHistory: vi.fn().mockResolvedValue([]),
  addToHistory: vi.fn().mockResolvedValue(undefined),
  removeFromHistory: vi.fn().mockResolvedValue(undefined),
  clearHistory: vi.fn().mockResolvedValue(undefined),
  formatTimestamp: vi.fn().mockReturnValue('just now'),
  getStoredHandle: vi.fn().mockResolvedValue(null),
}))

function makeFile(relPath: string, content: string): File {
  const name = relPath.split('/').pop() as string
  const file = new File([content], name, { type: 'text/markdown' })
  Object.defineProperty(file, 'webkitRelativePath', { value: relPath })
  return file
}

describe('HomeView — webkitdirectory fallback routes through workspace.open() (F-13)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    vi.mocked(addToHistory).mockClear()
  })

  it('parses via workspace.open() (the primary pipeline) and records a non-reopenable history entry', async () => {
    const workspaceStore = useWorkspaceStore()
    const openSpy = vi.spyOn(workspaceStore, 'open').mockImplementation(async () => {
      workspaceStore.hasParsed = true
    })

    const wrapper = shallowMount(HomeView)
    await flushPromises()

    const input = wrapper.find('input[webkitdirectory]')
    expect(input.exists()).toBe(true)

    const files = [makeFile('MyWorkspace/Doc_NN.md', '# doc')]
    Object.defineProperty(input.element, 'files', { value: files, configurable: true })
    await input.trigger('change')
    await flushPromises()

    expect(openSpy).toHaveBeenCalledTimes(1)
    const [handleArg] = openSpy.mock.calls[0]
    expect(handleArg.kind).toBe('directory')

    expect(addToHistory).toHaveBeenCalledWith(
      'MyWorkspace',
      null,
      'MyWorkspace/Doc_NN.md',
      { reopenable: false },
    )
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ path: '/workspace' }))
  })
})
