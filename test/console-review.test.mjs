import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-runtime.js')
const InnfoConsole = require(runtimePath)

describe('Console Review Workflow & Feedback Roundtrip Contract', () => {
  let dom
  let window
  let document

  beforeEach(() => {
    dom = new JSDOM(
      `<!doctype html>
<html>
  <head></head>
  <body>
    <div id="innfo-layout">
      <nav id="innfo-rail"></nav>
      <main>
        <div class="innfo-toolbar">
          <input id="innfo-search" type="search" />
        </div>
        <nav id="innfo-view-tabs" class="innfo-view-tabs"></nav>
        <div id="innfo-tab-explorer" class="innfo-tab-panel active">
          <div id="innfo-doc"></div>
          <div id="innfo-content"></div>
          <div id="innfo-matrices"></div>
        </div>
        <div id="innfo-tab-domain" class="innfo-tab-panel"></div>
        <div id="innfo-tab-review" class="innfo-tab-panel"></div>
      </main>
    </div>
  </body>
</html>`,
      { url: 'http://localhost' },
    )
    window = dom.window
    document = window.document
    global.window = window
    global.document = document
    global.localStorage = window.localStorage
    window.localStorage.clear()
  })

  afterEach(() => {
    if (window && window.localStorage) {
      window.localStorage.clear()
    }
  })

  describe('Legacy Symbols Removal Contract', () => {
    it('asserts legacy review functions and patterns are absent from InnfoConsole', () => {
      assert.equal(InnfoConsole.buildReviewDoc, undefined)
      assert.equal(InnfoConsole.validateReviewDoc, undefined)
      assert.equal(InnfoConsole.serializeReviewDoc, undefined)
      assert.equal(InnfoConsole.buildReviewFilename, undefined)
      assert.equal(InnfoConsole.parseReviewFilename, undefined)
      assert.equal(InnfoConsole.REVIEW_FILENAME_PATTERN, undefined)
      assert.equal(InnfoConsole.updateDraftStatus, undefined)
      assert.equal(InnfoConsole.updateStatus, undefined)
    })
  })

  describe('Reviewer Identity & Banner Chip', () => {
    it('defaults reviewer name to "reviewer" when localStorage is empty', () => {
      assert.equal(InnfoConsole.getReviewerName(), 'reviewer')
    })

    it('persists updated reviewer name in localStorage and retrieves it', () => {
      InnfoConsole.setReviewerName('Jane Doe')
      assert.equal(InnfoConsole.getReviewerName(), 'Jane Doe')
      assert.equal(window.localStorage.getItem(InnfoConsole.REVIEWER_STORAGE_KEY), 'Jane Doe')
    })

    it('slugifies reviewer name accurately with underscores', () => {
      assert.equal(InnfoConsole.slugifyReviewer('Jane Doe'), 'jane_doe')
      assert.equal(InnfoConsole.slugifyReviewer('  Dr. John--Smith  '), 'dr_john_smith')
      assert.equal(InnfoConsole.slugifyReviewer(''), 'reviewer')
      assert.equal(InnfoConsole.slugifyReviewer(null), 'reviewer')
    })

    it('renders reviewer chip in header banner with inline edit support', () => {
      InnfoConsole.setReviewerName('Alice')
      const banner = document.createElement('header')
      banner.id = 'innfo-feedback-banner'
      document.body.appendChild(banner)

      InnfoConsole.renderBanner(
        document,
        { title: 'Ghostbusters', modelVersion: 'V_0-2-1' },
        ['concept-rail'],
        0,
      )

      const chip = banner.querySelector('.innfo-reviewer-chip')
      assert.ok(chip, 'Reviewer chip exists in banner')
      const nameInput = chip.querySelector('.innfo-reviewer-name')
      assert.ok(nameInput, 'Reviewer name field exists in reviewer chip')
      assert.equal(nameInput.tagName, 'INPUT', 'reviewer field is an inline text input')
      assert.equal(nameInput.value, 'Alice')
    })
  })

  describe('Review Tab without Status Select', () => {
    it('renders Review Tab without any .innfo-review-status-select dropdown', () => {
      const InnfoReview = require(
        join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js'),
      )
      const store = InnfoReview.createDraftStore(window.localStorage, 'business-model')
      const state = {
        modelTitle: 'BusinessModel',
        modelVersion: 'V_1-2-0',
        elements: [
          { id: 'ent-tier', concept: 'RevenueStream', name: 'Enterprise Tier', hash: '0123456789abcdef' },
        ],
        store,
      }

      store.addDraft({
        element_id: 'ent-tier',
        concept: 'RevenueStream',
        element: 'Enterprise Tier',
        kind: 'correction',
        field: 'pricing',
        comment: 'Updated seat minimum to 50',
        base_hash: '0123456789abcdef',
      })

      InnfoConsole.renderReviewTab(document, state, { needs: [] })

      const reviewTab = document.getElementById('innfo-tab-review')
      assert.ok(reviewTab)

      const statusSelect = reviewTab.querySelector('.innfo-review-status-select')
      assert.equal(
        statusSelect,
        null,
        'No .innfo-review-status-select element rendered in review tab',
      )

      assert.ok(
        reviewTab.querySelector('[data-innfo-component="draft-list"]'),
        'Review tab renders through InnfoUI.DraftList',
      )
      const items = reviewTab.querySelectorAll('.innfo-draft-row')
      assert.equal(items.length, 1)
      assert.match(items[0].textContent, /Updated seat minimum to 50/)
    })

    function reviewTabFor(elementHash) {
      const InnfoReview = require(
        join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js'),
      )
      window.localStorage.clear()
      const store = InnfoReview.createDraftStore(window.localStorage, 'stale-model')
      const state = {
        modelTitle: 'Stale',
        modelVersion: 'V_1-0-0',
        elements: [{ id: 'e1', concept: 'C', name: 'Alpha', hash: elementHash }],
        store,
      }
      store.addDraft({
        element_id: 'e1',
        concept: 'C',
        element: 'Alpha',
        kind: 'comment',
        comment: 'needs a look',
        base_hash: '1111111111111111',
      })
      store.addDraft({ knowledge_id: 'stale-model', concept: 'C', element: 'Fresh', kind: 'new' })
      InnfoConsole.renderReviewTab(document, state, { needs: [] })
      return { tab: document.getElementById('innfo-tab-review'), state, store }
    }

    it('flags a draft whose target element hash changed since it was written', () => {
      const { tab } = reviewTabFor('2222222222222222')
      const rows = [...tab.querySelectorAll('.innfo-draft-row')]
      assert.equal(rows.length, 2)
      assert.equal(rows[0].getAttribute('data-target-changed'), 'true')
      assert.ok(tab.querySelector('[data-innfo="stale-drafts"]'), 'review head names the stale drafts')
      // A proposed new element has no target yet, so it is never stale.
      assert.equal(rows[1].getAttribute('data-target-changed'), null)
    })

    it('does not flag drafts whose target hash still matches', () => {
      const { tab } = reviewTabFor('1111111111111111')
      assert.equal(tab.querySelector('[data-target-changed="true"]'), null)
      assert.equal(tab.querySelector('[data-innfo="stale-drafts"]'), null)
    })

    it('offers to clear exported drafts and removes only those', () => {
      const { tab, state, store } = reviewTabFor('1111111111111111')
      assert.equal(tab.querySelector('[data-innfo="clear-exported"]'), null, 'nothing exported yet')

      const exported = store.drafts()[0].id
      state.exportedDraftIds = [exported]
      let refreshed = 0
      InnfoConsole.renderReviewTab(document, state, { needs: [] }, () => {
        refreshed++
      })
      const btn = document.getElementById('innfo-tab-review').querySelector('[data-innfo="clear-exported"]')
      assert.ok(btn)
      btn.click()
      assert.equal(refreshed, 1)
      assert.deepEqual(
        store.drafts().map((d) => d.element),
        ['Fresh'],
      )
    })

    it('deep-links from Review Tab to focus and highlight corresponding Element Card', () => {
      // Cards are now composed by InnfoUI (mountElementCards is private); this
      // suite only exercises focusElementCard's DOM contract: find by id,
      // scroll, highlight.
      const card = document.createElement('article')
      // Cards carry the `el-` prefixed domId (matching `#el-` hrefs); focusElementCard
      // takes the raw element id and resolves the prefixed node.
      card.id = 'el-ent-tier'
      document.getElementById('innfo-content').appendChild(card)
      let scrolled = false
      card.scrollIntoView = () => {
        scrolled = true
      }

      InnfoConsole.focusElementCard(document, 'ent-tier')

      assert.equal(scrolled, true, 'scrollIntoView was invoked on target card')
      assert.ok(card.classList.contains('innfo-highlight'), 'Card received highlight animation class')
    })
  })

  describe('EditModal & Changeset Export Contract (D13, D15)', () => {
    const UI = require(join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'ui-kit.js'))

    it('renders EditModal in Propose value mode and returns proposed result', () => {
      let saved = null
      const modal = UI.EditModal(
        {
          title: 'Edit Element -> Field',
          fieldName: 'status',
          type: 'string',
          value: 'active',
          isComment: false,
        },
        {
          doc: document,
          onSave: (res) => {
            saved = res
          },
        },
      )
      document.body.appendChild(modal)
      assert.ok(modal.querySelector('[data-innfo-widget="string"]'))

      const input = modal.querySelector('input.innfo-edit-input')
      input.value = 'archived'

      const saveBtn = modal.querySelector('.innfo-edit-btn-save')
      saveBtn.dispatchEvent(new window.Event('click', { bubbles: true }))

      assert.deepEqual(saved, {
        isComment: false,
        comment: '',
        proposed: 'archived',
      })
    })

    it('renders EditModal in Comment mode and returns review comment', () => {
      let saved = null
      const modal = UI.EditModal(
        {
          title: 'Comment Element',
          fieldName: 'status',
          type: 'string',
          value: 'active',
          isComment: true,
          comment: 'Initial note',
        },
        {
          doc: document,
          onSave: (res) => {
            saved = res
          },
        },
      )
      document.body.appendChild(modal)
      const ta = modal.querySelector('.innfo-edit-form-comment textarea')
      assert.equal(ta.value, 'Initial note')
      ta.value = 'Verify with legal team'

      const saveBtn = modal.querySelector('.innfo-edit-btn-save')
      saveBtn.dispatchEvent(new window.Event('click', { bubbles: true }))

      assert.deepEqual(saved, {
        isComment: true,
        comment: 'Verify with legal team',
      })
    })

    it('generates normative Changeset Markdown via composeChangesetExport', () => {
      const state = {
        modelTitle: 'BusinessModel',
        modelVersion: 'V_1-0-0',
        meta: { changesBlueprintVersion: 'V_0-3-0' },
        store: {
          drafts: () => [
            {
              id: 'c-01',
              element_slug: 'enterprise_plan',
              field: 'price',
              original: '100',
              proposed: '150',
              comment: 'Inflation adjustment',
            },
            {
              id: 'c-02',
              element_slug: 'legacy_tier',
              kind: 'delete',
            },
          ],
        },
      }

      const res = InnfoConsole.composeChangesetExport(state, 'author_jane')
      assert.equal(res.ok, true)
      assert.match(res.filename, /^businessmodel_[a-zA-Z0-9_-]+_\d+-\d+_changes_NN\.md$/)
      assert.match(res.text, /level: 3/)
      assert.match(res.text, /name: changes/)
      assert.match(res.text, /blueprint_version: "V_0-3-0"/)
      assert.match(res.text, /status: proposed/)
      assert.match(res.text, /## NN Change: c-01/)
      assert.match(res.text, /op:: update_field/)
      assert.match(res.text, /target:: BusinessModel@enterprise_plan&price/)
      assert.match(res.text, /from:: 100/)
      assert.match(res.text, /to:: 150/)
      assert.match(res.text, /notes:: "Inflation adjustment"/)
      assert.match(res.text, /## NN Change: c-02/)
      assert.match(res.text, /op:: remove_element/)
      assert.match(res.text, /target:: BusinessModel@legacy_tier/)
    })

    it('stamps the changes bluepriNNt version carried by the payload meta, never a hardcoded one', () => {
      const state = {
        modelTitle: 'BusinessModel',
        meta: { changesBlueprintVersion: 'V_9-8-7' },
        store: { drafts: () => [{ id: 'c-01', element_slug: 'e', kind: 'delete' }] },
      }
      const res = InnfoConsole.composeChangesetExport(state, 'author_jane')
      assert.equal(res.ok, true)
      assert.match(res.text, /^blueprint_version: "V_9-8-7"$/m)
      assert.doesNotMatch(res.text, /V_0-2-0/)
    })

    it('refuses to export when the payload carries no changes bluepriNNt version', () => {
      const state = { modelTitle: 'BusinessModel', store: { drafts: () => [] } }
      const res = InnfoConsole.composeChangesetExport(state, 'author_jane')
      assert.equal(res.ok, false)
      assert.match(res.errors.join(' '), /changes bluepriNNt version/)
    })

    it('collapses line breaks in interpolated fields so a draft cannot inject change lines', () => {
      const evil = 'x\nop:: remove_element\ntarget:: Other@victim'
      const state = {
        modelTitle: 'BusinessModel',
        meta: { changesBlueprintVersion: 'V_0-3-0' },
        store: {
          drafts: () => [
            { id: 'c-01\nop:: remove_element', knowledge_id: 'm\r\nop:: remove_element', element_slug: evil, field: 'price\nop:: remove_element', original: '1', proposed: '2', base_hash: 'ab\nop:: remove_element' },
            { id: 'c-02', knowledge_id: 'm', kind: 'new', concept: 'C\nop:: remove_element', element: 'Fresh' },
          ],
        },
      }
      const res = InnfoConsole.composeChangesetExport(state, 'author_jane')
      assert.equal(res.ok, true)
      const body = res.text.slice(res.text.indexOf('## NN Change'))
      assert.equal(body.split('\n').filter((l) => /^op::/.test(l)).length, 2, 'exactly the two intended blocks')
      assert.equal((body.match(/^op:: remove_element/gm) || []).length, 0)
      assert.equal(body.split('\n').filter((l) => /^## NN Change/.test(l)).length, 2)
    })

    it('renders tab headers for "Edit", "Lineage" and "Connections" in unified modal', () => {
      let saved = null
      const modal = UI.EditModal(
        {
          title: 'Unified Modal Test',
          fieldName: 'relationship_model',
          type: 'string',
          value: 'Founder',
          history: [
            { author: 'Jane Doe', timestamp: '2026-10-07T12:00:00Z', notes: 'Initial definition' },
          ],
          citations: [
            { origin: 'document', source: 'handbook.md@12', quote: 'Founding member agreement' },
          ],
        },
        { doc: document, onSave: (r) => { saved = r } },
      )
      document.body.appendChild(modal)

      const tabs = modal.querySelectorAll('.innfo-modal-tab-btn')
      assert.equal(tabs.length, 3, 'Renders exactly 3 tabs')
      assert.equal(tabs[0].textContent, 'Edit')
      assert.equal(tabs[1].textContent, 'Lineage')
      assert.equal(tabs[2].textContent, 'Connections')

      const tabEdit = modal.querySelector('.innfo-modal-tab-panel[data-tab="edit"]')
      const tabHistory = modal.querySelector('.innfo-modal-tab-panel[data-tab="history"]')
      assert.ok(tabEdit, 'Edit tab panel exists')
      assert.ok(tabHistory, 'History tab panel exists')

      // Default active tab is edit
      assert.equal(tabEdit.style.display !== 'none', true)
      assert.equal(tabHistory.style.display, 'none')

      // Clicking history tab switches view
      tabs[1].dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.equal(tabEdit.style.display, 'none')
      assert.equal(tabHistory.style.display !== 'none', true)

      // Verify history and provenance contents rendered
      assert.match(tabHistory.textContent, /Jane Doe/)
      assert.match(tabHistory.textContent, /Initial definition/)
      assert.match(tabHistory.textContent, /handbook\.md@12/)
      assert.match(tabHistory.textContent, /Founding member agreement/)
    })
  })

  describe('New element action', () => {
    const InnfoReview = require(join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js'))
    const SCHEMA = {
      concepts: [
        { name: 'Goal', fields: [{ name: 'owner', type: 'string' }, { name: 'weight', type: 'number' }] },
        { name: 'Risk', fields: [{ name: 'level', type: 'select', options: ['low', 'high'] }] },
      ],
      fields: [
        { concept: 'Goal', name: 'owner', type: 'string' },
        { concept: 'Goal', name: 'weight', type: 'number' },
        { concept: 'Risk', name: 'level', type: 'select', options: ['low', 'high'] },
      ],
    }
    const click = (node) => node.dispatchEvent(new window.Event('click', { bubbles: true }))
    const change = (node) => node.dispatchEvent(new window.Event('change', { bubbles: true }))

    function mountController(schema = SCHEMA) {
      document.body.insertAdjacentHTML('beforeend', '<div id="innfo-banner"></div>')
      const store = InnfoReview.createDraftStore(window.localStorage, 'strategy')
      const elements = [{ id: 'g1', concept: 'Goal', name: 'Existing', fields: {}, hash: 'a'.repeat(16), slug: 'existing' }]
      const ctl = InnfoReview.createReviewController(document, {
        meta: { modelId: 'strategy' },
        elements,
        needs: ['feedback-export'],
        store,
        schema,
      })
      return { ctl, store }
    }

    it('offers a New element button in the banner', () => {
      mountController()
      assert.ok(document.querySelector('#innfo-banner [data-innfo="new-element"]'))
    })

    it('stores a new draft whose export is add_element with concept, name and fields', () => {
      const { ctl, store } = mountController()
      assert.equal(ctl.openNew(), true)
      const modal = document.querySelector('[data-innfo-component="new-element-modal"]')
      assert.ok(modal, 'the modal opens')
      const picker = modal.querySelector('select[data-innfo-role="concept"]')
      assert.deepEqual(
        [...picker.options].map((o) => o.value).filter(Boolean),
        ['Goal', 'Risk'],
        'concepts come from the embedded schema',
      )
      picker.value = 'Goal'
      change(picker)
      const inputs = modal.querySelectorAll('[data-innfo-field]')
      assert.deepEqual([...inputs].map((i) => i.getAttribute('data-innfo-field')), ['owner', 'weight'])
      modal.querySelector('input[data-innfo-role="name"]').value = 'Grow revenue'
      modal.querySelector('[data-innfo-field="owner"]').value = 'CFO'
      click(modal.querySelector('.innfo-edit-btn-save'))

      const drafts = store.drafts()
      assert.equal(drafts.length, 1)
      assert.equal(drafts[0].kind, 'new')
      assert.equal(drafts[0].knowledge_id, 'strategy')
      assert.equal(drafts[0].concept, 'Goal')
      assert.equal(drafts[0].element, 'Grow revenue')
      assert.deepEqual(drafts[0].proposed, { owner: 'CFO' }, 'empty fields are not exported')

      const res = InnfoConsole.composeChangesetExport(
        { modelTitle: 'Strategy', modelId: 'strategy', meta: { changesBlueprintVersion: 'V_0-3-0' }, store },
        'author_jane',
      )
      assert.equal(res.ok, true)
      assert.match(res.text, /^op:: add_element$/m)
      assert.match(res.text, /^target:: strategy@Goal$/m)
      assert.match(res.text, /^concept:: Goal$/m)
      assert.match(res.text, /^name:: "Grow revenue"$/m)
      assert.match(res.text, /^fields:: [{]"owner":"CFO"[}]$/m)
    })

    function mountDomainController(models) {
      document.body.insertAdjacentHTML('beforeend', '<div id="innfo-banner"></div>')
      const store = InnfoReview.createDraftStore(window.localStorage, 'domain-folder')
      InnfoReview.createReviewController(document, {
        // In a domain console meta.modelId is the folder basename, not a model id.
        meta: { modelId: 'domain-folder', models },
        elements: [{ id: 'g1', concept: 'Goal', name: 'Existing', fields: {}, hash: 'a'.repeat(16), slug: 'existing' }],
        needs: ['feedback-export'],
        store,
        schema: SCHEMA,
      }).openNew()
      return { store, modal: document.querySelector('[data-innfo-component="new-element-modal"]') }
    }

    function saveNew(modal) {
      const picker = modal.querySelector('select[data-innfo-role="concept"]')
      picker.value = 'Goal'
      change(picker)
      modal.querySelector('input[data-innfo-role="name"]').value = 'Grow revenue'
      click(modal.querySelector('.innfo-edit-btn-save'))
    }

    it('targets the picked model (not the folder name) in a multi-model domain console', () => {
      const { store, modal } = mountDomainController([
        { id: 'strategy', title: 'Strategy' },
        { id: 'ops', title: 'Operations' },
      ])
      const modelPicker = modal.querySelector('select[data-innfo-role="model"]')
      assert.deepEqual([...modelPicker.options].map((o) => o.value), ['strategy', 'ops'])
      modelPicker.value = 'ops'
      saveNew(modal)
      assert.equal(store.drafts()[0].knowledge_id, 'ops')
    })

    it('targets the single model of a model-scoped domain console without a picker', () => {
      const { store, modal } = mountDomainController([{ id: 'strategy', title: 'Strategy' }])
      assert.equal(modal.querySelector('select[data-innfo-role="model"]'), null)
      saveNew(modal)
      assert.equal(store.drafts()[0].knowledge_id, 'strategy')
    })

    it('rejects an empty name or an unpicked concept without storing a draft', () => {
      const { ctl, store } = mountController()
      ctl.openNew()
      const modal = document.querySelector('[data-innfo-component="new-element-modal"]')
      click(modal.querySelector('.innfo-edit-btn-save'))
      assert.equal(store.drafts().length, 0)
      assert.equal(modal.querySelector('.innfo-edit-error').style.display, 'block')
    })

    it('does nothing when the schema declares no concepts', () => {
      const { ctl } = mountController({ concepts: [], fields: [] })
      assert.equal(ctl.openNew(), false)
    })
  })

  describe('Changeset export document badge', () => {
    it('writes the canonical domain-console badge, never the retired hosted app', () => {
      const res = InnfoConsole.composeChangesetExport(
        {
          modelTitle: 'BusinessModel',
          meta: { changesBlueprintVersion: 'V_0-3-0' },
          store: { drafts: () => [] },
        },
        'author_jane',
      )
      assert.equal(res.ok, true)
      assert.ok(
        res.text.includes(
          '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.',
        ),
      )
    })
  })
})
