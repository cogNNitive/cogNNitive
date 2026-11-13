import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, addCommentDraft, MODEL } from './helpers/console-boot.mjs'

function openChanges(document) {
  document.getElementById('nn-feedback-open').click()
  const modal = document.getElementById('nn-feedback-modal')
  assert.ok(modal.hasAttribute('open'), 'Changes opens a dialog')
  return modal
}

describe('one Changes entry for review and export', () => {
  it('opens with no drafts, retains the current view and offers history', () => {
    const { document, dom } = bootConsole()
    const hash = dom.window.location.hash
    assert.equal(document.querySelectorAll('#nn-feedback-open').length, 1)
    assert.equal(document.querySelector('#nn-review-dock'), null)
    const modal = openChanges(document)
    assert.match(modal.textContent, /No unsent changes/)
    assert.match(modal.textContent, /No applied changes yet/)
    assert.ok(modal.querySelector('[data-nn="download-changeset"]').disabled)
    modal.querySelector('[data-nn="close"]').click()
    assert.equal(dom.window.location.hash, hash)
    dom.window.close()
  })

  it('keeps a single working button in the navbar after edits and refreshes', () => {
    const { document, res, dom } = bootConsole({ before(doc) {
      const navbar = doc.createElement('nav')
      navbar.className = 'nn-navbar'
      doc.body.prepend(navbar)
    } })
    assert.ok(document.querySelector('#nn-navbar-actions #nn-feedback-open'), 'entry starts in navbar')
    res.controller.enable()
    addCommentDraft(document)
    res.state.refreshUi()
    assert.equal(document.querySelectorAll('#nn-feedback-open').length, 1)
    assert.match(document.querySelector('#nn-navbar-actions #nn-feedback-open').textContent, /Changes · 1/)
    const modal = openChanges(document)
    assert.equal(modal.querySelectorAll('[data-nn="discard"]').length, 1)
    modal.querySelector('[data-nn="discard"]').click()
    assert.equal(res.state.store.drafts().length, 0)
    assert.match(document.getElementById('nn-feedback-open').textContent, /Changes · 0/)
    assert.ok(modal.querySelector('[data-nn="download-changeset"]').disabled)
    dom.window.close()
  })

  it('validates the author, copies without clearing and confirms bulk discard', () => {
    const { document, res, dom } = bootConsole()
    res.controller.enable()
    addCommentDraft(document)
    const modal = openChanges(document)
    const copy = modal.querySelector('[data-nn="copy-changeset-prompt"]')
    assert.ok(copy.disabled)
    const author = modal.querySelector('[data-nn="identifier"]')
    author.value = 'Tester'
    author.dispatchEvent(new dom.window.Event('input'))
    assert.equal(copy.disabled, false)
    document.execCommand = () => true
    copy.click()
    assert.equal(res.state.store.drafts().length, 1)
    assert.match(modal.querySelector('[data-nn="copy-status"]').textContent, /Copied/)
    dom.window.confirm = () => false
    modal.querySelector('[data-nn="discard-all"]').click()
    assert.equal(res.state.store.drafts().length, 1)
    dom.window.confirm = () => true
    modal.querySelector('[data-nn="discard-all"]').click()
    assert.equal(res.state.store.drafts().length, 0)
    dom.window.close()
  })

  for (const field of ['description', 'role']) {
    it(`reverts ${field} from its actual current value into a pending proposal`, () => {
      const model = structuredClone(MODEL)
      model.changes = [{ status: 'applied', changes: [{
        op: 'update_field', target: `ghost-busters@ecto-1&${field}`,
        field, from: 'Previous', to: field === 'description' ? 'Car.' : 'Interceptor',
      }] }]
      const { document, res, dom } = bootConsole({ model })
      const modal = openChanges(document)
      const revert = modal.querySelector('[data-nn="revert"]')
      assert.ok(revert, 'history exposes Revert')
      revert.click()
      const [draft] = res.state.store.drafts()
      assert.equal(draft.original, field === 'description' ? 'Car.' : 'Interceptor')
      assert.equal(draft.proposed, 'Previous')
      assert.equal(model.elements[0][field === 'description' ? field : 'name'], field === 'description' ? 'Car.' : 'Ecto-1')
      assert.match(document.getElementById('nn-feedback-open').textContent, /Changes · 1/)
      dom.window.close()
    })
  }
})
