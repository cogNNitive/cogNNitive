import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHANGE_OPS } from '../../src/changeset/types.js'

/**
 * changeset-document-model: the `changes` bluepriNNt states the guarantee the seal
 * gives (an integrity check, never tamper-proofing), lists `set_fields`, and
 * documents the batch-wide execution facts the changes inherit.
 */

const SPEC = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'specs', 'bluepriNNts', 'changes', 'spec_NN.md'), 'utf-8')

function section(heading: string): string {
  const start = SPEC.indexOf(`## ${heading}\n`)
  expect(start, heading).toBeGreaterThan(-1)
  const rest = SPEC.slice(start + heading.length + 4)
  const end = rest.search(/^## /m)
  return end === -1 ? rest : rest.slice(0, end)
}

describe('the changes bluepriNNt text', () => {
  it('describes the seal as an integrity check, never as tamper-proof', () => {
    for (const heading of ['Philosophy', 'Objectives']) {
      const text = section(heading)
      expect(text, heading).not.toMatch(/tamper-proof|detect tampering|cryptographic/i)
    }
    expect(section('Philosophy')).toMatch(/integrity check/i)
    expect(section('Objectives')).toMatch(/integrity check against accidental modification/i)
  })

  it('keeps one Objectives bullet per line', () => {
    for (const line of section('Objectives').split('\n')) {
      expect(line.slice(1)).not.toMatch(/\.- /)
    }
  })

  it('lists every op of the closed set, set_fields included', () => {
    const options = /^## NN Field Definition: op\n[\s\S]*?^options:: \[(.*)\]$/m.exec(SPEC)![1]!.split(', ')
    expect(options).toContain('set_fields')
    const listed = /^- op: One of (.*)\.$/m.exec(SPEC)![1]!.split(', ')
    expect(listed).toContain('set_fields')
    expect(SPEC).toMatch(/^- set_fields: /m)
    for (const op of CHANGE_OPS) {
      if (op === 'review_gate') continue
      expect(options, op).toContain(op)
    }
  })

  it('documents the batch-wide execution facts in the frontmatter', () => {
    const spec = section('Specification')
    expect(spec).toMatch(/frontmatter/)
    for (const key of ['applied_at', 'batch', 'status', 'evidence_sha256']) expect(spec).toContain(key)
    expect(spec).toMatch(/inherit/)
  })
})
