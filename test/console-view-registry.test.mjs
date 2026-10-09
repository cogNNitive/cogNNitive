import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InnfoConsole, MODEL, bootConsole } from './helpers/console-boot.mjs'

const def = (over = {}) => ({
  id: 'pipeline',
  title: 'Pipeline',
  icon: 'chart',
  order: 20,
  kind: 'editable',
  mount() {},
  ...over,
})

describe('registerView contract', () => {
  it('accepts a valid definition without mounting it', () => {
    const registry = InnfoConsole.createViewRegistry()
    let mounts = 0
    registry.register(def({ mount: () => mounts++ }))
    assert.deepEqual(registry.list().map((v) => v.id), ['pipeline'])
    assert.equal(mounts, 0)
  })

  for (const [field, bad] of [
    ['title', ''],
    ['icon', undefined],
    ['order', Number.NaN],
    ['kind', 'draft'],
    ['mount', undefined],
  ]) {
    it(`rejects an invalid ${field}, naming field and id`, () => {
      const registry = InnfoConsole.createViewRegistry()
      assert.throws(
        () => registry.register(def({ [field]: bad })),
        (err) => err.message.includes('"pipeline"') && err.message.includes(field),
      )
      assert.equal(registry.list().length, 0)
    })
  }

  it('rejects ids that are not slugs', () => {
    const registry = InnfoConsole.createViewRegistry()
    for (const id of ['Pipeline', 'my_view', '-a', 'a--b', 'a b', '']) {
      assert.throws(() => registry.register(def({ id })), /id/, `id "${id}"`)
    }
  })

  it('rejects the reserved built-in ids', () => {
    const registry = InnfoConsole.createViewRegistry()
    for (const id of ['explorer', 'matrices', 'review']) {
      assert.throws(() => registry.register(def({ id })), /reserved/, id)
    }
  })

  it('viewRegistrar derives the id and source, and rejects a mismatching declared id', () => {
    const registry = InnfoConsole.createViewRegistry()
    const { id: _omit, ...noId } = def()
    registry.registrar('pipeline', 'domaiNN:consoles/views/pipeline.js')(noId)
    const [view] = registry.list()
    assert.equal(view.id, 'pipeline')
    assert.equal(view.source, 'domaiNN:consoles/views/pipeline.js')
    assert.throws(
      () => registry.registrar('other', 'x.js')(def({ id: 'pipeline' })),
      /"other".*pipeline/,
    )
    assert.equal(registry.list().length, 1)
  })

  it('exposes a default registry through registerView and viewRegistrar', () => {
    assert.equal(typeof InnfoConsole.registerView, 'function')
    assert.equal(typeof InnfoConsole.viewRegistrar('x', 's'), 'function')
  })
})

describe('tabs from the registry', () => {
  it('orders tabs by (order, id) with Changes last', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def({ id: 'zeta', title: 'Zeta', order: 20 }))
    registry.register(def({ id: 'alpha', title: 'Alpha', order: 20 }))
    registry.register(def({ id: 'first', title: 'First', order: 10 }))
    const { document } = bootConsole({ registry })
    const ids = [...document.querySelectorAll('.innfo-view-tab')].map((b) => b.dataset.tab)
    assert.deepEqual(ids, ['first', 'alpha', 'zeta', 'explorer', 'matrices', 'review'])
  })

  it('mounts lazily, once, and keeps view state across tab switches', () => {
    const registry = InnfoConsole.createViewRegistry()
    const log = []
    registry.register(
      def({
        mount(ctx) {
          log.push('mount')
          ctx.container.innerHTML = '<input id="v-input" />'
          return { onShow: () => log.push('show'), onHide: () => log.push('hide') }
        },
      }),
    )
    const { document } = bootConsole({ registry })
    const tab = (id) => document.querySelector(`.innfo-view-tab[data-tab="${id}"]`)
    // default tab is the lowest order: the pipeline view (order 20 < explorer 100)
    assert.deepEqual(log, ['mount'])
    document.getElementById('v-input').value = 'typed'
    tab('explorer').click()
    tab('pipeline').click()
    assert.equal(document.getElementById('v-input').value, 'typed')
    assert.deepEqual(log, ['mount', 'hide', 'show'])
    assert.ok(document.getElementById('innfo-tab-pipeline').classList.contains('active'))
  })

  it('does not mount a view whose tab is never activated', () => {
    const registry = InnfoConsole.createViewRegistry()
    let mounts = 0
    registry.register(def({ order: 500, mount: () => mounts++ }))
    bootConsole({ registry })
    assert.equal(mounts, 0)
  })

  it('routes #id and #matrices from the initial hash and on hashchange', async () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def())
    const first = bootConsole({ registry, url: 'http://localhost/#matrices' })
    assert.ok(first.document.getElementById('innfo-tab-matrices').classList.contains('active'))

    const reg2 = InnfoConsole.createViewRegistry()
    reg2.register(def())
    const { dom, document } = bootConsole({ registry: reg2, url: 'http://localhost/#explorer' })
    assert.ok(document.getElementById('innfo-tab-explorer').classList.contains('active'))
    dom.window.location.hash = '#pipeline'
    await new Promise((r) => setTimeout(r, 20))
    assert.ok(document.getElementById('innfo-tab-pipeline').classList.contains('active'))
    assert.ok(!document.getElementById('innfo-tab-explorer').classList.contains('active'))
    document.querySelector('.innfo-view-tab[data-tab="explorer"]').click()
    assert.equal(dom.window.location.hash, '#explorer')
  })

  it('has no Matrices tab without matrices', () => {
    const { document } = bootConsole({ model: { ...MODEL, matrices: [] } })
    assert.equal(document.querySelector('.innfo-view-tab[data-tab="matrices"]'), null)
    assert.equal(document.getElementById('innfo-tab-matrices'), null)
  })
})

describe('duplicate and invalid view ids', () => {
  it('throws on a duplicate id and keeps the first registration mounted', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.registrar('pipeline', 'bluepriNNt:a.js')(def({ id: undefined, title: 'First' }))
    assert.throws(
      () => registry.registrar('pipeline', 'domaiNN:b.js')(def({ id: undefined, title: 'Second' })),
      /duplicate/,
    )
    assert.deepEqual(registry.list().map((v) => v.title), ['First'])
    const { document } = bootConsole({ registry })
    const tabs = document.querySelectorAll('.innfo-view-tab[data-tab="pipeline"]')
    assert.equal(tabs.length, 1)
    assert.match(tabs[0].textContent, /First/)
  })

  it('shows a role=alert notice with id, both sources and reason', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.registrar('pipeline', 'bluepriNNt:a.js')(def({ id: undefined }))
    assert.throws(() => registry.registrar('pipeline', 'domaiNN:b.js')(def({ id: undefined })))
    const { document } = bootConsole({ registry })
    const notice = document.getElementById('innfo-view-errors')
    assert.ok(notice, 'notice exists')
    assert.equal(notice.getAttribute('role'), 'alert')
    for (const text of ['pipeline', 'bluepriNNt:a.js', 'domaiNN:b.js', 'duplicate']) {
      assert.ok(notice.textContent.includes(text), `notice mentions ${text}`)
    }
    assert.equal(registry.errors().length, 1)
  })

  it('also reports invalid definitions in the notice', () => {
    const registry = InnfoConsole.createViewRegistry()
    assert.throws(() => registry.register(def({ id: 'bad', kind: 'draft' })))
    const { document } = bootConsole({ registry })
    assert.match(document.getElementById('innfo-view-errors').textContent, /bad.*kind/)
  })

  it('shows no notice when nothing failed', () => {
    const { document } = bootConsole({ registry: InnfoConsole.createViewRegistry() })
    assert.equal(document.getElementById('innfo-view-errors'), null)
  })

  it('isolates a mount throw inline and keeps other tabs working', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(
      def({
        mount() {
          throw new Error('boom')
        },
      }),
    )
    const { document } = bootConsole({ registry })
    const panel = document.getElementById('innfo-tab-pipeline')
    assert.match(panel.textContent, /boom/)
    assert.match(document.getElementById('innfo-view-errors').textContent, /pipeline.*boom/)
    document.querySelector('.innfo-view-tab[data-tab="explorer"]').click()
    assert.ok(document.getElementById('innfo-tab-explorer').classList.contains('active'))
    document.querySelector('.innfo-view-tab[data-tab="pipeline"]').click()
    assert.match(panel.textContent, /boom/)
  })

  it('rejects an external id that collides with a built-in tab at boot', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def({ id: 'canonical' }))
    const { document } = bootConsole({ registry, model: { ...MODEL, rows: [{}], meta: { ...MODEL.meta, months: 3 } } })
    assert.match(document.getElementById('innfo-view-errors').textContent, /canonical.*duplicate/)
  })
})
