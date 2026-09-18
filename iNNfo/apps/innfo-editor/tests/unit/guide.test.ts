import { describe, it, expect } from 'vitest'
import guideData, { parseGuide } from '../../src/ai-guide/guide'

describe('guide.ts parser and structure', () => {
  it('parses title, dynamic subtitle, and sections from procedure_NN.md', () => {
    expect(guideData.title).toBe('Use iNNfo with AI')
    expect(guideData.subtitle).toContain('Edit your iNNfo models using')
    expect(guideData.steps.length).toBeGreaterThanOrEqual(4)
    expect(guideData.tools.length).toBeGreaterThanOrEqual(2)
    expect(guideData.matrixHeaders.length).toBeGreaterThanOrEqual(2)
    expect(guideData.matrixRows.length).toBeGreaterThanOrEqual(4)
  })

  it('extracts tool entries with valid URLs and initials', () => {
    const openCodeTool = guideData.tools.find((t) => t.name.includes('OpenCode'))
    expect(openCodeTool).toBeDefined()
    expect(openCodeTool?.url).toBe('https://opencode.ai/download')
    expect(openCodeTool?.initials).toBe('OD')
    expect(openCodeTool?.description).toContain('reference desktop client')

    const agentTool = guideData.tools.find((t) => t.name.includes('AI Coding Agents'))
    expect(agentTool).toBeDefined()
    expect(agentTool?.url).toBe('https://cognnitive.com/use')
    expect(agentTool?.initials).toBe('AC')
  })

  it('all non-null extractPrompt return values start with "innfo:"', () => {
    const steps = guideData.steps
    const prompts = steps.map((s) => s.prompt).filter(Boolean) as string[]
    expect(prompts.length).toBeGreaterThanOrEqual(2)
    for (const p of prompts) {
      expect(p).toMatch(/^innfo: /)
    }
  })

  it('edit model prompt starts with "innfo:" and contains expected content', () => {
    const steps = guideData.steps
    const editPrompts = steps
      .map((s) => s.prompt)
      .filter((p): p is string => p !== null && p.toLowerCase().includes('edit a model'))
    expect(editPrompts.length).toBeGreaterThanOrEqual(1)
    for (const p of editPrompts) {
      expect(p).toMatch(/^innfo: /)
      expect(p).toContain('nn-innfo')
    }
  })

  it('handles legacy * _NN syntax gracefully', () => {
    const legacyMd = `---
title: "Legacy Guide"
---
# _NN index
* _NN index: Work
* _NN index: Tools

# _NN Work
* _NN Work: Step One
  Description for step one.
* _NN Work: Configure MCP tools
  \`\`\`yaml
  tool: "OpenCode"
  \`\`\`
  Tell agent: *"innfo: Load the nn-innfo skill and check that innfo-mcp is configured"*

# _NN Tools
* _NN Tools: OpenCode
  Download: https://opencode.ai/download Supported desktop client.

# _NN matrices: work-roles matrix
| Work \\ Roles | User |
| :--- | :---: |
| Step One | Responsible |
`
    const parsed = parseGuide(legacyMd)
    expect(parsed.title).toBe('Legacy Guide')
    expect(parsed.steps.length).toBe(2)
    expect(parsed.tools.length).toBe(1)
    expect(parsed.tools[0].name).toBe('OpenCode')
    expect(parsed.tools[0].url).toBe('https://opencode.ai/download')
    expect(parsed.matrixRows.length).toBe(1)
  })
})
