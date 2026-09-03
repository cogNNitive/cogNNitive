import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import AIGuidePanel from '../../src/components/editor/AIGuidePanel.vue'

describe('AIGuidePanel steps accordion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('renders title and subtitle from the guide', () => {
    const wrapper = mount(AIGuidePanel)
    expect(wrapper.text()).toContain('Use iNNfo with AI')
    expect(wrapper.text()).toContain('Edit your iNNfo models using OpenCode')
  })

  it('renders the Tools section with OpenCode', () => {
    const wrapper = mount(AIGuidePanel)
    expect(wrapper.text()).toContain('Tools')
    expect(wrapper.text()).toContain('OpenCode')
  })

  it('renders at least one step in the Steps section', () => {
    const wrapper = mount(AIGuidePanel)
    expect(wrapper.text()).toContain('Steps')
    expect(wrapper.text()).toContain('Download and install OpenCode')
  })

  it('toggles the first step content on header click', async () => {
    const wrapper = mount(AIGuidePanel)
    const firstHeader = wrapper.findAll('.cursor-pointer.select-none').at(0)!

    // find the step container
    const step = wrapper.findAll('.overflow-hidden').at(0)!
    const content = step.findAll('.px-4.pb-4')
    // step 1 is open by default (openStep = 0)
    expect(content.length).toBeGreaterThan(0)

    // click to collapse
    await firstHeader.trigger('click')
    const contentAfterCollapse = step.findAll('.px-4.pb-4')
    expect(contentAfterCollapse.length).toBe(0)

    // click to expand again
    await firstHeader.trigger('click')
    const contentAfterExpand = step.findAll('.px-4.pb-4')
    expect(contentAfterExpand.length).toBeGreaterThan(0)
  })
})
