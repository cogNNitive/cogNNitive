import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  resolveTemplateSchema,
  validateTemplateAgainstMetaschema,
  parseModel,
  validateModel,
} from '../src/index'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', 'specs')
const readSpec = (p: string): string => readFileSync(join(specsRoot, p), 'utf-8')

const BUSINESS_MODEL = readSpec('templates/business-model/business-model_V_0-2-0_NN.md')
const ANALYSIS = readSpec('templates/analysis/analysis_V_0-2-0_NN.md')
const ORG_V2 = readSpec('templates/organization/organization_V_0-2-0_NN.md')
const PROJECTS_V2 = readSpec('templates/projects/projects_V_0-2-0_NN.md')
const BUSINESS_V2 = readSpec('templates/business/business_V_0-2-0_NN.md')
const INNFO_V2 = readSpec('iNNfo_V_0-2-0_NN.md')

/** Resolve an `includes` entry by (lowercased) name from the four decomposed templates on disk. */
const byName: Record<string, string> = {
  'business-model': BUSINESS_MODEL,
  analysis: ANALYSIS,
  organization: ORG_V2,
  projects: PROJECTS_V2,
}
const resolver = (ref: { name: string }): string | null => byName[ref.name.toLowerCase()] ?? null

describe('business-model_V_0-2-0 — composite of organization + projects', () => {
  it('resolves with zero errors', () => {
    const { errors } = resolveTemplateSchema(BUSINESS_MODEL, resolver)
    expect(errors, JSON.stringify(errors)).toEqual([])
  })

  it('keeps its own concepts and drops the ones that left', () => {
    const { schema } = resolveTemplateSchema(BUSINESS_MODEL, resolver)
    const names = new Set(schema.concepts.map((c) => c.name))

    for (const kept of ['Team', 'Goals', 'Unfair advantage', 'Misc', 'Procedure']) {
      expect(names.has(kept), `expected concept ${kept}`).toBe(true)
    }
    // Concepts removed by the decomposition. `Analysis` / `Validation` moved to
    // the `analysis` template; the plural human-structure names were renamed to
    // singular and moved to `organization` / `projects`.
    for (const gone of [
      'Analysis',
      'Validation',
      'Persons',
      'Positions',
      'Milestones',
      'Project plan',
    ]) {
      expect(names.has(gone), `concept ${gone} should be gone`).toBe(false)
    }
  })

  it('no longer declares the moved concepts in its own body', () => {
    // Without a resolver, only business-model's own Definitions are seen.
    const { schema } = resolveTemplateSchema(BUSINESS_MODEL, () => null)
    const own = new Set(schema.concepts.map((c) => c.name))
    for (const moved of [
      'Roles',
      'Functions',
      'Skills',
      'Persons',
      'Positions',
      'Milestones',
      'Phases',
      'Analysis',
      'Validation',
    ]) {
      expect(own.has(moved), `${moved} must not be declared locally`).toBe(false)
    }
    expect(own.has('Team')).toBe(true)
  })

  it("declares the stakeholder-sense role concept as `Stakeholder roles` (renamed to avoid colliding with organization's canonical `Roles`)", () => {
    // Own body only: the renamed concept is local to business-model.
    const { schema: own } = resolveTemplateSchema(BUSINESS_MODEL, () => null)
    const ownNames = own.concepts.map((c) => c.name)
    expect(ownNames).toContain('Stakeholder roles')
    expect(ownNames).not.toContain('Roles') // the bare name still belongs to organization

    // Composed: `Stakeholder roles` (business-model) and `Roles` (organization)
    // co-exist without a collision, and composition stays clean.
    const { schema, errors } = resolveTemplateSchema(BUSINESS_MODEL, resolver)
    expect(errors, JSON.stringify(errors)).toEqual([])
    const names = new Set(schema.concepts.map((c) => c.name))
    expect(names.has('Stakeholder roles')).toBe(true)
    expect(names.has('Roles')).toBe(true)
  })

  it('pulls the human-structure and project concepts back via includes', () => {
    const { schema } = resolveTemplateSchema(BUSINESS_MODEL, resolver)
    const names = new Set(schema.concepts.map((c) => c.name))
    for (const viaInclude of [
      'Organization',
      'Roles',
      'Functions',
      'Position',
      'Person',
      'Skills',
      'Project',
      'Phases',
      'Project roles',
    ]) {
      expect(names.has(viaInclude), `expected included concept ${viaInclude}`).toBe(true)
    }
    // The stakeholder `Roles` concept is gone; the surviving `Roles` is the
    // functional one from `organization` (a list, not a weight).
    const roles = schema.concepts.find((c) => c.name === 'Roles')!
    expect(roles.type).toBe('list')
  })

  it('the `Team` it keeps is a text concept (root aggregator replaced)', () => {
    const { schema } = resolveTemplateSchema(BUSINESS_MODEL, resolver)
    const team = schema.concepts.find((c) => c.name === 'Team')!
    expect(team.type).toBe('text')
  })

  it('validates green against the iNNfo_V_0-2-0 metaschema', () => {
    const errors = validateTemplateAgainstMetaschema(BUSINESS_MODEL, INNFO_V2).filter(
      (d) => d.severity === 'error',
    )
    expect(errors, JSON.stringify(errors)).toEqual([])
  })
})

describe('analysis_V_0-1-0 — standalone strategic-review template', () => {
  it('resolves standalone with zero errors and the review concepts', () => {
    const { schema, errors } = resolveTemplateSchema(ANALYSIS, () => null)
    expect(errors).toEqual([])
    const names = schema.concepts.map((c) => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['Analysis', 'Validation', 'Experiments', 'Assumptions', 'Risks']),
    )
  })

  it('declares all five business markers', () => {
    const { schema } = resolveTemplateSchema(ANALYSIS, () => null)
    expect(schema.markers.map((m) => m.name).sort()).toEqual([
      'certainty',
      'completion',
      'importance',
      'priority',
      'rating',
    ])
  })

  it('validates green against the iNNfo_V_0-2-0 metaschema', () => {
    const errors = validateTemplateAgainstMetaschema(ANALYSIS, INNFO_V2).filter(
      (d) => d.severity === 'error',
    )
    expect(errors, JSON.stringify(errors)).toEqual([])
  })
})

describe('analysis_V_0-2-0 — sample model validates', () => {
  it('the Ghostbusters analysis sample has no "not defined in template" errors', () => {
    const modelContent = readSpec(
      'templates/analysis/samples/Ghostbusters_V_0-2-0_analysis_NN.md',
    )
    const model = parseModel(modelContent)
    const template = {
      name: 'analysis_V_0-2-0',
      level: 2 as const,
      frontmatter: parseModel(ANALYSIS).frontmatter,
      rawContent: ANALYSIS,
    }
    const result = validateModel(model, template, null)
    const undef = result.errors.filter((e) => /is not defined in template/.test(e.message))
    expect(undef, JSON.stringify(undef)).toEqual([])
  })
})

describe('business_V_0-2-0 — umbrella composite (D1 marker dedup)', () => {
  it('resolves with ZERO errors — the 5 shared markers merge, no collision', () => {
    const { errors } = resolveTemplateSchema(BUSINESS_V2, resolver)
    expect(errors, JSON.stringify(errors)).toEqual([])
  })

  it('keeps exactly one entry per shared marker', () => {
    const { schema } = resolveTemplateSchema(BUSINESS_V2, resolver)
    for (const shared of ['importance', 'completion', 'certainty', 'priority', 'rating']) {
      const hits = schema.markers.filter((m) => m.name === shared)
      expect(hits.length, `${shared} should appear once, got ${hits.length}`).toBe(1)
    }
    // and the per-template markers survive
    expect(schema.markers.map((m) => m.name)).toEqual(
      expect.arrayContaining(['complexity', 'health']),
    )
  })

  it('unions concepts from all four templates', () => {
    const { schema } = resolveTemplateSchema(BUSINESS_V2, resolver)
    const names = new Set(schema.concepts.map((c) => c.name))
    for (const n of [
      'Business summary',
      'Team',
      'Procedure', // business-model
      'Analysis',
      'Validation', // analysis
      'Organization',
      'Person',
      'Skills', // organization
      'Project',
      'Phases',
      'Project roles', // projects
    ]) {
      expect(names.has(n), `expected umbrella concept ${n}`).toBe(true)
    }
  })

  it('deduplicates taxonomy edges across included templates and host index', () => {
    const { schema } = resolveTemplateSchema(BUSINESS_V2, resolver)
    const roots = schema.taxonomy.filter((e) => e.parent === '').map((e) => e.child)
    const uniqueRoots = new Set(roots)
    expect(roots.length).toBe(uniqueRoots.size)
    expect(roots.filter((r) => r === 'Organization')).toHaveLength(1)
    expect(roots.filter((r) => r === 'Project')).toHaveLength(1)
    expect(roots.filter((r) => r === 'Business summary')).toHaveLength(1)

    // Roles should be placed under Organization, not at root
    expect(roots).not.toContain('Roles')
    const rolesEdge = schema.taxonomy.find((e) => e.child === 'Roles')
    expect(rolesEdge?.parent).toBe('Organization')

    // Team children should be preserved from business-model template
    expect(schema.taxonomy.find((e) => e.child === 'Contributions')?.parent).toBe('Team')
    expect(schema.taxonomy.find((e) => e.child === 'Compensations')?.parent).toBe('Team')
  })

  it('validates green against the iNNfo_V_0-2-0 metaschema', () => {
    const errors = validateTemplateAgainstMetaschema(BUSINESS_V2, INNFO_V2).filter(
      (d) => d.severity === 'error',
    )
    expect(errors, JSON.stringify(errors)).toEqual([])
  })
})

describe('business_V_0-2-0 — collision is still an ERROR (REQ-B4)', () => {
  it('a divergent same-named Definition across sources fails composition, naming both', () => {
    const divergentAnalysis = ANALYSIS.replace('symbol:: *', 'symbol:: @')
    const clashResolver = (ref: { name: string }): string | null => {
      if (ref.name.toLowerCase() === 'analysis') return divergentAnalysis
      return resolver(ref)
    }
    const { errors } = resolveTemplateSchema(BUSINESS_V2, clashResolver)
    const collision = errors.find((e) => e.message.includes('importance'))
    expect(collision?.severity).toBe('error')
    expect(collision?.message).toMatch(/Business Model Template|Analysis Template/)
  })
})

describe('Ghostbusters_V_0-2-0 — sample validates against the composed umbrella', () => {
  it('parsing the sample against the resolved umbrella yields no "not defined in template" errors', () => {
    const modelContent = readSpec('templates/business/samples/Ghostbusters_V_0-2-0_business_NN.md')
    const model = parseModel(modelContent)
    const template = {
      name: 'business_V_0-2-0',
      level: 2 as const,
      frontmatter: parseModel(BUSINESS_V2).frontmatter,
      rawContent: BUSINESS_V2,
    }
    const result = validateModel(model, template, null, resolver)

    const undefinedConcept = result.errors.filter((e) =>
      /is not defined in template/.test(e.message),
    )
    expect(undefinedConcept, JSON.stringify(undefinedConcept)).toEqual([])

    const composeErrors = result.errors.filter((e) => e.path.startsWith('parent.includes'))
    expect(composeErrors, JSON.stringify(composeErrors)).toEqual([])
  })
})
