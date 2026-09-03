import { describe, it, expect } from 'vitest'
import guideData from '../../src/ai-guide/guide'

describe('guide.ts prompts (via innfoPrompt)', () => {
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


})
