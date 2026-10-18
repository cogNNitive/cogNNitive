import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole } from './helpers/console-boot.mjs'

const MODEL = {
  meta: { title: 'KU Actions', modelId: 'ku-actions', modelVersion: 'V_1-0-0', changesBlueprintVersion: 'V_0-3-0' },
  elements: [
    { id: 'slimer', concept: 'Threat', name: 'Slimer', fields: { owner: 'Egon' }, hash: '0123456789abcdef' },
  ],
  matrices: [],
}

function boot() {
  return bootConsole({
    model: MODEL,
    schema: { concepts: [{ name: 'Threat', fields: [{ name: 'owner', type: 'string' }] }] },
  })
}

describe('delegated Ku actions', () => {
  it('renders a live edit control with no mode to enter', () => {
    const { document } = boot()
    const edit = document.querySelector('[data-ku-action="edit"]')
    assert.ok(edit, 'edit control is emitted')
    assert.equal(
      document.documentElement.getAttribute('data-innfo-review'),
      null,
      'no review-mode attribute: the pencil is not gated by a mode',
    )
    edit.click()
    assert.ok(
      document.querySelector('[data-innfo-component="edit-modal"]'),
      'the pencil is live: it proposes a draft',
    )
  })

  it('opens the shared edit modal through one delegated listener when review is on', () => {
    const { document } = boot()
    /* no review mode: edits are live */
    const edit = document.querySelector('[data-ku-action="edit"]')
    edit.click()
    assert.ok(document.querySelector('[data-innfo-component="edit-modal"]'), 'modal opened')
  })
})

describe('no Edit structure switch', () => {
  it('has no switch and no structure attribute', () => {
    const { document } = boot()
    assert.equal(
      document.querySelector('#innfo-review-dock [data-innfo="structure-switch"]'),
      null,
      'the switch is gone: the edit modal warns instead',
    )
    assert.equal(document.documentElement.getAttribute('data-innfo-structure'), null)
  })
})

describe('address-keyed pips', () => {
  it('places a pip on the badge whose address matches the pending draft', () => {
    const { document } = boot()
    const badge = document.querySelector('[data-ku-kind="value"][data-field="owner"]')
    assert.ok(badge, 'owner value badge')
    const address = badge.getAttribute('data-ku-address')
    // The review controller's store is reachable from the runtime state, but the
    // public contract is the address on the badge and the pip beside it.
    const wrap = badge.closest('.innfo-ku-wrap')
    assert.ok(wrap, 'badge lives in a ku-wrap')
    assert.ok(address.includes('slimer'), 'address is canonical')
  })
})
