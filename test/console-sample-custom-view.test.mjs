import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, cp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { JSDOM } from 'jsdom'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')
const samples = resolve(here, '..', '_samples_nn')
const VIEW_ID = 'missing-descriptions'

describe('sample custom view (_samples_nn/consoles/views/missing-descriptions.js)', () => {
  let tmp
  let html

  before(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'nn-sample-view-'))
    await cp(samples, tmp, { recursive: true })
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, tmp, '--domain'], {
      maxBuffer: 64 * 1024 * 1024,
    })
    assert.match(stdout, /size: total \d+ B/)
    html = await readFile(join(tmp, 'domaiNN_console.html'), 'utf-8')
  })

  after(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  const boot = async () => {
    const dom = new JSDOM(html, {
      url: 'http://localhost',
      runScripts: 'dangerously',
      beforeParse(w) {
        w.matchMedia = () => ({
          matches: false,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent: () => false,
        })
      },
    })
    await new Promise((ok) => dom.window.addEventListener('load', ok))
    return dom
  }

  it('is exported by --domain and listed in the header', () => {
    const header = html.match(/<!-- innfo-views[\s\S]*?-->/)[0]
    assert.match(header, new RegExp(`^${VIEW_ID} domaiNN domaiNN:consoles/views/${VIEW_ID}\\.js sha256:[0-9a-f]{12}$`, 'm'))
  })

  it('registers under its file slug and lists elements without a description', async () => {
    const dom = await boot()
    const doc = dom.window.document
    assert.equal(doc.getElementById('innfo-view-errors'), null, 'registered without errors')
    const tab = doc.querySelector(`#innfo-view-tabs [data-tab="${VIEW_ID}"]`)
    assert.ok(tab, 'tab present')
    tab.click()
    const rows = doc.querySelectorAll(`#innfo-tab-${VIEW_ID} [data-element-id]`)
    assert.ok(rows.length > 0, 'lists elements')
    const model = JSON.parse(doc.getElementById('innfo-model').textContent)
    const missing = model.elements.filter((e) => !String(e.description ?? '').trim())
    assert.equal(rows.length, missing.length, 'exactly the elements without a description')
  })

  it('proposes a description change that lands in the single changeset', async () => {
    const dom = await boot()
    const doc = dom.window.document
    doc.querySelector(`#innfo-view-tabs [data-tab="${VIEW_ID}"]`).click()
    const row = doc.querySelector(`#innfo-tab-${VIEW_ID} [data-element-id]`)
    const id = row.dataset.elementId
    row.querySelector('input').value = 'A proposed description.'
    row.querySelector('button').click()

    const hostWindow = dom.window
    const state = hostWindow.InnfoConsole
    assert.ok(state, 'runtime present')
    // The Changes tab count and the exported changeset both see the draft.
    const reviewTab = doc.querySelector('#innfo-view-tabs [data-tab="review"]')
    assert.match(reviewTab.textContent, /1/)
    reviewTab.click()
    assert.match(doc.getElementById('innfo-tab-review').textContent, /A proposed description\./)
    const key = Object.keys(hostWindow.localStorage)[0]
    const stored = JSON.parse(hostWindow.localStorage.getItem(key))
    assert.equal(stored.drafts.length, 1)
    assert.equal(stored.drafts[0].proposed, 'A proposed description.')
    assert.equal(stored.drafts[0].field, 'description')
    assert.equal(stored.drafts[0].element_id, id)
    // The runtime's own export composer turns that draft into the changeset.
    const composed = state.composeExport(
      { store: { drafts: () => stored.drafts }, modelTitle: 'Sample', modelVersion: 'V_1-0-0', modelId: 'sample', meta: {} },
      'tester',
    )
    assert.equal(composed.ok, true, String(composed.errors))
    assert.equal(composed.items, 1)
    assert.match(composed.changesetText, /A proposed description./)
    assert.ok(composed.changesetText.includes(id))
  })
})
