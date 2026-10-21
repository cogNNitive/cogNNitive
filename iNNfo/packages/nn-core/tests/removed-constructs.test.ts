import { describe, it, expect } from 'vitest'
import { checkRemovedMarkerConstructs } from '../src/validator/removed-constructs.js'
import { parseKnowledge } from '../src/parser/index.js'
import { validateFormatContent } from '../src/validator/content.js'

describe('MARKERS_REMOVED Diagnostic', () => {
  it('detects Marker Definition in Level-2 blueprint', () => {
    const content = `---
spec_version: "V_0-5-0"
level: 2
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://example.com/spec.md"
title: "Legacy Blueprint"
---
# NN Marker Definition
## NN Marker Definition: importance
symbol:: !
`
    const parsed = parseKnowledge(content)
    const diags = checkRemovedMarkerConstructs(parsed, 'test_spec_NN.md')
    expect(diags).toHaveLength(1)
    expect(diags[0].code).toBe('MARKERS_REMOVED')
    expect(diags[0].severity).toBe('error')
    expect(diags[0].meta?.markers).toContain('importance')
    expect(diags[0].meta?.matrixColumns).toEqual([])
    expect(diags[0].promptHint).toBe('nn-innfo recipe MARKERS_REMOVED')
    expect(diags[0].message).toContain('test_spec_NN.md uses Marker Definitions (importance)')
    expect(diags[0].message).toContain('A flag marker becomes a value of the tags Field')
    expect(diags[0].message).toContain('A valued marker becomes a declared Field')
  })

  it('detects item-markers matrix in Level-3 document', () => {
    const content = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "projects"
  url: "https://example.com/projects.md"
title: "Legacy Knowledge"
knowledge_version: "V_0-1-0"
---
# NN matrices: item-markers matrix

| Element | priority | weight |
|---|---|---|
| Task1 | ! | 80 |
`
    const parsed = parseKnowledge(content)
    const diags = checkRemovedMarkerConstructs(parsed, 'model_NN.md')
    expect(diags).toHaveLength(1)
    expect(diags[0].code).toBe('MARKERS_REMOVED')
    expect(diags[0].severity).toBe('error')
    expect(diags[0].meta?.markers).toEqual([])
    expect(diags[0].meta?.matrixColumns).toEqual(['priority', 'weight'])
    expect(diags[0].message).toContain('an item-markers matrix (priority, weight)')
  })

  it('reports exactly one diagnostic when both constructs are present', () => {
    const content = `---
spec_version: "V_0-5-0"
level: 2
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://example.com/spec.md"
title: "Both"
---
# NN Marker Definition
## NN Marker Definition: importance

# NN matrices: item-markers matrix
| Element | importance |
|---|---|
| E1 | ! |
`
    const parsed = parseKnowledge(content)
    const diags = checkRemovedMarkerConstructs(parsed, 'both_NN.md')
    expect(diags).toHaveLength(1)
    expect(diags[0].code).toBe('MARKERS_REMOVED')
    expect(diags[0].meta?.markers).toEqual(['importance'])
    expect(diags[0].meta?.matrixColumns).toEqual(['importance'])
  })

  it('is version-agnostic (V_0-4-0 and V_0-5-0)', () => {
    for (const ver of ['V_0-4-0', 'V_0-5-0']) {
      const content = `---
spec_version: "${ver}"
level: 2
parent_spec:
  name: "iNNfo_${ver}"
  url: "https://example.com/${ver}.md"
title: "Version Test"
---
# NN Marker Definition
## NN Marker Definition: flag
`
      const parsed = parseKnowledge(content)
      const diags = checkRemovedMarkerConstructs(parsed, `test_${ver}_NN.md`)
      expect(diags).toHaveLength(1)
      expect(diags[0].code).toBe('MARKERS_REMOVED')
    }
  })

  it('leaves free matrices unaffected', () => {
    const content = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "business"
  url: "https://example.com/business.md"
title: "Free Matrix"
knowledge_version: "V_0-1-0"
---
# NN matrices: problems-value propositions matrix

| Problems | Solution A |
|---|---|
| P1 | High |
`
    const parsed = parseKnowledge(content)
    const diags = checkRemovedMarkerConstructs(parsed, 'free_matrix_NN.md')
    expect(diags).toHaveLength(0)
  })

  it('suppresses generic unknown-concept/matrix checks so no duplicate diagnostics appear', () => {
    const content = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "business"
  url: "https://example.com/business.md"
title: "Suppress Duplicates"
knowledge_version: "V_0-1-0"
---
# NN matrices: item-markers matrix

| Element | priority |
|---|---|
| E1 | ! |
`
    const report = validateFormatContent(content, 'suppress_NN.md')
    const errors = report.checks.filter((c) => !c.passed && c.severity === 'error')
    const markersRemoved = errors.filter((c) => c.code === 'MARKERS_REMOVED')
    expect(markersRemoved).toHaveLength(1)
    // No generic matrix warnings or errors about item-markers matrix
    const matrixErrors = errors.filter((c) => c.id !== 'MARKERS_REMOVED' && c.message?.includes('item-markers matrix'))
    expect(matrixErrors).toHaveLength(0)
  })
})
