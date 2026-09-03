import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConceptTableView from '../../src/components/editor/ConceptTableView.vue'
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

describe('ConceptTableView.vue — Reactivity and element addition', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a new row to the table reactively when addElement is called', async () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      childIds: ['Root/ExistingItem'],
    })
    const existing = makeNode('Root/ExistingItem', {
      parentId: 'Root',
      name: 'ExistingItem',
      type: 'Problems',
      kind: 'element',
    })
    modelStore.setGraph({ Root: root, 'Root/ExistingItem': existing }, ['Root'])

    const wrapper = mount(ConceptTableView, {
      props: {
        nodeId: 'virtual:Root:Problems',
        conceptType: 'Problems',
        conceptFields: [],
      },
    })

    // Initially, there should be 1 row in the table body (excluding empty state)
    const rowsBefore = wrapper.findAll('tbody tr')
    expect(rowsBefore).toHaveLength(1)
    expect(wrapper.text()).toContain('ExistingItem')

    // Click the "+" add element button in the header
    const plusBtn = wrapper.find('[data-testid="add-element-btn"]')
    expect(plusBtn.exists()).toBe(true)
    await plusBtn.trigger('click')

    // The table should reactively update to show 2 rows now
    const rowsAfter = wrapper.findAll('tbody tr')
    expect(rowsAfter).toHaveLength(2)
    expect(wrapper.text()).toContain('New Problems')
  })

  it('adds element using concept name instead of concept type when they differ', async () => {
    const modelStore = useModelStore()
    const root = makeNode('model', {
      childIds: ['model/Item1'],
    })
    const existing = makeNode('model/Item1', {
      parentId: 'model',
      name: 'Item1',
      type: 'Concepto_Peso',
      kind: 'element',
    })
    modelStore.setGraph({ model: root, 'model/Item1': existing }, ['model'])

    const wrapper = mount(ConceptTableView, {
      props: {
        nodeId: 'virtual:model:Concepto_Peso',
        conceptType: 'weight',
        conceptFields: [],
      },
    })

    const rowsBefore = wrapper.findAll('tbody tr')
    expect(rowsBefore).toHaveLength(1)
    expect(wrapper.text()).toContain('Item1')

    const plusBtn = wrapper.find('[data-testid="add-element-btn"]')
    await plusBtn.trigger('click')

    const rowsAfter = wrapper.findAll('tbody tr')
    expect(rowsAfter).toHaveLength(2)
    expect(wrapper.text()).toContain('New Concepto_Peso')
  })

  it('triggers drag and drop reordering', async () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      childIds: ['Root/ItemA', 'Root/ItemB', 'Root/ItemC'],
    })
    const itemA = makeNode('Root/ItemA', { parentId: 'Root', name: 'ItemA', type: 'Problems', kind: 'element' })
    const itemB = makeNode('Root/ItemB', { parentId: 'Root', name: 'ItemB', type: 'Problems', kind: 'element' })
    const itemC = makeNode('Root/ItemC', { parentId: 'Root', name: 'ItemC', type: 'Problems', kind: 'element' })
    modelStore.setGraph({ Root: root, 'Root/ItemA': itemA, 'Root/ItemB': itemB, 'Root/ItemC': itemC }, ['Root'])

    const wrapper = mount(ConceptTableView, {
      props: {
        nodeId: 'virtual:Root:Problems',
        conceptType: 'Problems',
        conceptFields: [],
      },
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)

    // Simulate drag start on ItemC (index 2)
    const dragStartEvent = {
      dataTransfer: {
        effectAllowed: '',
        setData: () => {},
      },
    } as unknown as DragEvent
    
    // Call drop on ItemA (index 0)
    const dropEvent = {
      preventDefault: () => {},
    } as unknown as DragEvent

    // Trigger drag start and drop
    await rows[2].trigger('dragstart', dragStartEvent)
    await rows[0].trigger('drop', dropEvent)

    // Check store reordered children:
    expect(modelStore.nodes['Root'].childIds).toEqual(['Root/ItemC', 'Root/ItemA', 'Root/ItemB'])
  })

  it('opens FieldDetailModal on double click on a cell with a truncatable field type when not in edit mode', async () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      childIds: ['Root/ItemA'],
    })
    const itemA = makeNode('Root/ItemA', {
      parentId: 'Root',
      name: 'ItemA',
      type: 'Problems',
      kind: 'element',
      fields: {
        description: {
          value: 'This is a very long description that should be truncated in the table cell view.',
        },
      },
    })
    modelStore.setGraph({ Root: root, 'Root/ItemA': itemA }, ['Root'])

    const wrapper = mount(ConceptTableView, {
      props: {
        nodeId: 'virtual:Root:Problems',
        conceptType: 'Problems',
        conceptFields: [
          { name: 'description', type: 'string' }
        ],
      },
    })

    const cells = wrapper.findAll('tbody tr td')
    expect(cells).toHaveLength(3)

    const descriptionCell = cells[1]
    expect(descriptionCell.classes()).toContain('cursor-zoom-in')

    const modal = wrapper.findComponent({ name: 'FieldDetailModal' })
    expect(modal.exists()).toBe(true)
    expect(modal.props('isOpen')).toBe(false)

    await descriptionCell.trigger('dblclick')

    expect(modal.props('isOpen')).toBe(true)
    expect(modal.props('nodeId')).toBe('Root/ItemA')
    expect(modal.props('fieldKey')).toBe('description')
    expect(modal.props('fieldType')).toBe('string')
  })
})
