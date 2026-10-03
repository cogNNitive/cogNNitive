import { describe, it, expect } from 'vitest'
import {
  projectLineage,
  extractDeclaredCitations,
  extractFileCitations,
} from '../../src/lineage/project.js'
import type { FileSnapshot } from '../../src/queryUnits.js'

const SIDECAR_PARENT = `parent_spec:
  name: "sidecar"
  url: "https://example.com/sidecar.md"`

function sidecar(subject: string, extra = ''): FileSnapshot {
  return {
    path: `${subject}_sidecar_NN.md`,
    content: `---
level: 3
${SIDECAR_PARENT}
source_file: ${subject}
sha256: hash-of-${subject.split('/').pop()}
size_bytes: 10
source_format: ${subject.split('.').pop()}
normalized_at: 2026-10-02T10:15:00Z
${extra}---
`,
  }
}

describe('projectLineage: sidecar-declared upstream', () => {
  it('uses the sidecar sources as the upstream edge of a text-native subject that cannot declare one', () => {
    const csv = 'artifacts/curated/m_20261002T101500Z.csv'
    const { sources } = projectLineage([
      { path: csv, content: 'id\na\n' },
      sidecar(csv, 'sources:\n  - sources/import/m.csv\n'),
    ])
    expect(sources[0].derived_from).toEqual(['sources/import/m.csv'])
  })

  it('prefers the citations the subject declares itself', () => {
    const md = 'artifacts/Report_20261002T101500Z.md'
    const { sources } = projectLineage([
      { path: md, content: '---\nsources: [kNNowledge/A_business_NN.md]\n---\n# R\n' },
      sidecar(md, 'sources:\n  - sources/import/other.csv\n'),
    ])
    expect(sources[0].derived_from).toEqual(['kNNowledge/A_business_NN.md'])
  })
})

describe('projectLineage (name-derived roles)', () => {
  const fixtureFiles: FileSnapshot[] = [
    // Binary subject: only its sidecar is in the snapshot; the sidecar carries the upstream edge.
    sidecar(
      'sources/import/contract.pdf',
      'normalized_by: nn-trannsform\nsources:\n  - "kNNowledge/Strategy_business_NN.md@## NN Strategy: Positioning"\n',
    ),
    // A two-member family of CSV sources.
    { path: 'sources/import/metrics.csv', content: 'metric,value\nmrr,1000\n' },
    sidecar('sources/import/metrics.csv'),
    { path: 'sources/import/metrics_20261002T101500Z.csv', content: 'metric,value\nmrr,1200\n' },
    sidecar('sources/import/metrics_20261002T101500Z.csv'),
    // An artifact reused as input: cognitivized in place, upstream comes from the subject itself.
    {
      path: 'artifacts/Market_20261002T101500Z.md',
      content: `---
title: Market
sources:
  - "kNNowledge/Strategy_business_NN.md@## NN Strategy: Positioning"
---
# Market
`,
    },
    sidecar('artifacts/Market_20261002T101500Z.md', 'sources:\n  - "ignored/for/text-subjects.md"\n'),
    // Sidecar whose source_file disagrees with the subject derived from its name.
    {
      path: 'sources/import/a.csv_sidecar_NN.md',
      content: `---
level: 3
${SIDECAR_PARENT}
source_file: sources/import/b.csv
sha256: x
size_bytes: 1
source_format: csv
normalized_at: 2026-10-02T10:15:00Z
---
`,
    },
    { path: 'sources/import/a.csv', content: 'a\n1\n' },
    // Knowledge
    {
      path: 'kNNowledge/Strategy_business_NN.md',
      content: `---
title: "Strategy Model"
level: 3
knowledge_version: "V_1-0-0"
parent_spec:
  name: "business"
  url: "https://example.com/spec.md"
---

# NN Strategy
## NN Strategy: Positioning
sources:: sources/import/interview.md@## Clients
description:: Market positioning.
`,
    },
    // The record is never a model.
    {
      path: 'kNNowledge/Lineage_cogNNitive_NN.md',
      content: `---
title: "cogNNitive Lineage Record"
level: 3
parent_spec:
  name: "cogNNitive"
  url: "https://example.com/cogNNitive.md"
---
# NN Sources
`,
    },
    // Artifacts that declare upstream.
    {
      path: 'artifacts/Report.md',
      content: `---
title: "Quarterly Report"
format: "report"
sources:
  - "kNNowledge/Strategy_business_NN.md@## NN Strategy: Positioning"
---
# Report body
`,
    },
    {
      path: 'artifacts/Strategy_Console.html',
      content: `<!DOCTYPE html>
<html>
<head>
<script id="innfo-model" type="application/json">
{ "meta": { "sources": ["kNNowledge/Strategy_business_NN.md"] }, "elements": [] }
</script>
</head>
<body></body>
</html>`,
    },
    { path: 'artifacts/summary.csv', content: `item,sources,count\nEnterprise,sources/import/interview.md@## Clients,42\n` },
    {
      path: 'artifacts/data.json',
      content: JSON.stringify([
        { id: 1, sources: ['sources/import/interview.md@## Clients'] },
        { id: 2, sources: 'sources/import/interview.md@## Clients' },
      ]),
    },
    // Suffixed member without upstream: still an artifact node.
    { path: 'artifacts/summary_20261002T101500Z.md', content: '# Summary\n' },
    // Excluded: loose hand-written markdown, terminal unsuffixed csv, legacy export-meta, staging.
    { path: 'artifacts/notes.md', content: '# Notes\n' },
    { path: 'artifacts/terminal.csv', content: 'colA,colB\n1,2\n' },
    {
      path: 'artifacts/legacy.html',
      content: `<html><head><script id="export-meta" type="application/json">{"sources": ["x.md@## A"]}</script></head></html>`,
    },
    { path: 'artifacts/staging/draft_20261002T101500Z.md', content: '# Draft\n' },
    {
      path: 'artifacts/fallback_doc.md',
      content: `---\nmodel: "Strategy"\nknowledge_version: "V_1-0-0"\n---\n# Content\n`,
    },
  ]

  it('projects a Source for every sidecar subject, with version rank and superseded_by', () => {
    const { sources } = projectLineage(fixtureFiles)

    const v1 = sources.find((s) => s.raw_filename === 'sources/import/metrics.csv')
    expect(v1).toMatchObject({
      name: 'metrics.csv',
      version: 'V1',
      superseded_by: 'sources/import/metrics_20261002T101500Z.csv',
      raw_hash: 'hash-of-metrics.csv',
      size: '10',
      source_format: 'csv',
      normalized_at: '2026-10-02T10:15:00Z',
      normalized_content: 'sources/import/metrics.csv_sidecar_NN.md',
      derived_from: [],
    })
    const v2 = sources.find((s) => s.raw_filename === 'sources/import/metrics_20261002T101500Z.csv')
    expect(v2?.version).toBe('V2')
    expect(v2?.superseded_by).toBeUndefined()
  })

  it('takes derived_from from the sidecar for a binary subject and from the subject otherwise', () => {
    const { sources } = projectLineage(fixtureFiles)

    const pdf = sources.find((s) => s.raw_filename === 'sources/import/contract.pdf')
    expect(pdf?.normalized_by).toBe('nn-trannsform')
    expect(pdf?.source_format).toBe('pdf')
    expect(pdf?.derived_from).toEqual(['kNNowledge/Strategy_business_NN.md@## NN Strategy: Positioning'])

    const market = sources.find((s) => s.raw_filename === 'artifacts/Market_20261002T101500Z.md')
    expect(market?.derived_from).toEqual(['kNNowledge/Strategy_business_NN.md@## NN Strategy: Positioning'])
  })

  it('never emits the removed archive, status, curated and media fields', () => {
    const { sources } = projectLineage(fixtureFiles)
    expect(sources.length).toBeGreaterThan(0)
    for (const s of sources) {
      for (const removed of ['archive_path', 'status', 'curated_csv', 'media_filename']) {
        expect(s).not.toHaveProperty(removed)
      }
    }
  })

  it('reports SIDECAR_SUBJECT_MISMATCH when source_file disagrees with the name-derived subject', () => {
    const projection = projectLineage(fixtureFiles)
    expect(projection.diagnostics).toEqual([
      expect.objectContaining({
        code: 'SIDECAR_SUBJECT_MISMATCH',
        path: 'sources/import/a.csv_sidecar_NN.md',
      }),
    ])
    // The subject named by the sidecar file name is still the Source.
    expect(projection.sources.some((s) => s.raw_filename === 'sources/import/a.csv')).toBe(true)
  })

  it('projects isModelCandidate documents as knowledge and skips the record', () => {
    const { knowledge } = projectLineage(fixtureFiles)

    expect(knowledge).toHaveLength(1)
    expect(knowledge[0]).toMatchObject({
      name: 'Strategy Model',
      model_ref: 'kNNowledge/Strategy_business_NN.md',
      knowledge_version: 'V_1-0-0',
      model_template: 'business',
    })
    expect(knowledge[0].citations).toEqual([
      {
        value: 'sources/import/interview.md@## Clients',
        referringPath: 'kNNowledge/Strategy_business_NN.md',
        element: 'Positioning',
        field: 'sources',
      },
    ])
  })

  it('projects suffixed or upstream-declaring files as artifacts and nothing else', () => {
    const { artifacts } = projectLineage(fixtureFiles)
    const refs = artifacts.map((a) => a.artifact_ref).sort()

    expect(refs).toEqual([
      'artifacts/Report.md',
      'artifacts/Strategy_Console.html',
      'artifacts/data.json',
      'artifacts/summary.csv',
      'artifacts/summary_20261002T101500Z.md',
    ])

    const report = artifacts.find((a) => a.name === 'Report')
    expect(report?.artifact_format).toBe('report')
    expect(report?.citations).toHaveLength(1)
    expect(artifacts.find((a) => a.name === 'Strategy_Console')?.artifact_format).toBe('board')
    expect(artifacts.find((a) => a.name === 'Strategy_Console')?.citations).toEqual([
      {
        value: 'kNNowledge/Strategy_business_NN.md',
        referringPath: 'artifacts/Strategy_Console.html',
        field: 'meta.sources',
      },
    ])
    expect(artifacts.find((a) => a.name === 'summary')?.artifact_format).toBe('dataset')
    expect(artifacts.find((a) => a.name === 'data')?.citations).toHaveLength(2)
    expect(artifacts.find((a) => a.name === 'summary_20261002T101500Z')?.citations).toEqual([])
  })

  it('does not project a Source twice as an artifact', () => {
    const { artifacts } = projectLineage(fixtureFiles)
    expect(artifacts.some((a) => a.artifact_ref === 'artifacts/Market_20261002T101500Z.md')).toBe(false)
  })

  it('moves a file from Artifacts to Sources when its sidecar appears', () => {
    const file: FileSnapshot = {
      path: 'artifacts/Market_20261002T101500Z.md',
      content: '# Market\n',
    }
    const before = projectLineage([file])
    expect(before.artifacts.map((a) => a.artifact_ref)).toEqual([file.path])
    expect(before.sources).toEqual([])

    const after = projectLineage([file, sidecar(file.path)])
    expect(after.artifacts).toEqual([])
    expect(after.sources.map((s) => s.raw_filename)).toEqual([file.path])
  })

  it('is deterministic and ignores input order', () => {
    const a = projectLineage(fixtureFiles)
    const b = projectLineage([...fixtureFiles].reverse())
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('ignores old mirror files, archive snapshots and staging sidecars', () => {
    const { sources, artifacts } = projectLineage([
      { path: 'sources/import/old.md', content: '---\nsource_file: x.txt\n---\n' },
      { path: 'sources/archive/m/V1/m.md', content: '---\nsource_file: m.txt\n---\n' },
      sidecar('sources/import/staging/x.md'),
    ])
    expect(sources).toEqual([])
    expect(artifacts).toEqual([])
  })
})

describe('extractDeclaredCitations', () => {
  it('reads the declared location of each file kind', () => {
    expect(
      extractDeclaredCitations({ path: 'a.md', content: '---\nsources: ["x.md@## A"]\n---\n' }),
    ).toEqual([{ value: 'x.md@## A', referringPath: 'a.md', field: 'sources' }])
    expect(extractDeclaredCitations({ path: 'a.csv', content: 'k,sources\n1,x.md@## A\n' })).toEqual([
      { value: 'x.md@## A', referringPath: 'a.csv', field: 'sources' },
    ])
    expect(extractDeclaredCitations({ path: 'a.json', content: '{"sources":["x.md@## A"]}' })).toEqual([
      { value: 'x.md@## A', referringPath: 'a.json', field: 'sources' },
    ])
    expect(extractDeclaredCitations({ path: 'a.txt', content: 'sources: x' })).toEqual([])
  })

  it('serves extractFileCitations for artifacts, sources and sidecars but not knowledge documents', () => {
    const sites = extractFileCitations([
      { path: 'artifacts/r_20261002T101500Z.md', content: '---\nsources: ["x.md@## A"]\n---\n' },
      sidecar('sources/import/c.pdf', 'sources: ["y.md@## B"]\n'),
      {
        path: 'kNNowledge/K_business_NN.md',
        content: '---\nlevel: 3\nsources: ["z.md@## C"]\nparent_spec:\n  name: business\n---\n',
      },
      { path: 'artifacts/staging/s_20261002T101500Z.md', content: '---\nsources: ["w.md@## D"]\n---\n' },
    ])
    expect(sites.map((s) => s.referringPath)).toEqual([
      'artifacts/r_20261002T101500Z.md',
      'sources/import/c.pdf_sidecar_NN.md',
    ])
  })
})
