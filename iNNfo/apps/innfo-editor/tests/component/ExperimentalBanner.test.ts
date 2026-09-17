import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ExperimentalBanner from '../../src/components/layout/ExperimentalBanner.vue'

describe('ExperimentalBanner.vue', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('renders by default when sessionStorage key is not set', () => {
    const wrapper = mount(ExperimentalBanner)
    expect(wrapper.find('[data-testid="experimental-banner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Work in Progress')
    expect(wrapper.text()).toContain('experimental and actively evolving')
  })

  it('hides when dismissed and writes to sessionStorage', async () => {
    const wrapper = mount(ExperimentalBanner)
    const button = wrapper.find('[data-testid="dismiss-experimental-banner"]')
    expect(button.exists()).toBe(true)

    await button.trigger('click')

    expect(wrapper.find('[data-testid="experimental-banner"]').exists()).toBe(false)
    expect(sessionStorage.getItem('nn_experimental_banner_dismissed')).toBe('true')
  })

  it('does not render if already dismissed in sessionStorage', () => {
    sessionStorage.setItem('nn_experimental_banner_dismissed', 'true')
    const wrapper = mount(ExperimentalBanner)
    expect(wrapper.find('[data-testid="experimental-banner"]').exists()).toBe(false)
  })
})
