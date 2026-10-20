import { describe, it, expect } from 'vitest'
import {
  scaffoldKnowledgeDocument,
  inferKnowledgeVersion,
  resolveBlueprintSchema,
  parseKnowledge,
  validateKnowledge,
} from '../../src/index.js'
import {
  BUSINESS_STUB,
  REFERENCE_STUB,
  BLANK_SPEC,
  BUSINESS_URL,
  REFERENCE_URL,
  BLANK_URL,
  golden,
} from '../fixtures/scaffold/stubs.js'

function inputsFor(raw: string) {
  return {
    schema: resolveBlueprintSchema(raw, () => null).schema,
    blueprintFrontmatter: parseKnowledge(raw).frontmatter as unknown as Record<string, unknown>,
  }
}

describe('scaffoldKnowledgeDocument: byte-identical to the pre-change init_knowledge output', () => {
  it('business bluepriNNt (list concept) with a title', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'NewModel',
      blueprintName: 'business_V_0-2-0',
      blueprintUrl: BUSINESS_URL,
      title: 'New Model',
      ...inputsFor(BUSINESS_STUB),
    })
    expect(out).toBe(golden('business'))
  })

  it('an explicit knowledge_version that differs from the parent is carried', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'Acme',
      blueprintName: 'business_V_0-2-0',
      blueprintUrl: BUSINESS_URL,
      knowledgeVersion: 'V_9-9-9',
      ...inputsFor(BUSINESS_STUB),
    })
    expect(out).toBe(golden('businessV999'))
  })

  it('a reference field with no concrete target is omitted from the starter element', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'RefModel',
      blueprintName: 'reftpl_V_0-1-0',
      blueprintUrl: REFERENCE_URL,
      ...inputsFor(REFERENCE_STUB),
    })
    expect(out).toBe(golden('ref'))
    expect(out).not.toContain('[[Target Element]]')
    expect(out).toContain('label:: <string>')
  })

  it('the shipped blank bluepriNNt (lone text concept) keeps one placeholder element heading (the validator requires a marker)', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'BlankModel',
      blueprintName: 'blank_V_0-2-0',
      blueprintUrl: BLANK_URL,
      ...inputsFor(BLANK_SPEC),
    })
    expect(out).toBe(golden('blank'))
    expect(out).toMatch(/##\s+NN\s+Content:\s+.+/)
    expect(out).not.toContain('# NN index')
  })

  it('the scaffolded document parses and validates against its bluepriNNt', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'NewModel',
      blueprintName: 'business_V_0-2-0',
      blueprintUrl: BUSINESS_URL,
      ...inputsFor(BUSINESS_STUB),
    })
    const parsed = parseKnowledge(out)
    expect(parsed.frontmatter.level).toBe(3)
    expect(validateKnowledge(parsed, parseKnowledge(BUSINESS_STUB) as never).errors).toEqual([])
  })
})

describe('scaffoldKnowledgeDocument: spec_version follows the bluepriNNt parent_spec', () => {
  it('takes spec_version and spec_url from the bluepriNNt parent_spec (blank -> iNNfo_V_0-5-0)', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'BlankModel_blank',
      blueprintName: 'blank',
      blueprintUrl: BLANK_URL,
      ...inputsFor(BLANK_SPEC),
    })
    const fm = parseKnowledge(out).frontmatter as unknown as Record<string, unknown>
    expect(fm.spec_version).toBe('V_0-5-0')
    expect(fm.spec_url).toBe('https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md')
  })

  it('takes them from a local stub parent_spec too', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'Acme_business',
      blueprintName: 'business_V_0-2-0',
      blueprintUrl: BUSINESS_URL,
      ...inputsFor(BUSINESS_STUB),
    })
    const fm = parseKnowledge(out).frontmatter as unknown as Record<string, unknown>
    expect(fm.spec_version).toBe('V_0-3-0')
    expect(fm.spec_url).toBe('https://example.com/iNNfo_V_0-3-0_NN.md')
  })

  it('keeps the V_0-4-0 fallback only when the bluepriNNt declares no parent_spec', () => {
    const out = scaffoldKnowledgeDocument({
      id: 'Acme_business',
      blueprintName: 'business',
      blueprintUrl: BUSINESS_URL,
      blueprintFrontmatter: { blueprint_version: 'V_0-2-0' },
    })
    const fm = parseKnowledge(out).frontmatter as unknown as Record<string, unknown>
    expect(fm.spec_version).toBe('V_0-4-0')
    expect(String(fm.spec_url)).toContain('iNNfo_V_0-4-0_NN.md')
  })
})

describe('inferKnowledgeVersion', () => {
  it('explicit wins over the parent version', () => {
    expect(inferKnowledgeVersion('V_3-0-0', { blueprint_version: 'V_0-2-0' })).toBe('V_3-0-0')
  })
  it('infers blueprint_version, then spec_version, from the parent', () => {
    expect(inferKnowledgeVersion(undefined, { blueprint_version: 'V_0-2-0', spec_version: 'V_0-4-0' })).toBe('V_0-2-0')
    expect(inferKnowledgeVersion(undefined, { spec_version: 'V_0-4-0' })).toBe('V_0-4-0')
  })
  it('falls back to V_0-1-0 when nothing resolves', () => {
    expect(inferKnowledgeVersion(undefined, null)).toBe('V_0-1-0')
    expect(inferKnowledgeVersion(undefined, {})).toBe('V_0-1-0')
  })
})
