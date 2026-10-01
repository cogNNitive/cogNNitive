import { describe, it, expect } from 'vitest'
import {
  projectLineage,
  extractFileCitations,
  type LineageProjection,
} from '../../src/lineage/project.js'
import type { FileSnapshot } from '../../src/queryUnits.js'

describe('projectLineage', () => {
  const fixtureFiles: FileSnapshot[] = [
    // Active Source with sidecar
    {
      path: 'sources/nn/interview.md',
      content: `---
source_file: sources/import/interview.txt
sha256: abc123def456
size_bytes: 1024
normalized_at: 2026-09-01T10:00:00Z
normalized_by: scanner
---
# Interview Notes
## Clients
Discussion with enterprise client.
`,
    },
    // Curated CSV without separate .md sidecar
    {
      path: 'sources/nn/metrics.csv',
      content: `metric,value\nmrr,1000\n`,
    },
    // Promoted deliverable as a source under sources/export/ with its own sources: frontmatter
    {
      path: 'sources/export/Market_Analysis_V_1-0-0.md',
      content: `---
sources: ["kNNowledge/Strategy_V_1-0-0_NN.md@## Strategy: Positioning"]
title: Market Analysis
---
# Market Analysis Content
`,
    },
    // Sidecar for promoted deliverable under sources/nn/export/
    {
      path: 'sources/nn/export/Market_Analysis_V_1-0-0.md',
      content: `---
source_file: sources/export/Market_Analysis_V_1-0-0.md
sha256: market789
size_bytes: 2048
normalized_at: 2026-09-02T12:00:00Z
---
# Promoted Market Analysis
`,
    },
    // Archived source V1
    {
      path: 'sources/archive/interview/V1/interview.md',
      content: `---
source_file: sources/import/interview.txt
sha256: oldhash111
size_bytes: 900
normalized_at: 2026-08-01T10:00:00Z
normalized_by: scanner
---
# Old Interview
`,
    },
    // kNNowledge model
    {
      path: 'kNNowledge/Strategy_V_1-0-0_NN.md',
      content: `---
title: "Strategy Model"
knowledge_version: "V_1-0-0"
parent_spec:
  name: "business"
  url: "https://example.com/spec.md"
---

# NN Strategy
## NN Strategy: Positioning
sources:: sources/nn/interview.md@## Clients
description:: Market positioning.
`,
    },
    // CogNNitive Lineage Record itself (must be excluded from ModelRecords)
    {
      path: 'kNNowledge/Lineage_Record_NN.md',
      content: `---
title: "cogNNitive Lineage Record"
parent_spec:
  name: "cogNNitive"
  url: "https://example.com/cogNNitive.md"
---
# NN Sources
`,
    },
    // Markdown artifact in export/
    {
      path: 'export/Report.md',
      content: `---
title: "Quarterly Report"
format: "report"
sources:
  - "kNNowledge/Strategy_V_1-0-0_NN.md@## NN Strategy: Positioning"
---
# Report body
`,
    },
    // HTML Console artifact with innfo-model.meta.sources
    {
      path: 'export/Strategy_Console.html',
      content: `<!DOCTYPE html>
<html>
<head>
<script id="innfo-model" type="application/json">
{
  "meta": {
    "modelId": "kNNowledge/Strategy_V_1-0-0",
    "sources": ["kNNowledge/Strategy_V_1-0-0_NN.md"]
  },
  "elements": []
}
</script>
</head>
<body></body>
</html>`,
    },
    // CSV artifact with sources column
    {
      path: 'export/summary.csv',
      content: `item,sources,count
Enterprise,sources/nn/interview.md@## Clients,42
`,
    },
    // JSON artifact with sources array
    {
      path: 'export/data.json',
      content: JSON.stringify([
        { id: 1, name: 'A', sources: ['sources/nn/interview.md@## Clients'] },
        { id: 2, name: 'B', sources: 'sources/nn/interview.md@## Clients' },
      ]),
    },
    // Terminal CSV artifact (no sources column)
    {
      path: 'export/terminal.csv',
      content: `colA,colB\n1,2\n`,
    },
    // Legacy export-meta HTML (must be ignored)
    {
      path: 'export/legacy.html',
      content: `<!DOCTYPE html>
<html>
<head>
<script id="export-meta" type="application/json">
{
  "modelName": "Strategy",
  "modelVersion": "V_1-0-0",
  "sources": ["sources/nn/interview.md@## Clients"]
}
</script>
</head>
<body></body>
</html>`,
    },
    // Artifact with model/knowledge_version fallback (must not create edges)
    {
      path: 'export/fallback_doc.md',
      content: `---
title: "Doc with legacy model fallback"
model: "Strategy"
knowledge_version: "V_1-0-0"
---
# Content
`,
    },
  ]

  it('projects sources including active, curated CSV, archive versions, and promoted sources', () => {
    const projection = projectLineage(fixtureFiles)

    // Check active interview.md (which has V1 in archive -> version V2, archive_path set)
    const interviewSource = projection.sources.find((s) => s.name === 'interview.txt')
    expect(interviewSource).toBeDefined()
    expect(interviewSource?.version).toBe('V2')
    expect(interviewSource?.archive_path).toBe('sources/archive/interview/V1/interview.md')
    expect(interviewSource?.raw_hash).toBe('abc123def456')
    expect(interviewSource?.source_format).toBe('txt')
    expect(interviewSource?.status).toBeUndefined()
    expect(interviewSource?.superseded_by).toBeUndefined()
    expect(interviewSource?.derived_from).toEqual([])

    // Check archived interview V1
    const archivedInterview = projection.sources.find((s) => s.name === 'interview.txt V1')
    expect(archivedInterview).toBeDefined()
    expect(archivedInterview?.status).toBe('archived')
    expect(archivedInterview?.version).toBe('V1')
    expect(archivedInterview?.superseded_by).toBe('interview.txt V2')
    expect(archivedInterview?.derived_from).toEqual([])

    // Check curated CSV without separate .md sidecar
    const csvSource = projection.sources.find((s) => s.name === 'metrics.csv')
    expect(csvSource).toBeDefined()
    expect(csvSource?.source_format).toBe('csv')
    expect(csvSource?.curated_csv).toBe('sources/nn/metrics.csv')

    // Check promoted source from sources/export/
    const promotedSource = projection.sources.find((s) => s.name === 'Market_Analysis_V_1-0-0.md')
    expect(promotedSource).toBeDefined()
    expect(promotedSource?.raw_filename).toBe('sources/export/Market_Analysis_V_1-0-0.md')
    expect(promotedSource?.derived_from).toEqual([
      'kNNowledge/Strategy_V_1-0-0_NN.md@## Strategy: Positioning',
    ])
  })

  it('projects knowledge models and ignores the cogNNitive lineage record', () => {
    const projection = projectLineage(fixtureFiles)

    expect(projection.knowledge).toHaveLength(1)
    const model = projection.knowledge[0]
    expect(model.name).toBe('Strategy Model')
    expect(model.model_ref).toBe('kNNowledge/Strategy_V_1-0-0_NN.md')
    expect(model.knowledge_version).toBe('V_1-0-0')
    expect(model.model_template).toBe('business')
    expect(model.citations).toEqual([
      {
        value: 'sources/nn/interview.md@## Clients',
        referringPath: 'kNNowledge/Strategy_V_1-0-0_NN.md',
        element: 'Positioning',
        field: 'sources',
      },
    ])
  })

  it('projects artifacts and ignores export-meta and model fallback', () => {
    const projection = projectLineage(fixtureFiles)

    const report = projection.artifacts.find((a) => a.name === 'Report')
    expect(report).toBeDefined()
    expect(report?.artifact_ref).toBe('export/Report.md')
    expect(report?.artifact_format).toBe('report')
    expect(report?.citations).toHaveLength(1)
    expect(report?.citations[0].value).toBe(
      'kNNowledge/Strategy_V_1-0-0_NN.md@## NN Strategy: Positioning',
    )

    const consoleHtml = projection.artifacts.find((a) => a.name === 'Strategy_Console')
    expect(consoleHtml).toBeDefined()
    expect(consoleHtml?.artifact_format).toBe('board')
    expect(consoleHtml?.citations).toEqual([
      {
        value: 'kNNowledge/Strategy_V_1-0-0_NN.md',
        referringPath: 'export/Strategy_Console.html',
        field: 'meta.sources',
      },
    ])

    const summaryCsv = projection.artifacts.find((a) => a.name === 'summary')
    expect(summaryCsv).toBeDefined()
    expect(summaryCsv?.artifact_format).toBe('dataset')
    expect(summaryCsv?.citations[0].value).toBe('sources/nn/interview.md@## Clients')

    const dataJson = projection.artifacts.find((a) => a.name === 'data')
    expect(dataJson).toBeDefined()
    expect(dataJson?.citations).toHaveLength(2)

    const terminalCsv = projection.artifacts.find((a) => a.name === 'terminal')
    expect(terminalCsv).toBeDefined()
    expect(terminalCsv?.citations).toEqual([])

    const legacyHtml = projection.artifacts.find((a) => a.name === 'legacy')
    expect(legacyHtml).toBeDefined()
    expect(legacyHtml?.citations).toEqual([])

    const fallbackDoc = projection.artifacts.find((a) => a.name === 'fallback_doc')
    expect(fallbackDoc).toBeDefined()
    expect(fallbackDoc?.citations).toEqual([])
  })

  it('extracts citations from all export and sources/export files', () => {
    const sites = extractFileCitations(fixtureFiles)
    expect(sites.length).toBeGreaterThan(0)
    const paths = sites.map((s) => s.referringPath)
    expect(paths).toContain('export/Report.md')
    expect(paths).toContain('export/Strategy_Console.html')
    expect(paths).toContain('sources/export/Market_Analysis_V_1-0-0.md')
  })
})
