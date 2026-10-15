import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, cp, readFile, readdir } from 'node:fs/promises'
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
  let scopedHtml

  before(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'nn-sample-view-'))
    await cp(samples, tmp, { recursive: true })
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, tmp, '--domain', '--no-open'], {
      maxBuffer: 64 * 1024 * 1024,
    })
    assert.match(stdout, /size: total \d+ B/)
    html = await readFile(join(tmp, 'domaiNN_console.html'), 'utf-8')
    await execFileAsync(process.execPath, [scriptPath, tmp, '--view', VIEW_ID, '--no-open'], { maxBuffer: 64 * 1024 * 1024 })
    const dir = join(tmp, 'artifacts', `${VIEW_ID}_view`)
    const [name] = await readdir(dir)
    scopedHtml = await readFile(join(dir, name), 'utf-8')
  })

  after(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  const boot = async (source = html) => {
    const dom = new JSDOM(source, {
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

  // Drives the console's own export UI and captures the changeset it would download.
  const exportChangeset = (dom) => {
    const doc = dom.window.document
    const downloads = []
    dom.window.Blob = class {
      constructor(parts) {
        this.text = parts.join('')
      }
    }
    dom.window.URL.createObjectURL = (blob) => {
      downloads.push({ text: blob.text })
      return 'blob:test'
    }
    dom.window.URL.revokeObjectURL = () => {}
    dom.window.HTMLAnchorElement.prototype.click = function () {
      if (this.download) downloads[downloads.length - 1].filename = this.download
    }
    doc.getElementById('innfo-feedback-open').click()
    const identifier = doc.querySelector('#innfo-feedback-modal [data-innfo="identifier"]')
    identifier.value = 'tester'
    identifier.dispatchEvent(new dom.window.Event('input'))
    doc.querySelector('#innfo-feedback-modal [data-innfo="download-changeset"]').click()
    return downloads
  }

  it('proposes a description in the scoped console and exports it in the single changeset', async () => {
    const dom = await boot(scopedHtml)
    const doc = dom.window.document
    assert.equal(doc.getElementById('innfo-view-errors'), null)
    const row = doc.querySelector(`#innfo-tab-${VIEW_ID} [data-element-id]`)
    const id = row.dataset.elementId
    row.querySelector('input').value = 'A proposed description.'
    row.querySelector('button').click()

    assert.match(doc.querySelector('#innfo-review-dock .innfo-dock-drafts').textContent, /Drafts:\s*1/)
    const downloads = exportChangeset(dom)
    assert.equal(downloads.length, 1, 'a single changeset')
    const [{ text, filename }] = downloads
    assert.match(filename, new RegExp(`-${VIEW_ID}_tester_.+_changes_NN\.md$`))
    assert.match(text, new RegExp(`title: "[^"]+ - Missing descriptions"`))
    // The target is the model address (the console id is `<model id>@<element slug>`), not the console id.
    const modelAddress = id.slice(0, id.lastIndexOf('@'))
    assert.ok(text.includes(`target:: ${modelAddress}@`), 'the change targets the element in its model')
    assert.equal(text.match(/A proposed description./g).length, 1, 'one proposal')
  })

  it('locks a proposed row so repeated clicks cannot stack duplicate proposals', async () => {
    const dom = await boot()
    const doc = dom.window.document
    doc.querySelector(`#innfo-view-tabs [data-tab="${VIEW_ID}"]`).click()
    const row = doc.querySelector(`#innfo-tab-${VIEW_ID} [data-element-id]`)
    const input = row.querySelector('input')
    const button = row.querySelector('button')
    input.value = 'First.'
    button.click()
    assert.equal(button.disabled, true)
    assert.equal(input.disabled, true)
    assert.equal(button.textContent, 'Proposed')
    input.value = 'Second.'
    button.click()
    button.click()
    const stored = JSON.parse(dom.window.localStorage.getItem(Object.keys(dom.window.localStorage)[0]))
    assert.equal(stored.drafts.length, 1)
    assert.equal(stored.drafts[0].proposed, 'First.')
  })
})
