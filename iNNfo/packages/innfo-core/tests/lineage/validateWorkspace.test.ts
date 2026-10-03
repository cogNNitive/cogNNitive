import { describe, it, expect } from 'vitest'
import {
  validateWorkspaceSources,
  type SourceResolver,
  type RecursiveParseResult,
  type BlueprintSchema,
} from '../../src/index.js'
import type { FileSnapshot } from '../../src/queryUnits.js'

describe('validateWorkspaceSources with FileSnapshot[]', () => {
  const mockResolver: SourceResolver = (p: string) => {
    if (p === 'sources/import/existing.md') {
      return {
        exists: true,
        content: '# Overview\nValid content',
        headings: ['overview'],
      }
    }
    return { exists: false }
  }

  const modelRecordsSchema: BlueprintSchema = {
    blueprint_version: 'V_0-3-0',
    concepts: [
      {
        name: 'ModelRecords',
        type: 'model',
        fields: [
          { name: 'model_ref', type: 'string' },
          { name: 'derived_from', type: 'citation' },
        ],
      },
    ],
  }

  const recursiveResult: RecursiveParseResult = {
    rootId: 'domaiNN',
    nodes: {
      domaiNN: {
        id: 'domaiNN',
        kind: 'domain',
        name: 'Domain',
        source: { path: 'domaiNN_NN.md', format: 'canonical' },
        rawContent: '',
        frontmatter: {},
        taxonomy: [],
        elements: {},
        fields: {},
        relationships: [],
        childIds: ['rec1'],
      },
      rec1: {
        id: 'rec1',
        kind: 'element',
        name: 'RecordElement',
        type: 'ModelRecords',
        parentId: 'domaiNN',
        source: { path: 'kNNowledge/Lineage_NN.md', format: 'canonical' },
        rawContent: '',
        frontmatter: {},
        taxonomy: [],
        elements: {},
        fields: {
          derived_from: {
            value: 'sources/import/existing.md@## Overview',
          },
        },
        templateSchema: modelRecordsSchema,
        relationships: [],
      },
    },
  }

  const snapshots: FileSnapshot[] = [
    {
      path: 'artifacts/DanglingReport.md',
      content: `---
title: "Dangling Report"
sources: ["sources/import/missing.md@## Section"]
---
`,
    },
    {
      path: 'artifacts/DanglingConsole.html',
      content: `<html><head><script id="innfo-model" type="application/json">
{
  "meta": {
    "sources": ["kNNowledge/MissingModel_NN.md"]
  }
}
</script></head><body></body></html>`,
    },
    {
      path: 'artifacts/ValidReport.md',
      content: `---
title: "Valid Report"
sources: ["sources/import/existing.md@## Overview"]
---
`,
    },
  ]

  it('validates artifact frontmatter and console meta citations from snapshot without false positives on ModelRecords.derived_from', () => {
    const diagnostics = validateWorkspaceSources(recursiveResult, mockResolver, snapshots)

    // Should contain errors for dangling citations in artifacts/ files
    const missingFileDiags = diagnostics.filter((d) => d.code === 'KU_DANGLING_FILE')
    expect(missingFileDiags.length).toBe(2)

    const reportDiag = missingFileDiags.find((d) => d.path.startsWith('artifacts/DanglingReport.md'))
    expect(reportDiag).toBeDefined()
    expect(reportDiag?.message).toContain('sources/import/missing.md')

    const consoleDiag = missingFileDiags.find((d) => d.path.startsWith('artifacts/DanglingConsole.html'))
    expect(consoleDiag).toBeDefined()
    expect(consoleDiag?.message).toContain('kNNowledge/MissingModel_NN.md')

    // No legacy derivation key warning on ModelRecords.derived_from
    const legacyDiags = diagnostics.filter((d) => d.code === 'LEGACY_DERIVATION_KEY')
    expect(legacyDiags).toHaveLength(0)

    // No errors on valid report
    const validDiags = diagnostics.filter((d) => d.path.startsWith('artifacts/ValidReport.md'))
    expect(validDiags).toHaveLength(0)
  })
})
