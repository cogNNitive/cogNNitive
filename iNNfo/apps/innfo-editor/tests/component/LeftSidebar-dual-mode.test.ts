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

describe('LeftSidebar — Dual Mode Navigation (R-DMS-01)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders Workspace Mode by default and displays overview metrics', () => {
    const modelStore = useModelStore()
    const uiStore = useUiStore()
    modelStore.setGraph(
      {
        'workspace_01.md': makeModelRootNode('workspace_01.md', 'workspace_01.md'),
        'auth_01.md': makeModelRootNode('auth_01.md', 'models/auth_01.md'),
      },
      ['workspace_01.md', 'auth_01.md'],
    )

    expect(uiStore.sidebarMode).toBe('workspace')

    const wrapper = mount(LeftSidebar, {
      attachTo: document.body,
    })

    const overviewPanel = wrapper.find('[data-testid="workspace-overview-panel"]')
    expect(overviewPanel.exists()).toBe(true)
    expect(overviewPanel.text()).toContain('Workspace Mode')
    expect(overviewPanel.text()).toContain('2 Models')
  })

  it('renders Focused Model Mode with top breadcrumb banner when a model is focused', async () => {
    const modelStore = useModelStore()
    const uiStore = useUiStore()
    modelStore.setGraph(
      {
        'workspace_01.md': makeModelRootNode('workspace_01.md', 'workspace_01.md'),
        'auth_01.md': makeModelRootNode('auth_01.md', 'models/auth_01.md'),
      },
      ['workspace_01.md', 'auth_01.md'],
    )

    uiStore.focusModel('auth_01.md')
    expect(uiStore.sidebarMode).toBe('focused_model')

    const wrapper = mount(LeftSidebar, {
      attachTo: document.body,
    })

    const breadcrumb = wrapper.find('[data-testid="breadcrumb-back-workspace"]')
    expect(breadcrumb.exists()).toBe(true)
    expect(breadcrumb.text()).toContain('Back to Workspace Overview')

    // Click breadcrumb back button
    await breadcrumb.trigger('click')
    expect(uiStore.sidebarMode).toBe('workspace')
  })
})
