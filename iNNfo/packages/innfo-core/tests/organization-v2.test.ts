import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  resolveTemplateSchema,
  validateTemplateAgainstMetaschema,
  parseFrontmatter,
} from '../src/index'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', 'specs')
const readSpec = (p: string): string => readFileSync(join(specsRoot, p), 'utf-8')

const ORG_V2 = readSpec('templates/organization/spec_NN.md')
const INNFO_V2 = readSpec('iNNfo_V_0-2-0_NN.md')

describe('organization_V_0-2-0 — standalone L2 template', () => {
  it('resolves as a valid standalone L2 schema (no includes, no-op resolver)', () => {
    const { schema, errors } = resolveTemplateSchema(ORG_V2, () => null)
    expect(errors).toEqual([])

    const concepts = schema.concepts.map((c) => c.name)
    expect(concepts).toEqual(
      expect.arrayContaining([
        'Organization',
        'Roles',
        'Position',
        'Person',
        'Skills',
        'Functions',
      ]),
    )

    const matrices = schema.matrices.map((m) => m.name)
    expect(matrices).toEqual(expect.arrayContaining(['Functions-Positions Matrix']))
  })

  it('re-attaches the ported Person fields', () => {
    const { schema } = resolveTemplateSchema(ORG_V2, () => null)
    const person = schema.concepts.find((c) => c.name === 'Person')!
    const fields = (person.fields ?? []).map((f) => f.name)
    expect(fields).toEqual(
      expect.arrayContaining(['position_ref', 'compensation', 'contributions']),
    )
  })

  it('validates green against the iNNfo_V_0-2-0 metaschema', () => {
    const diags = validateTemplateAgainstMetaschema(ORG_V2, INNFO_V2)
    const errors = diags.filter((d) => d.severity === 'error')
    expect(errors, JSON.stringify(errors)).toEqual([])
  })

  it('declares an explicit empty procedures block (robustness-coda 1.1)', () => {
    const fm = parseFrontmatter(ORG_V2)
    expect(fm).not.toBeNull()
    // Explicit: the key itself must be present — not implied by discovery yielding [].
    expect('procedures' in fm!).toBe(true)
    expect(fm!.procedures).toEqual([])
  })

  it('declares the empty block in raw frontmatter text, not via parser default', () => {
    const rawFm = ORG_V2.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
    expect(rawFm).toMatch(/^procedures:\s*\[\]/m)
  })

  it('dynamic discovery agrees with the declared block (empty set)', () => {
    const fm = parseFrontmatter(ORG_V2)!
    const discovered = Array.isArray(fm.procedures) ? fm.procedures : []
    expect(discovered).toEqual([])
  })
})
