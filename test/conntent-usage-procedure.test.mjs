import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { openSession } from './helpers/nn-mcp-session.mjs'

const usage = 'bluepriNNts/coNNtent/procedures/usage_procedures_NN.md'

test(
  'coNNtent usage declares the one slot its engine commands fill',
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
      // `{episode}` is the only value a run knows before it starts: Produce an Episode's
      // engine commands carry it. It is not required at the document level, because the other
      // five workflows never use it. Voice names, samples and languages are chosen inside the
      // run, once per language, so they are never run parameters.
      assert.deepEqual(
        entry.slots.map(({ name, kind, required }) => ({ name, kind, required })),
        [{ name: 'episode', kind: 'value', required: false }],
      )
    } finally {
      await session.close()
    }
  },
)

/** The six workflows the document's guidance names, as top-level containers. */
const workflows = {
  'set-up-the-domain': 'Set up the Domain',
  'define-a-frame': 'Define a Frame',
  'define-a-character': 'Define a Character',
  'create-a-series': 'Create a Series',
  'plan-an-episode': 'Plan an Episode',
  'produce-an-episode': 'Produce an Episode',
}

test(
  'coNNtent usage starts each of its six workflows on its own',
  { timeout: 180_000 },
  async () => {
    const session = await openSession({ procedures: { 'usage_procedures_NN.md': usage } })
    try {
      // The whole document holds six procedures, so it has no single start.
      const whole = await session.call('procedure_start', { procedure: 'usage' })
      assert.equal(whole.ok, false, JSON.stringify(whole))
      assert.equal(whole.code, 'PROCEDURE_NOT_RUNNABLE')
      assert.ok(whole.diagnostics.some((d) => d.code === 'MULTIPLE_STARTS'))

      // Only Produce an Episode runs on an episode the person names before it starts.
      const missing = await session.call('procedure_start', {
        procedure: 'usage@produce-an-episode',
      })
      assert.equal(missing.code, 'MISSING_REQUIRED_SLOT', JSON.stringify(missing))
      assert.deepEqual(missing.missing, ['episode'])

      const stepsOf = {}
      for (const slug of Object.keys(workflows)) {
        const params = slug === 'produce-an-episode' ? { episode: 'series/s1/episodes/e1' } : {}
        const started = await session.call('procedure_start', {
          procedure: `usage@${slug}`,
          params,
        })
        assert.equal(started.ok, true, `${slug}: ${JSON.stringify(started)}`)
        assert.match(started.run, new RegExp(`^usage-${slug}-`))
        const state = await session.call('procedure_state', { run: started.run })
        assert.equal(state.ok, true, `${slug}: ${JSON.stringify(state)}`)
        stepsOf[slug] = Object.keys(state.state.steps)
        assert.ok(stepsOf[slug].length > 1, `${slug} has no steps of its own`)
      }
      // A run holds its own workflow only: no step of a sibling leaks into it.
      const seen = new Map()
      for (const [slug, steps] of Object.entries(stepsOf))
        for (const step of steps) {
          assert.equal(seen.get(step) ?? slug, slug, `${step} is in ${seen.get(step)} and ${slug}`)
          seen.set(step, slug)
        }
    } finally {
      await session.close()
    }
  },
)

test('coNNtent usage guidance is readable UTF-8', async () => {
  const text = await readFile(new URL(`../iNNfo/specs/${usage}`, import.meta.url), 'utf8')
  // A double-encoded em dash (`â€”`) is what a cp1252 round trip leaves behind.
  assert.ok(!text.includes('â€'), 'mojibake in the usage guidance')
  assert.match(text, /^Six procedures carry a person from an empty folder/m)
})
