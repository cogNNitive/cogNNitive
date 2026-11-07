import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractBlueprintSchemaFromContent } from '../src/schema/extract.js'

const BP = join(import.meta.dirname, '../../../specs/bluepriNNts')
const load = (name: string) => readFileSync(join(BP, name, 'spec_NN.md'), 'utf-8')

const fieldsOf = (content: string, concept: string) => {
  const schema = extractBlueprintSchemaFromContent(content)
  const found = schema.concepts.find((c) => c.name === concept)
  return { found, fields: new Map((found?.fields ?? []).map((f) => [f.name, f])) }
}

describe('sources blueprint: Synchronization concept', () => {
  const { found, fields } = fieldsOf(load('sources'), 'Synchronization')

  it('declares the Synchronization concept', () => {
    expect(found).toBeDefined()
  })

  it('declares alias, origin_uri, kind and state', () => {
    expect([...fields.keys()]).toEqual(expect.arrayContaining(['alias', 'kind', 'state']))
    expect(fields.get('kind')?.options).toEqual(['file', 'folder'])
    expect(fields.get('state')?.options).toEqual(['active', 'paused'])
  })

  it('shares origin_uri between Source and Synchronization', () => {
    const shared = extractBlueprintSchemaFromContent(load('sources')).globalFields?.find(
      (g) => g.field.name === 'origin_uri',
    )
    expect(shared?.scope).toBe('list')
    expect(shared?.targets).toEqual(['Source', 'Synchronization'])
  })
})

describe('sidecar blueprint: origin keys', () => {
  const content = load('sidecar')
  const { fields } = fieldsOf(content, 'Sidecar')

  it('declares the four origin keys', () => {
    expect([...fields.keys()]).toEqual(
      expect.arrayContaining(['synchronization', 'origin_path', 'origin_uri', 'retrieved_at']),
    )
  })

  it('does not declare the legacy download keys', () => {
    expect(content).not.toMatch(/source_url/)
    expect(content).not.toMatch(/downloaded_at/)
  })
})
