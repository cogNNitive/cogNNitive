import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LeftSidebar from '../../src/components/layout/LeftSidebar.vue'
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
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  }
}

describe.skip('LeftSidebar — selected matrix details (moved from the central panel)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows description, source → target and value distribution for the selected matrix', () => {
    const modelStore = useModelStore()
    const uiStore = useUiStore()

    const root = makeNode('Root', {
      kind: 'root',
      fields: {
        __matrix_defs: {
          value: [
            {
              name: 'M1',
              source: 'Src',
              target: 'Tgt',
              widgetType: 'set',
              params: '',
              values: ['Max', 'High'],
              description: 'Sidebar matrix explanation.',
            },
          ],
        },
        'M1||Src0||Tgt0': { value: 'Max' },
        'M1||Src1||Tgt0': { value: 'High' },
      },
    })
    const specRoot = makeNode('spec:business', {
      kind: 'root',
      localMetamodel: {
        concepts: [
          { name: 'Src', icon: 'users', type: 'weight', color: 'blue' },
          { name: 'Tgt', icon: 'heart', type: 'weight', color: 'red' },
        ],
        markers: [],
      },
    })

    modelStore.setGraph({ Root: root, 'spec:business': specRoot }, ['Root', 'spec:business'])

    uiStore.setActiveView('matrices')
    uiStore.setActiveMatrixIndex(0)

    const wrapper = mount(LeftSidebar, { attachTo: document.body })

    expect(wrapper.find('[data-testid="selected-matrix-description"]').text()).toContain(
      'Sidebar matrix explanation.',
    )
    expect(wrapper.text()).toContain('Src')
    expect(wrapper.text()).toContain('Tgt')
    expect(wrapper.text()).toContain('Max: 1')
    expect(wrapper.text()).toContain('High: 1')
    wrapper.unmount()
  })

  it('does not render the details block outside the matrices view', () => {
    const modelStore = useModelStore()
    const uiStore = useUiStore()
    const root = makeNode('Root', {
      kind: 'root',
      fields: {
        __matrix_defs: {
          value: [
            {
              name: 'M1',
              source: 'Src',
              target: 'Tgt',
              widgetType: 'boolean',
              params: '',
              description: 'Only visible on the matrices view.',
            },
          ],
        },
      },
    })
    modelStore.setGraph({ Root: root }, ['Root'])

    uiStore.setActiveView('editor')
    uiStore.setActiveMatrixIndex(0)

    const wrapper = mount(LeftSidebar, { attachTo: document.body })
    expect(wrapper.find('[data-testid="selected-matrix-description"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
