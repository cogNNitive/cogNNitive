import { describe, it, expect } from 'vitest'
import { IdentityRegistry, buildQualifiedId, DuplicateNameError } from '../../src/model/identity'

describe('identity', () => {
  it('accepts unique sibling names', () => {
    const registry = new IdentityRegistry()
    const alpha = registry.register(null, 'Alpha')
    const beta = registry.register(null, 'Beta')

    expect(alpha).toBe('Alpha')
    expect(beta).toBe('Beta')
  })

  it('throws on duplicate sibling names (R-IE-02)', () => {
    const registry = new IdentityRegistry()
    registry.register(null, 'Alpha')
    expect(() => registry.register(null, 'Alpha')).toThrow(DuplicateNameError)
  })

  it('reports the colliding name in the error', () => {
    const registry = new IdentityRegistry()
    registry.register(null, 'Alpha')
    try {
      registry.register(null, 'Alpha')
    } catch (e) {
      expect(e).toBeInstanceOf(DuplicateNameError)
      expect((e as DuplicateNameError).duplicateName).toBe('Alpha')
      expect((e as DuplicateNameError).parentQualifiedId).toBeNull()
    }
  })

  it('resolves cross-branch same-name nodes to distinct qualified paths', () => {
    const registry = new IdentityRegistry()
    const parent1 = registry.register(null, 'Parent1')
    const parent2 = registry.register(null, 'Parent2')
    const alphaUnderParent1 = registry.register(parent1, 'Alpha')
    const alphaUnderParent2 = registry.register(parent2, 'Alpha')

    expect(alphaUnderParent1).toBe('Parent1/Alpha')
    expect(alphaUnderParent2).toBe('Parent2/Alpha')
    expect(alphaUnderParent1).not.toBe(alphaUnderParent2)
  })

  it('buildQualifiedId joins ancestor chain with Parent/Child', () => {
    expect(buildQualifiedId(null, 'Process')).toBe('Process')
    expect(buildQualifiedId('Process', 'Phase')).toBe('Process/Phase')
    expect(buildQualifiedId('Process/Phase', 'Task')).toBe('Process/Phase/Task')
  })
})
