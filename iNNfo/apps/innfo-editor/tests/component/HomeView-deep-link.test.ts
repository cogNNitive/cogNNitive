import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HomeView from '../../src/views/HomeView.vue'

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

describe('HomeView.vue Deep Link Loader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockReplace.mockReset()
    mockRouteQuery = {}
  })

  it('renders default home layout when no deep link params are present', async () => {
    mockRouteQuery = {}
    const wrapper = shallowMount(HomeView)

    expect(wrapper.find('[data-testid="deep-link-loader"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('iNNfo Editor & Modeler')
    expect(wrapper.text()).toContain('Open Workspace Folder')
  })

  it('renders loading state when model parameter is present in deep link', async () => {
    mockRouteQuery = { model: 'Capabilities_Catalog_V_1-0-0_capabilities' }
    const wrapper = shallowMount(HomeView)

    expect(wrapper.find('[data-testid="deep-link-loader"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Opening workspace for "Capabilities_Catalog_V_1-0-0_capabilities"')
  })

  it('renders loading state when workspace preset parameter is present in deep link', async () => {
    mockRouteQuery = { workspace: 'startup-founder' }
    const wrapper = shallowMount(HomeView)

    expect(wrapper.find('[data-testid="deep-link-loader"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading workspace preset...')
  })

  it('falls back to default home layout after resolution completes without navigation', async () => {
    mockRouteQuery = { model: 'UnknownModel' }
    const wrapper = shallowMount(HomeView)

    expect(wrapper.find('[data-testid="deep-link-loader"]').exists()).toBe(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="deep-link-loader"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('iNNfo Editor & Modeler')
  })
})
