import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const viewPath = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'metrics', 'assets', 'console-view-timeline.js')

function loadView() {
  const code = readFileSync(viewPath, 'utf8')
  let captured
  new Function('registerView', code)((def) => {
    captured = def
  })
  return captured
}

describe('metrics timeline view (bluepriNNt)', () => {
  let doc
  let container
  let gridCalls
  let edits

  beforeEach(() => {
    doc = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>').window.document
    container = doc.getElementById('c')
    gridCalls = []
    edits = []
    global.nnConsole = {
      renderTimelineGrid: (host, model, meta, hooks) => {
        gridCalls.push({ host, model, meta, hooks })
      },
    }
  })

  afterEach(() => {
    delete global.nnConsole
  })

  it('declares an editable view with order 10, and no self-declared id (the registrar injects it)', () => {
    const def = loadView()
    assert.equal(def.id, undefined)
    assert.equal(def.title, 'Timeline')
    assert.equal(def.order, 10)
    assert.equal(def.kind, 'editable')
    assert.equal(typeof def.mount, 'function')
  })

  it('derives the timeline projection from the payload elements without a row-edit hook', () => {
    const def = loadView()
    const ctx = {
      container,
      payload: {
        model: {
          elements: [
            { id: 'scenario-1', concept: 'Scenario', name: 'Year 1', fields: { scenarioMonths: '36' }, modelId: 'm1', modelTitle: 'Metrics' },
            { id: 'metrics-revenue', concept: 'Metrics', name: 'Revenue', fields: { metricValue: '100', metricType: 'revenue', metricUnit: 'USD' }, relations: [], modelId: 'm1', modelTitle: 'Metrics' },
          ],
        },
      },
      modal: { edit: (anchor) => edits.push(anchor) },
    }
    def.mount(ctx)

    assert.equal(gridCalls.length, 1)
    assert.equal(gridCalls[0].model.rows.length, 1)
    assert.equal(gridCalls[0].model.rows[0].id, 'metrics-revenue')
    assert.deepEqual(gridCalls[0].meta, { months: 36 })
    assert.equal(gridCalls[0].hooks, undefined, 'onEditRow was deleted')
    assert.equal(container.querySelector('.nn-edit-btn'), null)
  })

  it('shows an empty state when no model carries a projection, without calling the renderer', () => {
    const def = loadView()
    const ctx = {
      container,
      payload: { model: { elements: [{ id: 'x', concept: 'Stakeholders', name: 'Bob', fields: {} }] } },
      modal: { edit() {} },
    }
    def.mount(ctx)
    assert.equal(gridCalls.length, 0)
    assert.match(container.textContent, /No timeline projection/)
  })

  // ── variant series: one series per Scenario ──────────────────────
  describe('scenario variants', () => {
    const SCENARIO_MATRIX = {
      name: 'scenario-metrics matrix',
      slug: 'scenario-metrics-matrix',
      source: 'Scenario',
      target: 'Metrics',
      rows: ['Year 1 Baseline', 'Regional Expansion'],
      cols: ['Monthly Net Result', 'Monthly Containment Revenue', 'Vault Expansion Capex'],
      cells: {
        'Year 1 Baseline': { 'Monthly Net Result': 'Includes', 'Monthly Containment Revenue': 'Includes', 'Vault Expansion Capex': '-' },
        'Regional Expansion': { 'Monthly Net Result': 'Includes', 'Monthly Containment Revenue': 'Includes', 'Vault Expansion Capex': 'Includes' },
      },
    }

    function metricsElements() {
      return [
        { id: 'scenario-year-1', concept: 'Scenario', name: 'Year 1 Baseline', fields: { scenarioMonths: '12', scenarioType: 'historical' }, modelId: 'm1', modelTitle: 'Metrics' },
        { id: 'scenario-regional', concept: 'Scenario', name: 'Regional Expansion', fields: { scenarioMonths: '36', scenarioType: 'projection' }, modelId: 'm1', modelTitle: 'Metrics' },
        { id: 'metrics-net', concept: 'Metrics', name: 'Monthly Net Result', fields: { metricValue: '10', metricUnit: 'USD' }, modelId: 'm1', modelTitle: 'Metrics' },
        { id: 'metrics-revenue', concept: 'Metrics', name: 'Monthly Containment Revenue', fields: { metricValue: '100', metricUnit: 'USD' }, modelId: 'm1', modelTitle: 'Metrics' },
        { id: 'metrics-capex', concept: 'Metrics', name: 'Vault Expansion Capex', fields: { metricValue: '500', metricUnit: 'USD' }, modelId: 'm1', modelTitle: 'Metrics' },
      ]
    }

    function mountWith(matrices) {
      const def = loadView()
      const payload = { model: { elements: metricsElements() } }
      if (matrices) payload.model.matrices = matrices
      def.mount({ container, payload, modal: { edit() {} } })
    }

    it('renders one series per scenario, each with its own horizon', () => {
      mountWith([SCENARIO_MATRIX])
      assert.equal(gridCalls.length, 2, 'two scenarios produce two grids')
      assert.deepEqual(gridCalls.map((c) => c.meta.months), [12, 36], 'each series keeps its own horizon, not the widest one')
    })

    it('names each series with its model and scenario, so the variants are distinguishable', () => {
      mountWith([SCENARIO_MATRIX])
      const headings = Array.from(container.querySelectorAll('.nn-timeline-title')).map((h) => h.textContent)
      assert.deepEqual(headings, ['Metrics — Year 1 Baseline', 'Metrics — Regional Expansion'])
    })

    it('restricts each series to the rows its scenario-metrics cells include', () => {
      mountWith([SCENARIO_MATRIX])
      assert.deepEqual(
        gridCalls.map((c) => c.model.rows.map((r) => r.label)),
        [['Monthly Net Result', 'Monthly Containment Revenue'], ['Monthly Net Result', 'Monthly Containment Revenue', 'Vault Expansion Capex']],
        'a non-Includes cell keeps that row out of the scenario',
      )
    })

    it('keeps every row when the matrix says nothing about a scenario', () => {
      const partial = {
        ...SCENARIO_MATRIX,
        cells: { 'Year 1 Baseline': { 'Monthly Net Result': 'Includes' } },
      }
      mountWith([partial])
      assert.equal(gridCalls.length, 2)
      assert.deepEqual(gridCalls[0].model.rows.map((r) => r.label), ['Monthly Net Result'])
      assert.deepEqual(gridCalls[1].model.rows.map((r) => r.label).length, 3, 'an unknown scenario falls back to every row')
    })

    it('keeps every row when the includes would leave the series empty', () => {
      const empty = {
        ...SCENARIO_MATRIX,
        cells: { 'Year 1 Baseline': { 'Unrelated Metric': 'Includes' } },
      }
      mountWith([empty])
      assert.equal(gridCalls[0].model.rows.length, 3, 'an empty selection never renders an empty grid')
    })

    it('still renders one series per scenario when the payload carries no matrices', () => {
      mountWith(null)
      assert.equal(gridCalls.length, 2, 'variants do not depend on the matrix')
      assert.deepEqual(gridCalls.map((c) => c.meta.months), [12, 36])
      assert.deepEqual(gridCalls[0].model.rows.length, 3)
    })

    it('ignores matrices whose axes are not Scenario to Metrics', () => {
      mountWith([{ ...SCENARIO_MATRIX, source: 'Metrics', target: 'Metrics' }])
      assert.equal(gridCalls.length, 2)
      assert.deepEqual(gridCalls[0].model.rows.length, 3, 'a metrics-dependencies matrix never filters rows')
    })

    it('keeps a single scenario as one unnamed series, unchanged', () => {
      const def = loadView()
      def.mount({
        container,
        payload: {
          model: {
            elements: [
              { id: 's1', concept: 'Scenario', name: 'Year 1', fields: { scenarioMonths: '24', startYear: '2026', startMonth: '3' }, modelId: 'm1', modelTitle: 'Metrics' },
              { id: 'm-1', concept: 'Metrics', name: 'Revenue', fields: { metricValue: '1' }, modelId: 'm1', modelTitle: 'Metrics' },
            ],
          },
        },
        modal: { edit() {} },
      })
      assert.equal(gridCalls.length, 1)
      assert.equal(container.querySelector('.nn-timeline-title'), null, 'one series renders without a heading')
      assert.deepEqual(gridCalls[0].meta, { months: 24, startYear: 2026, startMonth: 3 })
      assert.equal(container.querySelector('button.nn-btn-csv'), null, 'a single variant offers no all-variant export')
    })

    // ── an empty horizon is not zero months ─────────────────────────
    it('ignores a scenario whose horizon is blank instead of rendering a zero-month grid', () => {
      const def = loadView()
      def.mount({
        container,
        payload: {
          model: {
            elements: [
              { id: 's1', concept: 'Scenario', name: 'No horizon', fields: { scenarioMonths: '' }, modelId: 'm1', modelTitle: 'Metrics' },
              { id: 'm-1', concept: 'Metrics', name: 'Revenue', fields: { metricValue: '1' }, modelId: 'm1', modelTitle: 'Metrics' },
            ],
          },
        },
        modal: { edit() {} },
      })
      assert.equal(gridCalls.length, 0, 'a blank horizon is not a projection')
      assert.match(container.textContent, /No timeline projection/)
    })

    // ── comparison cards ────────────────────────────────────────────
    it('summarises each variant beside its grid: type, horizon, row count and exclusive rows', () => {
      mountWith([SCENARIO_MATRIX])
      const summaries = Array.from(container.querySelectorAll('.nn-timeline-summary')).map((p) => p.textContent)
      assert.equal(summaries.length, 2, 'one summary per variant')
      assert.match(summaries[0], /historical/, 'the first card names its scenario type')
      assert.match(summaries[0], /12 months/)
      assert.match(summaries[0], /2 rows/)
      assert.doesNotMatch(summaries[0], /exclusive/i, 'a narrower variant owns no exclusive row')
      assert.match(summaries[1], /projection/)
      assert.match(summaries[1], /36 months/)
      assert.match(summaries[1], /3 rows/)
      assert.match(summaries[1], /exclusive: Vault Expansion Capex/i, 'a row only this variant carries is called out')
    })

    it('omits the exclusive clause when every variant carries the same rows', () => {      mountWith([{ ...SCENARIO_MATRIX, cells: {} }])
      const summaries = Array.from(container.querySelectorAll('.nn-timeline-summary')).map((p) => p.textContent)
      assert.equal(summaries.length, 2)
      assert.doesNotMatch(summaries[0], /exclusive/i)
      assert.doesNotMatch(summaries[1], /exclusive/i)
    })

    // ── all-variant CSV ─────────────────────────────────────────────
    it('exports every variant in one CSV from a single button', () => {
      const def = loadView()
      const blobs = []
      const realBlob = global.Blob
      const realCreate = global.URL.createObjectURL
      const realRevoke = global.URL.revokeObjectURL
      global.Blob = class { constructor(parts) { blobs.push(parts.join('')) } }
      global.URL.createObjectURL = () => 'blob:variants'
      global.URL.revokeObjectURL = () => {}
      const origCreateElement = doc.createElement.bind(doc)
      let downloadName = null
      doc.createElement = (tag) => {
        const el = origCreateElement(tag)
        if (tag === 'a') {
          el.click = () => {
            downloadName = el.download
          }
        }
        return el
      }
      try {
        def.mount({ container, payload: { model: { elements: metricsElements(), matrices: [SCENARIO_MATRIX] } }, modal: { edit() {} } })
        const button = container.querySelector('button.nn-btn-csv')
        assert.ok(button, 'the view offers the all-variant export')
        assert.match(button.textContent, /all variants/i)
        button.click()

        assert.equal(downloadName, 'timeline_variants.csv')
        assert.equal(blobs.length, 1, 'the whole file is written once')
        const csv = blobs[0]
        const lines = csv.split('\r\n')
        assert.equal(
          lines[0],
          '"Scenario","Scenario Type","Months","Start Year","Start Month","Group","Metric","Type","Unit","Base Value","Growth Rule"',
        )
        assert.equal(lines.length, 1 + 2 + 3, 'one row per variant and metric')
        assert.match(csv, /"Year 1 Baseline"/)
        assert.match(csv, /"Regional Expansion"/)
        assert.match(csv, /"Metrics","Monthly Net Result"/)
        assert.match(csv, /"Vault Expansion Capex"/, 'a row of the wider variant is in the file')
        assert.doesNotMatch(csv, /"0","0"/, 'a scenario without a start month leaves the cell empty, not zero')
      } finally {
        global.Blob = realBlob
        global.URL.createObjectURL = realCreate
        global.URL.revokeObjectURL = realRevoke
        doc.createElement = origCreateElement
      }
    })
  })
})
