import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import FieldSchemaView from '../../src/components/editor/FieldSchemaView.vue'

describe('FieldSchemaView.vue — Fields Schema metadata', () => {
  it('renders field names and type badges for every field', () => {
    const wrapper = mount(FieldSchemaView, {
      props: {
        fieldDefinitions: [
          { name: 'status', type: 'select' },
          { name: 'summary', type: 'string' },
        ],
      },
      global: { plugins: [createPinia()] },
    })

    const text = wrapper.text()
    expect(text).toContain('status')
    expect(text).toContain('select')
    expect(text).toContain('summary')
    expect(text).toContain('string')
    expect(wrapper.find('[data-testid="field-type-badge"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="field-type-badge"]')).toHaveLength(2)
  })

  it('renders options chips for select fields', () => {
    const wrapper = mount(FieldSchemaView, {
      props: {
        fieldDefinitions: [
          { name: 'status', type: 'select', options: ['active', 'inactive', 'archived'] },
        ],
      },
      global: { plugins: [createPinia()] },
    })

    const text = wrapper.text()
    expect(text).toContain('Options')
    expect(text).toContain('active')
    expect(text).toContain('inactive')
    expect(text).toContain('archived')
  })

  it('renders target concepts for reference fields', () => {
    const wrapper = mount(FieldSchemaView, {
      props: {
        fieldDefinitions: [
          { name: 'owner', type: 'reference', target_concepts: ['Stakeholders', 'Teams'] },
        ],
      },
      global: { plugins: [createPinia()] },
    })

    const text = wrapper.text()
    expect(text).toContain('Targets')
    expect(text).toContain('Stakeholders')
    expect(text).toContain('Teams')
  })

  it('renders default values when defined', () => {
    const wrapper = mount(FieldSchemaView, {
      props: {
        fieldDefinitions: [
          { name: 'count', type: 'number', default: 3 },
          { name: 'flag', type: 'boolean', default: true },
        ],
      },
      global: { plugins: [createPinia()] },
    })

    const text = wrapper.text()
    expect(text).toContain('Default')
    expect(text).toContain('3')
    expect(text).toContain('true')
  })

  it('omits empty metadata groups', () => {
    const wrapper = mount(FieldSchemaView, {
      props: {
        fieldDefinitions: [{ name: 'summary', type: 'string' }],
      },
      global: { plugins: [createPinia()] },
    })

    const text = wrapper.text()
    expect(text).not.toContain('Options')
    expect(text).not.toContain('Targets')
    expect(text).not.toContain('Default')
  })

  it('shows empty state when no fields are defined', () => {
    const wrapper = mount(FieldSchemaView, {
      props: { fieldDefinitions: [] },
    })

    expect(wrapper.text()).toContain('No fields defined for this concept.')
  })
})
