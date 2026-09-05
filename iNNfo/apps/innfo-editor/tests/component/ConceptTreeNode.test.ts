import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import ConceptTreeNode from '../../src/components/layout/ConceptTreeNode.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    storageMode: 'FILE' as const,
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  }
}

describe('ConceptTreeNode.vue — Instance counter (R-TN-02)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows instance count badge when node has children', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          kind: 'concept',
          childIds: ['Root/Child1', 'Root/Child2', 'Root/Child3'],
        }),
        'Root/Child1': makeNode('Root/Child1', { parentId: 'Root', kind: 'element' }),
        'Root/Child2': makeNode('Root/Child2', { parentId: 'Root', kind: 'element' }),
        'Root/Child3': makeNode('Root/Child3', { parentId: 'Root', kind: 'element' }),
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
      attachTo: document.body,
    })

    // Should show "3" in a counter badge
    expect(wrapper.text()).toContain('3')
  })

  it('does not show counter badge when node has no children', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', { kind: 'concept', childIds: [] }),
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
    })

    // Should NOT show a "0" counter badge
    expect(wrapper.text()).not.toContain('0')
  })
})

describe('ConceptTreeNode.vue — Ghost appearance (R-TN-04)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applies opacity 0.45 on row when node is empty (no content, no fields, no children)', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', { kind: 'concept', childIds: [], rawContent: '' }),
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
      attachTo: document.body,
    })

    // The row style (with opacity) is on the inner flex div, not the root .select-none div
    const row = wrapper.find('.flex.items-center')
    expect((row.element as HTMLElement).style.opacity).toBe('0.45')
  })

  it('does NOT apply reduced opacity when node has children', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', { kind: 'concept', childIds: ['Root/Child1'] }),
        'Root/Child1': makeNode('Root/Child1', { parentId: 'Root', kind: 'element' }),
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
    })

    const row = wrapper.find('.flex.items-center')
    expect((row.element as HTMLElement).style.opacity).not.toBe('0.45')
  })

  it('does NOT apply reduced opacity when node has fallback description in rawSections', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          kind: 'element',
          childIds: [],
          rawContent: '',
          rawSections: { description: 'This is a description' },
        }),
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
    })

    const row = wrapper.find('.flex.items-center')
    expect((row.element as HTMLElement).style.opacity).not.toBe('0.45')
  })
})

describe('ConceptTreeNode.vue — BlockPill integration (R-TN-01)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the BlockPill component inside the tree row', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', { kind: 'concept', childIds: [] }),
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
    })

    // BlockPill should be rendered within the tree row
    expect(wrapper.findComponent({ name: 'Pill' }).exists()).toBe(true)
  })

  it('passes the node name to BlockPill', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: { ...makeNode('Root', { kind: 'concept', childIds: [] }), name: 'MyConcept' },
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
    })

    expect(wrapper.text()).toContain('MyConcept')
  })

  it('shows "Empty" label via BlockPill for empty nodes', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', { kind: 'concept', childIds: [], rawContent: '' }),
      },
      ['Root'],
    )

    const wrapper = mount(ConceptTreeNode, {
      props: {
        nodeId: 'Root',
        selectedId: null,
      },
      attachTo: document.body,
    })

    expect(wrapper.text()).toContain('Empty')
  })
})

describe('ConceptTreeNode.vue — Diamond child renders once (R8)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /**
   * Mounts two sibling ConceptTreeNode subtrees inside labeled containers,
   * simulating the sidebar rendering two parents that both reference the
   * same diamond child via `childIds` (PR1's diamond-vs-cycle fix allows
   * this — the child keeps a single primary `parentId`).
   */
  function mountTwoTrees(rootAId: string, rootBId: string) {
    const TwoTrees = defineComponent({
      components: { ConceptTreeNode },
      template: `
        <div>
          <div data-testid="tree-a"><ConceptTreeNode :node-id="'${rootAId}'" :selected-id="null" /></div>
          <div data-testid="tree-b"><ConceptTreeNode :node-id="'${rootBId}'" :selected-id="null" /></div>
        </div>
      `,
    })
    return mount(TwoTrees, { attachTo: document.body })
  }

  it('renders a diamond child only under its primary parent (ParentA), not under both', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        ParentA: makeNode('ParentA', { kind: 'concept', childIds: ['Diamond'] }),
        ParentB: makeNode('ParentB', { kind: 'concept', childIds: ['Diamond'] }),
        Diamond: makeNode('Diamond', {
          parentId: 'ParentA',
          kind: 'element',
          name: 'DiamondChild',
        }),
      },
      ['ParentA', 'ParentB'],
    )

    const wrapper = mountTwoTrees('ParentA', 'ParentB')

    const treeA = wrapper.find('[data-testid="tree-a"]')
    const treeB = wrapper.find('[data-testid="tree-b"]')

    expect(treeA.text()).toContain('DiamondChild')
    expect(treeB.text()).not.toContain('DiamondChild')
  })

  it('renders a diamond child only under its primary parent (ParentB) — triangulation with the opposite primary parent', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        ParentA: makeNode('ParentA', { kind: 'concept', childIds: ['Diamond'] }),
        ParentB: makeNode('ParentB', { kind: 'concept', childIds: ['Diamond'] }),
        Diamond: makeNode('Diamond', {
          parentId: 'ParentB',
          kind: 'element',
          name: 'DiamondChild',
        }),
      },
      ['ParentA', 'ParentB'],
    )

    const wrapper = mountTwoTrees('ParentA', 'ParentB')

    const treeA = wrapper.find('[data-testid="tree-a"]')
    const treeB = wrapper.find('[data-testid="tree-b"]')

    expect(treeB.text()).toContain('DiamondChild')
    expect(treeA.text()).not.toContain('DiamondChild')
  })
})
