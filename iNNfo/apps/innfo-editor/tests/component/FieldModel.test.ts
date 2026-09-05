import { describe, it, expect, beforeEach, vi } from 'vitest'
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

  describe('inline submodel creation', () => {
    it('renders the creation button in edit mode (!readonly)', () => {
      const wrapper = mount(FieldModel, {
        props: {
          modelValue: '',
          readonly: false,
        },
      })

      const btn = wrapper.find('[data-testid="create-submodel-button"]')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toContain('Create & bind new model')
    })

    it('renders target_template badge inside creation button when specified', () => {
      const wrapper = mount(FieldModel, {
        props: {
          modelValue: '',
          readonly: false,
          fieldDefinition: {
            name: 'business_model',
            type: 'model',
            target_template: 'business',
          },
        },
      })

      const btn = wrapper.find('[data-testid="create-submodel-button"]')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toContain('business')
    })

    it('does not render creation trigger in readonly mode', () => {
      const wrapper = mount(FieldModel, {
        props: {
          modelValue: '',
          readonly: true,
          fieldDefinition: {
            name: 'business_model',
            type: 'model',
            target_template: 'business',
          },
        },
      })

      expect(wrapper.find('[data-testid="create-submodel-button"]').exists()).toBe(false)
    })

    it('invokes window.prompt pre-filled with suggested path derived from parent model path and target_template', async () => {
      const modelStore = useModelStore()
      const rootNode = makeNode('models/Ghostbusters_V_0-2-0_innovation_NN.md', {
        kind: 'root',
        source: { path: 'models/Ghostbusters_V_0-2-0_innovation_NN.md' },
      })
      const elementNode = makeNode('models/Ghostbusters_V_0-2-0_innovation_NN.md/initiative_01', {
        name: 'Municipal Franchise Expansion',
        parentId: 'models/Ghostbusters_V_0-2-0_innovation_NN.md',
        kind: 'element',
      })
      modelStore.setGraph(
        {
          [rootNode.id]: rootNode,
          [elementNode.id]: elementNode,
        },
        [rootNode.id],
      )

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)

      const wrapper = mount(FieldModel, {
        props: {
          modelValue: '',
          readonly: false,
          nodeId: elementNode.id,
          fieldKey: 'business_model',
          fieldDefinition: {
            name: 'business_model',
            type: 'model',
            target_template: 'business',
          },
        },
      })

      await wrapper.find('[data-testid="create-submodel-button"]').trigger('click')

      expect(promptSpy).toHaveBeenCalledWith(
        expect.stringContaining('business'),
        'models/Ghostbusters_V_0-2-0_business_NN.md',
      )
      promptSpy.mockRestore()
    })

    it('confirms prompt: invokes scaffoldSubmodel, emits update:modelValue, and calls uiStore.focusModel', async () => {
      const modelStore = useModelStore()
      const uiStore = useUiStore()
      const rootNode = makeNode('models/Ghostbusters_V_0-2-0_innovation_NN.md', {
        kind: 'root',
        source: { path: 'models/Ghostbusters_V_0-2-0_innovation_NN.md' },
      })
      const elementNode = makeNode('models/Ghostbusters_V_0-2-0_innovation_NN.md/initiative_01', {
        name: 'Municipal Franchise Expansion',
        parentId: 'models/Ghostbusters_V_0-2-0_innovation_NN.md',
        kind: 'element',
      })
      modelStore.setGraph(
        {
          [rootNode.id]: rootNode,
          [elementNode.id]: elementNode,
        },
        [rootNode.id],
      )

      const promptSpy = vi
        .spyOn(window, 'prompt')
        .mockReturnValue('models/Ghostbusters_V_0-2-0_business_NN.md')
      const focusSpy = vi.spyOn(uiStore, 'focusModel')

      const wrapper = mount(FieldModel, {
        props: {
          modelValue: '',
          readonly: false,
          nodeId: elementNode.id,
          fieldKey: 'business_model',
          fieldDefinition: {
            name: 'business_model',
            type: 'model',
            target_template: 'business',
          },
        },
      })

      await wrapper.find('[data-testid="create-submodel-button"]').trigger('click')

      expect(modelStore.nodes['models/Ghostbusters_V_0-2-0_business_NN.md']).toBeDefined()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
        'models/Ghostbusters_V_0-2-0_business_NN.md',
      ])
      expect(focusSpy).toHaveBeenCalledWith('models/Ghostbusters_V_0-2-0_business_NN.md')

      promptSpy.mockRestore()
      focusSpy.mockRestore()
    })

    it('cancelling prompt aborts creation without emitting or focusing', async () => {
      const modelStore = useModelStore()
      const uiStore = useUiStore()
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)
      const focusSpy = vi.spyOn(uiStore, 'focusModel')

      const wrapper = mount(FieldModel, {
        props: {
          modelValue: '',
          readonly: false,
          fieldDefinition: {
            name: 'business_model',
            type: 'model',
            target_template: 'business',
          },
        },
      })

      await wrapper.find('[data-testid="create-submodel-button"]').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
      expect(focusSpy).not.toHaveBeenCalled()

      promptSpy.mockRestore()
      focusSpy.mockRestore()
    })
  })
})
