import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bootConsole, addCommentDraft, MODEL, nnConsole, consoleDir } from './helpers/console-boot.mjs'

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

describe('unsent changes are a durable signal, not a toast', () => {
  // `beforeunload` is the only signal a browser gives before it discards the tab.
  function fireUnload(dom) {
    const ev = new dom.window.Event('beforeunload', { cancelable: true })
    dom.window.dispatchEvent(ev)
    return ev.defaultPrevented
  }

  it('marks the Changes button while the store is non-empty and clears it at zero', () => {
    const { document, res, dom } = bootConsole()
    const button = () => document.getElementById('nn-feedback-open')
    assert.equal(
      button().hasAttribute('data-nn-unsent'),
      false,
      'a fresh console claims nothing unsent',
    )

    res.controller.enable()
    addCommentDraft(document)

    assert.equal(res.state.store.drafts().length, 1)
    assert.equal(button().getAttribute('data-nn-unsent'), 'true')
    assert.match(button().textContent, /Changes · 1/)
    assert.match(button().getAttribute('title'), /1 unsent change lives only in this console/)

    res.state.store.clearDrafts(res.state.store.drafts().map((d) => d.id))
    res.state.refreshUi()
    assert.equal(
      button().hasAttribute('data-nn-unsent'),
      false,
      'zero unsent changes clears the state',
    )
    assert.equal(button().hasAttribute('title'), false)
    dom.window.close()
  })

  it('guards beforeunload only while drafts are unsent, and releases at zero', () => {
    const { document, res, dom } = bootConsole()
    assert.equal(fireUnload(dom), false, 'nothing to lose: no warning')

    res.controller.enable()
    addCommentDraft(document)
    assert.equal(fireUnload(dom), true, 'the tab warns while a draft lives only here')

    res.state.store.clearDrafts(res.state.store.drafts().map((d) => d.id))
    res.state.refreshUi()
    assert.equal(fireUnload(dom), false, 'the guard releases when the store empties')
    dom.window.close()
  })

  it('keeps the red state but no pulse under prefers-reduced-motion', () => {
    const css = readFileSync(join(consoleDir, 'nn-ui.css'), 'utf8')
    assert.match(css, /#nn-feedback-open\[data-nn-unsent='true'\]\s*\{[^}]*background:\s*#b91c1c/)
    // The pulse is inside a no-preference block, so a reduced-motion client keeps
    // the red and never receives the animation at all.
    const animationAt = css.indexOf('animation: nn-unsent-attention')
    assert.ok(animationAt > -1, 'the pulse animation is declared')
    const mediaOpen = css.lastIndexOf('@media', animationAt)
    assert.match(
      css.slice(mediaOpen, animationAt),
      /prefers-reduced-motion: no-preference/,
      'the pulse only applies when the reader allows motion',
    )
  })
})

describe('the two copy actions emit different artifacts and say so', () => {
  it('keeps the changeset document and the agent prompt distinct', () => {
    const { document, res, dom } = bootConsole({
      before(doc) {
        const navbar = doc.createElement('nav')
        navbar.className = 'nn-navbar'
        doc.body.prepend(navbar)
      },
    })
    // After boot: the helper installs the jsdom store that `getReviewerName` reads.
    nnConsole.setReviewerName('Egon Spengler')
    res.controller.enable()
    addCommentDraft(document)

    // The navbar action composes the agent prompt: instructions plus the embedded
    // changeset document.
    const prompt = nnConsole.composeAgentPrompt(res.state)
    assert.match(prompt, /# AI Agent Instructions: Apply Domain Console Changeset/)
    assert.match(prompt, /## NN Change:/)

    // The modal action copies the changeset document alone, byte-identical to the
    // download, with no instruction wrapper.
    const openButton = document.getElementById('nn-feedback-open')
    openButton.click()
    const modal = document.getElementById('nn-feedback-modal')
    const author = modal.querySelector('[data-nn="identifier"]')
    author.value = 'Egon Spengler'
    author.dispatchEvent(new dom.window.Event('input'))
    document.execCommand = () => true
    modal.querySelector('[data-nn="copy-changeset-prompt"]').click()
    const copied = modal.querySelector('[data-nn="changeset-preview"]').value
    assert.match(copied, /## NN Change:/)
    assert.doesNotMatch(copied, /# AI Agent Instructions/)
    // The prompt embeds that same changeset body; only its frontmatter `title:` differs
    // (the prompt labels it a review), which is why they are two artifacts, not one.
    const body = (text) => text.slice(text.indexOf('# NN index')).trim()
    assert.ok(prompt.includes(body(copied)), 'the prompt embeds the changeset the download writes')

    // Each label names its artifact, so the two are not read as duplicates.
    const navbarCopy = document.querySelector('#nn-navbar-actions [data-nn="copy-agent-prompt"]')
    assert.match(navbarCopy.textContent, /Copy AI Prompt/)
    assert.match(navbarCopy.getAttribute('title'), /embedded changeset document/)
    const modalCopy = modal.querySelector('[data-nn="copy-changeset-prompt"]')
    assert.match(modalCopy.textContent, /Copy changeset doc/)
    assert.match(modalCopy.getAttribute('title'), /same bytes Download changes writes/)
    dom.window.close()
  })
})
