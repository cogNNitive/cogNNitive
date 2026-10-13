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

  it('the Change concept declares sources of type citation', () => {
    const composed = resolveBlueprintSchema(changesSpec, () => null)
    const change = composed.schema.concepts.find((c) => c.name === 'Change')
    expect(change).toBeDefined()
    const sources = change!.fields.find((f) => f.name === 'sources')
    expect(sources).toBeDefined()
    expect(sources!.type).toBe('citation')
  })
})
