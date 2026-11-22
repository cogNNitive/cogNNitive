import { describe, it, expect } from 'vitest'
import {
  parseTransitions,
  transitionsProblems,
  buildDeclaredTransitions,
  declaredTransitionsFor,
} from '../../src/schema/transitions.js'
import {
  transitionAllowed,
  transitionDiagnostic,
  transitionValue,
  TRANSITION_NOT_ALLOWED,
} from '../../src/changeset/transitions.js'

const VIDEO_TRANSITIONS = {
  '': ['idea'],
  idea: ['draft', 'archived'],
  draft: ['approved', 'archived'],
  archived: [],
}

describe('parseTransitions', () => {
  it('reads a JSON object of value -> values', () => {
    expect(parseTransitions('{"": ["idea"], "idea": ["draft"], "draft": []}')).toEqual({
      '': ['idea'],
      idea: ['draft'],
      draft: [],
    })
  })

  it('accepts an already-parsed object', () => {
    expect(parseTransitions({ idea: ['draft'] })).toEqual({ idea: ['draft'] })
  })

  it('rejects a value that is not an object', () => {
    expect(parseTransitions('[idea, draft]')).toBeUndefined()
    expect(parseTransitions('idea')).toBeUndefined()
    expect(parseTransitions('')).toBeUndefined()
  })

  it('rejects an object whose members are not arrays of strings', () => {
    expect(parseTransitions('{"idea": "draft"}')).toBeUndefined()
    expect(parseTransitions('{"idea": [1]}')).toBeUndefined()
  })

  it('rejects malformed JSON', () => {
    expect(parseTransitions('{not json}')).toBeUndefined()
  })
})

describe('transitionsProblems', () => {
  const field = (over: Partial<Parameters<typeof transitionsProblems>[0]> = {}) => ({
    name: 'status',
    type: 'select',
    options: ['idea', 'draft', 'archived'],
    transitions: { '': ['idea'], idea: ['draft', 'archived'], draft: ['archived'], archived: [] },
    ...over,
  })

  it('accepts a well-formed declaration', () => {
    expect(transitionsProblems(field())).toEqual([])
  })

  it('accepts a declaration with no transitions at all', () => {
    expect(transitionsProblems(field({ transitions: undefined }))).toEqual([])
  })

  it('refuses a non-select field', () => {
    const problems = transitionsProblems(field({ type: 'string' }))
    expect(problems[0]).toContain('TRANSITIONS_INVALID')
    expect(problems[0]).toContain('not a select field')
  })

  it('refuses a key that is not one of the options', () => {
    const problems = transitionsProblems(
      field({
        transitions: {
          '': ['idea'],
          idea: ['draft'],
          draft: ['archived'],
          archived: [],
          ghost: [],
        },
      }),
    )
    expect(problems.some((p) => p.startsWith('TRANSITIONS_UNKNOWN_VALUE'))).toBe(true)
  })

  it('refuses a target that is not one of the options', () => {
    const problems = transitionsProblems(
      field({ transitions: { '': ['idea'], idea: ['nowhere'], draft: [], archived: [] } }),
    )
    expect(problems.some((p) => p.startsWith('TRANSITIONS_UNKNOWN_OPTION'))).toBe(true)
  })

  it('refuses an option that is not a key: terminal values are stated, not implied', () => {
    const problems = transitionsProblems(
      field({ transitions: { '': ['idea'], idea: ['draft'], draft: ['archived'] } }),
    )
    expect(
      problems.some((p) => p.startsWith('TRANSITIONS_INVALID') && p.includes('archived')),
    ).toBe(true)
  })
})

describe('declaredTransitionsFor / buildDeclaredTransitions', () => {
  it('builds a concept+field lookup, case-insensitive', () => {
    const lookup = buildDeclaredTransitions([
      {
        name: 'Video',
        fields: [{ name: 'status', transitions: VIDEO_TRANSITIONS }, { name: 'title' }],
      },
    ])
    expect(declaredTransitionsFor(lookup, 'video', 'STATUS')).toEqual(VIDEO_TRANSITIONS)
    expect(declaredTransitionsFor(lookup, 'Video', 'title')).toBeUndefined()
    expect(declaredTransitionsFor(lookup, 'Other', 'status')).toBeUndefined()
  })

  it('yields an empty map for a schema with no declaration', () => {
    expect(buildDeclaredTransitions([{ name: 'Video', fields: [{ name: 'title' }] }]).size).toBe(0)
  })
})

describe('transitionAllowed', () => {
  it('allows a declared edge', () => {
    expect(transitionAllowed(VIDEO_TRANSITIONS, 'idea', 'draft')).toBe(true)
  })

  it('refuses an undeclared edge', () => {
    expect(transitionAllowed(VIDEO_TRANSITIONS, 'idea', 'approved')).toBe(false)
  })

  it('always allows writing the value the field already holds', () => {
    expect(transitionAllowed(VIDEO_TRANSITIONS, 'archived', 'archived')).toBe(true)
    expect(transitionAllowed(VIDEO_TRANSITIONS, '', '')).toBe(true)
  })

  it('reads an unset field as the empty key', () => {
    expect(transitionAllowed(VIDEO_TRANSITIONS, '', 'idea')).toBe(true)
    expect(transitionAllowed(VIDEO_TRANSITIONS, '', 'draft')).toBe(false)
  })

  it('treats a terminal value as having no outgoing edge', () => {
    expect(transitionAllowed(VIDEO_TRANSITIONS, 'archived', 'idea')).toBe(false)
  })

  it('refuses a current value the declaration does not name', () => {
    expect(transitionAllowed(VIDEO_TRANSITIONS, 'unknown', 'idea')).toBe(false)
  })
})

describe('transitionValue', () => {
  it('maps absent values to the unset key', () => {
    expect(transitionValue(undefined)).toBe('')
    expect(transitionValue(null)).toBe('')
  })

  it('stringifies a present value', () => {
    expect(transitionValue('draft')).toBe('draft')
    expect(transitionValue(3)).toBe('3')
  })
})

describe('transitionDiagnostic', () => {
  it('is absent for an allowed edge', () => {
    expect(transitionDiagnostic('status', VIDEO_TRANSITIONS, 'idea', 'draft')).toBeUndefined()
  })

  it('names the code, the field, the current and requested values', () => {
    const diag = transitionDiagnostic('status', VIDEO_TRANSITIONS, 'idea', 'approved')!
    expect(diag).toContain(TRANSITION_NOT_ALLOWED)
    expect(diag).toContain('"status"')
    expect(diag).toContain('"idea"')
    expect(diag).toContain('"approved"')
    expect(diag).toContain('"draft"')
  })

  it('says a terminal value is terminal', () => {
    const diag = transitionDiagnostic('status', VIDEO_TRANSITIONS, 'archived', 'idea')!
    expect(diag).toContain('terminal')
  })

  it('renders the unset value as (unset)', () => {
    const diag = transitionDiagnostic('status', VIDEO_TRANSITIONS, '', 'archived')!
    expect(diag).toContain('(unset)')
  })
})
