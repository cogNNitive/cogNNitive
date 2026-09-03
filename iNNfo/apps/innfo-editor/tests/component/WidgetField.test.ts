import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import WidgetField from '../../src/shared/widgets/WidgetField.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, fieldKey: string, value: unknown): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    storageMode: 'FILE',
    type: 'text',
    fields: {
      [fieldKey]: {
        value,
        provenance: {
          author: { kind: 'system', id: 'parser' },
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      },
    },
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
  }
}

describe('WidgetField: dispatches to ported widget or FallbackWidget (R15)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the correct ported widget for a known type ("text")', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', 'summary', 'Hello') }, ['Root'])

    const wrapper = mount(WidgetField, {
      props: { nodeId: 'Root', fieldKey: 'summary', widgetType: 'text' },
    })

    expect(wrapper.find('.text-widget').exists()).toBe(true)
    expect(wrapper.find('.fallback-widget').exists()).toBe(false)
  })

  it('renders FallbackWidget for an unrecognized widget type, not a crash or blank field', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', 'steps', 'Step 1') }, ['Root'])

    const wrapper = mount(WidgetField, {
      props: { nodeId: 'Root', fieldKey: 'steps', widgetType: 'steps' },
    })

    expect(wrapper.find('.fallback-widget').exists()).toBe(true)
    expect(wrapper.text()).toContain('Step 1')
  })

  it('records provenance on the field when the user commits an edit (R16)', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', 'summary', 'Hello') }, ['Root'])

    const wrapper = mount(WidgetField, {
      props: { nodeId: 'Root', fieldKey: 'summary', widgetType: 'text', authorId: 'lucas' },
    })

    await wrapper.get('input').setValue('Edited')

    const node = modelStore.getNode('Root')!
    expect(node.fields.summary.value).toBe('Edited')
    expect(node.fields.summary.provenance.author).toEqual({ kind: 'user', id: 'lucas' })
  })

  it('records no new provenance beyond parse-time state when the node is only loaded, not edited (R16)', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', 'summary', 'Hello') }, ['Root'])

    mount(WidgetField, {
      props: { nodeId: 'Root', fieldKey: 'summary', widgetType: 'text', authorId: 'lucas' },
    })

    const node = modelStore.getNode('Root')!
    expect(node.fields.summary.provenance.author).toEqual({ kind: 'system', id: 'parser' })
    expect(modelStore.isDirty('Root')).toBe(false)
  })
})
