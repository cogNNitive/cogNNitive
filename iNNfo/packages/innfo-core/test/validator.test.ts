import { describe, it, expect } from 'vitest'
import { parseModel } from '../src/parser/index'
import { validateModel } from '../src/validator/model'

describe('parent spec resolution failure diagnostics', () => {
  const modelContent = [
    '---',
    'spec_version: "V_0-2-0"',
    'level: 3',
    'model_version: "V_0-1-2"',
    'title: "Model With Missing Parent"',
    'parent_spec:',
    '  name: "missing_parent"',
    '  url: "https://example.com/non-existent-spec"',
    '---',
    '',
    '# NN index',
    '* [[ConceptOne]]',
    '',
    '# NN ConceptOne',
    '## NN ConceptOne: ElementA',
    '',
  ].join('\n')

  it('emits [PARENT_RESOLUTION_FAILED] error when parent spec is missing', () => {
    const model = parseModel(modelContent)
    const result = validateModel(model, null, null)

    expect(result.valid).toBe(false)
    const parentError = result.errors.find((e) => e.message.includes('[PARENT_RESOLUTION_FAILED]'))
    expect(parentError).toBeDefined()
    expect(parentError?.severity).toBe('error')
  })

  it('suppresses downstream concept validation warnings when parent resolution fails', () => {
    const model = parseModel(modelContent)
    const result = validateModel(model, null, null)

    // Downstream concept warnings (e.g. "Concept 'X' is undocumented in parent template") must be suppressed
    const conceptWarnings = result.warnings.filter((w) => w.path.startsWith('parent.concepts.'))
    expect(conceptWarnings).toHaveLength(0)
  })

  it('does not emit [PARENT_RESOLUTION_FAILED] when parent template is provided', () => {
    const model = parseModel(modelContent)
    const mockTemplate = {
      name: 'missing_parent',
      level: 2 as const,
      frontmatter: {
        spec_version: 'V_0-2-0',
        level: 2 as const,
        title: 'Mock Parent',
      },
      rawContent: [
        '---',
        'spec_version: "V_0-2-0"',
        'level: 2',
        'title: "Mock Parent"',
        '---',
        '# NN Concept Definition',
        '## NN Concept Definition: ConceptOne',
        'type:: list',
      ].join('\n'),
    }

    const result = validateModel(model, mockTemplate, null)
    const parentError = result.errors.find((e) => e.message.includes('[PARENT_RESOLUTION_FAILED]'))
    expect(parentError).toBeUndefined()
  })

  it('validates the official Ghostbusters sample successfully against the updated Business template', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const modelContent = fs.readFileSync(path.join(import.meta.dirname, '../../../specs/templates/business/samples/Ghostbusters_V_0-1-0_business_NN.md'), 'utf8')
    const templateContent = fs.readFileSync(path.join(import.meta.dirname, '../../../specs/templates/business/business_V_0-1-0_NN.md'), 'utf8')


    const model = parseModel(modelContent)
    const mockTemplate = {
      name: 'business_V_0-1-0',
      level: 2 as const,
      frontmatter: model.frontmatter,
      rawContent: templateContent,
    }

    const result = validateModel(model, mockTemplate, null)
    const undefinedConceptErrors = result.errors.filter((e) => e.message.includes('is not defined in template'))
    expect(undefinedConceptErrors).toEqual([])
  })
})


