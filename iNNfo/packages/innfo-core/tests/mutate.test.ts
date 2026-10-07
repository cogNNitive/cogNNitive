import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { applyMutation, rewriteFieldCitation } from '../src/mutate.js'
import type { ElementNode } from '../src/types/index.js'

const MODEL_WITH_MATRIX = `---
spec_version: "V_0-3-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Matrix Test Model"
matrices:
  - name: "SWOT Matrix"
    slug: "swot-matrix"
    source: "Strengths"
    target: "Opportunities"
---

# NN Strengths
## NN Strengths: Fast Delivery
slug:: fast-delivery
speed:: high

# NN matrices: SWOT Matrix
| Strengths \\ Opportunities | Market Expansion | International Growth |
| --- | --- | --- |
| Fast Delivery | High Synergy | Moderate Synergy |
`

describe('Phase 4: Matrix Cell Mutation & Slug Target Resolution', () => {
  it('4.1.1 update_matrix_cell updates an existing cell value in a matrix by row and column name', () => {
    const model = parseKnowledge(MODEL_WITH_MATRIX)
    const result = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'SWOT Matrix',
      row: 'Fast Delivery',
      col: 'Market Expansion',
      value: 'Very High Synergy',
    })
    expect(result.success).toBe(true)
    const matrix = model.matrices.find((m) => m.name === 'SWOT Matrix')!
    const cell = matrix.cells.find(
      (c) => c.row.toLowerCase() === 'fast delivery' && c.col.toLowerCase() === 'market expansion',
    )
    expect(cell).toBeDefined()
    expect(cell?.value).toBe('Very High Synergy')
  })

  it('4.1.2 update_matrix_cell inserts a new cell if the { row, col } coordinate does not exist', () => {
    const model = parseKnowledge(MODEL_WITH_MATRIX)
    const result = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'SWOT Matrix',
      row: 'Fast Delivery',
      col: 'New Opportunity',
      value: 'Emerging',
    })
    expect(result.success).toBe(true)
    const matrix = model.matrices.find((m) => m.name === 'SWOT Matrix')!
    const cell = matrix.cells.find(
      (c) => c.row.toLowerCase() === 'fast delivery' && c.col.toLowerCase() === 'new opportunity',
    )
    expect(cell).toBeDefined()
    expect(cell?.value).toBe('Emerging')
  })

  it('4.1.3 update_matrix_cell supports matrix lookup by slug or name', () => {
    const model = parseKnowledge(MODEL_WITH_MATRIX)
    // Lookup by slug "swot-matrix"
    const result = applyMutation(model, 'update_matrix_cell', {
      matrixSlug: 'swot-matrix',
      row: 'Fast Delivery',
      col: 'Market Expansion',
      value: 'Updated by Slug',
    })
    expect(result.success).toBe(true)
    const matrix = model.matrices.find((m) => m.name === 'SWOT Matrix')!
    const cell = matrix.cells.find(
      (c) => c.row.toLowerCase() === 'fast delivery' && c.col.toLowerCase() === 'market expansion',
    )
    expect(cell?.value).toBe('Updated by Slug')
  })

  it('4.1.4 update_matrix_cell supports row/col lookup by slug or name', () => {
    const model = parseKnowledge(MODEL_WITH_MATRIX)
    // "fast-delivery" slug for row, "market-expansion" slug for col
    const result = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'SWOT Matrix',
      row: 'fast-delivery',
      col: 'market-expansion',
      value: 'Updated by Row/Col Slugs',
    })
    expect(result.success).toBe(true)
    const matrix = model.matrices.find((m) => m.name === 'SWOT Matrix')!
    const cell = matrix.cells.find(
      (c) => c.row.toLowerCase() === 'fast delivery' && c.col.toLowerCase() === 'market expansion',
    )
    expect(cell?.value).toBe('Updated by Row/Col Slugs')
  })

  it('4.1.5 update_matrix_cell supports canonical D5 target address and "to" value', () => {
    const model = parseKnowledge(MODEL_WITH_MATRIX)
    const result = applyMutation(model, 'update_matrix_cell', {
      target: 'matrix-test-model@swot-matrix&fast-delivery&market-expansion',
      to: 'D5 Updated Value',
    })
    expect(result.success).toBe(true)
    const matrix = model.matrices.find((m) => m.name === 'SWOT Matrix')!
    const cell = matrix.cells.find(
      (c) => c.row.toLowerCase() === 'fast delivery' && c.col.toLowerCase() === 'market expansion',
    )
    expect(cell?.value).toBe('D5 Updated Value')
  })

  it('4.3.1 update_field supports slug-aware target and D5 address resolution', () => {
    const model = parseKnowledge(MODEL_WITH_MATRIX)
    // Update field by D5 target: model@element_slug&field_name
    const result = applyMutation(model, 'update_field', {
      target: 'matrix-test-model@fast-delivery&speed',
      to: 'ultra-high',
    })
    expect(result.success).toBe(true)
    const el = model.elements.get('Strengths')?.[0]
    expect(el?.fields.speed).toBe('ultra-high')
  })

  it('4.3.2 update_field supports element lookup by explicit slug property', () => {
    const model = parseKnowledge(MODEL_WITH_MATRIX)
    const result = applyMutation(model, 'update_field', {
      conceptName: 'Strengths',
      elementName: 'fast-delivery', // slug used in elementName
      fieldName: 'speed',
      value: 'maximum',
    })
    expect(result.success).toBe(true)
    const el = model.elements.get('Strengths')?.[0]
    expect(el?.fields.speed).toBe('maximum')
  })

  it('4.4.1 rewriteFieldCitation rewrites touched field citation while preserving untouched fields', () => {
    const element: ElementNode = {
      type: 'Vision',
      name: 'Corporate Vision',
      description: '',
      fields: {
        statement: 'To lead the industry',
        statement_source: 'sources/interview.md@## Vision',
        target_year: '2030',
        target_year_source: 'sources/report.pdf_sidecar_NN.md@## Timeline',
        sources: [
          'sources/interview.md@## Vision',
          'sources/report.pdf_sidecar_NN.md@## Timeline',
        ],
      },
      markers: {},
    }

    const citationRef = 'changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01'
    rewriteFieldCitation(element, 'statement', citationRef)

    // Touched field citation is updated
    expect(element.fields.statement_source).toBe(citationRef)

    // Untouched field citation is preserved
    expect(element.fields.target_year_source).toBe('sources/report.pdf_sidecar_NN.md@## Timeline')

    // sources array reflects the updated citation
    expect(element.fields.sources).toEqual([
      citationRef,
      'sources/report.pdf_sidecar_NN.md@## Timeline',
    ])
  })

  it('4.4.2 rewriteFieldCitation initializes citation on an element without existing source', () => {
    const element: ElementNode = {
      type: 'Vision',
      name: 'New Vision',
      description: '',
      fields: {
        statement: 'Fresh statement',
      },
      markers: {},
    }

    const citationRef = 'changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-02'
    rewriteFieldCitation(element, 'statement', citationRef)

    expect(element.fields.statement_source).toBe(citationRef)
    expect(element.fields.sources).toEqual([citationRef])
  })
})
