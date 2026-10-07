import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { applyMutation, freeze_slugs } from '../src/mutate.js'

const MODEL_WITH_SLUG = `---
spec_version: "V_0-3-0"
level: 3
---

# NN ConceptA
## NN ConceptA: Alpha
slug:: alpha-slug
desc:: test

# NN ConceptB
## NN ConceptB: Beta
slug:: beta-slug
desc:: test
`

const UNFROZEN_MODEL = `---
spec_version: "V_0-3-0"
level: 3
---

# NN ConceptA
## NN ConceptA: Alpha
desc:: test

## NN ConceptA: Beta
desc:: test
`

describe('Phase 3: Mutate Engine Slug Immutability & freeze_slugs', () => {
  it('3.1.1 rename_element updates display name while leaving element.slug untouched and immutable (D1)', () => {
    const model = parseKnowledge(MODEL_WITH_SLUG)
    const result = applyMutation(model, 'rename_element', {
      conceptName: 'ConceptA',
      elementName: 'Alpha',
      newName: 'Alpha Renamed',
    })
    expect(result.success).toBe(true)
    const element = model.elements.get('ConceptA')?.[0]
    expect(element?.name).toBe('Alpha Renamed')
    expect(element?.slug).toBe('alpha-slug')
    expect(element?.slugExplicit).toBe(true)
  })

  it('3.1.2 rename_element allows renaming to a display name matching an element in a DIFFERENT concept (D3)', () => {
    const model = parseKnowledge(MODEL_WITH_SLUG)
    // Beta exists in ConceptB. Renaming Alpha in ConceptA to "Beta" should SUCCEED across concepts.
    const result = applyMutation(model, 'rename_element', {
      conceptName: 'ConceptA',
      elementName: 'Alpha',
      newName: 'Beta',
    })
    expect(result.success).toBe(true)
    const elementA = model.elements.get('ConceptA')?.[0]
    expect(elementA?.name).toBe('Beta')
    expect(elementA?.slug).toBe('alpha-slug') // slug remains immutable!
  })

  it('3.1.3 freeze_slugs assigns deterministic unique slugs to all unfrozen elements and sets slugExplicit = true (D19)', () => {
    const model = parseKnowledge(UNFROZEN_MODEL)
    const elements = model.elements.get('ConceptA')!
    expect(elements[0].slugExplicit).toBeFalsy()
    expect(elements[1].slugExplicit).toBeFalsy()

    const result = freeze_slugs(model)
    expect(result.success).toBe(true)
    expect(elements[0].slug).toBe('alpha')
    expect(elements[0].slugExplicit).toBe(true)
    expect(elements[1].slug).toBe('beta')
    expect(elements[1].slugExplicit).toBe(true)
  })

  it('3.1.4 Calling any mutation on a model with unfrozen elements automatically triggers freeze_slugs first', () => {
    const model = parseKnowledge(UNFROZEN_MODEL)
    const elements = model.elements.get('ConceptA')!
    expect(elements[0].slugExplicit).toBeFalsy()

    // Apply update_field mutation on Alpha
    const result = applyMutation(model, 'update_field', {
      conceptName: 'ConceptA',
      elementName: 'Alpha',
      fieldName: 'desc',
      value: 'updated',
    })
    expect(result.success).toBe(true)
    // Both elements should now be frozen with explicit slugs
    const updatedElements = model.elements.get('ConceptA')!
    expect(updatedElements[0].slug).toBe('alpha')
    expect(updatedElements[0].slugExplicit).toBe(true)
    expect(updatedElements[1].slug).toBe('beta')
    expect(updatedElements[1].slugExplicit).toBe(true)
  })
})
