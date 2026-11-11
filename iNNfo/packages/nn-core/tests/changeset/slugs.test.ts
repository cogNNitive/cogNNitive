import { describe, it, expect } from 'vitest'
import { resolveBatchSlugs } from '../../src/changeset/slugs.js'
import type { ChangeItem } from '../../src/changeset/types.js'
import type { ParsedKnowledge } from '../../src/types/index.js'

function createMockModel(slug: string, elementNames: string[] = []): ParsedKnowledge {
  const elements = new Map<string, Array<{ type: string; name: string; slug?: string; fields: Record<string, unknown>; markers: Record<string, unknown> }>>()
  const list = elementNames.map((name) => ({
    type: 'concept',
    name,
    slug: name.toLowerCase(),
    fields: {},
    markers: {},
  }))
  elements.set('concept', list)

  return {
    frontmatter: {
      knowledge_slug: slug,
      knowledge_version: 'V_0-1-0',
      parent_blueprint: 'concept',
      blueprint_version: 'V_0-1-0',
    },
    rawFrontmatter: {},
    elements,
    taxonomy: [],
    matrices: [],
    rawSections: [],
    footnotes: [],
  }
}

describe('2A: Batch Slug Collision & Intra-Batch Rewriting (resolveBatchSlugs)', () => {
  it('assigns base slug to first add_element and suffixes subsequent in document order', () => {
    const model = createMockModel('core', [])
    const models = new Map<string, ParsedKnowledge>([['core', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'add_element',
        target: 'core@concept',
        name: 'Feature',
      },
      {
        id: 'c2',
        op: 'add_element',
        target: 'core@concept',
        name: 'Feature',
      },
      {
        id: 'c3',
        op: 'add_element',
        target: 'core@concept',
        name: 'Feature',
      },
    ]

    const result = resolveBatchSlugs(changes, models)
    expect(result.changes[0].resolved_slug).toBe('feature')
    expect(result.changes[1].resolved_slug).toBe('feature-1')
    expect(result.changes[2].resolved_slug).toBe('feature-2')
    expect(result.conflictedChanges.size).toBe(0)
  })

  it('auto-suffixes colliding slug against live model', () => {
    const model = createMockModel('auth-mod', ['auth'])
    const models = new Map<string, ParsedKnowledge>([['auth-mod', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'add_element',
        target: 'auth-mod@concept',
        name: 'Auth',
      },
    ]

    const result = resolveBatchSlugs(changes, models)
    expect(result.changes[0].resolved_slug).toBe('auth-1')
    expect(result.conflictedChanges.size).toBe(0)
  })

  it('rewrites subsequent targets and wikilinks within batch', () => {
    const model = createMockModel('service-mod', ['service'])
    const models = new Map<string, ParsedKnowledge>([['service-mod', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'add_element',
        target: 'service-mod@concept',
        name: 'Service',
      },
      {
        id: 'c2',
        op: 'update_field',
        target: 'service-mod@service&port',
        to: '8080',
      },
      {
        id: 'c3',
        op: 'update_field',
        target: 'service-mod@other&description',
        to: 'Connects to [[service]] and [[service|My Service]]',
      },
    ]

    const result = resolveBatchSlugs(changes, models)
    expect(result.changes[0].resolved_slug).toBe('service-1')
    expect(result.changes[1].target).toBe('service-mod@service-1&port')
    expect(result.changes[2].to).toBe('Connects to [[service-1]] and [[service-1|My Service]]')
  })

  it('flags non-Latin element without explicit slug as EMPTY_SLUG conflict', () => {
    const model = createMockModel('core', [])
    const models = new Map<string, ParsedKnowledge>([['core', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'add_element',
        target: 'core@concept',
        name: '日本語',
      },
      {
        id: 'c2',
        op: 'add_element',
        target: 'core@concept',
        name: 'ValidName',
      },
    ]

    const result = resolveBatchSlugs(changes, models)
    expect(result.conflictedChanges.has('c1')).toBe(true)
    expect(result.conflictedChanges.get('c1')).toContain('EMPTY_SLUG')
    expect(result.changes[0].status).toBe('conflict')
    expect(result.changes[0].resolution).toContain('EMPTY_SLUG')
    // ValidName should still succeed
    expect(result.changes[1].resolved_slug).toBe('validname')
    expect(result.changes[1].status).toBeUndefined()
  })

  it('accepts non-Latin element when explicit slug is provided', () => {
    const model = createMockModel('core', [])
    const models = new Map<string, ParsedKnowledge>([['core', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'add_element',
        target: 'core@concept',
        name: '日本語',
        slug: 'japanese-core',
      },
    ]

    const result = resolveBatchSlugs(changes, models)
    expect(result.changes[0].resolved_slug).toBe('japanese-core')
    expect(result.conflictedChanges.size).toBe(0)
  })
})

describe('elementSlugProblems (issue #614: dotted slugs are not addressable)', () => {
  it('refuses a dotted slug with a named code and a suggested valid slug', async () => {
    const { elementSlugProblems, INVALID_ELEMENT_SLUG } = await import('../../src/index.js')
    const problems = elementSlugProblems({ id: 'c-01', op: 'add_element', slug: 'pipelinepartners.co' })
    expect(problems).toHaveLength(1)
    expect(problems[0].code).toBe(INVALID_ELEMENT_SLUG)
    expect(problems[0].message).toContain('change "c-01"')
    expect(problems[0].message).toContain('"pipelinepartners.co"')
    expect(problems[0].message).toContain('Use "pipelinepartnersco" instead.')
  })

  it('accepts a valid slug, a missing slug, a mixed-case slug and leaves add_model to its own check', async () => {
    const { elementSlugProblems } = await import('../../src/index.js')
    expect(elementSlugProblems({ id: 'c-01', op: 'add_element', slug: 'pipeline-partners' })).toEqual([])
    expect(elementSlugProblems({ id: 'c-01', op: 'add_element', slug: 'nn-person--dr-egon' })).toEqual([])
    expect(elementSlugProblems({ id: 'c-01', op: 'add_element', slug: 'Pipeline-Partners' })).toEqual([])
    expect(elementSlugProblems({ id: 'c-01', op: 'add_element' })).toEqual([])
    expect(elementSlugProblems({ id: 'c-01', op: 'add_model', slug: 'a.b' })).toEqual([])
  })
})
