import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AiWorkflowPanel from '../../src/components/editor/AiWorkflowPanel.vue'
import { useUiStore } from '../../src/stores/uiStore'

describe('AiWorkflowPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders header with Back to editor button and resets activeView on click', async () => {
    const uiStore = useUiStore()
    uiStore.setActiveView('ai-guide')

    const wrapper = mount(AiWorkflowPanel)
    expect(wrapper.text()).toContain('AI Workflow')

    const closeBtn = wrapper.find('[data-testid="ai-workflow-close-button"]')
    expect(closeBtn.exists()).toBe(true)
    expect(closeBtn.text()).toContain('Back to editor')

    await closeBtn.trigger('click')
    expect(uiStore.activeView).toBe('editor')
  })
})
