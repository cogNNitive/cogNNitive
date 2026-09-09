import { describe, it, expect } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(
  here,
  '..',
  '..',
  '..',
  'specs',
  'templates',
  'console',
  'innfo-runtime.js',
)

// nodeRequire aliases Node's require so the browser-first UMD bundle loads in tests.
const nodeRequire = createRequire(import.meta.url)

interface ElementLike {
  id: string
  concept: string
  name: string
  description?: string
  fields?: Record<string, string>
}

interface RuntimeCore {
  parseConfig: (raw: string) => { needs: string[]; runtime: Record<string, string> }
  hasNeed: (config: { needs: string[] }, need: string) => boolean
  parseSlots: (
    schemaRaw: string,
    modelRaw: string,
  ) => { schema: Record<string, unknown>; model: Record<string, unknown> }
  resolveElementId: (concept: string, name: string) => string
  filterElements: (elements: ElementLike[], query: string) => ElementLike[]
  checkStaleness: (
    feedbackVersion: string,
    liveVersion: string,
  ) => { stale: boolean; report: string }
  getDraftKey: (model: string, version: string) => string
  buildExportDoc: (args: {
    meta: Record<string, unknown>
    drafts: Array<Record<string, unknown>>
  }) => { meta: Record<string, unknown>; items: Array<Record<string, unknown>> }
}

function loadCore(): RuntimeCore {
  return nodeRequire(runtimePath) as RuntimeCore
}

const sampleElements: ElementLike[] = [
  {
    id: 'problems-paranormal-infestation',
    concept: 'Problems',
    name: 'Paranormal Infestation',
    description: 'Sites overrun by hostile spectral entities.',
    fields: { severity: 'high' },
  },
  {
    id: 'value-propositions-removal-service',
    concept: 'Value propositions',
    name: 'Removal Service',
    description: 'Rapid response spectral removal.',
    fields: { price: 'premium' },
  },
]

describe('parseConfig / hasNeed (needs[] capability gating)', () => {
  it('parses needs[] and runtime pins from innfo-config JSON', () => {
    const config = loadCore().parseConfig(
      JSON.stringify({ needs: ['feedback-export'], runtime: { cdn: 'https://cdn/x.js' } }),
    )
    expect(config.needs).toEqual(['feedback-export'])
    expect(config.runtime['cdn']).toBe('https://cdn/x.js')
  })

  it('defaults to dormant needs[] on empty or corrupt config', () => {
    expect(loadCore().parseConfig('').needs).toEqual([])
    expect(loadCore().parseConfig('not-json').needs).toEqual([])
  })

  it('gates export UI on the feedback-export need', () => {
    const core = loadCore()
    expect(core.hasNeed({ needs: ['feedback-export'], runtime: {} }, 'feedback-export')).toBe(true)
    expect(core.hasNeed({ needs: [], runtime: {} }, 'feedback-export')).toBe(false)
  })
})

describe('parseSlots (innfo-schema / innfo-model hydration input)', () => {
  it('parses populated schema and model slots', () => {
    const { schema, model } = loadCore().parseSlots(
      JSON.stringify({ concepts: [{ name: 'Problems' }] }),
      JSON.stringify({ meta: { title: 'Ghostbusters' }, elements: [] }),
    )
    expect((schema['concepts'] as unknown[]).length).toBe(1)
    expect((model['meta'] as Record<string, unknown>)['title']).toBe('Ghostbusters')
  })

  it('throws a named error on corrupt slot JSON', () => {
    expect(() => loadCore().parseSlots('{{{', '{}')).toThrow(/schema/i)
    expect(() => loadCore().parseSlots('{}', '{{{')).toThrow(/model/i)
  })
})

describe('resolveElementId (concept + name slug contract)', () => {
  it('matches the procedure id contract', () => {
    expect(loadCore().resolveElementId('Problems', 'Paranormal Infestation')).toBe(
      'problems-paranormal-infestation',
    )
  })

  it('handles multi-word concepts', () => {
    expect(loadCore().resolveElementId('Value propositions', 'Removal Service')).toBe(
      'value-propositions-removal-service',
    )
  })
})

describe('filterElements (console search)', () => {
  it('matches across name, concept, description, and field values', () => {
    const core = loadCore()
    expect(core.filterElements(sampleElements, 'spectral').length).toBe(2)
    expect(core.filterElements(sampleElements, 'premium').map((e) => e.id)).toEqual([
      'value-propositions-removal-service',
    ])
  })

  it('is case-insensitive and returns everything on empty query', () => {
    const core = loadCore()
    expect(core.filterElements(sampleElements, 'PARANORMAL').length).toBe(1)
    expect(core.filterElements(sampleElements, '').length).toBe(2)
  })
})

describe('checkStaleness (apply-feedback guard)', () => {
  it('reports fresh when versions match', () => {
    const result = loadCore().checkStaleness('V_0-2-1', 'V_0-2-1')
    expect(result.stale).toBe(false)
  })

  it('blocks with a report naming both versions on mismatch', () => {
    const result = loadCore().checkStaleness('V_0-2-0', 'V_0-2-1')
    expect(result.stale).toBe(true)
    expect(result.report).toContain('V_0-2-0')
    expect(result.report).toContain('V_0-2-1')
  })
})

describe('getDraftKey / buildExportDoc (localStorage + export modal)', () => {
  it('scopes draft keys per model and version', () => {
    const key = loadCore().getDraftKey('Ghostbusters', 'V_0-2-1')
    expect(key).toContain('ghostbusters')
    expect(key).toContain('v-0-2-1')
    expect(loadCore().getDraftKey('Ghostbusters', 'V_0-2-0')).not.toBe(key)
  })

  it('assembles the export document from meta and drafts', () => {
    const doc = loadCore().buildExportDoc({
      meta: { source_model: 'Ghostbusters' },
      drafts: [{ id: 'fb-001', kind: 'comment', status: 'pending' }],
    })
    expect(doc.meta['source_model']).toBe('Ghostbusters')
    expect(doc.items.length).toBe(1)
    expect(doc.items[0]['id']).toBe('fb-001')
  })
})
