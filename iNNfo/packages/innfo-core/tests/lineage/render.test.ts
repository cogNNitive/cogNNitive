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
        raw_hash: 'abc123def456',
        size: '1024',
        source_format: 'txt',
        normalized_at: '2026-09-01T10:00:00Z',
        normalized_by: 'scanner',
        normalized_content: 'sources/import/interview.txt_sidecar_NN.md',
        version: 'V1',
        superseded_by: 'sources/import/interview_20261002T101500Z.txt',
        derived_from: ['artifacts/doc_20261002T101500Z.md@## Overview'],
      },
      {
        name: 'interview_20261002T101500Z.txt',
        raw_filename: 'sources/import/interview_20261002T101500Z.txt',
        raw_hash: 'newhash222',
        size: '900',
        source_format: 'txt',
        normalized_at: '2026-10-02T10:15:00Z',
        normalized_content: 'sources/import/interview_20261002T101500Z.txt_sidecar_NN.md',
        version: 'V2',
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
            value: 'sources/import/interview.md@## Clients',
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
        artifact_ref: 'artifacts/Report.md',
        artifact_format: 'report',
        citations: [
          {
            value: 'kNNowledge/Strategy_V_1-0-0_NN.md@## NN Strategy: Positioning',
            referringPath: 'artifacts/Report.md',
            field: 'sources',
          },
        ],
      },
    ],
    diagnostics: [],
  }

  it('renders exact fields for Sources, ModelRecords, and Artifacts', () => {
    const rendered = renderLineageSections(sampleProjection)

    // Sources section
    expect(rendered.sources).toContain('# NN Sources\n')
    expect(rendered.sources).toContain('## NN Sources: interview.txt\n')
    expect(rendered.sources).toContain('raw_filename:: sources/import/interview.txt\n')
    expect(rendered.sources).toContain('raw_hash:: abc123def456\n')
    expect(rendered.sources).toContain('size:: 1024\n')
    expect(rendered.sources).toContain('source_format:: txt\n')
    expect(rendered.sources).toContain('normalized_at:: 2026-09-01T10:00:00Z\n')
    expect(rendered.sources).toContain('normalized_by:: scanner\n')
    expect(rendered.sources).toContain('normalized_content:: sources/import/interview.txt_sidecar_NN.md\n')
    expect(rendered.sources).toContain('version:: V1\n')
    expect(rendered.sources).toContain(
      'superseded_by:: sources/import/interview_20261002T101500Z.txt\n',
    )
    expect(rendered.sources).toContain('derived_from:: [artifacts/doc_20261002T101500Z.md@## Overview]\n')

    // Latest family member
    expect(rendered.sources).toContain('## NN Sources: interview_20261002T101500Z.txt\n')
    expect(rendered.sources).toContain('version:: V2\n')

    // Removed fields never render
    for (const removed of ['archive_path::', 'status::', 'curated_csv::', 'media_filename::']) {
      expect(rendered.sources).not.toContain(removed)
    }

    // ModelRecords section
    expect(rendered.modelRecords).toContain('# NN ModelRecords\n')
    expect(rendered.modelRecords).toContain('## NN ModelRecords: Strategy Model\n')
    expect(rendered.modelRecords).toContain('model_ref:: kNNowledge/Strategy_V_1-0-0_NN.md\n')
    expect(rendered.modelRecords).toContain('knowledge_version:: V_1-0-0\n')
    expect(rendered.modelRecords).toContain('model_template:: business\n')
    expect(rendered.modelRecords).toContain(
      'derived_from:: [sources/import/interview.md@## Clients]\n',
    )

    // Artifacts section
    expect(rendered.artifacts).toContain('# NN Artifacts\n')
    expect(rendered.artifacts).toContain('## NN Artifacts: Report\n')
    expect(rendered.artifacts).toContain('artifact_ref:: artifacts/Report.md\n')
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
      diagnostics: [],
    }

    const rendered = renderLineageSections(emptyProjection)
    expect(rendered.sources).toBe(
      '# NN Sources\n\n<!-- No sources ingested yet. Place files in sources/import and run a scan. -->\n',
    )
    expect(rendered.modelRecords).toBe(
      '# NN ModelRecords\n\n<!-- Auto-synced from kNNowledge/ on every --scan/--import-url/--lineage. One ModelRecords element per Level 3 model. -->\n',
    )
    expect(rendered.artifacts).toBe(
      '# NN Artifacts\n\n<!-- Auto-synced from artifacts/ on every --scan/--import-url/--lineage. One element per generated deliverable. -->\n',
    )
  })

  it('is strictly deterministic across multiple runs', () => {
    const run1 = renderLineageSections(sampleProjection)
    const run2 = renderLineageSections(sampleProjection)
    expect(run1).toEqual(run2)
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2))
  })
})
