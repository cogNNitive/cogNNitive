import { describe, it, expect } from 'vitest'
import {
  parseKnowledge,
  extractBlueprintSchema,
  buildDeclaredTransitions,
  declaredTransitionsFor,
  resolveBlueprintSchema,
  getCanonicalSpecContent,
} from '../../src/index.js'
import {
  transitionAllowed,
  transitionDiagnostic,
  TRANSITION_NOT_ALLOWED,
} from '../../src/changeset/transitions.js'

describe('Executions FSM concept-scoped status transitions (D7)', () => {
  const content = getCanonicalSpecContent('executions')!
  const { schema } = resolveBlueprintSchema(content, () => null)
  const transitions = buildDeclaredTransitions(schema.concepts)

  const stepTransitions = declaredTransitionsFor(transitions, 'Step Run', 'status')
  const artifactTransitions = declaredTransitionsFor(transitions, 'Run Artifact', 'status')

  it('builds distinct transitions for Step Run vs Run Artifact', () => {
    expect(stepTransitions).toBeDefined()
    expect(artifactTransitions).toBeDefined()
    expect(stepTransitions).not.toEqual(artifactTransitions)
  })

  describe('Step Run status transitions', () => {
    it('only admits pending as its initial status', () => {
      expect(transitionAllowed(stepTransitions!, '', 'pending')).toBe(true)
      expect(transitionAllowed(stepTransitions!, '', 'expected')).toBe(false)
      expect(transitionDiagnostic('status', stepTransitions!, '', 'expected')).toContain(
        TRANSITION_NOT_ALLOWED,
      )
    })

    it('follows valid step progression', () => {
      expect(transitionAllowed(stepTransitions!, 'pending', 'active')).toBe(true)
      expect(transitionAllowed(stepTransitions!, 'active', 'done')).toBe(true)
      expect(transitionAllowed(stepTransitions!, 'active', 'waiting')).toBe(true)
      expect(transitionAllowed(stepTransitions!, 'waiting', 'active')).toBe(true)
      expect(transitionAllowed(stepTransitions!, 'active', 'failed')).toBe(true)
      expect(transitionAllowed(stepTransitions!, 'failed', 'active')).toBe(true)
    })

    it('preserves the loop back-edge (done -> pending)', () => {
      expect(transitionAllowed(stepTransitions!, 'done', 'pending')).toBe(true)
    })

    it('refuses cross-lifecycle artifact transitions', () => {
      expect(transitionAllowed(stepTransitions!, 'pending', 'produced')).toBe(false)
      expect(transitionAllowed(stepTransitions!, 'active', 'validated')).toBe(false)
      expect(transitionAllowed(stepTransitions!, 'done', 'rejected')).toBe(false)
    })
  })

  describe('Run Artifact status transitions', () => {
    it('only admits expected as its initial status', () => {
      expect(transitionAllowed(artifactTransitions!, '', 'expected')).toBe(true)
      expect(transitionAllowed(artifactTransitions!, '', 'pending')).toBe(false)
      expect(transitionDiagnostic('status', artifactTransitions!, '', 'pending')).toContain(
        TRANSITION_NOT_ALLOWED,
      )
    })

    it('follows valid artifact progression', () => {
      expect(transitionAllowed(artifactTransitions!, 'expected', 'produced')).toBe(true)
      expect(transitionAllowed(artifactTransitions!, 'produced', 'validated')).toBe(true)
      expect(transitionAllowed(artifactTransitions!, 'produced', 'rejected')).toBe(true)
    })

    it('preserves artifact revalidation (validated -> produced)', () => {
      expect(transitionAllowed(artifactTransitions!, 'validated', 'produced')).toBe(true)
    })

    it('refuses cross-lifecycle step transitions', () => {
      expect(transitionAllowed(artifactTransitions!, 'expected', 'active')).toBe(false)
      expect(transitionAllowed(artifactTransitions!, 'produced', 'done')).toBe(false)
      expect(transitionAllowed(artifactTransitions!, 'validated', 'pending')).toBe(false)
    })
  })
})
