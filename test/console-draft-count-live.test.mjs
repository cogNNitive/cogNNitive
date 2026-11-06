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
    const del = document.querySelector('#nn-tab-review [data-nn="discard"]')
    assert.ok(del, 'delete control rendered in review tab')
    del.click()
    assert.match(document.querySelector('.nn-banner-drafts').textContent, /unsent:\s*0/)
    assert.match(document.querySelector('#nn-review-dock .nn-dock-drafts').textContent, /Unsent:\s*0/)
    assert.match(document.querySelector('.nn-review-count').textContent, /^0 pending changes/)
  })

  it('saving a draft keeps the mounted card node', () => {
    const { document, res } = bootConsole()
    res.controller.enable()
    const card = document.querySelector('#nn-content [data-element-id="ecto-1"]')
    assert.ok(card, 'card mounted')
    const control = card.querySelector('.nn-ku-more')
    assert.ok(control, 'name pencil control decorated')

    // Editing happens in the unit modal now, so the card is not the saved surface
    // any more: what must survive is the card's DOM identity, not a focus parked on
    // it (the popover-era assertion this test used to make).
    addCommentDraft(document)

    const after = document.querySelector('#nn-content [data-element-id="ecto-1"]')
    assert.equal(after, card, 'card DOM node identity preserved')
    assert.ok(card.contains(control), 'control still inside the same card')
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
