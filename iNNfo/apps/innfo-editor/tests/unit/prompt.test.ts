import { describe, it, expect } from 'vitest'
import { innfoPrompt } from '../../src/ai-guide/prompt'

describe('innfoPrompt', () => {
  it('prepends "innfo: " to a non-empty string', () => {
    expect(innfoPrompt('hello')).toBe('innfo: hello')
  })

  it('prepends "innfo: " to an empty string', () => {
    expect(innfoPrompt('')).toBe('innfo: ')
  })
})
