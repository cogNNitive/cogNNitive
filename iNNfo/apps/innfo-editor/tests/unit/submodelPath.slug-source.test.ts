import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { slugify } from '@cognnitive/innfo-core'
import * as submodelPath from '../../src/utils/submodelPath'

describe('submodelPath slug source of truth', () => {
  it('consumes the innfo-core slugify via the browser entry', () => {
    expect(typeof slugify).toBe('function')
    expect(slugify('Área de I+D & Innovación')).toBe('area-de-id-innovacion')
    expect(slugify('  __initiative_01__  ')).toBe('initiative-01')
  })

  it('does not define or re-export a second slugify implementation', () => {
    expect('slugify' in submodelPath).toBe(false)
    const src = readFileSync(resolve(__dirname, '../../src/utils/submodelPath.ts'), 'utf8')
    expect(src).not.toMatch(/function\s+slugify/)
  })

  it('derives paths with core slug semantics', () => {
    const path = submodelPath.deriveSuggestedSubmodelPath({
      parentPath: 'kNNowledge/Company_V_0-1-0_NN.md',
      conceptSlug: 'Iniciativas Estratégicas',
      elementSlug: 'Some_Field',
      targetBlueprint: 'business',
    })
    expect(path).toBe(
      'kNNowledge/Company_V_0-1-0/iniciativas-estrategicas/some-field/business_01.md',
    )
  })
})
