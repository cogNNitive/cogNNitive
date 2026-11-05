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

  it('asserts domaiNN bluepriNNt has no kNNowledge.derived_from and blueprint_version V_0-4-1', () => {
    const content = fs.readFileSync(DOMAINN_SPEC_PATH, 'utf-8')
    const parsed = parseKnowledge(content)

    expect((parsed.frontmatter as any)?.blueprint_version).toBe('V_0-4-1')

    const fieldNodes =
      parsed.elements.get('NN Field Definition') ||
      parsed.elements.get('Field Definition') ||
      []
    const knowledgeFields = fieldNodes
      .filter((f) => f.fields.concept?.value === 'kNNowledge')
      .map((f) => f.name)

    expect(knowledgeFields).not.toContain('derived_from')
  })

  it('asserts artifacts catalog bluepriNNt drops sources/produced_by and has blueprint_version V_0-5-2', () => {
    const content = fs.readFileSync(ARTIFACTS_SPEC_PATH, 'utf-8')
    const parsed = parseKnowledge(content)

    expect((parsed.frontmatter as any)?.blueprint_version).toBe('V_0-5-2')

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

})
