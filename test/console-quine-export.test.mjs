import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  decodedModelTextOf,
  draftsOf,
  modelOf,
  modelSlotMarkup,
  slotTextOf,
} from './helpers/console-slots.mjs'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'nn-runtime.js')
const uiKitPath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'ui-kit.js')
const reviewPath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js')

const nnConsole = require(runtimePath)
const nnUI = require(uiKitPath)
const nnReview = require(reviewPath)
const nnFsa = require(join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'nn-fsa.js'))

describe('Console Self-Saving Quine & AI Prompt Export Contract', () => {
  let dom
  let window
  let document

  const sampleSchema = {
    concepts: [{ name: 'ParanormalThreat' }, { name: 'ContainmentEquipment' }],
    fields: [
      { name: 'severity', concept: 'ParanormalThreat', type: 'string' },
      { name: 'capacity', concept: 'ContainmentEquipment', type: 'string' },
    ],
  }

  const sampleModel = {
    meta: {
      domainId: 'ghostbusters-hq',
      modelId: 'ghostbusters-model',
      title: 'GhostbustersModel',
      modelVersion: 'V_0-2-1',
      sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      changesBlueprintVersion: 'V_0-1-0',
    },
    elements: [
      {
        id: 'threat-slimer',
        concept: 'ParanormalThreat',
        name: 'Slimer',
        slug: 'slimer',
        hash: 'abcdef0123456789',
        fields: { severity: 'Class V' },
      },
      {
        id: 'equip-trap',
        concept: 'ContainmentEquipment',
        name: 'Ghost Trap',
        slug: 'ghost-trap',
        hash: 'fedcba9876543210',
        fields: { capacity: '1 entity' },
      },
    ],
    matrices: [],
    changes: [],
  }

  function createConsoleHtml(modelData, schemaData, configData) {
    return `<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <title>Ghostbusters Console</title>
  </head>
  <body>
    <header class="nn-navbar">
      <div class="nn-brand">
        <h1 class="nn-domain-title" id="nn-domain-title">Ghostbusters Console</h1>
        <div class="nn-mode" id="nn-navbar-extra"></div>
      </div>
      <nav id="nn-view-tabs" class="nn-view-tabs"></nav>
      <div class="nn-navbar-actions" id="nn-navbar-actions"></div>
    </header>

    <div id="nn-layout">
      <aside class="nn-rail"><nav id="nn-rail"></nav></aside>
      <main>
        <div class="nn-toolbar">
          <input id="nn-search" type="search" placeholder="Search..." />
        </div>
        <div id="nn-tab-explorer" class="nn-tab-panel active">
          <div id="nn-doc"></div>
          <div id="nn-content"></div>
          <div id="nn-matrices"></div>
        </div>
        <div id="nn-tab-review" class="nn-tab-panel"></div>
      </main>
    </div>

    <script type="application/json" id="nn-config">${JSON.stringify(configData || { needs: ['feedback-export', 'concept-rail'] })}</script>
    <script type="application/json" id="nn-schema">${JSON.stringify(schemaData || sampleSchema)}</script>
    ${modelSlotMarkup(modelData || sampleModel)}
    <script type="application/json" id="nn-drafts">{}</script>
  </body>
</html>`
  }

  /** Boots a document whose compressed nn-model slot is pre-decoded with the Node codec. */
  const bootDoc = (doc) => nnConsole.boot(doc, { modelText: decodedModelTextOf(doc) })

  beforeEach(() => {
    dom = new JSDOM(createConsoleHtml(), { url: 'http://localhost' })
    window = dom.window
    document = window.document
    global.window = window
    global.document = document
    global.CustomEvent = window.CustomEvent
    global.localStorage = window.localStorage
    global.Blob = window.Blob
    global.URL = window.URL
    window.localStorage.clear()
  })

  afterEach(() => {
    if (window && window.localStorage) {
      window.localStorage.clear()
    }
  })

  describe('1. In-Place Self-Saving Mechanism (Quine Pattern)', () => {
    it('writes drafts and UI state into #nn-drafts and keeps #nn-model compressed', async () => {
      const bootRes = bootDoc(document)
      assert.ok(bootRes.ok, 'Console boot succeeded')
      const state = bootRes.state

      // Propose an edit (draft)
      state.store.addDraft({
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        element_slug: 'slimer',
        kind: 'correction',
        field: 'severity',
        original: 'Class V',
        proposed: 'Class VII (Vigorous)',
        comment: 'Escalated threat assessment',
        base_hash: 'abcdef0123456789',
      })

      // Add search query
      const searchBox = document.getElementById('nn-search')
      searchBox.value = 'concept:ParanormalThreat'

      // Call saveSnapshot with forceDownload: true (fallback mode)
      const res = await nnConsole.saveSnapshot(document, state, { forceDownload: true })
      assert.ok(res.ok, 'saveSnapshot succeeded')
      assert.equal(res.draftsCount, 1)

      // The drafts and the UI state live in the plain JSON nn-drafts slot:
      const saved = draftsOf(res.html)
      assert.ok(Array.isArray(saved.drafts), 'nn-drafts has a drafts array')
      assert.equal(saved.drafts.length, 1)
      assert.equal(saved.drafts[0].proposed, 'Class VII (Vigorous)')
      assert.equal(saved.drafts[0].field, 'severity')
      assert.ok(saved.uiState, 'uiState is serialized')
      assert.equal(saved.uiState.searchQuery, 'concept:ParanormalThreat')
      assert.equal(saved.uiState.activeTab, 'explorer')
      assert.deepEqual(
        JSON.parse(document.getElementById('nn-drafts').textContent),
        saved,
        'the live DOM holds the same slot',
      )

      // The model stays compressed and carries neither drafts nor UI state:
      const modelText = slotTextOf(res.html, 'nn-model').trim()
      assert.match(modelText, /^[A-Za-z0-9+/=]+$/, 'nn-model is base64')
      const savedModel = modelOf(res.html)
      assert.equal(savedModel.drafts, undefined)
      assert.equal(savedModel.uiState, undefined)
      assert.deepEqual(
        savedModel.elements.map((e) => e.id),
        ['threat-slimer', 'equip-trap'],
      )
      assert.equal(savedModel.meta.modelId, 'ghostbusters-model')

      // Verify complete HTML serialization:
      assert.ok(res.html.startsWith('<!DOCTYPE html>\n'), 'HTML starts with <!DOCTYPE html>\\n')
      assert.ok(
        res.html.includes('Class VII (Vigorous)'),
        'HTML contains proposed draft content (plain JSON drafts)',
      )
      assert.ok(
        !res.html.includes('data-nn-console-booted="true"'),
        'data-nn-console-booted attribute is stripped for re-booting',
      )

      // Verify live DOM keeps its boot attribute intact:
      assert.equal(document.documentElement.getAttribute('data-nn-console-booted'), 'true')
    })

    it('escapes < in the drafts slot so a draft cannot close the script element', async () => {
      const state = bootDoc(document).state
      state.store.addDraft({
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        element_slug: 'slimer',
        kind: 'comment',
        comment: '</script><script>alert(1)</script>',
        base_hash: 'abcdef0123456789',
      })
      const res = await nnConsole.saveSnapshot(document, state, { forceDownload: true })
      assert.ok(res.ok, String(res.error))
      const raw = slotTextOf(res.html, 'nn-drafts')
      assert.equal(raw.includes('<'), false, 'no raw < inside the slot')
      assert.ok(raw.includes('\\u003c/script>'), 'the markup is escaped as \\u003c')
      assert.equal(
        draftsOf(res.html).drafts[0].comment,
        '</script><script>alert(1)</script>',
        'and decodes back verbatim',
      )
    })

    it('writes no _concept* runtime keys into the saved model elements (#718)', async () => {
      const state = bootDoc(document).state
      assert.ok(
        state.elements.some((e) => Object.keys(e).some((k) => k.startsWith('_concept'))),
        'the live state is decorated, so the save has something to strip',
      )
      const res = await nnConsole.saveSnapshot(document, state, { forceDownload: true })
      assert.ok(res.ok, String(res.error))
      for (const element of modelOf(res.html).elements) {
        assert.deepEqual(
          Object.keys(element).filter((k) => k.startsWith('_concept')),
          [],
          element.id,
        )
      }
      assert.deepEqual(
        modelOf(res.html).elements.map((e) => e.id),
        ['threat-slimer', 'equip-trap'],
      )
    })

    it('saves the exported shell, not the rendered DOM: markup outside <script> is unchanged (#718)', async () => {
      const markupOutsideScripts = (html) => {
        const doc = new JSDOM(html).window.document
        for (const s of [...doc.querySelectorAll('script')]) s.remove()
        return doc.documentElement.outerHTML
      }
      const exported = markupOutsideScripts(createConsoleHtml())
      const state = bootDoc(document).state
      assert.notEqual(
        markupOutsideScripts(document.documentElement.outerHTML),
        exported,
        'the boot rendered into the live DOM',
      )
      state.store.addDraft({
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        element_slug: 'slimer',
        kind: 'comment',
        comment: 'kept',
        base_hash: 'abcdef0123456789',
      })
      const res = await nnConsole.saveSnapshot(document, state, { forceDownload: true })
      assert.ok(res.ok, String(res.error))
      assert.equal(markupOutsideScripts(res.html), exported)
      assert.equal(draftsOf(res.html).drafts[0].comment, 'kept', 'the slots still carry the save')
      assert.ok(!res.html.includes('data-nn-console-booted'), 'the saved page boots again')
    })

    it('starts from the decoded model, so keys the state does not hold (files) survive a save', async () => {
      const files = {
        inventory: [
          {
            id: 'sources/a.md',
            path: 'sources/a.md',
            category: 'source',
            size: 10,
            sha256: 'a'.repeat(64),
            mimeType: 'text/markdown',
            mtime: '2026-11-01T10:00:00.000Z',
            citationsCount: 0,
            excerptCount: 0,
          },
        ],
      }
      const withFiles = { ...sampleModel, files, collections: { custom: ['kept'] } }
      dom = new JSDOM(createConsoleHtml(withFiles), { url: 'http://localhost' })
      document = dom.window.document
      global.window = dom.window
      global.document = document
      const state = bootDoc(document).state
      const res = await nnConsole.saveSnapshot(document, state, { forceDownload: true })
      assert.ok(res.ok, String(res.error))
      const saved = modelOf(res.html)
      assert.deepEqual(saved.files, files, 'model.files is kept')
      assert.deepEqual(saved.collections, { custom: ['kept'] }, 'an unknown model key is kept')
    })

    it('refuses to save a document whose model slot was never decoded, instead of dropping keys', async () => {
      const state = bootDoc(document).state
      const undecoded = new JSDOM(createConsoleHtml(), { url: 'http://localhost' }).window.document
      const res = await nnConsole.saveSnapshot(undecoded, state, { forceDownload: true })
      assert.equal(res.ok, false)
      assert.match(res.error, /nn-model slot is compressed/)
    })

    it('uses File System Access API (window.showSaveFilePicker) when supported', async () => {
      const bootRes = bootDoc(document)
      const state = bootRes.state

      let pickerCalled = false
      let writtenPayload = ''
      let writableClosed = false

      window.showSaveFilePicker = async (options) => {
        pickerCalled = true
        assert.ok(options.suggestedName.endsWith('.html'), 'suggestedName ends with .html')
        assert.equal(options.types[0].accept['text/html'][0], '.html')
        return {
          name: options.suggestedName,
          createWritable: async () => ({
            write: async (content) => {
              writtenPayload = content
            },
            close: async () => {
              writableClosed = true
            },
          }),
        }
      }

      const res = await nnConsole.saveSnapshot(document, state)
      assert.ok(res.ok, 'saveSnapshot succeeded with File System Access')
      assert.equal(res.method, 'file-system-access')
      assert.ok(pickerCalled, 'showSaveFilePicker was called')
      assert.ok(writableClosed, 'File handle was closed')
      assert.ok(writtenPayload.includes('<!DOCTYPE html>'), 'File content holds full document')
    })

    it('overwrites the remembered file with no picker on the second save', async () => {
      const bootRes = bootDoc(document)
      const state = bootRes.state

      const handle = {
        name: 'ana_domaiNN_console.html',
        written: '',
        async createWritable() {
          const self = handle
          return {
            async write(value) {
              self.written = value
            },
            async close() {},
          }
        },
        queryPermission: async () => 'granted',
      }
      const map = new Map()
      const store = {
        get: async (key) => map.get(key) || null,
        set: async (key, value) => {
          map.set(key, value)
        },
      }
      const key = nnFsa.snapshotKey({
        domainId: (state.meta && state.meta.domainId) || '',
        name: 'domaiNN_console.html',
      })
      await store.set(key, handle)
      window.nnFsa = {
        createIndexedDbStore: () => store,
        snapshotKey: nnFsa.snapshotKey,
        saveToRememberedFile: nnFsa.saveToRememberedFile,
      }

      let pickerCalled = false
      window.showSaveFilePicker = async () => {
        pickerCalled = true
        throw new Error('the picker must not open on a remembered save')
      }

      const res = await nnConsole.saveSnapshot(document, state, {
        suggestedName: 'domaiNN_console.html',
      })

      assert.equal(res.ok, true)
      assert.equal(res.inPlace, true, 'the save reports an in-place write')
      assert.equal(res.filename, 'ana_domaiNN_console.html')
      assert.equal(pickerCalled, false, 'no dialog on the second save')
      assert.ok(handle.written.includes('<!DOCTYPE html>'), 'the same file received the page')

      delete window.nnFsa
    })

    it('proposes the file the console was opened from, not a title-derived name', async () => {
      const fileDom = new JSDOM(createConsoleHtml(), {
        url: 'file:///C:/Users/ana/Downloads/domaiNN_console.html',
      })
      const fileDoc = fileDom.window.document
      const bootRes = bootDoc(fileDoc)

      let suggested = ''
      let pickerOptions = null
      fileDom.window.showSaveFilePicker = async (options) => {
        pickerOptions = options
        suggested = options.suggestedName
        return {
          name: options.suggestedName,
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        }
      }

      const res = await nnConsole.saveSnapshot(fileDoc, bootRes.state)

      assert.ok(res.ok, 'save succeeded')
      assert.equal(suggested, 'domaiNN_console.html', 'the opened file name is proposed')
      assert.equal(pickerOptions.id, 'nn-console-snapshot', 'the picker remembers its folder')
    })

    it('gracefully handles user cancellation in showSaveFilePicker (AbortError)', async () => {
      const bootRes = bootDoc(document)
      const state = bootRes.state

      window.showSaveFilePicker = async () => {
        const err = new Error('The user aborted a request.')
        err.name = 'AbortError'
        throw err
      }

      const res = await nnConsole.saveSnapshot(document, state)
      assert.equal(res.ok, false)
      assert.equal(res.aborted, true)
    })
  })

  describe('2. "Copy Prompt for AI Agent" Action', () => {
    it('composes structured Markdown prompt with domain, address, changeset diff, and actionable instructions', () => {
      const bootRes = bootDoc(document)
      const state = bootRes.state

      state.store.addDraft({
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        element_slug: 'slimer',
        kind: 'correction',
        field: 'severity',
        original: 'Class V',
        proposed: 'Class VII',
        comment: 'Escalation by Dr. Spengler',
        base_hash: 'abcdef0123456789',
        knowledge_id: 'ghostbusters-model',
      })

      const prompt = nnConsole.composeAgentPrompt(state)
      assert.ok(typeof prompt === 'string')
      assert.ok(prompt.includes('# AI Agent Instructions: Apply Domain Console Changeset'))
      assert.ok(prompt.includes('GhostbustersModel'), 'Includes domain/model title')
      assert.ok(
        prompt.includes('ghostbusters-model@slimer&severity'),
        'Includes canonical target address',
      )
      assert.ok(prompt.includes('Class VII'), 'Includes proposed value')
      assert.ok(prompt.includes('apply_change'), 'Includes actionable apply_change instruction')
      assert.ok(
        prompt.includes('npm run build:console'),
        'Includes build verification instructions',
      )
    })

    it('copies agent prompt to clipboard and displays feedback toast', async () => {
      const bootRes = bootDoc(document)
      const state = bootRes.state

      let clipboardText = ''
      window.navigator.clipboard = {
        writeText: async (text) => {
          clipboardText = text
        },
      }

      const res = await nnConsole.copyAgentPrompt(document, state)
      assert.ok(res.ok, 'copyAgentPrompt succeeded')
      assert.ok(
        clipboardText.includes('# AI Agent Instructions'),
        'Clipboard received formatted prompt',
      )

      // Verify toast feedback:
      const toast = document.querySelector('[data-nn="toast"]')
      assert.ok(toast, 'Feedback toast was mounted')
      assert.match(toast.textContent, /Copied!/)
    })
  })

  describe('3. Rehydration Guarantee (End-to-End Quine Roundtrip)', () => {
    it('rehydrates 100% of modified state, drafts, overrides, and UI selections from a saved snapshot', async () => {
      // Step A: Boot instance 1
      const boot1 = bootDoc(document)
      const state1 = boot1.state

      // Step B: User modifications
      state1.store.addDraft({
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        element_slug: 'slimer',
        kind: 'correction',
        field: 'severity',
        original: 'Class V',
        proposed: 'Class X Supernatural',
        comment: 'Major hazard update',
        base_hash: 'abcdef0123456789',
        knowledge_id: 'ghostbusters-model',
      })

      state1.store.addDraft({
        knowledge_id: 'ghostbusters-model',
        concept: 'ParanormalThreat',
        element: 'Gozer the Gozerian',
        kind: 'new',
        proposed: { severity: 'Destructor' },
      })

      // Change UI state
      document.getElementById('nn-search').value = 'concept:ParanormalThreat'
      nnConsole.setReviewerName('Egon Spengler')

      // Step C: Save snapshot (extract Quine HTML)
      const saveRes = await nnConsole.saveSnapshot(document, state1, { forceDownload: true })
      assert.ok(saveRes.ok)
      const quineHtml = saveRes.html

      // Step D: Create a completely FRESH and isolated environment (Instance 2)
      // Different localStorage to simulate opening on another machine
      const freshDom = new JSDOM(quineHtml, { url: 'http://localhost/rehydrated.html' })
      const freshDoc = freshDom.window.document

      // The saved file grows no indentation: both slots are single compact lines.
      assert.equal(slotTextOf(quineHtml, 'nn-model').trim().includes('\n'), false)
      assert.equal(slotTextOf(quineHtml, 'nn-drafts').trim().includes('\n'), false)

      // Boot instance 2 from the quine HTML the way the page does: decode, then boot.
      const boot2 = await nnConsole.decodeAndBoot(freshDoc)
      assert.ok(boot2.ok, 'Fresh boot succeeded from quine HTML')
      const state2 = boot2.state

      // Step E: Verify 100% state rehydration
      const rehydratedDrafts = state2.store.drafts()
      assert.equal(rehydratedDrafts.length, 2, 'Both drafts restored in store')

      const slimerDraft = rehydratedDrafts.find((d) => d.element === 'Slimer')
      assert.ok(slimerDraft, 'Slimer draft restored')
      assert.equal(slimerDraft.proposed, 'Class X Supernatural')
      assert.equal(slimerDraft.comment, 'Major hazard update')

      const gozerDraft = rehydratedDrafts.find((d) => d.element === 'Gozer the Gozerian')
      assert.ok(gozerDraft, 'Gozer draft restored')
      assert.equal(gozerDraft.kind, 'new')

      // Verify UI selections rehydration:
      const searchBox2 = freshDoc.getElementById('nn-search')
      assert.equal(searchBox2.value, 'concept:ParanormalThreat', 'Search filter query rehydrated')
      assert.equal(nnConsole.getReviewerName(), 'Egon Spengler', 'Reviewer identity rehydrated')

      // Verify top-bar action badge reflects rehydrated drafts:
      const badgeCount = freshDoc.querySelector('.nn-navbar-action-btn .nn-badge-count')
      assert.ok(badgeCount, 'Badge count rendered on action button')
      assert.equal(badgeCount.textContent, '2')
    })
  })

  describe('4. TopBarActions UI Kit & Header Integration', () => {
    it('mounts Save Snapshot and Copy AI Prompt buttons into #nn-navbar-actions', () => {
      bootDoc(document)

      const actionsContainer = document.getElementById('nn-navbar-actions')
      assert.ok(actionsContainer, '#nn-navbar-actions exists')

      const saveBtn = actionsContainer.querySelector('[data-nn="save-snapshot"]')
      assert.ok(saveBtn, 'Save Snapshot button is rendered in navbar')
      assert.match(saveBtn.textContent, /Save Snapshot/)

      const copyBtn = actionsContainer.querySelector('[data-nn="copy-agent-prompt"]')
      assert.ok(copyBtn, 'Copy AI Prompt button is rendered in navbar')
      assert.match(copyBtn.textContent, /Copy AI Prompt/)
    })

    it('TopBarActions updates draft count dynamically on user edits', () => {
      const bootRes = bootDoc(document)
      const state = bootRes.state

      const saveBtn = document.querySelector('[data-nn="save-snapshot"]')
      assert.equal(saveBtn.querySelector('.nn-badge-count'), null, 'No badge when 0 drafts')

      // Add draft
      state.store.addDraft({
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        kind: 'comment',
        comment: 'Checked',
        base_hash: 'abcdef0123456789',
      })

      // Trigger surface refresh
      state.refreshUi()

      const saveBtnUpdated = document.querySelector('[data-nn="save-snapshot"]')
      const badge = saveBtnUpdated.querySelector('.nn-badge-count')
      assert.ok(badge, 'Badge appears after draft is added')
      assert.equal(badge.textContent, '1')
    })
  })
})
