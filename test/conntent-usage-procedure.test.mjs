import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openSession } from './helpers/nn-mcp-session.mjs'

const usage = 'bluepriNNts/coNNtent/procedures/usage_procedures_NN.md'

test(
  'coNNtent usage declares the slots its engine commands fill',
  { timeout: 120_000 },
  async () => {
    const session = await openSession({ procedures: { 'usage_procedures_NN.md': usage } })
    try {
      // Scoped listing: bound to the server domain root, so no `domain` argument.
      const listing = await session.call('list_blueprint_procedures', {
        domain: undefined,
        path: '.',
      })
      assert.equal(listing.ok, true, JSON.stringify(listing))
      const [entry] = listing.procedures
      assert.equal(entry.id, 'usage')
      assert.deepEqual(entry.warnings, [])
      // `{episode}`, `{name}`, `{sample-audio}` and `{code}` are the placeholders the document's
      // engine commands carry. None is required at the document level: the six workflows use
      // different placeholders, so no single run parameter belongs to all of them.
      assert.deepEqual(
        entry.slots.map(({ name, kind, required }) => ({ name, kind, required })),
        ['episode', 'name', 'sample-audio', 'code'].map((name) => ({
          name,
          kind: 'value',
          required: false,
        })),
      )
    } finally {
      await session.close()
    }
  },
)
