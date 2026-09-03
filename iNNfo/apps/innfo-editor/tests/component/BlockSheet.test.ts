import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BlockSheet from '../../src/components/editor/BlockSheet.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  }
}

describe('BlockSheet.vue — Redesigned layout & assets', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Header and Layout', () => {
    it('renders element title with concept name and element name without tabs', async () => {
      const modelStore = useModelStore()
      const root = makeNode('Root', { rawContent: '---\nspec_version: V_0-1-5\n---\n' })
      const element = makeNode('Root/Task1', {
        name: 'Task1',
        parentId: 'Root',
        type: 'Task',
      })
      modelStore.setGraph({ Root: root, 'Root/Task1': element }, ['Root'])

      const wrapper = mount(BlockSheet, {
        props: {
          block: { id: 'Root/Task1', name: 'Task1', description: 'Sample description' },
          kind: 'instance',
          conceptType: 'Task',
          conceptName: 'Task',
          collapsed: false,
          isEditing: false,
        },
      })

      expect(wrapper.text()).toContain('Task')
      expect(wrapper.text()).toContain('Task1')
      expect(wrapper.text()).toContain('Sample description')
      // Ensure tab buttons are removed
      expect(wrapper.find('button[class*="border-b-2"]').exists()).toBe(false)
    })

    it('renders unified connections section when node has relationships', async () => {
      const modelStore = useModelStore()
      const root = makeNode('Root', { rawContent: '---\nspec_version: V_0-1-5\n---\n' })
      const element = makeNode('Root/Task1', {
        name: 'Task1',
        parentId: 'Root',
        type: 'Task',
        relationships: [{ label: 'depends_on', targetId: 'Root/Task2' }],
      })
      modelStore.setGraph({ Root: root, 'Root/Task1': element }, ['Root'])

      const wrapper = mount(BlockSheet, {
        props: {
          block: { id: 'Root/Task1', name: 'Task1', description: '' },
          kind: 'instance',
          conceptType: 'Task',
          conceptName: 'Task',
          collapsed: false,
          isEditing: false,
        },
      })

      expect(wrapper.text()).toContain('Connections & Relationships')
      expect(wrapper.text()).toContain('depends_on')
      expect(wrapper.text()).toContain('Task2')
    })
  })

  describe('Fields Schema (concept layout)', () => {
    it('renders field metadata (type badge, options, targets) in the Fields Schema section', async () => {
      const modelStore = useModelStore()
      const root = makeNode('Root', { rawContent: '---\nspec_version: V_0-1-5\n---\n' })
      modelStore.setGraph({ Root: root }, ['Root'])

      const wrapper = mount(BlockSheet, {
        props: {
          block: { id: '', name: 'Topic', description: '' },
          kind: 'concept',
          conceptType: 'topic',
          conceptName: 'Topic',
          conceptFields: [
            { name: 'status', type: 'select', options: ['active', 'inactive'] },
            { name: 'owner', type: 'reference', target_concepts: ['Persona'] },
          ],
          collapsed: false,
          isEditing: false,
        },
      })

      expect(wrapper.text()).toContain('Fields Schema')
      expect(wrapper.find('[data-testid="field-schema-view"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-testid="field-type-badge"]')).toHaveLength(2)
      expect(wrapper.text()).toContain('active')
      expect(wrapper.text()).toContain('inactive')
      expect(wrapper.text()).toContain('Persona')
    })

    it('shows "No fields defined" when the concept declares no fields', async () => {
      const modelStore = useModelStore()
      const root = makeNode('Root', { rawContent: '---\nspec_version: V_0-1-5\n---\n' })
      modelStore.setGraph({ Root: root }, ['Root'])

      const wrapper = mount(BlockSheet, {
        props: {
          block: { id: '', name: 'Topic', description: '' },
          kind: 'concept',
          conceptType: 'topic',
          conceptName: 'Topic',
          conceptFields: [],
          collapsed: false,
          isEditing: false,
        },
      })

      expect(wrapper.text()).toContain('Fields Schema')
      expect(wrapper.text()).toContain('No fields defined')
    })
  })

  describe('assetItems (Media & Attachments)', () => {
    it('renders declared node.assets as attachment items in NodeMedia', async () => {
      const modelStore = useModelStore()
      const root = makeNode('Root', { rawContent: '---\nspec_version: V_0-1-5\n---\n' })
      const element = makeNode('Root/Task1', {
        parentId: 'Root',
        type: 'Task',
        assets: ['docs/report.pdf'],
      })
      modelStore.setGraph({ Root: root, 'Root/Task1': element }, ['Root'])

      const wrapper = mount(BlockSheet, {
        props: {
          block: { id: 'Root/Task1', name: 'Task1', description: '' },
          kind: 'instance',
          conceptType: 'Task',
          conceptName: 'Task',
          collapsed: false,
          isEditing: false,
        },
      })

      await flushPromises()

      const mediaSection = wrapper.find('[data-testid="node-media"]')
      expect(mediaSection.exists()).toBe(true)
      expect(mediaSection.text()).toContain('report.pdf')
    })

    it('shows the empty-state message when the node has no assets', async () => {
      const modelStore = useModelStore()
      const root = makeNode('Root', { rawContent: '---\nspec_version: V_0-1-5\n---\n' })
      const element = makeNode('Root/Task2', { parentId: 'Root', type: 'Task' })
      modelStore.setGraph({ Root: root, 'Root/Task2': element }, ['Root'])

      const wrapper = mount(BlockSheet, {
        props: {
          block: { id: 'Root/Task2', name: 'Task2', description: '' },
          kind: 'instance',
          conceptType: 'Task',
          conceptName: 'Task',
          collapsed: false,
          isEditing: false,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('No media or attachments.')
    })
  })

  describe('Inherited Concepts (OpenCode Prompt Helper)', () => {
    it('renders the warning banner and the OpenCode prompt copy box when editing an inherited concept', async () => {
      const modelStore = useModelStore()

      // Setup mock root node with a parent_spec
      const root = makeNode('Root', {
        rawContent: '---\nspec_version: V_0-1-5\nparent_spec:\n  name: "business_V_0-1-1"\n  url: "https://example.com/spec"\n---\n',
      })

      // Setup mock spec node
      const specTemplate = makeNode('spec:business_V_0-1-1', {
        rawContent: '# Business Template\nThis is the template content.',
        source: { path: 'specs/business_V_0-1-1_NN.md' },
      })

      // Setup concept node under Root
      const conceptNode = makeNode('Root/MyConcept', {
        name: 'MyConcept',
        parentId: 'Root',
        type: 'MyConcept',
      })

      modelStore.setGraph({
        Root: root,
        'spec:business_V_0-1-1': specTemplate,
        'Root/MyConcept': conceptNode,
      }, ['Root', 'spec:business_V_0-1-1'])

      const wrapper = mount(BlockSheet, {
        props: {
          block: { id: 'Root/MyConcept', name: 'MyConcept', description: '' },
          kind: 'concept',
          conceptType: 'MyConcept',
          conceptName: 'MyConcept',
          collapsed: false,
          isEditing: true,
        },
      })

      // Verificar que se muestre la advertencia
      expect(wrapper.text()).toContain('These fields are inherited from the template')

      // Verificar que se renderice la caja del prompt para OpenCode
      expect(wrapper.text()).toContain('OpenCode Prompt (AI Editor)')
      expect(wrapper.text()).toContain('business_V_0-1-1_NN.md')

      // Buscar el textarea y verificar que tenga el prompt generado
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
      expect(textarea.element.value).toContain('I need to edit the concept "MyConcept"')
      expect(textarea.element.value).toContain('business_V_0-1-1_NN.md')
      expect(textarea.element.value).toContain('specs/business_V_0-1-1_NN.md')
      expect(textarea.element.value).toContain('Root')
    })
  })
})
