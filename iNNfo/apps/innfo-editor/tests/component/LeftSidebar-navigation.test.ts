import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LeftSidebar from '../../src/components/layout/LeftSidebar.vue'
import { useModelStore } from '../../src/stores/modelStore'
import { useUiStore } from '../../src/stores/uiStore'
import type { ModelNode } from '../../src/model/types'

function makeModelRootNode(id: string, path: string): ModelNode {
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
    source: { path },
    rawContent: `---
title: "${id}"
status: "active"
---
# NN index
`,
  }
}

describe('LeftSidebar — Semantic Navigation & View Switcher (specs/sidebar-navigation)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders switcher buttons for editor, graph, and consoles exclusively', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        'workspace_01.md': makeModelRootNode('workspace_01.md', 'workspace_01.md'),
      },
      ['workspace_01.md'],
    )

    const wrapper = mount(LeftSidebar)

    // Verify semantic buttons exist
    expect(wrapper.find('[data-testid="view-switcher-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-switcher-graph"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-switcher-consoles"]').exists()).toBe(true)

    // Verify explorer switcher button is NOT rendered
    expect(wrapper.find('[data-testid="view-switcher-explorer"]').exists()).toBe(false)
  })

  it('clicking semantic view switcher buttons switches uiStore.activeView', async () => {
    const modelStore = useModelStore()
    const uiStore = useUiStore()
    modelStore.setGraph(
      {
        'workspace_01.md': makeModelRootNode('workspace_01.md', 'workspace_01.md'),
      },
      ['workspace_01.md'],
    )

    const wrapper = mount(LeftSidebar)

    expect(uiStore.activeView).toBe('editor')

    await wrapper.find('[data-testid="view-switcher-graph"]').trigger('click')
    expect(uiStore.activeView).toBe('graph')

    await wrapper.find('[data-testid="view-switcher-consoles"]').trigger('click')
    expect(uiStore.activeView).toBe('consoles')

    await wrapper.find('[data-testid="view-switcher-editor"]').trigger('click')
    expect(uiStore.activeView).toBe('editor')
  })

  it('renders semantic model header and tree nodes in editor view', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        'workspace_01.md': makeModelRootNode('workspace_01.md', 'workspace_01.md'),
      },
      ['workspace_01.md'],
    )

    const wrapper = mount(LeftSidebar)

    expect(wrapper.find('[data-testid="model-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="model-header-name"]').text()).toContain('workspace_01.md')
  })
})
