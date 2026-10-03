import { describe, it, expect } from 'vitest'
import {
  generateConsolePrompt,
  resolveProcedure,
  TEMPLATE_PROCEDURE_MAP,
} from './consolePrompt'

describe('consolePrompt.generateConsolePrompt', () => {
  const input = {
    title: 'Ghostbusters Workspace',
    version: '2.1.0',
    models: [
      {
        title: 'Business Strategic Model',
        template: 'business',
        modelPath: 'models/Business_V_1-0-0_business_NN.md',
        consolePath: 'artifacts/business_console.html',
        hasConsole: true,
      },
      {
        title: 'Organization Matrix',
        template: 'organization',
        modelPath: 'models/Organization_V_1-0-0_organization_NN.md',
        hasConsole: false,
      },
    ],
  }

  it('includes workspace metadata', () => {
    const prompt = generateConsolePrompt(input)
    expect(prompt).toContain('Ghostbusters Workspace')
    expect(prompt).toContain('v2.1.0')
  })

  it('lists every model with title, template and model path', () => {
    const prompt = generateConsolePrompt(input)
    expect(prompt).toContain('Business Strategic Model')
    expect(prompt).toContain('`business`')
    expect(prompt).toContain('models/Business_V_1-0-0_business_NN.md')
    expect(prompt).toContain('Organization Matrix')
    expect(prompt).toContain('models/Organization_V_1-0-0_organization_NN.md')
  })

  it('derives a default console path when none is provided', () => {
    const prompt = generateConsolePrompt(input)
    expect(prompt).toContain('artifacts/organization_console.html')
  })

  it('includes the three step headings and the hub compilation procedure', () => {
    const prompt = generateConsolePrompt(input)
    expect(prompt).toContain('Model Validation')
    expect(prompt).toContain('Console Regeneration')
    expect(prompt).toContain('Workspace Hub Compilation')
    expect(prompt).toContain('compile_workspace_hub_NN.md')
  })

  it('never emits a dead specs/templates path', () => {
    const prompt = generateConsolePrompt(input)
    expect(prompt).not.toContain('specs/templates/')
    expect(prompt).toContain('iNNfo/specs/bluepriNNts/')
  })
})

describe('consolePrompt.TEMPLATE_PROCEDURE_MAP', () => {
  it('maps every known template under the bluepriNNts root', () => {
    for (const [template, path] of Object.entries(TEMPLATE_PROCEDURE_MAP)) {
      expect(path).toContain(`iNNfo/specs/bluepriNNts/${template}/`)
      expect(path).not.toContain('specs/templates/')
    }
  })

  it('falls back to a conventional path for an unmapped template', () => {
    expect(resolveProcedure('unknown')).toBe(
      'iNNfo/specs/bluepriNNts/unknown/procedures/compile_unknown_console_NN.md',
    )
  })
})
