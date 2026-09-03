import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LeftSidebar from '../../src/components/layout/LeftSidebar.vue'
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
    source: { path: 'model.md' },
    ...overrides,
  }
}

describe('LeftSidebar — Concept and element ordering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('orders concepts according to template concepts order', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        'model.md': makeNode('model.md', {
          source: { path: 'model.md' },
          rawContent: `---
title: Business Model
---
# _NN index
* [[Analysis]]
* [[Market]]
`,
          localMetamodel: {
            concepts: [
              { name: 'Business summary', type: 'text' },
              { name: 'Market', type: 'category' },
              { name: 'Analysis', type: 'category' },
            ],
            markers: [],
          },
        }),
      },
      ['model.md'],
    )

    const wrapper = mount(LeftSidebar, {
      attachTo: document.body,
    })

    const groupText = wrapper.text()
    // Business summary (index 0 in template) should appear before Market (index 1) and Analysis (index 2)
    const idxSummary = groupText.indexOf('Business summary')
    const idxMarket = groupText.indexOf('Market')
    const idxAnalysis = groupText.indexOf('Analysis')

    expect(idxSummary).toBeGreaterThan(-1)
    expect(idxMarket).toBeGreaterThan(-1)
    expect(idxAnalysis).toBeGreaterThan(-1)

    expect(idxSummary).toBeLessThan(idxAnalysis)
    expect(idxMarket).toBeLessThan(idxAnalysis)
  })

  it('orders direct elements by document childIds order', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        'model.md': makeNode('model.md', {
          source: { path: 'model.md' },
          childIds: ['elem2', 'elem1'],
          localMetamodel: {
            concepts: [{ name: 'Profiles', type: 'weight' }],
            markers: [],
          },
        }),
        elem1: makeNode('elem1', {
          name: 'First in doc',
          parentId: 'model.md',
          type: 'Profiles',
          kind: 'element',
          source: { path: 'model.md' },
        }),
        elem2: makeNode('elem2', {
          name: 'Zeroth in doc',
          parentId: 'model.md',
          type: 'Profiles',
          kind: 'element',
          source: { path: 'model.md' },
        }),
      },
      ['model.md'],
    )

    const wrapper = mount(LeftSidebar, {
      attachTo: document.body,
    })

    const expandAllBtn = wrapper.find('[data-testid="expand-all"]')
    await expandAllBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    const idxZeroth = text.indexOf('Zeroth in doc')
    const idxFirst = text.indexOf('First in doc')

    expect(idxZeroth).toBeGreaterThan(-1)
    expect(idxFirst).toBeGreaterThan(-1)
    expect(idxZeroth).toBeLessThan(idxFirst)
  })

  it('does not repeat root concepts when taxonomy edges contain duplicates', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        'model.md': makeNode('model.md', {
          source: { path: 'model.md' },
          localMetamodel: {
            concepts: [
              { name: 'Organization', type: 'category' },
              { name: 'Project', type: 'category' },
            ],
            markers: [],
            taxonomy: [
              { parent: '', child: 'Organization' },
              { parent: '', child: 'Organization' },
              { parent: '', child: 'Organization' },
              { parent: '', child: 'Project' },
              { parent: '', child: 'Project' },
            ],
          },
        }),
      },
      ['model.md'],
    )

    const wrapper = mount(LeftSidebar, {
      attachTo: document.body,
    })

    const virtualNodes = wrapper.findAll('[data-testid="virtual-group-node"]')
    expect(virtualNodes).toHaveLength(2)
  })
})
