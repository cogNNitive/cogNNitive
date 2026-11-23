import { describe, it, expect } from 'vitest'
import { scaffoldBodyFromSchema } from './knowledge.js'

/** The executions shape: a distributed run root and an append-only event log. */
const schema = {
  concepts: [
    {
      name: 'Procedure Execution',
      type: 'list',
      storage: { mode: 'distributed' },
      fields: [{ name: 'def_rev', type: 'string' }],
    },
    {
      name: 'Execution Event',
      type: 'list',
      writePolicy: { policy: 'append-only' },
      fields: [{ name: 'kind', type: 'select', options: ['started', 'completed'] }],
    },
    { name: 'Note', type: 'list', fields: [{ name: 'body', type: 'string' }] },
  ],
  matrices: [],
}

describe('scaffoldBodyFromSchema and write policies', () => {
  const body = scaffoldBodyFromSchema(schema, {
    concept: 'Procedure Execution',
    slug: 'onboard-acme',
    name: 'Onboard ACME',
  })

  it('seeds no placeholder element in an append-only concept (it would be a fact nobody recorded)', () => {
    expect(body).toContain('# NN Execution Event')
    expect(body).not.toContain('## NN Execution Event:')
    expect(body).not.toContain('kind:: started')
  })

  it('seeds no placeholder element in a read-only concept', () => {
    const readOnly = scaffoldBodyFromSchema({
      concepts: [
        { name: 'Snapshot', type: 'list', writePolicy: { policy: 'read-only' } },
        { name: 'Note', type: 'list' },
      ],
      matrices: [],
    })
    expect(readOnly).toContain('# NN Snapshot')
    expect(readOnly).not.toContain('## NN Snapshot:')
  })

  it('seeds only the root element in an instance model, not placeholders of other mutable concepts', () => {
    expect(body).toContain('## NN Procedure Execution: Onboard ACME')
    expect(body).not.toContain('## NN Note: Example Note')
    expect(body).not.toContain('body:: <string>')
  })
})
