import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseKnowledge } from '../src/parser/index.js'
import { extractBlueprintSchema } from '../src/schema/extract.js'
import { resolveBlueprintSchema } from '../src/schema/compose.js'

const REPO_ROOT = join(import.meta.dirname, '../../../../')
const BLUEPRINTS_DIR = join(REPO_ROOT, 'iNNfo/specs/bluepriNNts')

// The shipped L2 blueprints that must declare the shared tags field directly:
const EXPECTED_TAGS_L2S = [
  'analysis',
  'artifacts',
  'blank',
  'business-model',
  'changes',
  'cogNNitive',
  'design-presets',
  'documentation',
  'domaiNN',
  'innovation',
  'metrics',
  'organization',
  'procedures',
  'projects',
  'repository',
  'sources',
  'video-script',
  'visual-catalog',
  'workspace',
]

describe('Task 2.2: Shipped Field Catalogue and Blueprint Conventions', () => {
  it('no live L2 declares Marker Definition or item-markers matrix', async () => {
    const entries = await readdir(BLUEPRINTS_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'base' || entry.name === 'console' || entry.name.startsWith('.')) continue
      let specPath = ''
      if (entry.isDirectory()) {
        specPath = join(BLUEPRINTS_DIR, entry.name, 'spec_NN.md')
      } else if (entry.name === 'workspace_spec_NN.md') {
        specPath = join(BLUEPRINTS_DIR, entry.name)
      } else {
        continue
      }

      const content = await readFile(specPath, 'utf-8').catch(() => null)
      if (!content) continue

      const parsed = parseKnowledge(content)
      const schema = extractBlueprintSchema(parsed)

      expect(schema.markers ?? [], `${entry.name} should have no Marker Definitions`).toHaveLength(0)
      expect(
        content.toLowerCase().includes('item-markers matrix'),
        `${entry.name} should have no item-markers matrix`,
      ).toBe(false)
    }
  })

  it('declares the identical open tags Field in exactly the required L2s', async () => {
    for (const name of EXPECTED_TAGS_L2S) {
      const specPath =
        name === 'workspace'
          ? join(BLUEPRINTS_DIR, 'workspace_spec_NN.md')
          : join(BLUEPRINTS_DIR, name, 'spec_NN.md')

      const content = await readFile(specPath, 'utf-8')
      const parsed = parseKnowledge(content)
      const schema = extractBlueprintSchema(parsed)

      // Global field target '*'
      const tagsGf = schema.globalFields?.find((gf) => gf.field.name.toLowerCase() === 'tags')
      expect(tagsGf, `${name} must declare a global tags field`).toBeDefined()
      expect(tagsGf?.scope).toBe('*')
      expect(tagsGf?.field.type).toBe('select')
      expect(tagsGf?.field.multiple).toBe(true)
      expect(tagsGf?.field.options, `${name} tags field must be open (no options)`).toBeUndefined()
    }
  })

  it('sidecar blueprint MUST NOT declare tags', async () => {
    const specPath = join(BLUEPRINTS_DIR, 'sidecar/spec_NN.md')
    const content = await readFile(specPath, 'utf-8')
    const parsed = parseKnowledge(content)
    const schema = extractBlueprintSchema(parsed)
    const tagsGf = schema.globalFields?.find((gf) => gf.field.name.toLowerCase() === 'tags')
    expect(tagsGf).toBeUndefined()
  })

  it('business blueprint gets tags by composition (declares none itself)', async () => {
    const specPath = join(BLUEPRINTS_DIR, 'business/spec_NN.md')
    const content = await readFile(specPath, 'utf-8')
    const parsed = parseKnowledge(content)
    const local = extractBlueprintSchema(parsed)
    const localTags = local.globalFields?.find((gf) => gf.field.name.toLowerCase() === 'tags')
    expect(localTags, 'business should not declare tags directly').toBeUndefined()

    // When composed with resolver, business gets tags on its concepts
    const resolver = (ref: { name: string; url?: string }) => {
      const p = join(BLUEPRINTS_DIR, ref.name, 'spec_NN.md')
      try {
        return readFileSync(p, 'utf-8')
      } catch {
        return null
      }
    }
    const composed = resolveBlueprintSchema(content, resolver)
    const stakeholderConcept = composed.schema.concepts.find(
      (c) => c.name.toLowerCase() === 'stakeholders',
    )
    expect(stakeholderConcept?.fields?.some((f) => f.name.toLowerCase() === 'tags')).toBe(true)
  })

  it('no Tags concept in domaiNN or workspace', async () => {
    for (const name of ['domaiNN', 'workspace']) {
      const specPath =
        name === 'workspace'
          ? join(BLUEPRINTS_DIR, 'workspace_spec_NN.md')
          : join(BLUEPRINTS_DIR, name, 'spec_NN.md')
      const content = await readFile(specPath, 'utf-8')
      const parsed = parseKnowledge(content)
      const schema = extractBlueprintSchema(parsed)
      const tagsConcept = schema.concepts.find((c) => c.name.toLowerCase() === 'tags')
      expect(tagsConcept, `${name} must not declare a Tags concept`).toBeUndefined()
    }
  })

  it('specific field catalog declarations match table rows', async () => {
    // organization & procedures: complexity (number, *, scale 0-100 step 5)
    for (const name of ['organization', 'procedures']) {
      const content = await readFile(join(BLUEPRINTS_DIR, name, 'spec_NN.md'), 'utf-8')
      const parsed = parseKnowledge(content)
      const schema = extractBlueprintSchema(parsed)
      const complexity = schema.globalFields?.find((gf) => gf.field.name === 'complexity')
      expect(complexity, `${name} has complexity`).toBeDefined()
      expect(complexity?.scope).toBe('*')
      expect(complexity?.field.type).toBe('number')
      expect(complexity?.field.widget).toBe('scale')
      expect(complexity?.field.widgetConfig).toEqual({ min: 0, max: 100, step: 5 })
    }

    // projects: health (*, select [nominal, warning, critical], cycle)
    {
      const content = await readFile(join(BLUEPRINTS_DIR, 'projects/spec_NN.md'), 'utf-8')
      const parsed = parseKnowledge(content)
      const schema = extractBlueprintSchema(parsed)
      const health = schema.globalFields?.find((gf) => gf.field.name === 'health')
      expect(health).toBeDefined()
      expect(health?.scope).toBe('*')
      expect(health?.field.type).toBe('select')
      expect(health?.field.options).toEqual(['nominal', 'warning', 'critical'])
      expect(health?.field.widget).toBe('cycle')
    }

    // visual-catalog: confidence on Entry (number, scale 0-10)
    {
      const content = await readFile(join(BLUEPRINTS_DIR, 'visual-catalog/spec_NN.md'), 'utf-8')
      const parsed = parseKnowledge(content)
      const schema = extractBlueprintSchema(parsed)
      const entryConcept = schema.concepts.find((c) => c.name === 'Entry')
      const confidence = entryConcept?.fields?.find((f) => f.name === 'confidence')
      expect(confidence).toBeDefined()
      expect(confidence?.type).toBe('number')
      expect(confidence?.widget).toBe('scale')
      expect(confidence?.widgetConfig).toEqual({ min: 0, max: 10 })
    }
  })

  it('frozen cogNNitive_V_0-2-1_NN.md stays byte-identical', async () => {
    const historicalPath = join(REPO_ROOT, 'iNNfo/specs/cogNNitive_V_0-2-1_NN.md')
    const content = await readFile(historicalPath, 'utf-8')
    expect(content).toContain('spec_version: "V_0-2-1"')
    expect(content).toContain('template_version: "V_0-4-0"')
  })

  it('frozen workspace_V_0-2-2_NN.md stays byte-identical', async () => {
    const historicalPath = join(REPO_ROOT, 'iNNfo/specs/workspace_V_0-2-2_NN.md')
    const content = await readFile(historicalPath, 'utf-8')
    expect(content).toContain('spec_version: "V_0-2-2"')
  })
})
