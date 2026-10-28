import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'nn-runtime.js')
const nnConsole = require(runtimePath)

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
    <div id="nn-layout">
      <nav id="nn-rail"></nav>
      <main>
        <div class="nn-toolbar">
          <input id="nn-search" type="search" />
        </div>
        <nav id="nn-view-tabs" class="nn-view-tabs"></nav>
        <div id="nn-tab-explorer" class="nn-tab-panel active">
          <div id="nn-doc"></div>
          <div id="nn-content"></div>
          <div id="nn-matrices"></div>
        </div>
        <div id="nn-tab-domain" class="nn-tab-panel"></div>
        <div id="nn-tab-review" class="nn-tab-panel"></div>
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
    it('asserts legacy review functions and patterns are absent from nnConsole', () => {
      assert.equal(nnConsole.buildReviewDoc, undefined)
      assert.equal(nnConsole.validateReviewDoc, undefined)
      assert.equal(nnConsole.serializeReviewDoc, undefined)
      assert.equal(nnConsole.buildReviewFilename, undefined)
      assert.equal(nnConsole.parseReviewFilename, undefined)
      assert.equal(nnConsole.REVIEW_FILENAME_PATTERN, undefined)
      assert.equal(nnConsole.updateDraftStatus, undefined)
      assert.equal(nnConsole.updateStatus, undefined)
    })
  })

  describe('Reviewer Identity & Banner Chip', () => {
    it('defaults reviewer name to "reviewer" when localStorage is empty', () => {
      assert.equal(nnConsole.getReviewerName(), 'reviewer')
    })

    it('persists updated reviewer name in localStorage and retrieves it', () => {
      nnConsole.setReviewerName('Jane Doe')
      assert.equal(nnConsole.getReviewerName(), 'Jane Doe')
      assert.equal(window.localStorage.getItem(nnConsole.REVIEWER_STORAGE_KEY), 'Jane Doe')
    })

    it('slugifies reviewer name accurately with underscores', () => {
      assert.equal(nnConsole.slugifyReviewer('Jane Doe'), 'jane_doe')
      assert.equal(nnConsole.slugifyReviewer('  Dr. John--Smith  '), 'dr_john_smith')
      assert.equal(nnConsole.slugifyReviewer(''), 'reviewer')
      assert.equal(nnConsole.slugifyReviewer(null), 'reviewer')
    })

    it('renders reviewer chip in header banner with inline edit support', () => {
      nnConsole.setReviewerName('Alice')
      const banner = document.createElement('header')
      banner.id = 'nn-feedback-banner'
      document.body.appendChild(banner)

      nnConsole.renderBanner(
        document,
        { title: 'Ghostbusters', modelVersion: 'V_0-2-1' },
        ['concept-rail'],
        0,
      )

      const chip = banner.querySelector('.nn-reviewer-chip')
      assert.ok(chip, 'Reviewer chip exists in banner')
      const nameInput = chip.querySelector('.nn-reviewer-name')
      assert.ok(nameInput, 'Reviewer name field exists in reviewer chip')
      assert.equal(nameInput.tagName, 'INPUT', 'reviewer field is an inline text input')
      assert.equal(nameInput.value, 'Alice')
    })
  })

  describe('Review Tab without Status Select', () => {
    it('renders Review Tab without any .nn-review-status-select dropdown', () => {
      const nnReview = require(
        join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js'),
      )
      const store = nnReview.createDraftStore(window.localStorage, 'business-model')
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

      nnConsole.renderReviewTab(document, state, { needs: [] })

      const reviewTab = document.getElementById('nn-tab-review')
      assert.ok(reviewTab)

      const statusSelect = reviewTab.querySelector('.nn-review-status-select')
      assert.equal(
        statusSelect,
        null,
        'No .nn-review-status-select element rendered in review tab',
      )

      assert.ok(
        reviewTab.querySelector('[data-nn-component="draft-list"]'),
        'Review tab renders through nnUI.DraftList',
      )
      const items = reviewTab.querySelectorAll('.nn-change-card')
      assert.equal(items.length, 1)
      assert.match(
        items[0].querySelector('.nn-change-card-note').textContent,
        /Updated seat minimum to 50/,
      )
    })

    function reviewTabFor(elementHash) {
      const nnReview = require(
        join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js'),
      )
      window.localStorage.clear()
      const store = nnReview.createDraftStore(window.localStorage, 'stale-model')
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
      nnConsole.renderReviewTab(document, state, { needs: [] })
      return { tab: document.getElementById('nn-tab-review'), state, store }
    }

    it('flags a draft whose target element hash changed since it was written', () => {
      const { tab } = reviewTabFor('2222222222222222')
      const rows = [...tab.querySelectorAll('.nn-change-card')]
      assert.equal(rows.length, 2)
      assert.equal(rows[0].getAttribute('data-target-changed'), 'true')
      assert.ok(tab.querySelector('[data-nn="stale-drafts"]'), 'review head names the stale drafts')
      // A proposed new element has no target yet, so it is never stale.
      assert.equal(rows[1].getAttribute('data-target-changed'), null)
    })

    it('does not flag drafts whose target hash still matches', () => {
      const { tab } = reviewTabFor('1111111111111111')
      assert.equal(tab.querySelector('[data-target-changed="true"]'), null)
      assert.equal(tab.querySelector('[data-nn="stale-drafts"]'), null)
    })

    it('removes already-applied field drafts on controller start and keeps the rest', () => {
      const nnReview = require(
        join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js'),
      )
      window.localStorage.clear()
      const store = nnReview.createDraftStore(window.localStorage, 'applied-model')
      const elements = [
        { id: 'e1', concept: 'C', name: 'Alpha', hash: 'ffffffffffffffff', fields: { owner: 'Bea' } },
      ]
      // Stale + value now matches -> applied, removed on load.
      store.addDraft({ element_id: 'e1', concept: 'C', element: 'Alpha', kind: 'correction', field: 'owner', original: 'Ana', proposed: 'Bea', base_hash: '1111111111111111' })
      // Stale but diverged -> stays.
      store.addDraft({ element_id: 'e1', concept: 'C', element: 'Alpha', kind: 'correction', field: 'owner', original: 'Ana', proposed: 'Other', base_hash: '1111111111111111' })
      // Comment, new-element, delete and matrix-cell drafts are never auto-removed.
      store.addDraft({ element_id: 'e1', concept: 'C', element: 'Alpha', kind: 'comment', comment: 'x', base_hash: '1111111111111111' })
      store.addDraft({ knowledge_id: 'applied-model', concept: 'C', element: 'Fresh', kind: 'new' })
      store.addDraft({ element_id: 'e1', concept: 'C', element: 'Alpha', kind: 'delete', base_hash: '1111111111111111' })
      store.addDraft({ element_id: 'e1', concept: 'C', element: 'Alpha', kind: 'correction', matrix: 'M', row: 'r', col: 'c', original: 'x', proposed: 'y', base_hash: '1111111111111111' })

      nnReview.createReviewController(document, {
        meta: { modelId: 'applied-model' },
        elements,
        needs: ['feedback-export'],
        store,
      })

      const remaining = store.drafts()
      assert.equal(remaining.some((d) => d.proposed === 'Bea'), false, 'the applied draft is gone')
      assert.equal(remaining.length, 5, 'the other five drafts stay')
      const persisted = JSON.parse(
        window.localStorage.getItem('nn-console:v4:applied-model'),
      )
      assert.equal(persisted.drafts.some((d) => d.proposed === 'Bea'), false, 'removal persisted')
      assert.equal(
        document.querySelector('#nn-tab-review [data-nn="clear-exported"]'),
        null,
        'no clear-exported control',
      )
    })

    it('deep-links from Review Tab to focus and highlight corresponding Element Card', () => {
      // Cards are now composed by nnUI (mountElementCards is private); this
      // suite only exercises focusElementCard's DOM contract: find by id,
      // scroll, highlight.
      const card = document.createElement('article')
      // Cards carry the `el-` prefixed domId (matching `#el-` hrefs); focusElementCard
      // takes the raw element id and resolves the prefixed node.
      card.id = 'el-ent-tier'
      document.getElementById('nn-content').appendChild(card)
      let scrolled = false
      card.scrollIntoView = () => {
        scrolled = true
      }

      nnConsole.focusElementCard(document, 'ent-tier')

      assert.equal(scrolled, true, 'scrollIntoView was invoked on target card')
      assert.ok(card.classList.contains('nn-highlight'), 'Card received highlight animation class')
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
      assert.ok(modal.querySelector('[data-nn-widget="string"]'))

      const input = modal.querySelector('input.nn-edit-input')
      input.value = 'archived'

      const saveBtn = modal.querySelector('.nn-edit-btn-save')
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
      const ta = modal.querySelector('.nn-edit-form-comment textarea')
      assert.equal(ta.value, 'Initial note')
      ta.value = 'Verify with legal team'

      const saveBtn = modal.querySelector('.nn-edit-btn-save')
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

      const res = nnConsole.composeChangesetExport(state, 'author_jane')
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
      const res = nnConsole.composeChangesetExport(state, 'author_jane')
      assert.equal(res.ok, true)
      assert.match(res.text, /^blueprint_version: "V_9-8-7"$/m)
      assert.doesNotMatch(res.text, /V_0-2-0/)
    })

    it('refuses to export when the payload carries no changes bluepriNNt version', () => {
      const state = { modelTitle: 'BusinessModel', store: { drafts: () => [] } }
      const res = nnConsole.composeChangesetExport(state, 'author_jane')
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
      const res = nnConsole.composeChangesetExport(state, 'author_jane')
      assert.equal(res.ok, true)
      const body = res.text.slice(res.text.indexOf('## NN Change'))
      assert.equal(body.split('\n').filter((l) => /^op::/.test(l)).length, 2, 'exactly the two intended blocks')
      assert.equal((body.match(/^op:: remove_element/gm) || []).length, 0)
      assert.equal(body.split('\n').filter((l) => /^## NN Change/.test(l)).length, 2)
    })

    it('renders tab headers for "Edit", "Changes" and "Connections" in unified modal', () => {
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

      const tabs = modal.querySelectorAll('.nn-modal-tab-btn')
      assert.equal(tabs.length, 3, 'Renders exactly 3 tabs')
      assert.equal(tabs[0].textContent, 'Edit')
      assert.equal(tabs[1].textContent, 'Changes')
      assert.equal(tabs[2].textContent, 'Connections')

      const tabEdit = modal.querySelector('.nn-modal-tab-panel[data-tab="edit"]')
      const tabHistory = modal.querySelector('.nn-modal-tab-panel[data-tab="history"]')
      assert.ok(tabEdit, 'Edit tab panel exists')
      assert.ok(tabHistory, 'History tab panel exists')

      // Default active tab is edit
      assert.equal(tabEdit.style.display !== 'none', true)
      assert.equal(tabHistory.style.display, 'none')

      // Clicking history tab switches view
      tabs[1].dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.equal(tabEdit.style.display, 'none')
      assert.equal(tabHistory.style.display !== 'none', true)

      // The Changes tab renders the change history as standard element sheets (one
      // ElementCard per change; the old per-field Citations section is gone).
      assert.match(tabHistory.textContent, /Jane Doe/)
      assert.match(tabHistory.textContent, /Initial definition/)
      assert.ok(
        tabHistory.querySelector('article[data-nn-component="element-card"]'),
        'an element sheet is rendered per history entry',
      )
    })
  })

  describe('New element action', () => {
    const nnReview = require(join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js'))
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
      document.body.insertAdjacentHTML('beforeend', '<div id="nn-banner"></div>')
      const store = nnReview.createDraftStore(window.localStorage, 'strategy')
      const elements = [{ id: 'g1', concept: 'Goal', name: 'Existing', fields: {}, hash: 'a'.repeat(16), slug: 'existing' }]
      const ctl = nnReview.createReviewController(document, {
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
      assert.ok(document.querySelector('#nn-banner [data-nn="new-element"]'))
    })

    it('stores a new draft whose export is add_element with concept, name and fields', () => {
      const { ctl, store } = mountController()
      assert.equal(ctl.openNew(), true)
      const modal = document.querySelector('[data-nn-component="new-element-modal"]')
      assert.ok(modal, 'the modal opens')
      const picker = modal.querySelector('select[data-nn-role="concept"]')
      assert.deepEqual(
        [...picker.options].map((o) => o.value).filter(Boolean),
        ['Goal', 'Risk'],
        'concepts come from the embedded schema',
      )
      picker.value = 'Goal'
      change(picker)
      const inputs = modal.querySelectorAll('[data-nn-field]')
      assert.deepEqual([...inputs].map((i) => i.getAttribute('data-nn-field')), ['owner', 'weight'])
      modal.querySelector('input[data-nn-role="name"]').value = 'Grow revenue'
      modal.querySelector('[data-nn-field="owner"]').value = 'CFO'
      click(modal.querySelector('.nn-edit-btn-save'))

      const drafts = store.drafts()
      assert.equal(drafts.length, 1)
      assert.equal(drafts[0].kind, 'new')
      assert.equal(drafts[0].knowledge_id, 'strategy')
      assert.equal(drafts[0].concept, 'Goal')
      assert.equal(drafts[0].element, 'Grow revenue')
      assert.deepEqual(drafts[0].proposed, { owner: 'CFO' }, 'empty fields are not exported')

      const res = nnConsole.composeChangesetExport(
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
      document.body.insertAdjacentHTML('beforeend', '<div id="nn-banner"></div>')
      const store = nnReview.createDraftStore(window.localStorage, 'domain-folder')
      nnReview.createReviewController(document, {
        // In a domain console meta.modelId is the folder basename, not a model id.
        meta: { modelId: 'domain-folder', models },
        elements: [{ id: 'g1', concept: 'Goal', name: 'Existing', fields: {}, hash: 'a'.repeat(16), slug: 'existing' }],
        needs: ['feedback-export'],
        store,
        schema: SCHEMA,
      }).openNew()
      return { store, modal: document.querySelector('[data-nn-component="new-element-modal"]') }
    }

    function saveNew(modal) {
      const picker = modal.querySelector('select[data-nn-role="concept"]')
      picker.value = 'Goal'
      change(picker)
      modal.querySelector('input[data-nn-role="name"]').value = 'Grow revenue'
      click(modal.querySelector('.nn-edit-btn-save'))
    }

    it('targets the picked model (not the folder name) in a multi-model domain console', () => {
      const { store, modal } = mountDomainController([
        { id: 'strategy', title: 'Strategy' },
        { id: 'ops', title: 'Operations' },
      ])
      const modelPicker = modal.querySelector('select[data-nn-role="model"]')
      assert.deepEqual([...modelPicker.options].map((o) => o.value), ['strategy', 'ops'])
      modelPicker.value = 'ops'
      saveNew(modal)
      assert.equal(store.drafts()[0].knowledge_id, 'ops')
    })

    it('targets the single model of a model-scoped domain console without a picker', () => {
      const { store, modal } = mountDomainController([{ id: 'strategy', title: 'Strategy' }])
      assert.equal(modal.querySelector('select[data-nn-role="model"]'), null)
      saveNew(modal)
      assert.equal(store.drafts()[0].knowledge_id, 'strategy')
    })

    it('rejects an empty name or an unpicked concept without storing a draft', () => {
      const { ctl, store } = mountController()
      ctl.openNew()
      const modal = document.querySelector('[data-nn-component="new-element-modal"]')
      click(modal.querySelector('.nn-edit-btn-save'))
      assert.equal(store.drafts().length, 0)
      assert.equal(modal.querySelector('.nn-edit-error').style.display, 'block')
    })

    it('does nothing when the schema declares no concepts', () => {
      const { ctl } = mountController({ concepts: [], fields: [] })
      assert.equal(ctl.openNew(), false)
    })
  })

  describe('Changeset export preamble', () => {
    it('writes no boilerplate badge, so the author owns the preamble slot', () => {
      const res = nnConsole.composeChangesetExport(
        {
          modelTitle: 'BusinessModel',
          meta: { changesBlueprintVersion: 'V_0-3-0' },
          store: { drafts: () => [] },
        },
        'author_jane',
      )
      assert.equal(res.ok, true)
      assert.ok(!res.text.includes('This is an **iNNfo document**'))
      assert.ok(!res.text.includes('> [!NOTE]'))
      assert.ok(res.text.includes('# NN index'))
    })
  })
})
