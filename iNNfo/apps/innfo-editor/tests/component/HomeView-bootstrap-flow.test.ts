import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HomeView from '../../src/views/HomeView.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useRoute: () => ({
    query: {},
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

describe('HomeView.vue Stacked Collapsible & Bootstrap Modal Flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockReplace.mockReset()
  })

  it('renders stacked action cards in collapsed state and expands on click', async () => {
    const wrapper = mount(HomeView)
    await flushPromises()

    const newCard = wrapper.find('[data-testid="card-new-workspace"]')
    const existingCard = wrapper.find('[data-testid="card-existing-workspace"]')

    expect(newCard.exists()).toBe(true)
    expect(existingCard.exists()).toBe(true)

    // Initially collapsed bodies do not exist in DOM
    expect(wrapper.text()).not.toContain('Select Folder for New Workspace')

    // Click header of Card 1 to expand
    const newHeader = newCard.find('button')
    await newHeader.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Select Folder for New Workspace')
    expect(wrapper.text()).toContain('_NN')
    expect(wrapper.text()).toContain('OpenCode')
    expect(wrapper.text()).toContain('Installing AI Agents Guide')

    const docLink = wrapper.find('a[href*="installing-ai-agents"]')
    expect(docLink.exists()).toBe(true)
    expect(docLink.attributes('target')).toBe('_blank')

    // Click again to collapse
    await newHeader.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Select Folder for New Workspace')
  })

  it('activates Bootstrap Modal when an empty directory is picked from expanded new workspace card', async () => {
    const emptyHandle = {
      kind: 'directory' as const,
      name: 'my-startup_NN',
      async *entries() {},
    }

    const mockPicker = vi.fn().mockResolvedValue(emptyHandle)
    ;(window as any).showDirectoryPicker = mockPicker

    const wrapper = mount(HomeView)
    await flushPromises()

    expect(wrapper.find('[data-testid="bootstrap-modal"]').exists()).toBe(false)

    // Expand new workspace card
    const newHeader = wrapper.find('[data-testid="card-new-workspace"] button')
    await newHeader.trigger('click')
    await flushPromises()

    // Click on Select Folder for New Workspace button
    const actionBtn = wrapper.findAll('[data-testid="card-new-workspace"] button')[1]
    await actionBtn.trigger('click')
    await flushPromises()

    expect(mockPicker).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="bootstrap-modal"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Bootstrap New Workspace')
    expect(wrapper.text()).toContain('my-startup_NN')
    expect(wrapper.text()).toContain('innfo: bootstrap a new workspace model in this directory')
  })

  it('opens workspace directly when directory already contains _NN.md files', async () => {
    const workspaceStore = useWorkspaceStore()
    const openSpy = vi.spyOn(workspaceStore, 'open').mockImplementation(async () => {
      workspaceStore.hasParsed = true
    })

    const populatedHandle = {
      kind: 'directory' as const,
      name: 'existing_NN',
      async *entries() {
        yield ['Ghostbusters_V_0-2-1_business_NN.md', { kind: 'file' as const }]
      },
    }

    const mockPicker = vi.fn().mockResolvedValue(populatedHandle)
    ;(window as any).showDirectoryPicker = mockPicker

    const wrapper = mount(HomeView)
    await flushPromises()

    // Expand existing workspace card
    const existingHeader = wrapper.find('[data-testid="card-existing-workspace"] button')
    await existingHeader.trigger('click')
    await flushPromises()

    const openWsBtn = wrapper.findAll('[data-testid="card-existing-workspace"] button')[1]
    await openWsBtn.trigger('click')
    await flushPromises()

    expect(openSpy).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith({ path: '/workspace', query: {}, hash: '' })
    expect(wrapper.find('[data-testid="bootstrap-modal"]').exists()).toBe(false)
  })
})
