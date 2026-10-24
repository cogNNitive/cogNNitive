import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, addCommentDraft } from './helpers/console-boot.mjs'

describe('S1b: draft count stays live without reload', () => {
  it('saving a draft updates banner, tab badge and review text', () => {
    const { document, res } = bootConsole()
    assert.ok(res.controller, 'review controller present')
    res.controller.enable()
    assert.match(document.querySelector('#nn-review-dock .nn-dock-drafts').textContent, /Unsent:\s*0/)

    addCommentDraft(document)

    assert.match(document.querySelector('.nn-banner-drafts').textContent, /unsent:\s*1/)
    assert.match(document.querySelector('#nn-review-dock .nn-dock-drafts').textContent, /Unsent:\s*1/)
    assert.match(document.querySelector('.nn-review-count').textContent, /^1 pending change/)
  })

  it('deleting a draft from the review tab updates all three', () => {
    const { document, res } = bootConsole()
    res.controller.enable()
    addCommentDraft(document)
    const del = document.querySelector('#nn-tab-review .nn-change-discard')
    assert.ok(del, 'delete control rendered in review tab')
    del.click()
    assert.match(document.querySelector('.nn-banner-drafts').textContent, /unsent:\s*0/)
    assert.match(document.querySelector('#nn-review-dock .nn-dock-drafts').textContent, /Unsent:\s*0/)
    assert.match(document.querySelector('.nn-review-count').textContent, /^0 pending changes/)
  })

  it('saving a draft keeps the mounted card node and focus', () => {
    const { document, res } = bootConsole()
    res.controller.enable()
    const card = document.querySelector('#nn-content [data-element-id="ecto-1"]')
    assert.ok(card, 'card mounted')
    // Open the tag-proposal popover, then park focus on another control of the
    // card; a card remount would drop that focus when the draft is saved.
    const Ev = document.defaultView.Event
    card.querySelector('[data-nn-ctl="tag-add"]').dispatchEvent(new Ev('click', { bubbles: true }))
    document.querySelector('.nn-popover-comment').value = 'looks wrong'
    const control = card.querySelector('.nn-ku-more')
    assert.ok(control, 'name pencil control decorated')
    control.focus()
    assert.equal(document.activeElement, control, 'control focused before saving')

    document.querySelector('.nn-popover-save').dispatchEvent(new Ev('click', { bubbles: true }))

    const after = document.querySelector('#nn-content [data-element-id="ecto-1"]')
    assert.equal(after, card, 'card DOM node identity preserved')
    assert.ok(card.contains(control), 'control still inside the same card')
    assert.equal(document.activeElement, control, 'focus stays on the same control')
    assert.match(document.querySelector('.nn-banner-drafts').textContent, /unsent:\s*1/)
    assert.match(document.querySelector('#nn-review-dock .nn-dock-drafts').textContent, /Unsent:\s*1/)
    assert.match(document.querySelector('.nn-review-count').textContent, /^1 pending change/)
  })

  it('records a change as ONE state badge on the row, without remounting the card', () => {
    const { document, res } = bootConsole()
    res.controller.enable()
    const card = document.querySelector('#nn-content [data-element-id="ecto-1"]')
    assert.equal(card.querySelector('[data-nn-component="reviewed-toggle"]'), null, 'no reviewed mark')

    addCommentDraft(document)

    const after = document.querySelector('#nn-content [data-element-id="ecto-1"]')
    assert.equal(after, card, 'card DOM node identity preserved')
    const badges = after.querySelectorAll(
      '[data-nn-change-state] [data-nn-component="status-badge"]',
    )
    assert.equal(badges.length, 1, 'exactly one change-state signal per row')
    assert.equal(badges[0].getAttribute('data-status'), 'local')
  })
})
