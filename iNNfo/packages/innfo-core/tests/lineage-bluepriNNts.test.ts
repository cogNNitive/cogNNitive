import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseKnowledge } from '../src/parser/index'
import { validateKnowledge } from '../src/validator/knowledge'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const COGNNITIVE_SPEC_PATH = path.join(REPO_ROOT, 'iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md')
const DOMAINN_SPEC_PATH = path.join(REPO_ROOT, 'iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md')
const ARTIFACTS_SPEC_PATH = path.join(REPO_ROOT, 'iNNfo/specs/bluepriNNts/artifacts/spec_NN.md')

describe('Lineage single-edge bluepriNNt schemas and contracts (S6)', () => {
  it('asserts cogNNitive bluepriNNt matches projection fields and single-edge lineage', () => {
    const content = fs.readFileSync(COGNNITIVE_SPEC_PATH, 'utf-8')
    const parsed = parseKnowledge(content)

    // template_version V_0-4-1
    expect((parsed.frontmatter as any)?.template_version).toBe('V_0-4-1')

    const fieldNodes =
      parsed.elements.get('NN Field Definition') ||
      parsed.elements.get('Field Definition') ||
      []

    const fieldsByConcept: Record<string, { name: string; type?: string }[]> = {}
    for (const f of fieldNodes) {
      const concept = (typeof f.fields.concept === 'object' ? (f.fields.concept as any)?.value : f.fields.concept) as string
      const type = (typeof f.fields.type === 'object' ? (f.fields.type as any)?.value : f.fields.type) as string
      if (!concept) continue
      if (!fieldsByConcept[concept]) fieldsByConcept[concept] = []
      fieldsByConcept[concept].push({ name: f.name, type })
    }

    const expectedSourcesFields = [
      'raw_filename',
      'raw_hash',
      'size',
      'source_format',
      'normalized_at',
      'normalized_by',
      'normalized_content',
      'version',
      'superseded_by',
      'derived_from',
    ]
    const actualSourcesFieldNames = (fieldsByConcept['Sources'] || []).map((f) => f.name)
    expect(actualSourcesFieldNames.sort()).toEqual(expectedSourcesFields.sort())

    const sourcesDerivedFrom = fieldsByConcept['Sources']?.find((f) => f.name === 'derived_from')
    expect(sourcesDerivedFrom?.type).toBe('citation')

    const expectedModelRecordsFields = [
      'model_ref',
      'knowledge_version',
      'model_template',
      'derived_from',
    ]
    const actualModelRecordsFieldNames = (fieldsByConcept['ModelRecords'] || []).map((f) => f.name)
    expect(actualModelRecordsFieldNames.sort()).toEqual(expectedModelRecordsFields.sort())

    const modelRecordsDerivedFrom = fieldsByConcept['ModelRecords']?.find(
      (f) => f.name === 'derived_from',
    )
    expect(modelRecordsDerivedFrom?.type).toBe('citation')

    const expectedArtifactsFields = ['artifact_ref', 'artifact_format', 'derived_from']
    const actualArtifactsFieldNames = (fieldsByConcept['Artifacts'] || []).map((f) => f.name)
    expect(actualArtifactsFieldNames.sort()).toEqual(expectedArtifactsFields.sort())

    const artifactsDerivedFrom = fieldsByConcept['Artifacts']?.find((f) => f.name === 'derived_from')
    expect(artifactsDerivedFrom?.type).toBe('citation')

    // Removed fields absent (the last four left with the sources/nn mirror and the archive flow)
    const removedFields = [
      'media_filename',
      'curated_csv',
      'status',
      'archive_path',
      'generated_by',
      'produced_by',
      'derived_from_inputs',
      'location',
      'artifact_version',
      'artifact_hash',
      'model_version',
      'raw_file',
    ]
    for (const concept of Object.keys(fieldsByConcept)) {
      for (const field of fieldsByConcept[concept]) {
        expect(removedFields).not.toContain(field.name)
      }
    }

    // Matrix definition removed
    const matrixDefs =
      parsed.elements.get('NN Matrix Definition') ||
      parsed.elements.get('Matrix Definition') ||
      []
    expect(matrixDefs.find((m) => m.name.includes('Artifact-Source Lineage'))).toBeUndefined()
    expect((parsed.frontmatter as any)?.relationship_types?.evaluable_matrix?.enabled).toBe(false)

    // Stale section removed and example uses @
    expect(content).not.toContain('validator currently checks intra-model references only')
    expect(content).not.toMatch(/sources\/(nn|original|export|archive)\//)
    expect(content).toMatch(/@/)
  })

  it('asserts domaiNN bluepriNNt has no kNNowledge.derived_from and blueprint_version V_0-3-1', () => {
    const content = fs.readFileSync(DOMAINN_SPEC_PATH, 'utf-8')
    const parsed = parseKnowledge(content)

    expect((parsed.frontmatter as any)?.blueprint_version).toBe('V_0-3-1')

    const fieldNodes =
      parsed.elements.get('NN Field Definition') ||
      parsed.elements.get('Field Definition') ||
      []
    const knowledgeFields = fieldNodes
      .filter((f) => f.fields.concept?.value === 'kNNowledge')
      .map((f) => f.name)

    expect(knowledgeFields).not.toContain('derived_from')
  })

  it('asserts artifacts catalog bluepriNNt drops sources/produced_by and has blueprint_version V_0-4-1', () => {
    const content = fs.readFileSync(ARTIFACTS_SPEC_PATH, 'utf-8')
    const parsed = parseKnowledge(content)

    expect((parsed.frontmatter as any)?.blueprint_version).toBe('V_0-4-1')

    const fieldNodes =
      parsed.elements.get('NN Field Definition') ||
      parsed.elements.get('Field Definition') ||
      []
    const artifactFields = fieldNodes
      .filter((f) => f.fields.concept?.value === 'Artifact')
      .map((f) => f.name)

    expect(artifactFields).not.toContain('sources')
    expect(artifactFields).not.toContain('produced_by')
  })

  it('validates a sample cogNNitive record with citation ModelRecords.derived_from with no false-positive dangling references', () => {
    const specContent = fs.readFileSync(COGNNITIVE_SPEC_PATH, 'utf-8')
    const specDoc = {
      name: 'cogNNitive',
      level: 2 as const,
      frontmatter: { spec_version: 'V_0-2-1', level: 2, title: 'cogNNitive Template' },
      rawContent: specContent,
    }

    const recordContent = [
      '---',
      'spec_version: "V_0-2-1"',
      'level: 3',
      'knowledge_version: "V_0-1-0"',
      'title: "Sample Workspace Lineage"',
      'parent_spec:',
      '  name: "cogNNitive"',
      '  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md"',
      '---',
      '',
      '# NN index',
      '* [[Sources]]',
      '* [[ModelRecords]]',
      '* [[Artifacts]]',
      '* [[Procedures]]',
      '',
      '# NN Sources',
      '## NN Sources: input.md',
      'raw_filename:: sources/import/input.md',
      'raw_hash:: sha256:abc123',
      'size:: 100',
      'source_format:: md',
      'normalized_content:: sources/import/input.md',
      'version:: V1',
      'derived_from:: []',
      '',
      '# NN ModelRecords',
      '## NN ModelRecords: DomainModel',
      'model_ref:: kNNowledge/Domain_NN.md',
      'knowledge_version:: V_0-1-0',
      'model_template:: business',
      'derived_from:: [sources/import/input.md@## Overview]',
      '',
      '# NN Artifacts',
      '## NN Artifacts: Report',
      'artifact_ref:: artifacts/report.md',
      'artifact_format:: report',
      'derived_from:: [kNNowledge/Domain_NN.md@## Section]',
      '',
      '# NN Procedures',
      '## NN Procedures: Ingest run',
      'procedure_ref:: procedures/Ingest_NN.md',
      'agent:: nn-trannsform',
      'run_at:: 2026-10-01T00:00:00Z',
    ].join('\n')

    const parsedModel = parseKnowledge(recordContent)
    const res = validateKnowledge(parsedModel, specDoc)

    // The intra-model reference validator should not treat citation fields as broken reference targets
    const referenceErrors = (res.checks || []).filter(
      (c) => c.severity === 'error' && !c.passed && c.code?.includes('REFERENCE'),
    )
    expect(referenceErrors).toHaveLength(0)
    expect(res.errors.filter((e) => e.severity === 'error')).toHaveLength(0)
  })
})
