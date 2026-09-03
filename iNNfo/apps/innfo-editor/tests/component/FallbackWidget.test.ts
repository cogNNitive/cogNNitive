import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FallbackWidget from '../../src/shared/widgets/FallbackWidget.vue'

describe('FallbackWidget (R15 "Fallback widget for unported type")', () => {
  it('renders the raw value and a type badge for an unrecognized widget type', () => {
    const wrapper = mount(FallbackWidget, {
      props: { modelValue: 'raw string value', widgetType: 'some-unported-type' },
    })

    expect(wrapper.text()).toContain('raw string value')
    expect(wrapper.text()).toContain('some-unported-type')
  })

  it('renders without crashing for a non-string raw value', () => {
    const wrapper = mount(FallbackWidget, {
      props: { modelValue: 42, widgetType: 'weight' },
    })

    expect(wrapper.text()).toContain('42')
  })

  it('renders without crashing for an undefined value', () => {
    const wrapper = mount(FallbackWidget, {
      props: { modelValue: undefined, widgetType: 'unknown' },
    })

    expect(wrapper.exists()).toBe(true)
  })
})
