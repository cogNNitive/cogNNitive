import { describe, it, expect } from 'vitest'
import { readChangeAuthor } from '../src/console/citations.js'
import type { HeadingInfo } from '../src/index.js'

const heading = { line: 0, level: 2, concept: 'NN Change' } as unknown as HeadingInfo

function origin(author: string) {
  return readChangeAuthor(`## NN Change: c1\nauthor:: ${author}\n`, heading)
}

describe('readChangeAuthor origin', () => {
  it('classifies the default changeset author "agent" as an agent', () => {
    expect(origin('agent')).toEqual({ origin: 'agent', author: 'agent' })
  })
  it('still classifies named agent tools as agents', () => {
    expect(origin('ClaudeCode').origin).toBe('agent')
  })
  it('classifies other names as human', () => {
    expect(origin('lucas').origin).toBe('human')
  })
})
