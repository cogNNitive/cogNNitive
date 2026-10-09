import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InnfoConsole, bootConsole } from './helpers/console-boot.mjs'

const def = (id, over = {}) => ({
  id,
  title: id,
  icon: 'chart',
  order: 20,
  kind: 'editable',
  mount() {},
  ...over,
})

// Boots a console with the given views, each capturing its ctx, and mounts
// them all by clicking their tabs.
function bootViews(defs, opts = {}) {
  const registry = InnfoConsole.createViewRegistry()
  const ctxs = {}
  defs.forEach((d) => {
    const mount = d.mount
    registry.register({
      ...d,
      mount(ctx) {
        ctxs[d.id] = ctx
        return mount(ctx)
      },
    })
  })
  const booted = bootConsole({ registry, ...opts })
  defs.forEach((d) =>
    booted.document.querySelector(`.innfo-view-tab[data-tab="${d.id}"]`).click(),
  )
  return { ...booted, ctxs, registry }
}

const noticeText = (document) => {
  const n = document.getElementById('innfo-view-errors')
  return n ? n.textContent : ''
}

describe('S2b shared mount context', () => {
  it('two views land their drafts in the same store and one changeset', () => {
    const { ctxs } = bootViews([def('alpha'), def('beta')])
    const seen = []
    ctxs.beta.store.onChange(() => seen.push('beta'))
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'from alpha' })
    ctxs.beta.store.propose({
      elementId: 'ecto-1',
      field: 'role',
      kind: 'correction',
      proposed: 'Hearse',
    })
    assert.equal(ctxs.alpha.store.drafts().length, 2)
    assert.deepEqual(
      ctxs.alpha.store.drafts().map((d) => d.id),
      ctxs.beta.store.drafts().map((d) => d.id),
    )
    assert.equal(ctxs.alpha.changeset.count(), 2)
    assert.equal(ctxs.beta.changeset.count(), 2)
    const composed = ctxs.alpha.changeset.compose('lucas')
    assert.equal(composed.ok, true)
    assert.equal(composed.items, 2)
    assert.equal(ctxs.beta.changeset.compose('lucas').items, 2)
    assert.deepEqual(seen, ['beta', 'beta'], 'a listener hears every save, from any view')
  })

  it('remove and the returned off function reach the same store', () => {
    const { ctxs } = bootViews([def('alpha'), def('beta')])
    let calls = 0
    const off = ctxs.beta.store.onChange(() => calls++)
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'x' })
    const [draft] = ctxs.beta.store.drafts()
    ctxs.beta.store.remove(draft.id)
    assert.equal(ctxs.alpha.store.drafts().length, 0)
    assert.equal(calls, 2, 'save and delete both notify')
    off()
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'y' })
    assert.equal(calls, 2, 'off() unsubscribes')
  })

  it('an unknown element is rejected instead of silently dropped', () => {
    const { ctxs } = bootViews([def('alpha')])
    assert.throws(
      () => ctxs.alpha.store.propose({ elementId: 'nope', kind: 'comment', comment: 'x' }),
      /nope/,
    )
  })

  it('every view opens the controller single modal slot', () => {
    const { document, ctxs } = bootViews([def('alpha'), def('beta')])
    const modals = () => document.querySelectorAll('.innfo-edit-modal')
    assert.equal(modals().length, 0)
    ctxs.alpha.modal.edit({ elementId: 'ecto-1', field: 'role' })
    assert.equal(modals().length, 1)
    const first = modals()[0]
    ctxs.beta.modal.edit({ elementId: 'ecto-1', field: '__name' })
    assert.equal(modals().length, 1, 'the second view replaced the open modal')
    assert.notEqual(modals()[0], first)
    ctxs.alpha.modal.comment({ elementId: 'ecto-1' })
    assert.equal(modals().length, 1, 'a comment modal takes the same slot')
  })

  it('a comment modal save lands one comment draft in the shared store', () => {
    const { document, ctxs } = bootViews([def('alpha'), def('beta')])
    ctxs.alpha.modal.comment({ elementId: 'ecto-1' })
    const modal = document.querySelector('.innfo-edit-modal')
    modal.querySelector('.innfo-edit-form-comment textarea').value = 'needs a source'
    modal.querySelector('.innfo-edit-btn-save').click()
    const drafts = ctxs.beta.store.drafts()
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].kind, 'comment')
    assert.equal(drafts[0].comment, 'needs a source')
    assert.equal(document.querySelectorAll('.innfo-edit-modal').length, 0, 'slot freed after save')
  })

  it('an edit modal save lands a correction for the chosen field', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    ctxs.alpha.modal.edit({ elementId: 'ecto-1', field: 'role' })
    const modal = document.querySelector('.innfo-edit-modal')
    modal.querySelector('.innfo-edit-form-propose input, .innfo-edit-form-propose textarea').value = 'Hearse'
    modal.querySelector('.innfo-edit-btn-save').click()
    const [draft] = ctxs.alpha.store.drafts()
    assert.equal(draft.kind, 'correction')
    assert.equal(draft.field, 'role')
    assert.equal(draft.proposed, 'Hearse')
  })

  it('exposes the shared payload and the changeset export hook', () => {
    const { ctxs, document } = bootViews([def('alpha')])
    const { payload } = ctxs.alpha
    assert.equal(payload.model.elements[0].id, 'ecto-1')
    assert.deepEqual(payload.models, [])
    assert.ok(payload.schema && payload.meta)
    assert.equal(typeof ctxs.alpha.changeset.openExport, 'function')
    assert.equal(ctxs.alpha.doc, document)
  })
})

describe('S2b live draft count from a view', () => {
  it('a propose updates banner, Review badge and pending text', () => {
    const { document, ctxs, res } = bootViews([def('alpha')])
    res.controller.enable()
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'x' })
    assert.match(document.querySelector('.innfo-banner-drafts').textContent, /drafts:\s*1/)
    assert.equal(
      document.querySelector('.innfo-view-tab[data-tab="review"] .innfo-rail-badge').textContent,
      '1',
    )
    assert.match(document.querySelector('.innfo-review-count').textContent, /^1 pending change/)
  })
})

describe('S2b readonly views and sandboxed iframes', () => {
  const html = '<p id="hello">Hello</p><script>window.parent.__pwned = 1</script>'

  it('a readonly ctx carries no store, modal or changeset', () => {
    const { ctxs } = bootViews([def('doc', { kind: 'readonly' })])
    const keys = Object.keys(ctxs.doc).sort()
    assert.deepEqual(keys, ['container', 'doc', 'id', 'mountHtml', 'payload', 'ui'])
  })

  it('an editable ctx has no mountHtml', () => {
    const { ctxs } = bootViews([def('alpha')])
    assert.equal(ctxs.alpha.mountHtml, undefined)
  })

  it('mountHtml builds the iframe with the exact sandbox contract', () => {
    const { ctxs } = bootViews([
      def('doc', { kind: 'readonly', mount: (ctx) => void ctx.mountHtml(html) }),
    ])
    const frames = ctxs.doc.container.querySelectorAll('iframe')
    assert.equal(frames.length, 1)
    const f = frames[0]
    assert.equal(f.getAttribute('sandbox'), 'allow-popups allow-popups-to-escape-sandbox')
    assert.equal(f.getAttribute('referrerpolicy'), 'no-referrer')
    for (const bad of [
      'allow-same-origin',
      'allow-scripts',
      'allow-forms',
      'allow-modals',
      'allow-downloads',
      'allow-top-navigation',
    ]) {
      assert.ok(!f.getAttribute('sandbox').split(' ').includes(bad), bad)
    }
    const csp =
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'">'
    assert.ok(f.getAttribute('srcdoc').startsWith(csp), 'CSP meta leads the srcdoc')
    assert.ok(f.getAttribute('srcdoc').endsWith(html), 'view html follows unchanged')
  })

  it('an inline script in the srcdoc does not execute', async () => {
    // jsdom does not load srcdoc documents, so this guards against a future
    // regression that evaluates the html in the parent; the sandbox tokens
    // asserted above are what stop a real browser.
    const { dom, ctxs } = bootViews(
      [def('doc', { kind: 'readonly', mount: (ctx) => void ctx.mountHtml(html) })],
      { runScripts: 'dangerously' },
    )
    await new Promise((r) => setTimeout(r, 50))
    assert.equal(dom.window.__pwned, undefined)
    const f = ctxs.doc.container.querySelector('iframe')
    assert.ok(!f.getAttribute('sandbox').includes('allow-scripts'))
  })

  it('mountHtml replaces the previous iframe instead of stacking', () => {
    const { ctxs } = bootViews([def('doc', { kind: 'readonly' })])
    ctxs.doc.mountHtml('<p>one</p>')
    ctxs.doc.mountHtml('<p>two</p>')
    const frames = ctxs.doc.container.querySelectorAll('iframe')
    assert.equal(frames.length, 1)
    assert.ok(frames[0].getAttribute('srcdoc').endsWith('<p>two</p>'))
  })
})

describe('S2b editable views never hold an iframe', () => {
  const tick = () => new Promise((r) => setTimeout(r, 0))

  it('an iframe appended during mount is removed synchronously and reported with the id', () => {
    const { document, ctxs } = bootViews([
      def('sneaky', {
        mount(ctx) {
          ctx.container.appendChild(ctx.doc.createElement('iframe'))
        },
      }),
    ])
    assert.equal(ctxs.sneaky.container.querySelectorAll('iframe').length, 0)
    const text = noticeText(document)
    assert.match(text, /sneaky/)
    assert.match(text, /iframe/)
  })

  it('a nested iframe added later is removed after the observer runs', async () => {
    const { document, ctxs } = bootViews([def('late')])
    ctxs.late.container.innerHTML = '<div><iframe></iframe></div>'
    await tick()
    assert.equal(ctxs.late.container.querySelectorAll('iframe').length, 0)
    assert.match(noticeText(document), /late/)
  })

  it('calling mountHtml from an editable view throws and stays isolated', () => {
    const { document, ctxs } = bootViews([
      def('bad', { mount: (ctx) => ctx.mountHtml('<p>x</p>') }),
      def('good'),
    ])
    assert.equal(ctxs.bad.container.querySelectorAll('iframe').length, 0)
    assert.match(noticeText(document), /bad/)
    assert.ok(ctxs.good, 'the other view still mounted')
    assert.match(document.querySelector('#innfo-tab-bad .innfo-view-error').textContent, /bad/)
  })

  it('a readonly view keeps its iframe and raises no notice', async () => {
    const { document, ctxs } = bootViews([
      def('doc', { kind: 'readonly', mount: (ctx) => void ctx.mountHtml('<p>x</p>') }),
    ])
    await tick()
    assert.equal(ctxs.doc.container.querySelectorAll('iframe').length, 1)
    assert.equal(noticeText(document), '')
  })
})

describe('S2b review follow-up: comment-only modal', () => {
  it('a comment-only target has no mode toggle to flip into Propose value', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    ctxs.alpha.modal.comment({ elementId: 'ecto-1' })
    const modal = document.querySelector('.innfo-edit-modal')
    assert.ok(modal)
    assert.equal(modal.querySelector('.innfo-edit-mode-selector'), null)
    assert.equal(modal.querySelector('.innfo-edit-mode-btn'), null)
  })

  it('an empty comment is rejected with a visible message and no draft', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    ctxs.alpha.modal.comment({ elementId: 'ecto-1' })
    const modal = document.querySelector('.innfo-edit-modal')
    modal.querySelector('.innfo-edit-form-comment textarea').value = '   '
    modal.querySelector('.innfo-edit-btn-save').click()
    assert.equal(ctxs.alpha.store.drafts().length, 0)
    const err = document.querySelector('.innfo-edit-modal .innfo-edit-error')
    assert.ok(err, 'validation message rendered in the modal')
    assert.equal(err.style.display, 'block')
    assert.match(err.textContent, /comment/i)
    assert.equal(document.querySelectorAll('.innfo-edit-modal').length, 1, 'modal stays open')
  })

  it('a field comment modal also rejects an empty comment but keeps the toggle', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    ctxs.alpha.modal.comment({ elementId: 'ecto-1', field: 'role' })
    const modal = document.querySelector('.innfo-edit-modal')
    assert.ok(modal.querySelector('.innfo-edit-mode-selector'), 'field targets may still propose')
    modal.querySelector('.innfo-edit-btn-save').click()
    assert.equal(ctxs.alpha.store.drafts().length, 0)
    assert.equal(modal.querySelector('.innfo-edit-error').style.display, 'block')
  })
})
