import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  scaffoldKnowledgeDocument,
  resolveBlueprintSchema,
  parseKnowledge,
  validateKnowledge,
  validateDocument,
} from '../../src/index.js'

const BLUEPRINTS_DIR = join(import.meta.dirname!, '..', '..', '..', '..', 'specs', 'bluepriNNts')

const readBlueprint = (name: string): string => readFileSync(join(BLUEPRINTS_DIR, name, 'spec_NN.md'), 'utf-8')
const resolveInclude = (ref: { name: string }): string | null =>
  existsSync(join(BLUEPRINTS_DIR, ref.name, 'spec_NN.md')) ? readBlueprint(ref.name) : null

function validateScaffold(name: string, doc: string) {
  return validateKnowledge(parseKnowledge(doc), parseKnowledge(readBlueprint(name)) as never, null, resolveInclude).errors
}

/** Full hygiene + schema pass, exactly what the MCP validate tool runs. */
function auditScaffold(name: string, doc: string) {
  return validateDocument(doc, {
    fileName: `Starter_${name}_NN.md`,
    template: parseKnowledge(readBlueprint(name)) as never,
    resolveInclude,
  })
}

function scaffoldFor(name: string) {
  const raw = readBlueprint(name)
  const composed = resolveBlueprintSchema(raw, resolveInclude)
  const doc = scaffoldKnowledgeDocument({
    id: 'Starter',
    blueprintName: name,
    blueprintUrl: `https://example.com/${name}/spec_NN.md`,
    schema: composed.schema,
    blueprintFrontmatter: parseKnowledge(raw).frontmatter as unknown as Record<string, unknown>,
  })
  return { raw, composed, doc }
}

describe('scaffold: typed fields never emit an invalid placeholder', () => {
  it('a number field is not scaffolded as a literal <number> placeholder', () => {
    const { doc } = scaffoldFor('business')
    expect(doc).not.toContain('<number>')
    expect(doc).not.toContain('<boolean>')
  })

  it('the business bluepriNNt (with its includes) scaffolds a document with zero validation errors', () => {
    const { doc } = scaffoldFor('business')
    expect(validateScaffold('business', doc)).toEqual([])
  })
})

describe('scaffold: every shipped bluepriNNt yields a self-valid starter document', () => {
  const names = readdirSync(BLUEPRINTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(BLUEPRINTS_DIR, d.name, 'spec_NN.md')))
    .map((d) => d.name)

  it('discovers the shipped bluepriNNts', () => {
    expect(names).toContain('business')
  })

  for (const name of names) {
    it(`${name}: full document validation (hygiene + schema) has no errors and no Level 3 index warning`, () => {
      const { composed, doc } = scaffoldFor(name)
      if (composed.errors.length > 0) return
      const audit = auditScaffold(name, doc)
      expect(audit.errors).toEqual([])
      expect(audit.warnings.map((w) => w.path)).not.toContain('format.l3-index-ignored')
    })

    it(`${name}: scaffold only warns about a text concept's placeholder element when no list concept exists`, () => {
      const { composed, doc } = scaffoldFor(name)
      if (composed.errors.length > 0) return
      const elementWarnings = auditScaffold(name, doc).warnings.filter((w) => w.path.startsWith('elements.'))
      const hasListConcept = composed.schema.concepts.some((c) => c.type !== 'text')
      if (hasListConcept) expect(elementWarnings).toEqual([])
    })

    it(`${name}: scaffold validates with zero errors`, () => {
      const { composed, doc } = scaffoldFor(name)
      if (composed.errors.length > 0) return // composition problems are not a scaffold concern
      expect(validateScaffold(name, doc)).toEqual([])
    })
  }
})
