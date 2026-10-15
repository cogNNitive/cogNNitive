import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, addCommentDraft } from './helpers/console-boot.mjs'

describe('S1b: draft count stays live without reload', () => {
  it('saving a draft updates banner, tab badge and review text', () => {
    const { document, res } = bootConsole()
    assert.ok(res.controller, 'review controller present')
    res.controller.enable()
    assert.match(document.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*0/)

    addCommentDraft(document)

    assert.match(document.querySelector('.innfo-banner-drafts').textContent, /drafts:\s*1/)
    assert.match(document.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*1/)
    assert.match(document.querySelector('.innfo-review-count').textContent, /^1 pending change/)
  })

  it('deleting a draft from the review tab updates all three', () => {
    const { document, res } = bootConsole()
    res.controller.enable()
    addCommentDraft(document)
    const del = document.querySelector('#innfo-tab-review .innfo-draft-delete')
    assert.ok(del, 'delete control rendered in review tab')
    del.click()
    assert.match(document.querySelector('.innfo-banner-drafts').textContent, /drafts:\s*0/)
    assert.match(document.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*0/)
    assert.match(document.querySelector('.innfo-review-count').textContent, /^0 pending changes/)
  })

  it('saving a draft keeps the mounted card node and focus', () => {
    const { document, res } = bootConsole()
    res.controller.enable()
    const card = document.querySelector('#innfo-content [data-element-id="ecto-1"]')
    assert.ok(card, 'card mounted')
    // Open the comment popover, then park focus on another control of the card;
    // a card remount would drop that focus when the draft is saved.
    const Ev = document.defaultView.Event
    card.querySelector('[data-innfo-ctl="card-anchor"]').dispatchEvent(new Ev('click', { bubbles: true }))
    document.querySelector('.innfo-popover-comment').value = 'looks wrong'
    const control = card.querySelector('[data-innfo-ctl="edit-toggle"]')
    assert.ok(control, 'edit-toggle control decorated')
    control.focus()
    assert.equal(document.activeElement, control, 'control focused before saving')

    document.querySelector('.innfo-popover-save').dispatchEvent(new Ev('click', { bubbles: true }))

    const after = document.querySelector('#innfo-content [data-element-id="ecto-1"]')
    assert.equal(after, card, 'card DOM node identity preserved')
    assert.ok(card.contains(control), 'control still inside the same card')
    assert.equal(document.activeElement, control, 'focus stays on the same control')
    assert.match(document.querySelector('.innfo-banner-drafts').textContent, /drafts:\s*1/)
    assert.match(document.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*1/)
    assert.match(document.querySelector('.innfo-review-count').textContent, /^1 pending change/)
  })

  it('marking an element reviewed does not remount the cards', () => {
    const { document, res } = bootConsole()
    res.controller.enable()
    const card = document.querySelector('#innfo-content [data-element-id="ecto-1"]')
    const toggle = card.querySelector('[data-innfo-component="reviewed-toggle"]')
    assert.ok(toggle, 'reviewed toggle decorated')
    toggle.click()
    assert.equal(document.querySelector('#innfo-content [data-element-id="ecto-1"]'), card)
  })
})
