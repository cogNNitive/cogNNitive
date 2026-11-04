import { describe, it, expect } from 'vitest'
import { parseTargetAddress } from './change-args.js'

describe('parseTargetAddress on the unified address grammar', () => {
  it('splits a hierarchical id, an element and a field', () => {
    const r = parseTargetAddress('villabotijos-today/pepper-mapache@00-gancho&voice')
    expect(r).toMatchObject({
      modelSlug: 'villabotijos-today/pepper-mapache',
      remainder: '00-gancho&voice',
      parts: ['00-gancho', 'voice'],
    })
    expect(r.error).toBeUndefined()
  })

  it('accepts a concept field, a matrix cell and a bare model id', () => {
    expect(parseTargetAddress('m@concept:goal&owner')).toMatchObject({
      modelSlug: 'm',
      parts: ['concept:goal', 'owner'],
    })
    expect(parseTargetAddress('m@swot&r1&c1')).toMatchObject({ modelSlug: 'm', parts: ['swot', 'r1', 'c1'] })
    expect(parseTargetAddress('m')).toEqual({ modelSlug: 'm', remainder: '', parts: [] })
    expect(parseTargetAddress('m@swot&r1&c1').error).toBeUndefined()
  })

  it('reports a file path as a removed form', () => {
    const md = parseTargetAddress('kNNowledge/x_NN.md@goal-1&owner')
    expect(md.error?.code).toBe('MODEL_CITED_BY_PATH')
    expect(md.error?.message).toContain('<hierarchical-id>@<slug>')
    expect(parseTargetAddress('a\\b@x').error?.code).toBe('ADDRESS_MALFORMED')
  })

  it('reports a wikilink value as a removed form', () => {
    expect(parseTargetAddress('[[Goal 1]]').error?.removed).toBe('wikilink reference')
    expect(parseTargetAddress('[[Plan :: Goal 1]]').error?.removed).toBe('title-qualified reference')
  })

  it('keeps splitting a legacy display-name target so existing callers still resolve it, and flags it', () => {
    const r = parseTargetAddress('m@Goal 1&owner')
    expect(r).toMatchObject({ modelSlug: 'm', remainder: 'Goal 1&owner', parts: ['Goal 1', 'owner'] })
    expect(r.error?.code).toBe('ADDRESS_MALFORMED')
  })
})
