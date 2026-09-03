import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Header from '../../src/components/layout/Header.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'
import pkg from '../../package.json'

function makeNode(id: string, fields: Record<string, any>): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'document',
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        {
          value,
          provenance: {
            author: { kind: 'system', id: 'parser' },
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        },
      ]),
    ),
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: 'path/to/model.md' },
  }
}

describe('Header.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders iNNfo Modeler title and version badge', () => {
    const wrapper = mount(Header)
    const text = wrapper.text()

    expect(text).toContain('iNNfo Modeler')
    const versionBadge = wrapper.find('[data-testid="header-version-badge"]')
    expect(versionBadge.exists()).toBe(true)
    expect(versionBadge.text()).toContain(`v${pkg.version}`)
  })

  it('does not render Spec, Template, Model pills in header directly', () => {
    const modelStore = useModelStore()
    modelStore.rootIds = ['Root']
    modelStore.nodes = {
      Root: makeNode('Root', {
        spec_version: 'V_0-1-9',
        template_name: 'CustomTemplate',
        template_version: 'V_2-0-0',
        model_version: 'V_1-2-3',
      }),
    }

    const wrapper = mount(Header)
    const text = wrapper.text()

    // Spec, Template, Model pills are moved to ModelInfoPanel
    expect(text).not.toContain('iNNfo_V_0-1-9_NN.md')
    expect(text).not.toContain('CustomTemplate_V_2-0-0')
    const infoButton = wrapper.find('[data-testid="header-info-button"]')
    expect(infoButton.exists()).toBe(true)
  })

  it('triggers 5-second blinking animation on validation icon when warnings or errors exist', () => {
    const modelStore = useModelStore()
    modelStore.rootIds = ['Root']
    modelStore.nodes = {
      Root: makeNode('Root', {}),
    }
    modelStore.validationReport = {
      checks: [],
      summary: { total: 1, passed: 0, errors: 1, warnings: 0 },
    }

    const wrapper = mount(Header)
    const valButton = wrapper.find('button[title*="Model is incorrect"]')
    expect(valButton.exists()).toBe(true)
    expect(valButton.classes()).toContain('animate-header-blink')
  })
})
