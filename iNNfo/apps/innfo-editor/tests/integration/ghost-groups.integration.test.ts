import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LeftSidebar from '../../src/components/layout/LeftSidebar.vue'
import { useModelStore } from '../../src/stores/modelStore'
import { useMetamodelStore } from '../../src/stores/metamodelStore'
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

describe('Ghost groups — Add action integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('modelStore.addConceptElement creates a child element and reduces ghost count', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          childIds: [],
          localMetamodel: {
            concepts: [
              { name: 'Task', type: 'list' },
              { name: 'Note', type: 'text' },
            ],
            markers: [],
          },
        }),
      },
      ['Root'],
    )

    const metamodelStore = useMetamodelStore()
    expect(metamodelStore.ghostConcepts).toHaveLength(2)

    // Add an element of type Task
    const newId = modelStore.addConceptElement('Task', 'My first task')
    expect(newId).toBe('Root/My first task')

    // Verify element was created
    const newNode = modelStore.getNode(newId)
    expect(newNode).toBeDefined()
    expect(newNode!.type).toBe('Task')
    expect(newNode!.kind).toBe('element')
    expect(newNode!.parentId).toBe('Root')

    // Ghost concepts should now exclude Task
    expect(metamodelStore.ghostConcepts).toHaveLength(1)
    expect(metamodelStore.ghostConcepts[0].name).toBe('Note')
  })

  it('addConceptElement throws when no root exists', () => {
    const modelStore = useModelStore()
    expect(() => modelStore.addConceptElement('Task', 'My Task')).toThrow('No root node')
  })

  it('clicking a ghost group header in LeftSidebar selects virtual concept ID without creating element', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          childIds: [],
          localMetamodel: {
            concepts: [{ name: 'Task', type: 'list' }],
            markers: [],
          },
        }),
      },
      ['Root'],
    )

    const metamodelStore = useMetamodelStore()

    expect(metamodelStore.ghostConcepts).toHaveLength(1)

    const wrapper = mount(LeftSidebar, {
      attachTo: document.body,
    })

    // Find and click the ghost group header
    const ghostHeader = wrapper.find('[data-testid="ghost-group-header"]')
    expect(ghostHeader.exists()).toBe(true)
    await ghostHeader.trigger('click')

    // It should NOT create elements immediately, so ghost count remains 1
    expect(metamodelStore.ghostConcepts).toHaveLength(1)

    // The select-node event should be emitted by LeftSidebar with the virtual concept node ID
    expect(wrapper.emitted('select-node')).toBeTruthy()
    expect(wrapper.emitted('select-node')![0]).toEqual(['virtual:Root:Task'])
  })
})
