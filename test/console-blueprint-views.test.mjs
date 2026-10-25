import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const require = createRequire(import.meta.url)
const UI = require(join(repoRoot, 'iNNfo/specs/bluepriNNts/console/ui-kit.js'))

function loadView(rel) {
  const code = readFileSync(join(repoRoot, rel), 'utf8')
  let captured
  new Function('registerView', code)((def) => {
    captured = def
  })
  return captured
}

const orgChart = 'iNNfo/specs/bluepriNNts/organization/assets/console-view-org-chart.js'
const roadmap = 'iNNfo/specs/bluepriNNts/projects/assets/console-view-roadmap.js'

describe('organization org-chart view (bluepriNNt)', () => {
  let doc
  let container
  let edits
  beforeEach(() => {
    doc = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>').window.document
    container = doc.getElementById('c')
    edits = []
  })

  it('declares an editable view with order 20', () => {
    const def = loadView(orgChart)
    assert.equal(def.title, 'Org Chart')
    assert.equal(def.order, 20)
    assert.equal(def.kind, 'editable')
    assert.equal(typeof def.mount, 'function')
  })

  it('groups persons under their position via position_ref, with Ku badges and no view-mode edit', () => {
    const def = loadView(orgChart)
    const ctx = {
      container,
      ui: UI,
      payload: {
        meta: { modelId: 'org' },
        model: {
          elements: [
            { id: 'position-chief', concept: 'Position', name: 'Chief Scientist', fields: {} },
            {
              id: 'person-egon',
              concept: 'Person',
              name: 'Dr. Egon Spengler',
              fields: { compensation: 'equity' },
              relations: [{ field: 'position_ref', target: 'position-chief' }],
            },
          ],
        },
      },
      modal: { edit: (a) => edits.push(a) },
    }
    def.mount(ctx)
    const cards = container.querySelectorAll('.nn-org-position')
    assert.equal(cards.length, 1)
    assert.match(cards[0].textContent, /Chief Scientist/)
    assert.match(cards[0].textContent, /Dr\. Egon Spengler/)
    assert.ok(cards[0].querySelector('[data-ku-kind="element"]'), 'positions render as element Ku badges')
    assert.equal(container.querySelector('.nn-edit-anchor'), null, 'no un-gated view-mode edit anchor')
  })

  it('shows an empty state with no organization elements', () => {
    const def = loadView(orgChart)
    def.mount({
      container,
      payload: { model: { elements: [{ id: 'x', concept: 'Stakeholders', name: 'Bob', fields: {} }] } },
      modal: { edit() {} },
    })
    assert.match(container.textContent, /No organization elements/)
  })
})

describe('projects roadmap view (bluepriNNt)', () => {
  let doc
  let container
  let edits
  beforeEach(() => {
    doc = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>').window.document
    container = doc.getElementById('c')
    edits = []
  })

  it('declares an editable view with order 20', () => {
    const def = loadView(roadmap)
    assert.equal(def.title, 'Roadmap')
    assert.equal(def.order, 20)
    assert.equal(def.kind, 'editable')
    assert.equal(typeof def.mount, 'function')
  })

  it('groups tasks under their milestone via the milestone relation, with status meta', () => {
    const def = loadView(roadmap)
    const ctx = {
      container,
      ui: UI,
      payload: {
        meta: { modelId: 'projects' },
        model: {
          elements: [
            { id: 'milestone-signoff', concept: 'Milestone', name: 'Full Grid Signoff', fields: { target_date: '2026-06' } },
            {
              id: 'task-test',
              concept: 'Task',
              name: 'Execute Full Load Grid Test',
              fields: { status: 'backlog', priority: 'critical', duration: '3d' },
              relations: [{ field: 'milestone', target: 'milestone-signoff' }],
            },
          ],
        },
      },
      modal: { edit: (a) => edits.push(a) },
    }
    def.mount(ctx)
    const columns = container.querySelectorAll('.nn-roadmap-milestone')
    assert.equal(columns.length, 1)
    assert.match(columns[0].textContent, /Full Grid Signoff/)
    assert.match(columns[0].textContent, /backlog/)
    assert.match(columns[0].textContent, /critical/)
    assert.ok(columns[0].querySelector('[data-ku-kind="element"]'), 'milestones render as element Ku badges')
    assert.equal(container.querySelector('.nn-edit-anchor'), null, 'no un-gated view-mode edit anchor')
  })

  it('shows an empty state with no project elements', () => {
    const def = loadView(roadmap)
    def.mount({
      container,
      payload: { model: { elements: [{ id: 'x', concept: 'Stakeholders', name: 'Bob', fields: {} }] } },
      modal: { edit() {} },
    })
    assert.match(container.textContent, /No project elements/)
  })
})
