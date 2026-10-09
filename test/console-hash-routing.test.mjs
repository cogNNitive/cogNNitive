import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InnfoConsole, bootConsole } from './helpers/console-boot.mjs'

const view = {
  id: 'pipeline',
  title: 'Pipeline',
  icon: 'chart',
  order: 20,
  kind: 'editable',
  mount() {},
}

async function until(cond, ms = 2000) {
  const end = Date.now() + ms
  while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 10))
}

function boot(url) {
  const registry = InnfoConsole.createViewRegistry()
  registry.register(view)
  const booted = bootConsole({ registry, url })
  const { dom, document } = booted
  return {
    ...booted,
    hash: () => dom.window.location.hash,
    tab: (id) => document.querySelector(`.innfo-view-tab[data-tab="${id}"]`),
    active: (id) => document.getElementById(`innfo-tab-${id}`).classList.contains('active'),
    search(value) {
      const box = document.getElementById('innfo-search')
      box.value = value
      box.dispatchEvent(new dom.window.Event('input'))
    },
    query: () => document.getElementById('innfo-search').value,
  }
}

describe('tab and search query share the hash', () => {
  it('keeps the query when a tab is clicked after searching', () => {
    const t = boot('http://localhost')
    t.search('ecto')
    assert.equal(t.hash(), '#explorer&q=ecto')
    t.tab('matrices').click()
    assert.equal(t.hash(), '#matrices&q=ecto')
    assert.ok(t.active('matrices'))
    assert.equal(t.query(), 'ecto')
  })

  it('keeps the tab when searching after a tab click', () => {
    const t = boot('http://localhost')
    t.tab('explorer').click()
    assert.equal(t.hash(), '#explorer')
    t.search('ecto')
    assert.equal(t.hash(), '#explorer&q=ecto')
    t.search('')
    assert.equal(t.hash(), '#explorer')
  })

  it('does not yank the user off a tab on a refresh that does not change the query', () => {
    const t = boot('http://localhost')
    t.search('ecto')
    t.tab('matrices').click()
    t.search('ecto')
    assert.ok(t.active('matrices'))
  })

  it('still honors the bare #q= hash on load', () => {
    const t = boot('http://localhost/#q=ecto')
    assert.equal(t.query(), 'ecto')
    assert.ok(t.active('explorer'))
  })

  it('restores tab and query on reload', () => {
    const first = boot('http://localhost')
    first.search('ecto')
    first.tab('matrices').click()
    const reloaded = boot(first.dom.window.location.href)
    assert.ok(reloaded.active('matrices'))
    assert.equal(reloaded.query(), 'ecto')
    assert.equal(reloaded.hash(), '#matrices&q=ecto')
  })

  it('selects tab and query on back and forward', async () => {
    const t = boot('http://localhost')
    t.tab('explorer').click()
    t.search('ecto')
    t.tab('matrices').click()
    assert.equal(t.hash(), '#matrices&q=ecto')
    t.dom.window.history.back()
    await until(() => t.hash() === '#explorer&q=ecto' && t.active('explorer'))
    assert.ok(t.active('explorer'))
    assert.equal(t.query(), 'ecto')
    t.dom.window.history.back()
    await until(() => t.hash() === '#explorer' && t.query() === '')
    assert.equal(t.query(), '')
    t.dom.window.history.forward()
    await until(() => t.hash() === '#explorer&q=ecto' && t.query() === 'ecto')
    assert.equal(t.query(), 'ecto')
    assert.ok(t.active('explorer'))
  })
})
