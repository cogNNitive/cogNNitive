import { describe, it, expect } from 'vitest'
import type { ValidationError } from '@cognnitive/innfo-core'
import { buildVerifyPrompt, buildVerifyPromptFromValidation } from './verify-prompt'

function err(message: string): ValidationError {
  return { path: 'elements.Roles.RoleA', message, severity: 'error' }
}

describe('differential verify prompts (llm-context-efficiency)', () => {
  it('re-validation carries new errors only: exit + new_errors + log path ref', () => {
    const prompt = buildVerifyPrompt({
      exit: 1,
      newErrors: [err('[MISSING_FIELD] RoleA lacks linked')],
      verdict: '1 new error',
      logPath: '/tmp/verify-run.log',
    })
    expect(prompt.exit).toBe(1)
    expect(prompt.new_errors).toHaveLength(1)
    expect(prompt.new_errors[0].message).toContain('[MISSING_FIELD]')
    expect(prompt.verdict).toBe('1 new error')
    expect(prompt.log_path).toBe('/tmp/verify-run.log')
  })

  it('never embeds full logs or rendered artifacts, only a path reference', () => {
    const prompt = buildVerifyPrompt({
      exit: 1,
      newErrors: [err('boom')],
      verdict: '1 new error',
      logPath: '/tmp/verify-run.log',
    })
    expect(prompt).not.toHaveProperty('log')
    expect(prompt).not.toHaveProperty('fullLog')
    expect(prompt).not.toHaveProperty('full_log')
    expect(prompt).not.toHaveProperty('artifact')
    expect(prompt).not.toHaveProperty('rendered')
  })

  it('clean run carries the verdict only: empty new_errors, clean verdict', () => {
    const prompt = buildVerifyPromptFromValidation(
      { valid: true, errors: [] },
      { exit: 0, logPath: '/tmp/verify-run.log' },
    )
    expect(prompt.exit).toBe(0)
    expect(prompt.new_errors).toEqual([])
    expect(prompt.verdict).toBe('clean')
    expect(prompt.log_path).toBe('/tmp/verify-run.log')
  })

  it('triangulation: failing validation verdict counts the new errors', () => {
    const prompt = buildVerifyPromptFromValidation(
      { valid: false, errors: [err('first'), err('second')] },
      { exit: 1 },
    )
    expect(prompt.exit).toBe(1)
    expect(prompt.new_errors).toHaveLength(2)
    expect(prompt.verdict).toBe('2 new errors')
    expect(prompt).not.toHaveProperty('log_path')
  })

  it('triangulation: single new error uses the singular verdict', () => {
    const prompt = buildVerifyPromptFromValidation(
      { valid: false, errors: [err('only')] },
      { exit: 1, logPath: '/tmp/verify-run.log' },
    )
    expect(prompt.verdict).toBe('1 new error')
    expect(prompt.new_errors).toHaveLength(1)
  })

  it('triangulation: historical errors are never re-added, only forwarded as received', () => {
    const fresh = [err('fresh-only')]
    const prompt = buildVerifyPrompt({ exit: 1, newErrors: fresh, verdict: '1 new error' })
    expect(prompt.new_errors).toBe(fresh)
    expect(prompt.new_errors).toHaveLength(1)
  })
})
