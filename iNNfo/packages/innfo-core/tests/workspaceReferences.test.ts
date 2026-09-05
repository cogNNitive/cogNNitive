import { describe, it, expect } from 'vitest'
import {
  QUALIFIED_REF_RE,
  parseQualifiedRef,
  collectQualifiedReferenceCandidates,
  validateWorkspaceReferences,
} from '../src/validator/workspaceReferences'
import type { WorkspaceIndex } from '../src/recursiveParser/workspaceIndex'
import type { RecursiveParseResult } from '../src/recursiveParser/types'
import type { ModelNode, Concept } from '../src/types'
import type { TemplateSchema } from '../src/schema'

function field(value: unknown): ModelNode['fields'][string] {
  return { value, provenance: { author: { kind: 'system', id: 'test' }, timestamp: '' } }
}

function makeSchema(concepts: Concept[]): TemplateSchema {
  return { concepts, markers: [], matrices: [], taxonomy: [] }
}

function emptyIndex(overrides: Partial<WorkspaceIndex> = {}): WorkspaceIndex {
  return {
    pathToNodeId: {},
    titleToNodeIds: {},
    fileNameToNodeIds: {},
    nodeTemplate: {},
    nodeElementConcepts: {},
    nodeSchema: {},
    extraParents: {},
    missing: [],
    issues: [],
    ...overrides,
  }
}

/** Builds a minimal root + one child element node, wired via parentId/childIds. */
function makeRootAndElement(opts: {
  elementType: string
  fields: Record<string, unknown>
  description?: string
}): { result: RecursiveParseResult; root: ModelNode; element: ModelNode } {
  const root: ModelNode = {
    id: 'root-1',
    name: 'root_01',
    parentId: null,
    childIds: ['elem-1'],
    type: 'document',
    kind: 'root',
    fields: { title: field('Root Model') },
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: 'root_01.md' },
  }
  const element: ModelNode = {
    id: 'elem-1',
    name: 'Jane Doe',
    parentId: 'root-1',
    childIds: [],
    type: opts.elementType,
    kind: 'element',
    fields: Object.fromEntries(Object.entries(opts.fields).map(([k, v]) => [k, field(v)])),
    markers: {},
    relationships: [],
    rawSections: opts.description ? { description: opts.description } : {},
    source: { path: 'root_01.md' },
  }
  const result: RecursiveParseResult = {
    nodes: { [root.id]: root, [element.id]: element },
    rootIds: [root.id],
    issues: [],
  }
  return { result, root, element }
}

describe('QUALIFIED_REF_RE / parseQualifiedRef', () => {
  it('qualified-ref-parsing: only the qualified `[[Title :: Element]]` form parses', () => {
    const cases: Array<[string, { modelTitle: string; elementName: string } | null]> = [
      ['[[A :: B]]', { modelTitle: 'A', elementName: 'B' }],
      ['[[ A::B ]]', { modelTitle: 'A', elementName: 'B' }],
      ['[[A]]', null],
      ['A :: B', null],
      ['[[A :: B :: C]]', { modelTitle: 'A', elementName: 'B :: C' }],
    ]

    for (const [input, expected] of cases) {
      const result = parseQualifiedRef(input)
      if (expected === null) {
        expect(result, `expected null for ${JSON.stringify(input)}`).toBeNull()
      } else {
        expect(result, `expected a match for ${JSON.stringify(input)}`).not.toBeNull()
        expect(result!.modelTitle).toBe(expected.modelTitle)
        expect(result!.elementName).toBe(expected.elementName)
        expect(result!.raw).toBe(input)
      }
    }
  })

  it('QUALIFIED_REF_RE is anchored (no partial-string matches)', () => {
    expect(QUALIFIED_REF_RE.test('prefix [[A :: B]] suffix')).toBe(false)
    expect(QUALIFIED_REF_RE.test('[[A :: B]]')).toBe(true)
  })
})

describe('collectQualifiedReferenceCandidates', () => {
  it('untyped-field-ignored: only reference/model typed fields are collected, string fields are not', () => {
    const schema = makeSchema([
      {
        name: 'Person',
        type: 'text',
        fields: [
          { name: 'bio', type: 'string' },
          { name: 'contact', type: 'reference' },
        ],
      },
    ])
    const { result } = makeRootAndElement({
      elementType: 'Person',
      fields: {
        bio: '[[Acme Org :: Jane Doe]]', // qualified-shaped, but the field is untyped (string)
        contact: '[[Acme Org :: Jane Doe]]', // typed reference — must be collected
      },
    })
    const index = emptyIndex({ nodeSchema: { 'root-1': schema } })

    const candidates = collectQualifiedReferenceCandidates(result, index)

    expect(candidates).toHaveLength(1)
    expect(candidates[0].fieldDef.name).toBe('contact')
    expect(candidates[0].ref).toEqual({
      modelTitle: 'Acme Org',
      elementName: 'Jane Doe',
      raw: '[[Acme Org :: Jane Doe]]',
    })
  })

  it('a `model`-typed field is collected the same as a `reference`-typed field', () => {
    const schema = makeSchema([
      {
        name: 'ModelRef',
        type: 'model',
        fields: [{ name: 'manifest', type: 'model' }],
      },
    ])
    const { result } = makeRootAndElement({
      elementType: 'ModelRef',
      fields: { manifest: '[[Acme Org :: Jane Doe]]' },
    })
    const index = emptyIndex({ nodeSchema: { 'root-1': schema } })

    const candidates = collectQualifiedReferenceCandidates(result, index)

    expect(candidates).toHaveLength(1)
    expect(candidates[0].fieldDef.type).toBe('model')
  })

  it('prose-not-scanned: qualified-looking text in element prose (rawSections.description) is not a field value and is never collected', () => {
    const schema = makeSchema([
      {
        name: 'Person',
        type: 'text',
        fields: [{ name: 'contact', type: 'reference' }],
      },
    ])
    const { result, element } = makeRootAndElement({
      elementType: 'Person',
      fields: { contact: '[[Acme Org :: Jane Doe]]' },
      description: 'See also [[Other Model :: Someone Else]] for context.',
    })
    const index = emptyIndex({ nodeSchema: { 'root-1': schema } })

    // Sanity: the prose text really is qualified-ref shaped and really is on the node.
    expect(element.rawSections.description).toContain('[[Other Model :: Someone Else]]')

    const candidates = collectQualifiedReferenceCandidates(result, index)

    expect(candidates).toHaveLength(1)
    expect(candidates[0].ref.modelTitle).toBe('Acme Org')
  })

  it('intra-model-refs-untouched: an unqualified `[[Element]]` value in a typed field is not collected', () => {
    const schema = makeSchema([
      {
        name: 'Person',
        type: 'text',
        fields: [{ name: 'contact', type: 'reference' }],
      },
    ])
    const { result } = makeRootAndElement({
      elementType: 'Person',
      fields: { contact: '[[Jane Doe]]' },
    })
    const index = emptyIndex({ nodeSchema: { 'root-1': schema } })

    const candidates = collectQualifiedReferenceCandidates(result, index)

    expect(candidates).toHaveLength(0)
  })

  it('no-schema-node-skipped: a root with no resolvable template schema is skipped gracefully, not an error', () => {
    const { result } = makeRootAndElement({
      elementType: 'Person',
      fields: { contact: '[[Acme Org :: Jane Doe]]' },
    })
    const index = emptyIndex() // nodeSchema deliberately empty — resolver never produced one

    expect(() => collectQualifiedReferenceCandidates(result, index)).not.toThrow()
    expect(collectQualifiedReferenceCandidates(result, index)).toHaveLength(0)
  })
})

describe('validateWorkspaceReferences', () => {
  it('is stubbed to always return [] in this slice (PR5a) regardless of candidates found', () => {
    const schema = makeSchema([
      {
        name: 'Person',
        type: 'text',
        fields: [{ name: 'contact', type: 'reference' }],
      },
    ])
    const { result } = makeRootAndElement({
      elementType: 'Person',
      fields: { contact: '[[Acme Org :: Jane Doe]]' },
    })
    const index = emptyIndex({ nodeSchema: { 'root-1': schema } })

    // Confirm a candidate really was found (otherwise this assertion would be trivial).
    expect(collectQualifiedReferenceCandidates(result, index)).toHaveLength(1)

    expect(validateWorkspaceReferences(result, index)).toEqual([])
  })
})
