import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseKnowledge,
  resolveBlueprintSchema,
  validateKnowledge,
} from '../../src/index.js'
import type { SpecDocument } from '../../src/index.js'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', '..', 'specs')
const changesSpec = readFileSync(join(specsRoot, 'bluepriNNts/changes/spec_NN.md'), 'utf-8')

/** The Level-3 document template embedded in the `changes` blueprint. */
function extractTemplate(spec: string): string {
  const marker = '### Level 3 Changeset Template'
  const at = spec.indexOf(marker)
  expect(at).toBeGreaterThan(-1)
  const fenceStart = spec.indexOf('```markdown', at)
  const bodyStart = spec.indexOf('\n', fenceStart) + 1
  const fenceEnd = spec.indexOf('```', bodyStart)
  return spec.slice(bodyStart, fenceEnd)
}

const specDoc: SpecDocument = {
  name: 'changes',
  level: 2,
  frontmatter: {},
  rawContent: changesSpec,
}

describe('changes blueprint — Level 3 template', () => {
  it('a document created from the template validates with no fm-level / fm-parent error', () => {
    const template = extractTemplate(changesSpec)
    const model = parseKnowledge(template)

    expect(model.frontmatter.level).toBe(3)
    expect((model.frontmatter.parent_spec as { name?: string })?.name).toBe('changes')
    expect((model.frontmatter.parent_spec as { url?: string })?.url).toBeTruthy()

    const res = validateKnowledge(model, specDoc, null)
    const errors = res.checks.filter((c) => c.severity === 'error')
    expect(errors.find((c) => c.id === 'fm-level')).toBeUndefined()
    expect(errors.find((c) => c.id === 'fm-parent')).toBeUndefined()
  })

  it('the Change concept declares evidence of type citation', () => {
    const composed = resolveBlueprintSchema(changesSpec, () => null)
    const change = composed.schema.concepts.find((c) => c.name === 'Change')
    expect(change).toBeDefined()
    const evidence = change!.fields.find((f) => f.name === 'evidence')
    expect(evidence).toBeDefined()
    expect(evidence!.type).toBe('citation')
  })

  it('validates a changeset holding update_concept_field and remove_matrix without invalid-op diagnostics', () => {    const changesetContent = `---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-4-0"
status: proposed
proposal_sha: "0000000000000000000000000000000000000000000000000000000000000000"
title: "Testing new ops"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: update_concept_field
target:: strategy@concept:Goals&tags
from:: [core]
to:: [core, ai]

## NN Change: c-02
op:: remove_matrix
target:: strategy@matrix:Access Matrix
`
    const model = parseKnowledge(changesetContent)
    const res = validateKnowledge(model, specDoc, null)
    const errors = res.checks.filter((c) => c.severity === 'error')
    expect(errors).toEqual([])
  })

  it('accepts update_element_text and produce_artifact as Change ops', () => {
    const changesetContent = `---
spec_version: "V_0-5-0"
level: 3
knowledge_version: "V_0-1-0"
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-6-0"
status: proposed
proposal_sha: "0000000000000000000000000000000000000000000000000000000000000000"
title: "Prose and artifact"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: update_element_text
target:: strategy@statement
from:: Draft text
to:: Final text
evidence:: [sources/import/a.md@## One]

## NN Change: c-02
op:: produce_artifact
target:: artifacts/r_20261002T101500Z.md
evidence:: [sources/import/a.md@## One]
`
    const model = parseKnowledge(changesetContent)
    const res = validateKnowledge(model, specDoc, null)
    const errors = res.checks.filter((c) => c.severity === 'error')
    expect(errors).toEqual([])
  })

  it('declares the matrix seed and the execution-fact keys, and drops inline fields', () => {
    const composed = resolveBlueprintSchema(changesSpec, () => null)
    const change = composed.schema.concepts.find((c) => c.name === 'Change')!
    const names = change.fields.map((f) => f.name)
    for (const required of ['seed', 'resolved_target', 'evidence_sha256', 'applied_at', 'batch']) {
      expect(names).toContain(required)
    }
    expect(names).not.toContain('fields')
    expect(change.fields.find((f) => f.name === 'evidence')!.type).toBe('citation')
  })

  it('declares the ops update_element_text and produce_artifact in the op select', () => {
    const composed = resolveBlueprintSchema(changesSpec, () => null)
    const op = composed.schema.concepts
      .find((c) => c.name === 'Change')!
      .fields.find((f) => f.name === 'op')!
    const options = ((op as { options?: unknown[] }).options ?? []).map((v) => String(v))
    expect(options).toContain('update_element_text')
    expect(options).toContain('produce_artifact')
  })
})

describe('changes blueprint — add_model of a distributed instance (distributed-storage S6a)', () => {
  const changeset = `---
spec_version: "V_0-5-0"
level: 3
knowledge_version: "V_0-1-0"
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-7-0"
status: proposed
proposal_sha: "0000000000000000000000000000000000000000000000000000000000000000"
title: "Create a Video instance"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: add_model
target:: villabotijos-today/new-episode
concept:: Video
blueprint_name:: "video-script_V_0-15-0"
blueprint_url:: "specs/bluepriNNts/video-script/spec_NN.md"
name:: "New Episode"
evidence:: decision
`

  it('validates a changeset whose add_model names the concept it instantiates', () => {
    const model = parseKnowledge(changeset)
    const res = validateKnowledge(model, specDoc, null)
    const errors = res.checks.filter((c) => c.severity === 'error')
    expect(errors).toEqual([])
  })

  it('declares concept for add_model, not only for element operations', () => {
    const composed = resolveBlueprintSchema(changesSpec, () => null)
    const change = composed.schema.concepts.find((c) => c.name === 'Change')!
    const concept = change.fields.find((f) => f.name === 'concept')!
    expect(concept.type).toBe('string')
    const description = String((concept as { description?: string }).description ?? '')
    expect(description).toContain('add_model')
    expect(description).toContain('distributed')
  })
})
