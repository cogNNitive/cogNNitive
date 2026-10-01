import { describe, it, expect } from 'vitest'
import {
  renderLineageSections,
} from '../../src/lineage/render.js'
import { projectLineage, type LineageProjection } from '../../src/lineage/project.js'

describe('renderLineageSections', () => {
  const sampleProjection: LineageProjection = {
    sources: [
      {
        name: 'interview.txt',
        raw_filename: 'sources/import/interview.txt',
        media_filename: 'sources/media/interview.mp3',
        raw_hash: 'abc123def456',
        size: '1024',
        source_format: 'txt',
        normalized_at: '2026-09-01T10:00:00Z',
        normalized_by: 'scanner',
        normalized_content: 'sources/nn/interview.md',
        curated_csv: 'sources/nn/interview.csv',
        version: 'V2',
        archive_path: 'sources/archive/interview/V1/interview.md',
        derived_from: ['sources/export/doc.md@## Overview'],
      },
      {
        name: 'interview.txt V1',
        raw_filename: 'sources/import/interview.txt',
        raw_hash: 'oldhash111',
        size: '900',
        source_format: 'txt',
        normalized_at: '2026-08-01T10:00:00Z',
        normalized_by: 'scanner',
        normalized_content: 'sources/archive/interview/V1/interview.md',
        status: 'archived',
        version: 'V1',
        superseded_by: 'interview.txt V2',
        derived_from: [],
      },
    ],
    knowledge: [
      {
        name: 'Strategy Model',
        model_ref: 'kNNowledge/Strategy_V_1-0-0_NN.md',
        knowledge_version: 'V_1-0-0',
        model_template: 'business',
        citations: [
          {
            value: 'sources/nn/interview.md@## Clients',
            referringPath: 'kNNowledge/Strategy_V_1-0-0_NN.md',
            element: 'Positioning',
            field: 'sources',
          },
        ],
      },
    ],
    artifacts: [
      {
        name: 'Report',
        artifact_ref: 'export/Report.md',
        artifact_format: 'report',
        citations: [
          {
            value: 'kNNowledge/Strategy_V_1-0-0_NN.md@## NN Strategy: Positioning',
            referringPath: 'export/Report.md',
            field: 'sources',
          },
        ],
      },
    ],
  }

  it('renders exact fields for Sources, ModelRecords, and Artifacts', () => {
    const rendered = renderLineageSections(sampleProjection)

    // Sources section
    expect(rendered.sources).toContain('# NN Sources\n')
    expect(rendered.sources).toContain('## NN Sources: interview.txt\n')
    expect(rendered.sources).toContain('raw_filename:: sources/import/interview.txt\n')
    expect(rendered.sources).toContain('media_filename:: sources/media/interview.mp3\n')
    expect(rendered.sources).toContain('raw_hash:: abc123def456\n')
    expect(rendered.sources).toContain('size:: 1024\n')
    expect(rendered.sources).toContain('source_format:: txt\n')
    expect(rendered.sources).toContain('normalized_at:: 2026-09-01T10:00:00Z\n')
    expect(rendered.sources).toContain('normalized_by:: scanner\n')
    expect(rendered.sources).toContain('normalized_content:: sources/nn/interview.md\n')
    expect(rendered.sources).toContain('curated_csv:: sources/nn/interview.csv\n')
    expect(rendered.sources).toContain('version:: V2\n')
    expect(rendered.sources).toContain('archive_path:: sources/archive/interview/V1/interview.md\n')
    expect(rendered.sources).toContain('derived_from:: [sources/export/doc.md@## Overview]\n')

    // Archived source
    expect(rendered.sources).toContain('## NN Sources: interview.txt V1\n')
    expect(rendered.sources).toContain('status:: archived\n')
    expect(rendered.sources).toContain('superseded_by:: interview.txt V2\n')

    // ModelRecords section
    expect(rendered.modelRecords).toContain('# NN ModelRecords\n')
    expect(rendered.modelRecords).toContain('## NN ModelRecords: Strategy Model\n')
    expect(rendered.modelRecords).toContain('model_ref:: kNNowledge/Strategy_V_1-0-0_NN.md\n')
    expect(rendered.modelRecords).toContain('knowledge_version:: V_1-0-0\n')
    expect(rendered.modelRecords).toContain('model_template:: business\n')
    expect(rendered.modelRecords).toContain(
      'derived_from:: [sources/nn/interview.md@## Clients]\n',
    )

    // Artifacts section
    expect(rendered.artifacts).toContain('# NN Artifacts\n')
    expect(rendered.artifacts).toContain('## NN Artifacts: Report\n')
    expect(rendered.artifacts).toContain('artifact_ref:: export/Report.md\n')
    expect(rendered.artifacts).toContain('artifact_format:: report\n')
    expect(rendered.artifacts).toContain(
      'derived_from:: [kNNowledge/Strategy_V_1-0-0_NN.md@## NN Strategy: Positioning]\n',
    )
  })

  it('renders placeholders for empty projection sections', () => {
    const emptyProjection: LineageProjection = {
      sources: [],
      knowledge: [],
      artifacts: [],
    }

    const rendered = renderLineageSections(emptyProjection)
    expect(rendered.sources).toBe(
      '# NN Sources\n\n<!-- No sources ingested yet. Place files in sources/import and run a scan. -->\n',
    )
    expect(rendered.modelRecords).toBe(
      '# NN ModelRecords\n\n<!-- Auto-synced from kNNowledge/ on every --scan/--import-url/--lineage. One ModelRecords element per Level 3 model. -->\n',
    )
    expect(rendered.artifacts).toBe(
      '# NN Artifacts\n\n<!-- Auto-synced from export/ on every --scan/--import-url/--lineage. One element per generated deliverable. -->\n',
    )
  })

  it('is strictly deterministic across multiple runs', () => {
    const run1 = renderLineageSections(sampleProjection)
    const run2 = renderLineageSections(sampleProjection)
    expect(run1).toEqual(run2)
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2))
  })
})
