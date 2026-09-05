import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FieldModel from '../../src/shared/widgets/FieldModel.vue'
import { useModelStore } from '../../src/stores/modelStore'
import { useUiStore } from '../../src/stores/uiStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'text',
    kind: 'element',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  } as ModelNode
}

describe('FieldModel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a sidebar-styled pillbadge in read mode with basename text and full-path title', () => {
    const wrapper = mount(FieldModel, {
      props: {
        modelValue: './models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN.md',
        readonly: true,
      },
    })

    const pill = wrapper.find('[data-testid="model-field-pill"]')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toBe('jose-luis-olmo-mora_V_0-1-0_business_NN.md')
    expect(pill.attributes('title')).toBe(
      './models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN.md',
    )
    expect(pill.classes()).toContain('bg-primary/10')
    expect(pill.classes()).toContain('text-primary')
  })

  it('shows an em dash placeholder when there is no value in read mode', () => {
    const wrapper = mount(FieldModel, {
      props: {
        modelValue: '',
        readonly: true,
      },
    })

    expect(wrapper.find('[data-testid="model-field-pill"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('—')
  })

  it('resolves the value to a modelStore node and calls uiStore.focusModel on click', async () => {
    const modelStore = useModelStore()
    const uiStore = useUiStore()
    const projectRoot = makeNode('Root')
    const businessModelRoot = makeNode('models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN', {
      name: 'jose-luis-olmo-mora',
      source: { path: './models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN.md' },
    })
    modelStore.setGraph(
      {
        Root: projectRoot,
        'models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN': businessModelRoot,
      },
      ['Root', 'models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN'],
    )

    const wrapper = mount(FieldModel, {
      props: {
        modelValue: './models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN.md',
        readonly: true,
      },
    })

    await wrapper.find('[data-testid="model-field-pill"]').trigger('click')

    expect(uiStore.focusedModelId).toBe('models/proyectos/jose-luis-olmo-mora_V_0-1-0_business_NN')
    expect(uiStore.sidebarMode).toBe('focused_model')
  })

  it('falls back to focusModel with the cleaned raw value when no matching node is found', async () => {
    const uiStore = useUiStore()

    const wrapper = mount(FieldModel, {
      props: {
        modelValue: 'models/unknown.md',
        readonly: true,
      },
    })

    await wrapper.find('[data-testid="model-field-pill"]').trigger('click')

    expect(uiStore.focusedModelId).toBe('models/unknown.md')
    expect(uiStore.sidebarMode).toBe('focused_model')
  })

  it('renders an input in edit mode', () => {
    const wrapper = mount(FieldModel, {
      props: {
        modelValue: 'models/auth_01.md',
        readonly: false,
      },
    })

    expect(wrapper.find('[data-testid="model-field-pill"]').exists()).toBe(false)
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('models/auth_01.md')
  })

  it('shows an autocomplete dropdown of workspace models filtered by query', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        'models/auth_01': makeNode('models/auth_01', { source: { path: 'models/auth_01.md' } }),
        'models/billing_02': makeNode('models/billing_02', {
          source: { path: 'models/billing_02.md' },
        }),
      },
      ['models/auth_01', 'models/billing_02'],
    )

    const wrapper = mount(FieldModel, {
      props: {
        modelValue: '',
        readonly: false,
      },
    })

    const input = wrapper.find('input')
    await input.trigger('focus')

    let options = wrapper.findAll('.field-model-option')
    expect(options).toHaveLength(2)

    await input.setValue('auth')
    options = wrapper.findAll('.field-model-option')
    expect(options).toHaveLength(1)
    expect(options[0].text()).toContain('auth_01.md')
  })

  it('emits update:modelValue with the selected model path on suggestion click', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        'models/auth_01': makeNode('models/auth_01', { source: { path: 'models/auth_01.md' } }),
      },
      ['models/auth_01'],
    )

    const wrapper = mount(FieldModel, {
      props: {
        modelValue: '',
        readonly: false,
      },
    })

    await wrapper.find('input').trigger('focus')
    const option = wrapper.find('.field-model-option')
    await option.trigger('mousedown')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['models/auth_01.md'])
  })
})
