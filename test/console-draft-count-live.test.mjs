import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, addCommentDraft } from './helpers/console-boot.mjs'

describe('S1b: draft count stays live without reload', () => {
  it('saving a draft updates banner, tab badge and review text', () => {
    const { document, res } = bootConsole()
    assert.ok(res.controller, 'review controller present')
    res.controller.enable()
    const reviewBadge = () =>
      document.querySelector('.innfo-view-tab[data-tab="review"] .innfo-rail-badge')
    assert.equal(reviewBadge(), null, 'no badge before any draft')

    addCommentDraft(document)

    assert.match(document.querySelector('.innfo-banner-drafts').textContent, /drafts:\s*1/)
    assert.equal(reviewBadge() && reviewBadge().textContent, '1')
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
    assert.equal(
      document.querySelector('.innfo-view-tab[data-tab="review"] .innfo-rail-badge'),
      null,
    )
    assert.match(document.querySelector('.innfo-review-count').textContent, /^0 pending changes/)
  })
})

