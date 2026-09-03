import { describe, it, expect } from 'vitest'
import { useTreeExpansion } from '../../src/composables/useTreeExpansion'

describe('useTreeExpansion', () => {
  it('starts collapsed (generation -1) and expandAll increments to a positive generation', () => {
    const { expandedGeneration, expandAll } = useTreeExpansion()
    expect(expandedGeneration.value).toBe(-1)
    expandAll()
    expect(expandedGeneration.value).toBe(1)
    expandAll()
    expect(expandedGeneration.value).toBe(2)
  })

  it('collapseAll always drives the generation to a new negative value', () => {
    const { expandedGeneration, expandAll, collapseAll } = useTreeExpansion()
    expandAll()
    expandAll()
    expect(expandedGeneration.value).toBe(2)
    collapseAll()
    expect(expandedGeneration.value).toBe(-2)
    collapseAll()
    expect(expandedGeneration.value).toBe(-3)
  })

  it('toggleModel treats an unseen model id as expanded-by-default and flips it to collapsed', () => {
    const { expandedModels, toggleModel } = useTreeExpansion()
    expect(expandedModels.value['model-a']).toBeUndefined()
    toggleModel('model-a')
    expect(expandedModels.value['model-a']).toBe(false)
    toggleModel('model-a')
    expect(expandedModels.value['model-a']).toBe(true)
  })
})
