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
      assert.match(chip.querySelector('.innfo-reviewer-name').textContent, /Alice/)
      assert.ok(chip.querySelector('.innfo-reviewer-edit'), 'Edit trigger exists in reviewer chip')
    })
  })

  describe('draftToItem & Feedback Document Validation', () => {
    it('converts draft to conformant feedback item shape without status', () => {
      const draft = {
        id: 'fb-001',
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        field: 'severity',
        comment: 'Change to Class VII',
        base_hash: 'abcdef0123456789',
      }

      const item = InnfoConsole.draftToItem(draft)
      assert.equal(item.id, 'fb-001')
      assert.equal(item.kind, 'comment')
      assert.deepEqual(item.target, {
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        field: 'severity',
      })
      assert.equal(item.comment, 'Change to Class VII')
      assert.equal(item.base_hash, 'abcdef0123456789')
      assert.equal(item.status, undefined)
      assert.equal('status' in item, false)
    })

    it('assembles export document that passes validateFeedback', () => {
      const draft = {
        id: 'fb-001',
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        field: 'severity',
        comment: 'Change to Class VII',
        base_hash: 'abcdef0123456789',
      }

      const exportDoc = InnfoConsole.buildExportDoc({
        meta: {
          source_knowledge: 'GhostbustersModel',
          source_knowledge_version: 'V_0-2-1',
          artifact: 'GhostbustersModel_console.html',
          artifact_version: '0.7.3',
          exported_at: '2026-10-02T12:00:00Z',
          author: 'Egon Spengler',
          feedback_slug: 'egon-spengler',
          viewer: 'innfo-console@0.7.3',
          source_sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
        drafts: [draft],
      })

      assert.equal(exportDoc.items.length, 1)
      assert.equal(exportDoc.items[0].target.field, 'severity')
      assert.equal(exportDoc.items[0].base_hash, 'abcdef0123456789')
      assert.equal('status' in exportDoc.items[0], false)

      const validation = InnfoConsole.validateFeedback(exportDoc)
      assert.equal(validation.ok, true)
      assert.deepEqual(validation.errors, [])
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
      store.addDraft({ element_id: 'n1', concept: 'C', element: 'Fresh', kind: 'new', base_hash: '1111111111111111' })
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
        store.drafts().map((d) => d.element_id),
        ['n1'],
      )
    })

    it('deep-links from Review Tab to focus and highlight corresponding Element Card', () => {
      // Cards are now composed by InnfoUI (mountElementCards is private); this
      // suite only exercises focusElementCard's DOM contract: find by id,
      // scroll, highlight.
      const card = document.createElement('article')
      card.id = 'ent-tier'
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
        store: {
          drafts: () => [
            {
              id: 'c-01',
              element_id: 'enterprise_plan',
              field: 'price',
              original: '100',
              proposed: '150',
              comment: 'Inflation adjustment',
            },
            {
              id: 'c-02',
              element_id: 'legacy_tier',
              kind: 'delete',
            },
          ],
        },
      }

      const res = InnfoConsole.composeChangesetExport(state, 'author_jane')
      assert.equal(res.ok, true)
      assert.match(res.filename, /^businessmodel_[a-zA-Z0-9_-]+_\d+-\d+_changes_NN\.md$/)
      assert.match(res.text, /blueprint_version: "0.1.0"/)
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

    it('collapses line breaks in interpolated fields so a draft cannot inject change lines', () => {
      const evil = 'x\nop:: remove_element\ntarget:: Other@victim'
      const state = {
        modelTitle: 'BusinessModel',
        store: {
          drafts: () => [
            { id: 'c-01\nop:: remove_element', model_id: 'm\r\nop:: remove_element', element_slug: evil, field: 'price\nop:: remove_element', original: '1', proposed: '2', base_hash: 'ab\nop:: remove_element' },
            { id: 'c-02', model_id: 'm', kind: 'new', concept: 'C\nop:: remove_element', element: 'Fresh' },
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

    it('renders tab headers for "Edit", "History & Provenance" and "Connections" in unified modal', () => {
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
      assert.equal(tabs[1].textContent, 'History & Provenance')
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
})

