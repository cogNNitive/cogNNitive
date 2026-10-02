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
        elementId: 'threat-slimer',
        concept: 'ParanormalThreat',
        elementName: 'Slimer',
        field: 'severity',
        note: 'Change to Class VII',
        base_hash: 'abcdef0123456789',
        status: 'pending', // must be stripped
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
        elementId: 'threat-slimer',
        concept: 'ParanormalThreat',
        elementName: 'Slimer',
        field: 'severity',
        note: 'Change to Class VII',
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
      const state = {
        modelTitle: 'BusinessModel',
        modelVersion: 'V_1-2-0',
        draftKey: 'test-review-tab-key',
      }

      InnfoConsole.addDraft(state.draftKey, {
        elementId: 'ent-tier',
        concept: 'RevenueStream',
        elementName: 'Enterprise Tier',
        kind: 'correction',
        field: 'pricing',
        note: 'Updated seat minimum to 50',
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

      const items = reviewTab.querySelectorAll('.innfo-review-item')
      assert.equal(items.length, 1)
      assert.match(items[0].textContent, /Updated seat minimum to 50/)
    })

    it('deep-links from Review Tab to focus and highlight corresponding Element Card', () => {
      const elements = [{ id: 'ent-tier', name: 'Enterprise Tier', concept: 'RevenueStream' }]
      InnfoConsole.renderCards(document, elements, [], () => {})
      const card = document.getElementById('ent-tier')
      let scrolled = false
      card.scrollIntoView = () => {
        scrolled = true
      }

      InnfoConsole.focusElementCard(document, 'ent-tier')

      assert.equal(scrolled, true, 'scrollIntoView was invoked on target card')
      assert.ok(card.classList.contains('innfo-highlight'), 'Card received highlight animation class')
    })
  })
})
