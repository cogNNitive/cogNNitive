import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DirectoryHandleLike, FileHandleLike } from '../src/fs-types'
import type { BlueprintSchema } from '../src/schema'
import { extractBlueprintSchema } from '../src/schema'
import { parseKnowledge } from '../src/parser'
import { recursiveParse } from '../src/recursiveParser'

/**
 * A3: fields whose schema declares `type:: citation` must reach `node.sources`
 * and the relationship graph the same way name-based `sources::` fields do —
 * additively, via a second pass that runs after `childNode.templateSchema` is
 * stashed (design.md D3). Exercised at the `recursiveParse` level per
 * tasks.md A3.1: `roundtrip-fidelity.test.ts` never touches `recursiveParse`
 * and cannot stand in as evidence for this behavior.
 */

type DirEntries = Array<[string, FileHandleLike | DirectoryHandleLike]>

function fakeDir(name: string, entries: DirEntries): DirectoryHandleLike {
  const fileMap = new Map<string, FileHandleLike>()
  const dirMap = new Map<string, DirectoryHandleLike>()
  for (const [entryName, entry] of entries) {
    if (entry.kind === 'file') fileMap.set(entryName, entry)
    else dirMap.set(entryName, entry)
  }
  return {
    kind: 'directory',
    name,
    entries: async function* () {
      for (const e of entries) yield e
    },
    getFileHandle: async (fileName: string) => {
      const found = fileMap.get(fileName)
      if (!found) throw Object.assign(new Error('File not found'), { code: 'ENOENT' })
      return found
    },
    getDirectoryHandle: async (dirName: string) => {
      const found = dirMap.get(dirName)
      if (!found) throw Object.assign(new Error('Directory not found'), { code: 'ENOENT' })
      return found
    },
  }
}

function fakeFile(name: string, content: string): FileHandleLike {
  return {
    kind: 'file',
    name,
    getFile: async () => ({ text: async () => content }),
  }
}

function makeIndex(links: string[]): string {
  const items = links.map((p) => `* [${p}](./${p})`).join('\n')
  return `---\nspec_version: "V_0-1-2"\nlevel: 0\ntitle: "Workspace Index"\n---\n\n# NN index\n\n${items}\n`
}

const BASE_FM = `spec_version: "V_0-1-2"\nlevel: 3\nknowledge_version: "V_0-0-1"\nparent:\n  name: "business_V_0-1-1"\n  url: "https://example.com/business"`

function planModel(propertyLine: string): string {
  return [
    '---',
    BASE_FM,
    'title: "Pricing Plan"',
    '---',
    '',
    '# NN Producto',
    '',
    '## NN Producto: Widget',
    propertyLine,
    '',
  ].join('\n')
}

const PRODUCTO_SCHEMA: BlueprintSchema = {
  concepts: [
    {
      name: 'Producto',
      type: 'category',
      fields: [{ name: 'precio_source', type: 'citation' as never }],
    },
  ],
  markers: [],
  matrices: [],
  taxonomy: [],
}

describe('attachSchemaTypedCitations (wired through recursiveParse)', () => {
  it('fills node.sources and adds an origin:"source" relationship for a schema-typed citation field', async () => {
    const root = fakeDir('workspace', [
      ['domaiNN_NN.md', fakeFile('domaiNN_NN.md', makeIndex(['plan_NN.md']))],
      [
        'plan_NN.md',
        fakeFile('plan_NN.md', planModel('precio_source:: sources/nn/pricing.md@## Q3 Pricing')),
      ],
    ])

    const result = await recursiveParse(root, undefined, {
      resolveBlueprintSchema: () => PRODUCTO_SCHEMA,
    })

    const widget = Object.values(result.nodes).find((n) => n.name === 'Widget')
    expect(widget).toBeDefined()
    expect(widget!.sources?.map((s) => s.filePath)).toEqual(['sources/nn/pricing.md'])
    const sourceEdges = widget!.relationships.filter((r) => r.origin === 'source')
    expect(sourceEdges).toEqual([
      { targetId: 'sources/nn/pricing.md', label: 'precio_source', origin: 'source' },
    ])
  })

  it('does not double-count a field that is already matched by the name-based path', async () => {
    const schemaWithSourcesAsCitation: BlueprintSchema = {
      concepts: [
        {
          name: 'Producto',
          type: 'category',
          fields: [{ name: 'sources', type: 'citation' as never }],
        },
      ],
      markers: [],
      matrices: [],
      taxonomy: [],
    }
    const root = fakeDir('workspace', [
      ['domaiNN_NN.md', fakeFile('domaiNN_NN.md', makeIndex(['plan_NN.md']))],
      ['plan_NN.md', fakeFile('plan_NN.md', planModel('sources:: sources/nn/pricing.md@## Q3 Pricing'))],
    ])

    const result = await recursiveParse(root, undefined, {
      resolveBlueprintSchema: () => schemaWithSourcesAsCitation,
    })

    const widget = Object.values(result.nodes).find((n) => n.name === 'Widget')
    expect(widget!.sources).toHaveLength(1)
    expect(widget!.relationships.filter((r) => r.origin === 'source')).toHaveLength(1)
  })

  it('fills node.sources for a schema-typed citation field declared directly on the entrypoint model', async () => {
    // Regression test: the entrypoint model (workspace_NN.md) is registered
    // via parseAndRegisterKnowledge BEFORE the worklist loop starts, and its own
    // path never passes through that loop's `resolvedPath` gate — so schema-
    // typed citation fields defined directly on the entrypoint were silently
    // dropped until the fix in workspace.ts (right after entrypointSchema is
    // computed).
    const entrypoint = [
      '---',
      BASE_FM,
      'title: "Workspace Entrypoint"',
      '---',
      '',
      '# NN Producto',
      '',
      '## NN Producto: Widget',
      'precio_source:: sources/nn/pricing.md@## Q3 Pricing',
      '',
    ].join('\n')

    const root = fakeDir('workspace', [['domaiNN_NN.md', fakeFile('domaiNN_NN.md', entrypoint)]])

    const result = await recursiveParse(root, undefined, {
      resolveBlueprintSchema: () => PRODUCTO_SCHEMA,
    })

    const widget = Object.values(result.nodes).find((n) => n.name === 'Widget')
    expect(widget).toBeDefined()
    expect(widget!.sources?.map((s) => s.filePath)).toEqual(['sources/nn/pricing.md'])
    const sourceEdges = widget!.relationships.filter((r) => r.origin === 'source')
    expect(sourceEdges).toEqual([
      { targetId: 'sources/nn/pricing.md', label: 'precio_source', origin: 'source' },
    ])
  })

  it('leaves the graph unchanged when no template schema resolves', async () => {
    const root = fakeDir('workspace', [
      ['domaiNN_NN.md', fakeFile('domaiNN_NN.md', makeIndex(['plan_NN.md']))],
      [
        'plan_NN.md',
        fakeFile('plan_NN.md', planModel('precio_source:: sources/nn/pricing.md@## Q3 Pricing')),
      ],
    ])

    const result = await recursiveParse(root)

    const widget = Object.values(result.nodes).find((n) => n.name === 'Widget')
    expect(widget).toBeDefined()
    expect(widget!.sources).toBeUndefined()
    expect(widget!.relationships.filter((r) => r.origin === 'source')).toHaveLength(0)
  })
})

/**
 * `visual-catalog` is the blueprint this change ships. Its `Entry.source` and
 * `Evidence.source` fields are declared `type:: citation`, so a Level-3 catalog
 * adopting it must have those values typed onto the graph exactly as any other
 * citation field. The schema is read from the REAL shipped blueprint package,
 * so this fails (RED) until `visual-catalog/spec_NN.md` exists.
 */
const repoBlueprintsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
)
const visualCatalogSpecPath = join(repoBlueprintsDir, 'visual-catalog', 'spec_NN.md')

describe('visual-catalog blueprint citation fields (real package)', () => {
  it('declares Entry.source and Evidence.source as citation and types both onto the graph', async () => {
    expect(existsSync(visualCatalogSpecPath)).toBe(true)

    const schema = extractBlueprintSchema(parseKnowledge(readFileSync(visualCatalogSpecPath, 'utf8')))
    expect(schema.concepts.find((c) => c.name === 'Entry')?.fields?.find((f) => f.name === 'source')?.type).toBe(
      'citation',
    )
    expect(
      schema.concepts.find((c) => c.name === 'Evidence')?.fields?.find((f) => f.name === 'source')?.type,
    ).toBe('citation')

    const model = [
      '---',
      BASE_FM,
      'title: "Visual Catalog"',
      '---',
      '',
      '# NN Entry',
      '',
      '## NN Entry: Museum Pass',
      'source:: sources/nn/photo.md@## Capture',
      '',
      '# NN Evidence',
      '',
      '## NN Evidence: Photo A',
      'source:: sources/nn/photo.md@## Capture',
      '',
    ].join('\n')

    const root = fakeDir('workspace', [
      ['domaiNN_NN.md', fakeFile('domaiNN_NN.md', makeIndex(['catalog_NN.md']))],
      ['catalog_NN.md', fakeFile('catalog_NN.md', model)],
    ])

    const result = await recursiveParse(root, undefined, { resolveBlueprintSchema: () => schema })

    const entry = Object.values(result.nodes).find((n) => n.name === 'Museum Pass')
    const evidence = Object.values(result.nodes).find((n) => n.name === 'Photo A')
    expect(entry!.sources?.map((s) => s.filePath)).toEqual(['sources/nn/photo.md'])
    expect(entry!.relationships.filter((r) => r.origin === 'source')).toEqual([
      { targetId: 'sources/nn/photo.md', label: 'source', origin: 'source' },
    ])
    expect(evidence!.sources?.map((s) => s.filePath)).toEqual(['sources/nn/photo.md'])
    expect(evidence!.relationships.filter((r) => r.origin === 'source')).toEqual([
      { targetId: 'sources/nn/photo.md', label: 'source', origin: 'source' },
    ])
  })
})
