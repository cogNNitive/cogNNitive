import { describe, it, expect } from 'vitest'
import {
  serializeConsoleSlot,
  buildConsoleSchemaSlot,
  computeSha256,
} from '../src/index.js'

describe('Console Slot Serializer & Schema Slot Builder', () => {
  it('serializeConsoleSlot escapes < character without literal < in output', () => {
    const rawObject = {
      note: '</script><script>alert("xss")</script>',
      html: '<div>test</div>',
    }

    const serialized = serializeConsoleSlot(rawObject)
    expect(serialized).not.toContain('<')
    expect(serialized).toContain('\\u003c/script>\\u003cscript>alert(\\"xss\\")\\u003c/script>')
    expect(serialized).toContain('\\u003cdiv>test\\u003c/div>')
  })

  it('buildConsoleSchemaSlot creates canonical array shapes from schema or elements', () => {
    const mockSchema = {
      concepts: [{ name: 'Mission', label: 'Our Mission' }],
      fields: [{ concept: 'Mission', name: 'sources', type: 'citation' }],
      markers: [{ name: 'flag', label: 'Important' }],
      matrices: [{ name: 'mx1', source: 'A', target: 'B' }],
    }

    const slotFromSchema = buildConsoleSchemaSlot(mockSchema as any)
    expect(Array.isArray(slotFromSchema.concepts)).toBe(true)
    expect(Array.isArray(slotFromSchema.fields)).toBe(true)
    expect(Array.isArray(slotFromSchema.markers)).toBe(true)
    expect(Array.isArray(slotFromSchema.matrices)).toBe(true)
    expect(slotFromSchema.concepts[0].name).toBe('Mission')

    // When schema is omitted, concepts are derived from elements
    const elements = [
      {
        id: 'mission-1',
        concept: 'Mission',
        name: 'Mission 1',
        fields: {},
        markers: {},
        hash: '1234567890abcdef',
      },
      {
        id: 'service-1',
        concept: 'Service',
        name: 'Service 1',
        fields: {},
        markers: {},
        hash: 'abcdef1234567890',
      },
    ]

    const slotFromElements = buildConsoleSchemaSlot(undefined, elements)
    expect(slotFromElements.concepts).toEqual([
      { name: 'Mission' },
      { name: 'Service' },
    ])
    expect(slotFromElements.fields).toEqual([])
    expect(slotFromElements.markers).toEqual([])
    expect(slotFromElements.matrices).toEqual([])
  })

  it('computeSha256 produces identical 64-character hex hash matching standard crypto', () => {
    const input = 'Ghostbusters Level 3 Model Content'
    const hash = computeSha256(input)
    expect(hash).toBe('04efb1f8df1e4e1cd9adab176563424fecda1db3723a8282220da9b31f811297')
    expect(hash).toHaveLength(64)
  })

  it('buildConsoleSchemaSlot flattens concept field definitions into a flat fields array', () => {
    const schema = {
      concepts: [
        {
          name: 'Task',
          fields: [
            { name: 'status', type: 'select', options: ['todo', 'done'] },
            { name: 'depends_on', type: 'reference', target_concepts: ['Task', 'Milestone'] },
          ],
        },
        { name: 'Milestone', fields: [{ name: 'status', type: 'string' }] },
        { name: 'Bare' },
      ],
      markers: [],
      matrices: [],
      taxonomy: [],
    }

    const slot = buildConsoleSchemaSlot(schema as any)
    expect(slot.fields).toEqual([
      { concept: 'Task', name: 'status', type: 'select', options: ['todo', 'done'] },
      {
        concept: 'Task',
        name: 'depends_on',
        type: 'reference',
        target_concepts: ['Task', 'Milestone'],
      },
      { concept: 'Milestone', name: 'status', type: 'string' },
    ])
  })
})
