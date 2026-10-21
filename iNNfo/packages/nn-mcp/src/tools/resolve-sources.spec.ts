import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readdir } from 'node:fs/promises'
import { resolveSources, EXCERPT_CHAR_CAP } from './resolve-sources'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-resolve-sources')
const specsDir = join(rootDir, 'specs')

/** Local level-1/level-0 chain so template resolution never hits the network. */
async function stubSpecChain() {
  await writeFile(
    join(specsDir, 'iNNfo_V_0-1-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-1-0"',
      'level: 1',
      'title: "Local iNNfo Spec"',
      'parent_spec:',
      '  name: "defiNNe_V_0-1-0"',
      '  url: "https://example.com/defiNNe_V_0-1-0_NN.md"',
      '---',
    ].join('\n'),
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNe_V_0-1-0_NN.md'),
    ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "Local defiNNe Spec"', '---'].join('\n'),
    'utf-8',
  )
}

/** A local level-2 template declaring `precio_source` as `type:: citation`. */
async function stubPricingTemplate() {
  await writeFile(
    join(specsDir, 'pricing_V_0-1-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-1-0"',
      'level: 2',
      'title: "Local Pricing Template"',
      'parent_spec:',
      '  name: "iNNfo_V_0-1-0"',
      '  url: "https://example.com/iNNfo_V_0-1-0_NN.md"',
      '---',
      '',
      '# NN Concept Definition',
      '',
      '## NN Concept Definition: Producto',
      'type:: category',
      '',
      '# NN Field Definition',
      '',
      '## NN Field Definition: precio_source',
      'concept:: Producto',
      'type:: citation',
      '',
    ].join('\n'),
    'utf-8',
  )
  await stubSpecChain()
}

async function writeWorkspace(): Promise<void> {
  await mkdir(join(rootDir, 'models'), { recursive: true })
  await mkdir(join(rootDir, 'sources', 'import'), { recursive: true })

  await writeFile(
    join(rootDir, 'models', 'Plan_V_1-0-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-1-0"',
      'level: 3',
      'knowledge_version: "V_1-0-0"',
      'parent_spec:',
      '  name: "pricing_V_0-1-0"',
      '  url: "https://example.com/pricing_V_0-1-0_NN.md"',
      '---',
      '',
      '# NN Producto',
      '',
      '## NN Producto: Widget',
      'sources:: sources/import/pricing.md@## Q3 Pricing',
      'precio_source:: sources/import/pricing.md@## Q3 Pricing',
      'dangling_source:: sources/import/missing.md@## Ghost',
      'unknown_anchor_source:: sources/import/report.md@## Nonexistent Heading',
      'long_source:: sources/import/long.md@## Long Section',
      'short_source:: sources/import/short.md@## Short Section',
      'agent_known_source:: sources/import/change-agent-known.md@## NN Change: c-01',
      'agent_unknown_marker_source:: sources/import/change-agent-unknown.md@## NN Change: c-01',
      'agent_missing_author_source:: sources/import/change-agent-missing.md@## NN Change: c-01',
      'human_source:: sources/import/change-human.md@## NN Change: c-01',
      'nested_source:: sources/import/change-nested.md@### Sub Detail',
      'sibling_source:: sources/import/change-sibling.md@## Sibling Heading',
      'document_source:: sources/import/plain-doc.md@## Plain Heading',
      'frontmatter_author_source:: sources/import/author-doc.md@## Authored Heading',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'pricing.md'),
    [
      '---',
      'sha256: "abc123"',
      '---',
      '',
      '## Q3 Pricing',
      'Widget priced at $42 for Q3.',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'report.md'),
    ['---', 'sha256: "def456"', '---', '', '## Some Other Heading', 'Unrelated content.', ''].join(
      '\n',
    ),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'long.md'),
    ['---', 'sha256: "longhash"', '---', '', '## Long Section', 'x'.repeat(2000), ''].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'short.md'),
    ['---', 'sha256: "shorthash"', '---', '', '## Short Section', 'y'.repeat(120), ''].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'change-agent-known.md'),
    [
      '## NN Change: c-01',
      '',
      'op:: update_field',
      'target:: Plan@Widget&precio_source',
      'author:: ClaudeCode',
      'notes:: "agent authored"',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'change-agent-unknown.md'),
    [
      '## NN Change: c-01',
      '',
      'op:: update_field',
      'target:: Plan@Widget&precio_source',
      'author:: _',
      'notes:: "unknown"',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'change-agent-missing.md'),
    [
      '## NN Change: c-01',
      '',
      'op:: update_field',
      'target:: Plan@Widget&precio_source',
      'notes:: "no author line"',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'change-human.md'),
    [
      '## NN Change: c-01',
      '',
      'op:: update_field',
      'target:: Plan@Widget&precio_source',
      'author:: Maria Lopez',
      'notes:: "human authored"',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'change-nested.md'),
    [
      '## NN Change: c-01',
      '',
      'op:: update_field',
      'target:: Plan@Widget&precio_source',
      'author:: ClaudeCode',
      'notes:: "nested"',
      '',
      '### Sub Detail',
      '',
      'More detail text goes here.',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'change-sibling.md'),
    [
      '## NN Change: c-01',
      '',
      'op:: update_field',
      'target:: Plan@Widget&precio_source',
      'author:: ClaudeCode',
      'notes:: "sibling"',
      '',
      '## Sibling Heading',
      '',
      'Text here that is separate from the change block above.',
      '',
    ].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'plain-doc.md'),
    ['---', 'sha256: "plaindoc1"', '---', '', '## Plain Heading', 'Just prose.', ''].join('\n'),
    'utf-8',
  )

  await writeFile(
    join(rootDir, 'sources', 'import', 'author-doc.md'),
    [
      '---',
      'sha256: "authordoc1"',
      'author: "Jane Reviewer"',
      '---',
      '',
      '## Authored Heading',
      'A plain document with a frontmatter author.',
      '',
    ].join('\n'),
    'utf-8',
  )
}

describe('resolve_sources', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    await writeWorkspace()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('resolves a valid citation with excerpt and sha256', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'sources',
    })
    expect(results).toHaveLength(1)
    expect(results[0].path).toBe('sources/import/pricing.md')
    expect(results[0].anchor).toBe('q3-pricing')
    expect(results[0].exists).toBe(true)
    expect(results[0].sha256).toBe('abc123')
    expect(results[0].excerpt).toContain('Widget priced at $42 for Q3.')
    expect(results[0].excerpt!.length).toBeLessThanOrEqual(EXCERPT_CHAR_CAP)
  })

  it('filters by fieldName so only that field is resolved', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'precio_source',
    })
    expect(results).toHaveLength(1)
    expect(results[0].path).toBe('sources/import/pricing.md')
  })

  it('reports a dangling file without throwing', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'dangling_source',
    })
    expect(results).toHaveLength(1)
    expect(results[0].exists).toBe(false)
    expect(results[0].error).toBe('DANGLING_FILE')
    expect(results[0].excerpt).toBeUndefined()
    expect(results[0].sha256).toBeUndefined()
    expect(results[0].version).toBeUndefined()
  })

  it('reports an unknown anchor within an existing file', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'unknown_anchor_source',
    })
    expect(results).toHaveLength(1)
    expect(results[0].exists).toBe(true)
    expect(results[0].error).toBe('UNKNOWN_ANCHOR')
  })

  it('resolves a schema-typed non-sources field with an explicit fieldName, standalone (no A3 schema needed)', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'precio_source',
    })
    expect(results).toHaveLength(1)
    expect(results[0].exists).toBe(true)
  })

  it('resolves schema-typed citation fields when fieldName is omitted, without any network fetch or file writes', async () => {
    await stubPricingTemplate()
    const fetchSpy = vi.spyOn(global, 'fetch')
    const before = await snapshotFiles()

    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    const after = await snapshotFiles()
    expect(after).toEqual(before)

    const paths = results.map((r) => r.path)
    // Both the name-based `sources` field and the schema-typed `precio_source`
    // field resolve to the same target here, so the same path appears twice —
    // once per field — proving both selection paths fired.
    expect(paths.filter((p) => p === 'sources/import/pricing.md')).toHaveLength(2)
  })

  it('truncates a long section to the excerpt cap', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'long_source',
    })
    expect(results).toHaveLength(1)
    expect(results[0].excerpt!.length).toBeLessThanOrEqual(EXCERPT_CHAR_CAP)
    expect(results[0].truncated).toBe(true)
  })

  it('returns a short section in full, uncapped', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'short_source',
    })
    expect(results).toHaveLength(1)
    expect(results[0].excerpt).toContain('y'.repeat(120))
    expect(results[0].excerpt!.length).toBeLessThan(EXCERPT_CHAR_CAP)
    expect(results[0].truncated).toBeUndefined()
  })

  it('every returned entry carries a field key', async () => {
    const results = await resolveSources(rootDir, {
      model: 'Plan_V_1-0-0',
      elementId: 'Widget',
      fieldName: 'sources',
    })
    expect(results).toHaveLength(1)
    expect(results[0].field).toBe('sources')
  })

  describe('origin classification', () => {
    it('classifies a known agent tool id in a NN Change author as agent', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'agent_known_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('agent')
      expect(results[0].author).toBe('ClaudeCode')
    })

    it('classifies an unfilled author marker (_) as agent with author "unknown"', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'agent_unknown_marker_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('agent')
      expect(results[0].author).toBe('unknown')
    })

    it('classifies a missing author:: line as agent with author "unknown"', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'agent_missing_author_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('agent')
      expect(results[0].author).toBe('unknown')
    })

    it('classifies an unrecognized name inside a NN Change block as human', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'human_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('human')
      expect(results[0].author).toBe('Maria Lopez')
    })

    it('classifies a sub-heading nested under a NN Change block via ancestor walk', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'nested_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('agent')
      expect(results[0].author).toBe('ClaudeCode')
    })

    it('classifies a sibling heading of a NN Change block as document', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'sibling_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('document')
    })

    it('never yields a reviewer origin: a frontmatter-authored document heading is document', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'frontmatter_author_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('document')
      expect(results[0].author).toBeUndefined()
    })

    it('classifies a plain document heading as document, without crashing', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'document_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('document')
    })

    it('classifies a dangling file as document, without a throw', async () => {
      const results = await resolveSources(rootDir, {
        model: 'Plan_V_1-0-0',
        elementId: 'Widget',
        fieldName: 'dangling_source',
      })
      expect(results).toHaveLength(1)
      expect(results[0].origin).toBe('document')
    })

  })
})

async function snapshotFiles(): Promise<string[]> {
  const out: string[] = []
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else out.push(full)
    }
  }
  await walk(rootDir)
  return out.sort()
}
