import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { resolveTemplateWithCache } from '../src/tools/spec.js'
import { buildTemplateSchemaResolverFromCache } from '../src/tools/validate.js'

const rootDir = join(import.meta.dirname!, '..', 'temp-test-schema-cache')
const specsDir = join(rootDir, 'specs')

describe('buildTemplateSchemaResolverFromCache', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('resolves a node\'s composed template schema synchronously from an already-warmed SpecCache, without I/O at call time', async () => {
    const templateContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Business Template"',
      '---',
      '',
      '# NN Concept Definition',
      '## NN Concept Definition: Startup',
      'type:: text',
      '',
      '# NN Field Definition',
      '## NN Field Definition: business_model',
      'concept:: Startup',
      'type:: model',
      'target_template:: sub_business_V_0-1-0',
    ].join('\n')
    await writeFile(join(specsDir, 'business_V_0-1-1_NN.md'), templateContent, 'utf-8')

    const { cache } = await resolveTemplateWithCache(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
    )

    const resolver = buildTemplateSchemaResolverFromCache(cache)
    const schema = resolver({
      path: 'startup_NN.md',
      name: 'startup_NN',
      content: '',
      frontmatter: { parent_spec: { name: 'business_V_0-1-1' } },
    })

    expect(schema).not.toBeNull()
    expect(schema!.concepts[0]!.name).toBe('Startup')
    expect(schema!.concepts[0]!.fields?.[0]!.name).toBe('business_model')
    expect(schema!.concepts[0]!.fields?.[0]!.type).toBe('model')
  })

  it('returns null when the node\'s parent_spec.name is not present in the cache (unknown template)', async () => {
    const templateContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Business Template"',
      '---',
      '',
      '# NN Concept Definition',
      '## NN Concept Definition: Startup',
      'type:: text',
    ].join('\n')
    await writeFile(join(specsDir, 'business_V_0-1-1_NN.md'), templateContent, 'utf-8')

    const { cache } = await resolveTemplateWithCache(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
    )

    const resolver = buildTemplateSchemaResolverFromCache(cache)
    const schema = resolver({
      path: 'unrelated_NN.md',
      name: 'unrelated_NN',
      content: '',
      frontmatter: { parent_spec: { name: 'totally-unknown-template' } },
    })

    expect(schema).toBeNull()
  })

  it('returns null for a null cache (host resolution failed) instead of throwing', () => {
    const resolver = buildTemplateSchemaResolverFromCache(null)
    const schema = resolver({
      path: 'x_NN.md',
      name: 'x_NN',
      content: '',
      frontmatter: { parent_spec: { name: 'business_V_0-1-1' } },
    })
    expect(schema).toBeNull()
  })
})
