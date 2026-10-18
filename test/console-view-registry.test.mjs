import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { InnfoConsole, MODEL, bootConsole, consoleDir } from './helpers/console-boot.mjs'

const InnfoUI = createRequire(import.meta.url)(join(consoleDir, 'ui-kit.js'))

const def = (over = {}) => ({
  id: 'pipeline',
  title: 'Pipeline',
  icon: 'chart',
  order: 20,
  kind: 'editable',
  mount() {},
  ...over,
})

async function until(cond, ms = 2000) {
  const end = Date.now() + ms
  while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 10))
}

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

  it('rejects an icon that is not a slug, so it cannot inject markup', () => {
    const registry = InnfoConsole.createViewRegistry()
    for (const icon of ['x"><img onerror=1>', 'Chart', 'a b', '<b>']) {
      assert.throws(() => registry.register(def({ icon })), /icon/, icon)
    }
    assert.equal(registry.list().length, 0)
  })

  it('icon helper never interpolates an unvalidated name into attributes', () => {
    const svg = global.InnfoIcons.getSvg('x"><img onerror=1>', { size: 15 })
    assert.ok(!svg.includes('<img'), svg)
    assert.match(svg.match(/class="([^"]*)"/)[1], /^[a-z0-9 -]+$/)
    const kit = InnfoUI.icon('x"><img onerror=1>', 15)
    assert.ok(!kit.includes('<img'), kit)
    assert.match(kit.match(/class="([^"]*)"/)[1], /^[a-z0-9 -]+$/)
  })

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
  it('orders tabs by (order, id); Changes is not a tab', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def({ id: 'zeta', title: 'Zeta', order: 20 }))
    registry.register(def({ id: 'alpha', title: 'Alpha', order: 20 }))
    registry.register(def({ id: 'first', title: 'First', order: 10 }))
    const { document } = bootConsole({ registry })
    const ids = [...document.querySelectorAll('.innfo-view-tab')].map((b) => b.dataset.tab)
    // Band order: the built-in core tabs first, then domain custom views by (order, id).
    assert.deepEqual(ids, ['metamodel', 'explorer', 'matrices', 'first', 'alpha', 'zeta'])
  })

  it('opens on the model explorer by default, not the lowest-order view', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def({ id: 'pipe', order: 1 }))
    const { document } = bootConsole({ registry })
    const active = document.querySelector('.innfo-view-tab.active')
    assert.equal(active.dataset.tab, 'explorer')
  })

  it('honors config.defaultView when it names a real tab', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def({ id: 'pipe', order: 1 }))
    const { document } = bootConsole({ registry, config: { needs: [], defaultView: 'pipe' } })
    const active = document.querySelector('.innfo-view-tab.active')
    assert.equal(active.dataset.tab, 'pipe')
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
    // The default tab is the model explorer (the domain console's primary
    // content), not the lowest-order custom view, so the custom view is not
    // mounted until its tab is activated.
    assert.deepEqual(log, [])
    tab('pipeline').click()
    assert.deepEqual(log, ['mount'])
    document.getElementById('v-input').value = 'typed'
    tab('explorer').click()
    tab('pipeline').click()
    assert.equal(document.getElementById('v-input').value, 'typed')
    assert.deepEqual(log, ['mount', 'hide', 'show'])
    assert.ok(document.getElementById('innfo-tab-pipeline').classList.contains('active'))
  })

  it('does not remount on a search refresh', () => {
    const registry = InnfoConsole.createViewRegistry()
    let mounts = 0
    registry.register(def({ mount: () => mounts++ }))
    const { dom, document } = bootConsole({ registry })
    document.querySelector('.innfo-view-tab[data-tab="explorer"]').click()
    document.querySelector('.innfo-view-tab[data-tab="pipeline"]').click()
    assert.equal(mounts, 1)
    const box = document.getElementById('innfo-search')
    box.value = 'ecto'
    box.dispatchEvent(new dom.window.Event('input'))
    box.value = ''
    box.dispatchEvent(new dom.window.Event('input'))
    document.querySelector('.innfo-view-tab[data-tab="pipeline"]').click()
    assert.equal(mounts, 1)
  })

  it('does not mount the default view when an initial search picks Explorer', () => {
    const registry = InnfoConsole.createViewRegistry()
    let mounts = 0
    registry.register(def({ mount: () => mounts++ }))
    const { document } = bootConsole({ registry, url: 'http://localhost/#q=ecto' })
    assert.equal(mounts, 0)
    assert.ok(document.getElementById('innfo-tab-explorer').classList.contains('active'))
  })

  it('isolates a throwing onShow or onHide and keeps switching tabs', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(
      def({
        mount: () => ({
          onShow() {
            throw new Error('show-fail')
          },
          onHide() {
            throw new Error('hide-fail')
          },
        }),
      }),
    )
    const { document } = bootConsole({ registry, config: { needs: [], defaultView: 'pipeline' } })
    const tab = (id) => document.querySelector(`.innfo-view-tab[data-tab="${id}"]`)
    assert.doesNotThrow(() => {
      tab('explorer').click()
      tab('pipeline').click()
    })
    assert.ok(document.getElementById('innfo-tab-pipeline').classList.contains('active'))
    const text = document.getElementById('innfo-view-errors').textContent
    assert.match(text, /pipeline.*hide-fail/)
    assert.match(text, /pipeline.*show-fail/)
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
    await until(() => document.getElementById('innfo-tab-pipeline').classList.contains('active'))
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
    const { document } = bootConsole({ registry, config: { needs: [], defaultView: 'pipeline' } })
    const panel = document.getElementById('innfo-tab-pipeline')
    assert.match(panel.textContent, /boom/)
    assert.match(document.getElementById('innfo-view-errors').textContent, /pipeline.*boom/)
    document.querySelector('.innfo-view-tab[data-tab="explorer"]').click()
    assert.ok(document.getElementById('innfo-tab-explorer').classList.contains('active'))
    document.querySelector('.innfo-view-tab[data-tab="pipeline"]').click()
    assert.match(panel.textContent, /boom/)
  })

  it('mounts an external "canonical" view (no built-in uses that id anymore)', () => {
    const registry = InnfoConsole.createViewRegistry()
    let mounts = 0
    registry.register(def({ id: 'canonical', mount: () => mounts++ }))
    const { document } = bootConsole({ registry })
    assert.equal(document.getElementById('innfo-view-errors'), null)
    assert.ok(document.getElementById('innfo-tab-canonical'))
    document.querySelector('.innfo-view-tab[data-tab="canonical"]').click()
    assert.equal(mounts, 1)
  })
})

describe('panel id collisions', () => {
  for (const id of ['domain', 'studio']) {
    it(`rejects an external "${id}" view instead of mounting into the existing panel`, () => {
      const registry = InnfoConsole.createViewRegistry()
      let mounts = 0
      registry.register(def({ id, mount: () => mounts++ }))
      const { document } = bootConsole({
        registry,
        before(doc) {
          const legacy = doc.createElement('div')
          legacy.id = `innfo-tab-${id}`
          legacy.innerHTML = '<p id="legacy-content">legacy</p>'
          doc.querySelector('main').appendChild(legacy)
        },
      })
      const panel = document.getElementById(`innfo-tab-${id}`)
      assert.equal(mounts, 0)
      assert.equal(panel.innerHTML, '<p id="legacy-content">legacy</p>')
      assert.equal(document.querySelector(`.innfo-view-tab[data-tab="${id}"]`), null)
      assert.match(document.getElementById('innfo-view-errors').textContent, new RegExp(`${id}.*panel`))
    })
  }
})

describe('shell without <main>', () => {
  it('reports a view that has no panel instead of throwing out of boot or click', () => {
    const registry = InnfoConsole.createViewRegistry()
    let mounts = 0
    registry.register(
      def({
        mount() {
          mounts++
          throw new Error('boom')
        },
      }),
    )
    let booted
    assert.doesNotThrow(() => {
      booted = bootConsole({
        registry,
        config: { needs: [], defaultView: 'pipeline' },
        before(doc) {
          const nav = doc.createElement('nav')
          nav.id = 'innfo-view-tabs'
          doc.body.appendChild(nav)
          doc.querySelector('main').remove()
        },
      })
    })
    const { document } = booted
    assert.equal(mounts, 0)
    assert.match(document.getElementById('innfo-view-errors').textContent, /pipeline.*panel/)
    assert.doesNotThrow(() => {
      document.querySelector('.innfo-view-tab[data-tab="explorer"]').click()
      document.querySelector('.innfo-view-tab[data-tab="pipeline"]').click()
    })
  })
})

describe('booting twice on one document', () => {
  const failing = () =>
    def({
      order: -10,
      mount() {
        throw new Error('boom')
      },
    })

  it('does not duplicate notices or error content', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(failing())
    const model = { ...MODEL, rows: [{}], meta: { ...MODEL.meta, months: 3 } }
    const { document } = bootConsole({ registry, model, config: { needs: [], defaultView: 'pipeline' } })
    const before = document.querySelectorAll('#innfo-view-errors p').length
    assert.equal(before, 1)
    InnfoConsole.boot(document, { registry })
    assert.equal(document.querySelectorAll('#innfo-view-errors p').length, before)
    assert.equal(document.querySelectorAll('#innfo-tab-pipeline .innfo-view-error').length, 1)
    assert.equal(registry.errors().length, 0)
  })

  it('tears down the previous boot listeners', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def())
    const { dom, document } = bootConsole({
      registry,
      before(doc) {
        const win = doc.defaultView
        const live = new Set()
        const add = win.addEventListener.bind(win)
        const remove = win.removeEventListener.bind(win)
        win.addEventListener = (type, fn, o) => (type === 'hashchange' && live.add(fn), add(type, fn, o))
        win.removeEventListener = (type, fn, o) => (live.delete(fn), remove(type, fn, o))
        win.__live = live
      },
    })
    const one = dom.window.__live.size
    InnfoConsole.boot(document, { registry })
    assert.equal(dom.window.__live.size, one)
  })

  it('renders once per search input after a second boot', () => {
    const registry = InnfoConsole.createViewRegistry()
    registry.register(def())
    const { dom, document } = bootConsole({ registry })
    InnfoConsole.boot(document, { registry })
    let rendered = 0
    document.addEventListener('innfo:rendered', () => rendered++)
    const box = document.getElementById('innfo-search')
    box.value = 'ecto'
    box.dispatchEvent(new dom.window.Event('input'))
    assert.equal(rendered, 1)
  })
})
