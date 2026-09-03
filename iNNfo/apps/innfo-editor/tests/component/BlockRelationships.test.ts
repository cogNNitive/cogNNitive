import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockRelationships from '../../src/components/editor/BlockRelationships.vue'
import type { ModelRelationship } from '../../src/model/types'

describe('BlockRelationships.vue — R-SC-03', () => {
  const rels: ModelRelationship[] = [
    { targetId: 'Task/Review', label: 'depends_on', value: 'high' },
    { targetId: 'Task/Approve', label: 'blocks', value: 'critical' },
    { targetId: 'Note/Comment', label: 'references' },
  ]

  it('renders relationship rows with label, target, and value', () => {
    const wrapper = mount(BlockRelationships, {
      props: {
        relationships: rels,
        onNavigate: () => {},
      },
    })

    const text = wrapper.text()
    expect(text).toContain('depends_on')
    expect(text).toContain('Task/Review')
    expect(text).toContain('high')
    expect(text).toContain('blocks')
    expect(text).toContain('Task/Approve')
    expect(text).toContain('critical')
  })

  it('renders relationship without value when value is absent', () => {
    const wrapper = mount(BlockRelationships, {
      props: {
        relationships: rels,
        onNavigate: () => {},
      },
    })

    expect(wrapper.text()).toContain('Note/Comment')
    expect(wrapper.text()).toContain('references')
  })

  it('emits navigate when a target link is clicked', async () => {
    const navigated: string[] = []
    const wrapper = mount(BlockRelationships, {
      props: {
        relationships: rels,
        onNavigate: (targetId: string) => {
          navigated.push(targetId)
        },
      },
    })

    await wrapper.findAll('button')[0].trigger('click')
    expect(navigated).toEqual(['Task/Review'])
  })

  it('shows empty state italic text when relationships array is empty', () => {
    const wrapper = mount(BlockRelationships, {
      props: {
        relationships: [],
        onNavigate: () => {},
      },
    })

    expect(wrapper.text()).toContain('No relationships defined.')
  })
})
