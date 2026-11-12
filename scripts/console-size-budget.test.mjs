import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CONSOLE_SIZE_BUDGET,
  evaluateSizeBudget,
  resolveSizeBudget,
  stripConsoleCitations,
  stripConsoleProvenance,
} from './console-views.mjs'

describe('resolveSizeBudget', () => {
  it('falls back to the shipped thresholds when the manifest declares nothing', () => {
    const budget = resolveSizeBudget(null)
    assert.deepEqual(budget, { ...CONSOLE_SIZE_BUDGET, source: 'default', problems: [] })
  })

  it('takes both thresholds from the manifest frontmatter', () => {
    const budget = resolveSizeBudget({ console_size_budget_warn: '40000000', console_size_budget_fail: 120000000 })
    assert.equal(budget.warnBytes, 40_000_000)
    assert.equal(budget.failBytes, 120_000_000)
    assert.equal(budget.source, 'domain')
    assert.deepEqual(budget.problems, [])
  })

  it('keeps the default for the key it cannot read, and says so', () => {
    const budget = resolveSizeBudget({ console_size_budget_fail: 'lots' })
    assert.equal(budget.failBytes, CONSOLE_SIZE_BUDGET.failBytes)
    assert.equal(budget.source, 'default')
    assert.match(budget.problems.join(' '), /console_size_budget_fail/)
  })

  it('refuses a warn threshold that is not below the fail threshold', () => {
    const budget = resolveSizeBudget({ console_size_budget_warn: 900, console_size_budget_fail: 900 })
    assert.equal(budget.warnBytes, CONSOLE_SIZE_BUDGET.warnBytes)
    assert.equal(budget.failBytes, CONSOLE_SIZE_BUDGET.failBytes)
    assert.match(budget.problems.join(' '), /must be lower than/)
  })

  it('rejects a non-positive threshold', () => {
    const budget = resolveSizeBudget({ console_size_budget_warn: 0 })
    assert.equal(budget.warnBytes, CONSOLE_SIZE_BUDGET.warnBytes)
    assert.equal(budget.problems.length, 1)
  })
})

describe('evaluateSizeBudget', () => {
  const parts = { bundle: 1_000, models: 2_000, views: 3_000 }

  it('reports ok below the warn threshold', () => {
    const gate = evaluateSizeBudget({ ...parts, total: 500 })
    assert.equal(gate.status, 'ok')
    assert.match(gate.message, /size: total 500 B/)
    assert.equal(gate.strategy, 'none')
  })

  it('warns above the warn threshold and fails above the fail threshold', () => {
    const warn = evaluateSizeBudget({ ...parts, total: CONSOLE_SIZE_BUDGET.warnBytes + 1 })
    assert.equal(warn.status, 'warn')
    const bad = evaluateSizeBudget({ ...parts, total: CONSOLE_SIZE_BUDGET.failBytes + 1 })
    assert.equal(bad.status, 'fail')
    assert.match(bad.message, /Views are not split lazily/)
  })

  it('honours a per-domain budget', () => {
    const gate = evaluateSizeBudget({ ...parts, total: 1_500, budget: { warnBytes: 1_000, failBytes: 2_000 } })
    assert.equal(gate.status, 'warn')
    assert.equal(gate.limit, 1_000)
    assert.equal(gate.failBytes, 2_000)
  })

  it('names the strategy it applied', () => {
    const gate = evaluateSizeBudget({ ...parts, total: 500, strategy: 'strip-citations' })
    assert.match(gate.message, /\[strategy: strip-citations\]/)
  })
})

describe('degrade steps', () => {
  function payload() {
    return {
      model: {
        elements: [
          { id: 'a', citations: { sources: [{ path: 'x' }] }, provenance: { f: {} }, history: [{ at: 1 }] },
          { id: 'b' },
        ],
      },
    }
  }

  it('drops only the resolved citations, leaving provenance alone', () => {
    const p = payload()
    assert.equal(stripConsoleCitations(p), 1)
    assert.equal(p.model.elements[0].citations, undefined)
    assert.notEqual(p.model.elements[0].provenance, undefined)
  })

  it('drops provenance and history as the second step', () => {
    const p = payload()
    assert.equal(stripConsoleProvenance(p), 1)
    assert.equal(p.model.elements[0].provenance, undefined)
    assert.equal(p.model.elements[0].history, undefined)
  })

  it('reports nothing to do on a payload without either', () => {
    assert.equal(stripConsoleCitations({ model: { elements: [{ id: 'a' }] } }), 0)
    assert.equal(stripConsoleProvenance({ model: { elements: [{ id: 'a' }] } }), 0)
    assert.equal(stripConsoleCitations(null), 0)
    assert.equal(stripConsoleProvenance({}), 0)
  })
})
