import { describe, it, expect } from 'vitest'
import { generatePromptForBlock } from '../../src/utils/promptGenerator'
import type { ModelNode, MetamodelConcept } from '../../src/model/types'

describe('promptGenerator', () => {
  const sampleBlock = {
    id: 'block-1',
    name: 'User Authentication',
    parentId: null,
    childIds: [],
    type: 'Feature',
    fields: {
      description: { value: 'Handles OAuth2 and JWT session lifecycle', editAttribution: { author: { kind: 'user', id: 'u1' }, timestamp: '2026-09-12' } },
      provider: { value: 'Google', editAttribution: { author: { kind: 'user', id: 'u1' }, timestamp: '2026-09-12' } },
      sessionDuration: { value: '7d', editAttribution: { author: { kind: 'user', id: 'u1' }, timestamp: '2026-09-12' } },
    },
    markers: {},
  } as unknown as ModelNode

  const sampleSchema: MetamodelConcept = {
    name: 'Feature',
    type: 'Feature',
    fields: [],
  }

  it('generates an implementation prompt with block context and fields', () => {
    const prompt = generatePromptForBlock({
      block: sampleBlock,
      schema: sampleSchema,
      modelName: 'Security Architecture',
      rawContent: '## NN Feature: User Authentication\n- provider: Google\n- sessionDuration: 7d\n',
      taskType: 'implement',
    })

    expect(prompt).toContain('# Context: iNNfo Model [Security Architecture]')
    expect(prompt).toContain('## Target Block: User Authentication (Feature)')
    expect(prompt).toContain('Handles OAuth2 and JWT session lifecycle')
    expect(prompt).toContain('provider: Google')
    expect(prompt).toContain('Please implement the logic')
    expect(prompt).toContain('## NN Feature: User Authentication')
  })

  it('supports custom instructions and task types', () => {
    const prompt = generatePromptForBlock({
      block: sampleBlock,
      taskType: 'refactor',
      customInstructions: 'Ensure backwards compatibility with v1 clients',
    })

    expect(prompt).toContain('Analyze and refactor this Feature')
    expect(prompt).toContain('Ensure backwards compatibility with v1 clients')
  })
})
