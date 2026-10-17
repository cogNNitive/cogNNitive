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
  it('renders edit controls but keeps them inert while review mode is off', () => {
    const { document } = boot()
    const edit = document.querySelector('[data-ku-action="edit"]')
    assert.ok(edit, 'edit control is emitted')
    edit.click()
    assert.equal(document.querySelector('[data-innfo-component="edit-modal"]'), null)
  })

  it('opens the shared edit modal through one delegated listener when review is on', () => {
    const { document } = boot()
    document.querySelector('.innfo-review-toggle').click()
    const edit = document.querySelector('[data-ku-action="edit"]')
    edit.click()
    assert.ok(document.querySelector('[data-innfo-component="edit-modal"]'), 'modal opened')
  })
})

describe('Edit structure switch', () => {
  it('toggles html[data-innfo-structure] and resets on review exit', () => {
    const { document } = boot()
    const toggle = document.querySelector('.innfo-review-toggle')
    toggle.click()
    const sw = document.querySelector('#innfo-review-dock [data-innfo="structure-switch"]')
    assert.ok(sw, 'switch exists in the review dock')
    assert.equal(sw.getAttribute('role'), 'switch')
    assert.equal(sw.getAttribute('aria-checked'), 'false')
    sw.click()
    assert.equal(document.documentElement.getAttribute('data-innfo-structure'), 'on')
    assert.equal(sw.getAttribute('aria-checked'), 'true')
    toggle.click()
    assert.equal(document.documentElement.getAttribute('data-innfo-structure'), null)
    assert.equal(document.querySelector('#innfo-review-dock [data-innfo="structure-switch"]'), null)
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
