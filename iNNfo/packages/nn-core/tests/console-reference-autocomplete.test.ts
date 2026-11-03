// @vitest-environment jsdom
/**
 * Console reference surface (distributed-storage S5b.3): a field stores an address
 * and shows the target's title, and authoring a reference is a title autocomplete
 * over the concept's collection that writes the address.
 *
 * (unified-reference-grammar: Titles are display-only; Authoring surfaces
 * autocomplete by title and write the id; distributed-collection-resolution: The
 * console builds collections from declarations.)
 */
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const UI = req(join(consoleDir, 'ui-kit.js')) as any

const MODELS = [
  { id: 'villabotijos-today/pepper-mapache', title: 'El mapache fuera de la ley' },
  { id: 'villabotijos-today/intro', title: 'Intro' },
  { id: 'innteresante/intro', title: 'Intro' },
]

const COLLECTIONS = {
  Video: ['innteresante/intro', 'villabotijos-today/intro', 'villabotijos-today/pepper-mapache'],
}

const index = (collections: Record<string, string[]> = COLLECTIONS) =>
  UI.buildReferenceIndex({ models: MODELS, collections })

describe('a reference field shows the target title and keeps the address', () => {
  it('renders the title of the addressed model and links to it', () => {
    const node = UI.FieldValue(
      { name: 'video', type: 'reference', value: 'villabotijos-today/pepper-mapache' },
      { doc: document, referenceIndex: index() },
    ) as HTMLElement

    expect(node.textContent).toContain('El mapache fuera de la ley')
    const link = node.querySelector('a[data-address]') as HTMLAnchorElement
    expect(link).toBeTruthy()
    expect(link.getAttribute('data-address')).toBe('villabotijos-today/pepper-mapache')
    expect(link.getAttribute('title')).toBe('villabotijos-today/pepper-mapache')
    expect(String(link.getAttribute('href'))).toContain('pepper-mapache')
  })

  it('keeps the stored value the address, not the title', () => {
    const field = { name: 'video', type: 'reference', value: 'villabotijos-today/pepper-mapache' }
    const node = UI.FieldValue(field, { doc: document, referenceIndex: index() }) as HTMLElement
    expect(field.value).toBe('villabotijos-today/pepper-mapache')
    expect(node.getAttribute('data-value')).toBe('villabotijos-today/pepper-mapache')
  })

  it('falls back to the plain text when the address is not in the index', () => {
    // No index entry means no title to show: the value renders as plain text, never
    // as a made-up label.
    const node = UI.FieldValue(
      { name: 'video', type: 'reference', value: 'unknown/model' },
      { doc: document, referenceIndex: index() },
    )
    expect(node).toBeNull()
  })
})

describe('autocomplete over a concept collection', () => {
  it('filters by title substring and shows title - address', () => {
    const candidates = UI.referenceCandidates(index(), ['Video'], 'mapache')
    expect(candidates.map((c: any) => c.address)).toEqual(['villabotijos-today/pepper-mapache'])
    expect(candidates[0].title).toBe('El mapache fuera de la ley')
  })

  it('lists both Videos titled Intro, with their addresses, and filters by concept', () => {
    const candidates = UI.referenceCandidates(index(), ['Video'], 'Intro')
    expect(candidates.map((c: any) => c.address).sort()).toEqual([
      'innteresante/intro',
      'villabotijos-today/intro',
    ])
    expect(UI.referenceCandidates(index(), ['Series'], 'Intro')).toEqual([])
  })

  it('writes nothing until a candidate is selected, then inserts the address', () => {
    const candidates = UI.referenceCandidates(index(), ['Video'], '')
    const widget = UI.FieldReferenceWidget('', candidates, {
      doc: document,
      modelId: 'villabotijos-today/pepper-mapache',
    }) as HTMLElement
    const input = widget.querySelector('input') as HTMLInputElement

    input.value = 'Intro'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const options = [...widget.querySelectorAll('[data-nn-reference-option]')]
    expect(options.map((o) => o.textContent)).toEqual([
      'Intro - innteresante/intro',
      'Intro - villabotijos-today/intro',
    ])
    // Nothing is written until one is picked.
    expect(input.value).toBe('Intro')
    expect(input.getAttribute('data-address')).toBeNull()

    ;(options[1] as HTMLElement).dispatchEvent(new Event('click', { bubbles: true }))
    expect(input.value).toBe('villabotijos-today/intro')
    expect(input.getAttribute('data-address')).toBe('villabotijos-today/intro')
  })

  it('inserts the relative form when the target belongs to the same model', () => {
    const local = UI.buildReferenceIndex({
      models: MODELS,
      collections: { Scene: ['villabotijos-today/pepper-mapache@00-gancho'] },
    })
    const candidates = UI.referenceCandidates(local, ['Scene'], '')
    const widget = UI.FieldReferenceWidget('', candidates, {
      doc: document,
      modelId: 'villabotijos-today/pepper-mapache',
    }) as HTMLElement
    const option = widget.querySelector('[data-nn-reference-option]') as HTMLElement
    option.dispatchEvent(new Event('click', { bubbles: true }))
    expect((widget.querySelector('input') as HTMLInputElement).value).toBe('@00-gancho')
  })
})

describe('the editor message names the title and the address', () => {
  it('lists candidates by title and address when the typed value is not an address', () => {
    const message = UI.referenceError('nobody', UI.referenceCandidates(index(), ['Video'], ''))
    expect(message).toContain('"Intro"')
    expect(message).toContain('(innteresante/intro)')
    expect(message).toContain('(villabotijos-today/intro)')
  })

  it('accepts an exact address', () => {
    expect(UI.referenceError('innteresante/intro', UI.referenceCandidates(index(), ['Video'], ''))).toBe('')
  })
})
