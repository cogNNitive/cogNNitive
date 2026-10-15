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
    assert.match(document.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*1/)
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
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'none\'; form-action \'none\'; img-src data: blob:; style-src \'unsafe-inline\'">'
    assert.ok(f.getAttribute('srcdoc').startsWith(csp), 'CSP meta leads the srcdoc')
    assert.ok(f.getAttribute('srcdoc').endsWith(html), 'view html follows unchanged')
  })

  // Honesty note: jsdom does not load srcdoc documents and does not enforce
  // the sandbox, so this cannot prove a real browser blocks the script. It
  // asserts the two things this code controls: the markup travels only in
  // the srcdoc attribute (never parsed into the parent), and no sandbox
  // token would let the framed script run.
  it('the view html is delivered via the srcdoc attribute only', async () => {
    const { dom, ctxs } = bootViews(
      [def('doc', { kind: 'readonly', mount: (ctx) => void ctx.mountHtml(html) })],
      { runScripts: 'dangerously' },
    )
    await new Promise((r) => setTimeout(r, 50))
    const { container } = ctxs.doc
    assert.equal(container.querySelector('#hello'), null, 'markup not parsed into the parent')
    assert.equal(container.querySelector('script'), null, 'no script element in the parent')
    assert.equal(dom.window.__pwned, undefined)
    const f = container.querySelector('iframe')
    assert.ok(f.getAttribute('srcdoc').includes('<script>window.parent.__pwned = 1</script>'))
    assert.equal(f.children.length, 0, 'the frame element itself holds no content')
    const tokens = f.getAttribute('sandbox').split(' ')
    assert.ok(!tokens.includes('allow-scripts') && !tokens.includes('allow-same-origin'))
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

describe('S2b review follow-up: store.propose validates its input', () => {
  const rejects = (propose, pattern) => {
    const { ctxs } = bootViews([def('alpha')])
    assert.throws(() => ctxs.alpha.store.propose(propose), pattern)
    assert.equal(ctxs.alpha.store.drafts().length, 0, 'nothing stored on rejection')
  }

  it('an unknown kind throws instead of being coerced to a comment', () => {
    rejects({ elementId: 'ecto-1', kind: 'bogus', comment: 'x' }, /kind.*bogus/)
    rejects({ elementId: 'ecto-1', comment: 'x' }, /kind/)
  })

  it('a comment needs non-empty text', () => {
    rejects({ elementId: 'ecto-1', kind: 'comment' }, /comment/)
    rejects({ elementId: 'ecto-1', kind: 'comment', comment: '  ' }, /comment/)
  })

  it('a correction needs a field and a proposed value', () => {
    rejects({ elementId: 'ecto-1', kind: 'correction', proposed: 'x' }, /field/)
    rejects({ elementId: 'ecto-1', kind: 'correction', field: 'role' }, /proposed/)
  })

  it('name and description corrections carry the original element value', () => {
    const { ctxs } = bootViews([def('alpha')])
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'correction', field: 'name', proposed: 'Ecto-2' })
    ctxs.alpha.store.propose({
      elementId: 'ecto-1',
      kind: 'correction',
      field: 'description',
      proposed: 'Hearse.',
    })
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'correction', field: 'role', proposed: 'Hearse' })
    const [name, description, role] = ctxs.alpha.store.drafts()
    assert.equal(name.original, 'Ecto-1')
    assert.equal(description.original, 'Car.')
    assert.equal(role.original, 'Interceptor')
  })
})

describe('S2b review follow-up: draft change listeners', () => {
  it('a listener that proposes terminates and the final state is shown', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    let calls = 0
    ctxs.alpha.store.onChange(() => {
      calls++
      if (calls < 100) ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'again' })
    })
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'first' })
    assert.ok(calls <= 3, `listener ran ${calls} times`)
    const n = ctxs.alpha.store.drafts().length
    assert.equal(document.querySelector('.innfo-banner-drafts').textContent.trim(), `drafts: ${n}`)
  })

  it('a listener that removes inside onChange also terminates', () => {
    const { ctxs } = bootViews([def('alpha')])
    let calls = 0
    ctxs.alpha.store.onChange(() => {
      calls++
      const [d] = ctxs.alpha.store.drafts()
      if (d && calls < 100) ctxs.alpha.store.remove(d.id)
    })
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'x' })
    assert.ok(calls <= 3, `listener ran ${calls} times`)
    assert.equal(ctxs.alpha.store.drafts().length, 0)
  })

  it('a throwing listener is reported in the view error notice and does not block others', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    let healthy = 0
    ctxs.alpha.store.onChange(() => {
      throw new Error('listener boom')
    })
    ctxs.alpha.store.onChange(() => healthy++)
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'x' })
    assert.equal(healthy, 1)
    const text = noticeText(document)
    assert.match(text, /alpha/)
    assert.match(text, /listener boom/)
  })

  it('a listener from a destroyed boot is not called after re-boot', () => {
    const { document, ctxs, registry } = bootViews([def('alpha')])
    const old = ctxs.alpha
    let calls = 0
    old.store.onChange(() => calls++)
    InnfoConsole.boot(document, { registry })
    assert.notEqual(ctxs.alpha, old, 're-boot mounted a fresh ctx')
    old.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'x' })
    assert.equal(calls, 0)
  })
})

describe('S2b review follow-up: openEdit side effects and focus', () => {
  it('an invalid call leaves an open modal untouched', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    ctxs.alpha.modal.edit({ elementId: 'ecto-1', field: 'role' })
    const open = document.querySelector('.innfo-edit-modal')
    assert.equal(ctxs.alpha.modal.edit({ elementId: 'nope', field: 'role' }), false)
    assert.equal(ctxs.alpha.modal.edit({ elementId: 'ecto-1' }), false, 'no field and no comment mode')
    assert.equal(ctxs.alpha.modal.comment({ elementId: 'nope' }), false)
    assert.equal(document.querySelectorAll('.innfo-edit-modal').length, 1)
    assert.equal(document.querySelector('.innfo-edit-modal'), open, 'same modal node survives')
  })

  it('cancel restores focus to the element focused when the view opened the modal', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    const opener = document.createElement('button')
    opener.textContent = 'edit from view'
    ctxs.alpha.container.appendChild(opener)
    opener.focus()
    assert.equal(document.activeElement, opener)
    ctxs.alpha.modal.edit({ elementId: 'ecto-1', field: 'role' })
    document.querySelector('.innfo-edit-modal textarea, .innfo-edit-modal input').focus()
    assert.notEqual(document.activeElement, opener)
    document.querySelector('.innfo-edit-btn-cancel').click()
    assert.equal(document.querySelectorAll('.innfo-edit-modal').length, 0)
    assert.equal(document.activeElement, opener)
  })

  it('a second open does not capture the first modal as the focus anchor', () => {
    const { document, ctxs } = bootViews([def('alpha')])
    const opener = document.createElement('button')
    ctxs.alpha.container.appendChild(opener)
    opener.focus()
    ctxs.alpha.modal.edit({ elementId: 'ecto-1', field: 'role' })
    document.querySelector('.innfo-edit-modal textarea, .innfo-edit-modal input').focus()
    ctxs.alpha.modal.comment({ elementId: 'ecto-1' })
    document.querySelector('.innfo-edit-btn-cancel').click()
    assert.equal(document.activeElement, opener)
  })
})

describe('S2b review follow-up: embedding guard hardening', () => {
  const tick = () => new Promise((r) => setTimeout(r, 0))

  for (const tag of ['object', 'embed', 'frame']) {
    it(`an editable view's <${tag}> is removed during mount and reported`, () => {
      const { document, ctxs } = bootViews([
        def('sneaky', {
          mount(ctx) {
            ctx.container.appendChild(ctx.doc.createElement(tag))
          },
        }),
      ])
      assert.equal(ctxs.sneaky.container.querySelectorAll(tag).length, 0)
      assert.match(noticeText(document), /sneaky/)
    })

    it(`an editable view's <${tag}> added later is removed by the observer`, async () => {
      const { document, ctxs } = bootViews([def('late')])
      ctxs.late.container.appendChild(document.createElement(tag))
      await tick()
      assert.equal(ctxs.late.container.querySelectorAll(tag).length, 0)
      assert.match(noticeText(document), /late/)
    })
  }

  it('an editable view cannot park an iframe outside its panel in the document body', async () => {
    const { document, ctxs } = bootViews([def('alpha')])
    document.body.appendChild(document.createElement('iframe'))
    await tick()
    assert.equal(document.querySelectorAll('iframe').length, 0)
    assert.match(noticeText(document), /alpha/)
    assert.ok(ctxs.alpha)
  })

  it('mountHtml hands back no frame handle', () => {
    let returned = 'unset'
    bootViews([
      def('doc', {
        kind: 'readonly',
        mount(ctx) {
          returned = ctx.mountHtml('<p>x</p>')
        },
      }),
    ])
    assert.equal(returned, undefined)
  })

  it('a readonly view may only create frames through mountHtml', async () => {
    const { document, ctxs } = bootViews([
      def('doc', {
        kind: 'readonly',
        mount(ctx) {
          ctx.container.appendChild(ctx.doc.createElement('iframe'))
        },
      }),
    ])
    assert.equal(ctxs.doc.container.querySelectorAll('iframe').length, 0)
    assert.match(noticeText(document), /doc/)
    ctxs.doc.container.appendChild(document.createElement('iframe'))
    await tick()
    assert.equal(ctxs.doc.container.querySelectorAll('iframe').length, 0, 'late frame removed too')
    ctxs.doc.mountHtml('<p>ok</p>')
    await tick()
    assert.equal(ctxs.doc.container.querySelectorAll('iframe').length, 1, 'mountHtml still works')
  })

  it('the editable guard does not strip a readonly view mountHtml frame', async () => {
    const { document } = bootViews([
      def('alpha'),
      def('doc', { kind: 'readonly', order: 30, mount: (ctx) => void ctx.mountHtml('<p>x</p>') }),
    ])
    await tick()
    assert.equal(document.querySelectorAll('#innfo-tab-doc iframe').length, 1)
    assert.equal(noticeText(document), '')
  })
})

describe('S2b review follow-up: remove refreshes decorations and counts', () => {
  const pending = (document) => {
    const p = document.querySelector('[data-innfo-component="rail-progress"]')
    return p ? p.getAttribute('data-pending') : null
  }

  it('after store.remove the rail progress mark is refreshed', () => {
    const { document, ctxs, res } = bootViews([def('alpha')])
    res.controller.enable()
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'x' })
    assert.equal(pending(document), '1')
    ctxs.alpha.store.remove(ctxs.alpha.store.drafts()[0].id)
    assert.equal(pending(document), '0', 'decoration is not left stale')
  })

  it('after store.remove banner, Review badge and pending text follow', () => {
    const { document, ctxs, res } = bootViews([def('alpha')])
    res.controller.enable()
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'x' })
    ctxs.alpha.store.propose({ elementId: 'ecto-1', kind: 'comment', comment: 'y' })
    ctxs.alpha.store.remove(ctxs.alpha.store.drafts()[0].id)
    assert.match(document.querySelector('.innfo-banner-drafts').textContent, /drafts:\s*1/)
    assert.match(document.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*1/)
    assert.match(document.querySelector('.innfo-review-count').textContent, /^1 pending change/)
    ctxs.alpha.store.remove(ctxs.alpha.store.drafts()[0].id)
    assert.match(document.querySelector('.innfo-banner-drafts').textContent, /drafts:\s*0/)
    assert.match(document.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*0/)
  })
})
