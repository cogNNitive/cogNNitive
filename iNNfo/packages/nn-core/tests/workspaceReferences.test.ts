import { describe, it, expect } from 'vitest'
import {
  validateWorkspaceReferences,
  MissingWorkspaceIndexError,
} from '../src/validator/workspaceReferences'
import { buildWorkspaceIndex, type WorkspaceIndex } from '../src/recursiveParser/workspaceIndex'
import type { ParseIssue, RecursiveParseResult } from '../src/recursiveParser/types'
import type { KnowledgeNode, Concept } from '../src/types'
import type { BlueprintSchema } from '../src/schema'
import { validateFormatContent } from '../src/validator/content'

function field(value: unknown): KnowledgeNode['fields'][string] {
  return { value, editAttribution: { author: { kind: 'system', id: 'test' }, timestamp: '' } }
}

function makeSchema(concepts: Concept[]): BlueprintSchema {
  return { concepts, markers: [], matrices: [], taxonomy: [] }
}

/** Builds a root node directly (bypassing `recursiveParse`); `parent_spec` makes it a discoverable model. */
function makeRoot(opts: {
  id: string
  path: string
  title?: string
  templateSchema?: BlueprintSchema
  parentSpec?: { name: string; url?: string }
  childIds?: string[]
}): KnowledgeNode {
  return {
    id: opts.id,
    name: opts.id,
    parentId: null,
    childIds: opts.childIds ?? [],
    type: 'document',
    kind: 'root',
    fields: {
      ...(opts.title !== undefined ? { title: field(opts.title) } : {}),
      parent_spec: field(opts.parentSpec ?? { name: 'business_V_0-1-0' }),
    },
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: opts.path },
    ...(opts.templateSchema ? { templateSchema: opts.templateSchema } : {}),
  }
}

/** Builds an element node wired under `parentId`. The slug is derived from the name unless given. */
function makeElement(opts: {
  id: string
  name: string
  parentId: string
  parentPath: string
  elementType: string
  slug?: string
  fields?: Record<string, unknown>
  description?: string
}): KnowledgeNode {
  return {
    id: opts.id,
    name: opts.name,
    slug: opts.slug,
    parentId: opts.parentId,
    childIds: [],
    type: opts.elementType,
    kind: 'element',
    fields: Object.fromEntries(Object.entries(opts.fields ?? {}).map(([k, v]) => [k, field(v)])),
    markers: {},
    relationships: [],
    rawSections: opts.description ? { description: opts.description } : {},
    source: { path: opts.parentPath },
  }
}

/** Assembles a `RecursiveParseResult` from flat nodes and derives its `WorkspaceIndex` via the real `buildWorkspaceIndex`. */
function workspace(
  nodesArr: KnowledgeNode[],
  issues: ParseIssue[] = [],
): { result: RecursiveParseResult; index: WorkspaceIndex } {
  const nodes: Record<string, KnowledgeNode> = {}
  for (const n of nodesArr) nodes[n.id] = n
  const rootIds = nodesArr.filter((n) => n.kind === 'root').map((n) => n.id)
  const result: RecursiveParseResult = { nodes, rootIds, issues }
  return { result, index: buildWorkspaceIndex(result) }
}

const PERSON = makeSchema([{ name: 'Person', type: 'text', fields: [] }])

/**
 * Two models: `acme_org_NN.md` (id `acme_org`, Person elements `jane-doe` and `john-smith`)
 * and `referrer_NN.md` (id `referrer`) whose Founder element holds `value` in the typed field `fundadores`.
 */
function twoModels(
  value: unknown,
  fieldDef: Partial<Concept['fields'][number]> = {},
  targetOpts: { parentSpec?: { name: string; url?: string } } = {},
): { result: RecursiveParseResult; index: WorkspaceIndex } {
  const referrerSchema = makeSchema([
    { name: 'Founder', type: 'text', fields: [{ name: 'fundadores', type: 'reference', ...fieldDef }] },
  ])
  const target = makeRoot({
    id: 'target',
    path: 'acme_org_NN.md',
    title: 'Acme Org',
    templateSchema: PERSON,
    childIds: ['jane', 'john'],
    ...targetOpts,
  })
  const jane = makeElement({ id: 'jane', name: 'Jane Doe', parentId: 'target', parentPath: 'acme_org_NN.md', elementType: 'Person' })
  const john = makeElement({ id: 'john', name: 'John Smith', parentId: 'target', parentPath: 'acme_org_NN.md', elementType: 'Person' })
  const referrer = makeRoot({
    id: 'referrer',
    path: 'referrer_NN.md',
    title: 'Referrer',
    templateSchema: referrerSchema,
    childIds: ['founder'],
  })
  const founder = makeElement({
    id: 'founder',
    name: 'Some Founder',
    parentId: 'referrer',
    parentPath: 'referrer_NN.md',
    elementType: 'Founder',
    fields: { fundadores: value },
  })
  return workspace([target, jane, john, referrer, founder])
}

describe('validateWorkspaceReferences: addresses (cross-model-reference-validation)', () => {
  it('a valid cross-model address resolves with no diagnostics', () => {
    const { result, index } = twoModels('acme_org@jane-doe')
    expect(validateWorkspaceReferences(result, index)).toEqual([])
  })

  it('a dangling model names the address and the referencing location', () => {
    const { result, index } = twoModels('ghost@jane-doe')
    const diagnostics = validateWorkspaceReferences(result, index)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({ severity: 'error', code: 'REF_MODEL_NOT_FOUND' })
    expect(diagnostics[0].message).toContain('ghost@jane-doe')
    expect(diagnostics[0].message).toContain('referrer_NN.md')
    expect(diagnostics[0].path).toBe('referrer_NN.md#elements.Founder.Some Founder.fields.fundadores')
  })

  it('a dangling element in an existing model is REF_ELEMENT_NOT_FOUND', () => {
    const { result, index } = twoModels('acme_org@nobody')
    const diagnostics = validateWorkspaceReferences(result, index)
    expect(diagnostics.map((d) => d.code)).toEqual(['REF_ELEMENT_NOT_FOUND'])
    expect(diagnostics[0].severity).toBe('error')
  })

  it('a bare slug resolves neither as a model nor as an element', () => {
    const { result, index } = twoModels('jane-doe')
    expect(validateWorkspaceReferences(result, index).map((d) => d.code)).toEqual(['REF_MODEL_NOT_FOUND'])
  })

  it('a stale address after a move names the old id', () => {
    const { result, index } = twoModels('old/acme-org@jane-doe')
    const [d] = validateWorkspaceReferences(result, index)
    expect(d.code).toBe('REF_MODEL_NOT_FOUND')
    expect(d.message).toContain('old/acme-org')
  })

  it('a stale address names the recorded successor of a moved instance (A-11)', () => {
    const { result, index } = twoModels('innteresante/intro@00-gancho')
    const successor = (id: string) => (id === 'innteresante/intro' ? 'villabotijos-today/intro' : undefined)

    const [d] = validateWorkspaceReferences(result, index, undefined, successor)
    expect(d.code).toBe('REF_MODEL_NOT_FOUND')
    expect(d.message).toContain('innteresante/intro')
    expect(d.message).toContain('villabotijos-today/intro')

    // Without a recorded move there is no successor to name.
    expect(validateWorkspaceReferences(result, index)[0].message).not.toContain('recorded successor')
  })

  it('the title-qualified form is rejected as a removed form and never resolved by title', () => {
    const { result, index } = twoModels('[[Acme Org :: Jane Doe]]')
    const diagnostics = validateWorkspaceReferences(result, index)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({ severity: 'error', code: 'ADDRESS_MALFORMED' })
    expect(diagnostics[0].message).toContain('title-qualified reference')
  })

  it('a bare wikilink in a typed field is a removed form too', () => {
    const { result, index } = twoModels('[[Jane Doe]]')
    expect(validateWorkspaceReferences(result, index).map((d) => d.code)).toEqual(['ADDRESS_MALFORMED'])
  })

  it('an absolute self-reference is ADDRESS_NOT_CANONICAL', () => {
    const { result, index } = twoModels('referrer@some-founder')
    const diagnostics = validateWorkspaceReferences(result, index)
    expect(diagnostics.map((d) => d.code)).toEqual(['ADDRESS_NOT_CANONICAL'])
    expect(diagnostics[0].message).toContain('@some-founder')
  })

  it('a relative @slug is left to the per-file validator', () => {
    const { result, index } = twoModels('@some-founder')
    expect(validateWorkspaceReferences(result, index)).toEqual([])
  })

  it('a target_concepts mismatch warns, and does not error', () => {
    const { result, index } = twoModels('acme_org@jane-doe', { target_concepts: ['Company'] })
    const diagnostics = validateWorkspaceReferences(result, index)
    expect(diagnostics.map((d) => [d.severity, d.code])).toEqual([['warning', 'REF_CONCEPT_MISMATCH']])
  })

  it('a target_blueprint mismatch warns, and a match is silent', () => {
    const mismatch = twoModels('acme_org@jane-doe', { target_blueprint: 'projects' }, { parentSpec: { name: 'business_V_0-1-0' } })
    expect(
      validateWorkspaceReferences(mismatch.result, mismatch.index).map((d) => [d.severity, d.code]),
    ).toEqual([['warning', 'REF_BLUEPRINT_MISMATCH']])

    const match = twoModels('acme_org@jane-doe', { target_blueprint: 'business_V_0-1-0' }, { parentSpec: { name: 'business_V_0-1-0' } })
    expect(validateWorkspaceReferences(match.result, match.index)).toEqual([])
  })

  it('an address inside prose, an untyped field or a node without schema is never scanned', () => {
    const referrerSchema = makeSchema([
      { name: 'Founder', type: 'text', fields: [{ name: 'fundadores', type: 'reference' }, { name: 'note', type: 'string' }] },
    ])
    const referrer = makeRoot({ id: 'r', path: 'r_NN.md', templateSchema: referrerSchema, childIds: ['f'] })
    const founder = makeElement({
      id: 'f',
      name: 'F',
      parentId: 'r',
      parentPath: 'r_NN.md',
      elementType: 'Founder',
      fields: { note: 'ghost@nobody' },
      description: 'see ghost@nobody',
    })
    const ws = workspace([referrer, founder])
    expect(validateWorkspaceReferences(ws.result, ws.index)).toEqual([])

    const noSchema = twoModels('ghost@nobody')
    delete (noSchema.index.nodeSchema as Record<string, unknown>)['referrer']
    expect(validateWorkspaceReferences(noSchema.result, noSchema.index)).toEqual([])
  })

  it('equal titles are legal: no duplicate-title issue, both models stay addressable', () => {
    const a = makeRoot({ id: 'a', path: 'org_one_NN.md', title: 'Acme Org', templateSchema: PERSON, childIds: ['ea'] })
    const ea = makeElement({ id: 'ea', name: 'Ann', parentId: 'a', parentPath: 'org_one_NN.md', elementType: 'Person' })
    const b = makeRoot({ id: 'b', path: 'org_two_NN.md', title: 'Acme Org', templateSchema: PERSON, childIds: ['eb'] })
    const eb = makeElement({ id: 'eb', name: 'Bob', parentId: 'b', parentPath: 'org_two_NN.md', elementType: 'Person' })
    const referrer = makeRoot({
      id: 'r',
      path: 'r_NN.md',
      templateSchema: makeSchema([{ name: 'Founder', type: 'text', fields: [{ name: 'fundadores', type: 'reference' }] }]),
      childIds: ['f'],
    })
    const f = makeElement({
      id: 'f',
      name: 'F',
      parentId: 'r',
      parentPath: 'r_NN.md',
      elementType: 'Founder',
      fields: { fundadores: ['org_one@ann', 'org_two@bob'] },
    })
    const { result, index } = workspace([a, ea, b, eb, referrer, f])
    expect(index.issues).toEqual([])
    expect(validateWorkspaceReferences(result, index)).toEqual([])
  })
})

describe('validateWorkspaceReferences: address lists (MULTIVALUE_SYNTAX)', () => {
  it('a YAML sequence of addresses resolves clean', () => {
    const { result, index } = twoModels(['acme_org@jane-doe', 'acme_org@john-smith'])
    expect(validateWorkspaceReferences(result, index)).toEqual([])
  })

  it('newline-separated addresses resolve clean', () => {
    const { result, index } = twoModels('acme_org@jane-doe\nacme_org@john-smith')
    expect(validateWorkspaceReferences(result, index)).toEqual([])
  })

  it('a comma-joined scalar fails with the stable code and a hint, with no resolution noise', () => {
    const { result, index } = twoModels('acme_org@jane-doe, acme_org@john-smith')
    const diagnostics = validateWorkspaceReferences(result, index)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({ severity: 'error', code: 'MULTIVALUE_SYNTAX' })
    expect(diagnostics[0].promptHint).toContain('acme_org@jane-doe\nacme_org@john-smith')
  })
})

describe('conv-wikilinks: the title-qualified form is no longer bypassed', () => {
  function referrerDoc(wikilinkValue: string): string {
    return `---
spec_version: "V_0-3-0"
level: 3
knowledge_version: "V_1-0-0"
title: "Referrer"
parent_spec:
  name: "mini_V_1-0-0"
  url: "https://example.com/mini_V_1-0-0_NN.md"
---

# NN index

* [[Founder]]

# NN Founder

## NN Founder: Some Founder
fundadores:: ${wikilinkValue}
`
  }

  function wikilinksCheck(content: string) {
    const report = validateFormatContent(content, 'referrer_V_1-0-0_NN.md')
    const check = report.checks.find((c) => c.id === 'conv-wikilinks')
    if (!check) throw new Error('conv-wikilinks check did not run (hasIndex must be true)')
    return check
  }

  it('a title-qualified value is reported as a removed form', () => {
    const check = wikilinksCheck(referrerDoc('[[Acme Org :: Jane Doe]]'))
    expect(check.passed).toBe(false)
    expect(check.message).toContain('removed')
  })

  it('a non-qualified local wikilink is still checked normally', () => {
    const check = wikilinksCheck(referrerDoc('[[Ghost]]'))
    expect(check.passed).toBe(false)
    expect(check.message).toContain('ghost')
  })
})

describe('validateWorkspaceReferences: missing WorkspaceIndex guard', () => {
  function single(): RecursiveParseResult {
    const root = makeRoot({ id: 'root-1', path: 'root_NN.md', childIds: [] })
    return { nodes: { [root.id]: root }, rootIds: [root.id], issues: [] }
  }

  it('throws a named, actionable error instead of a raw TypeError when index is omitted', () => {
    // @ts-expect-error - deliberately calling without the required `index` argument
    expect(() => validateWorkspaceReferences(single())).toThrow(MissingWorkspaceIndexError)
    // @ts-expect-error - deliberately calling without the required `index` argument
    expect(() => validateWorkspaceReferences(single())).toThrow(/buildWorkspaceIndex/)
  })

  it('throws the same named error when index is null', () => {
    expect(() => validateWorkspaceReferences(single(), null as unknown as WorkspaceIndex)).toThrow(
      MissingWorkspaceIndexError,
    )
  })

  it('a real WorkspaceIndex built via buildWorkspaceIndex does not trigger the guard', () => {
    const result = single()
    expect(() => validateWorkspaceReferences(result, buildWorkspaceIndex(result))).not.toThrow()
  })
})
