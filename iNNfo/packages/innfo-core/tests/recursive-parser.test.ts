import { describe, it, expect } from 'vitest'
import type { DirectoryHandleLike, FileHandleLike } from '../src/fs-types'
import { recursiveParse, normalizeSingleModel } from '../src/recursiveParser'

/* ── Fake handle helpers ─────────────────────────────────────── */

type DirEntries = Array<[string, FileHandleLike | DirectoryHandleLike]>

function fakeDir(name: string, entries: DirEntries): DirectoryHandleLike {
  const fileMap = new Map<string, FileHandleLike>()
  const dirMap = new Map<string, DirectoryHandleLike>()
  for (const [entryName, entry] of entries) {
    if (entry.kind === 'file') {
      fileMap.set(entryName, entry)
    } else {
      dirMap.set(entryName, entry)
    }
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

function md(frontmatter: Record<string, unknown>, body?: string): string {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')
  return `---\n${fm}\n---\n${body ?? ''}`
}

const BASE_FM = {
  spec_version: 'V_0-1-2',
  level: 3,
  model_version: 'V_0-0-1',
  parent: { name: 'business_V_0-1-1', url: 'https://example.com/business' },
}

function makeModel(title: string, body?: string): string {
  return md({ ...BASE_FM, title }, body)
}

function makeIndex(wikilinks: string[]): string {
  const items = wikilinks.map((w) => `* [[${w}]]`).join('\n')
  return `---\nspec_version: "V_0-1-2"\nlevel: 0\ntitle: "Workspace Index"\n---\n\n# NN index\n\n${items}\n`
}

function makeIndexWithMdLinks(links: string[]): string {
  const items = links.map((p) => `* [${p}](./${p})`).join('\n')
  return `---\nspec_version: "V_0-1-2"\nlevel: 0\ntitle: "Workspace Index"\n---\n\n# NN index\n\n${items}\n`
}

/* ── Tests ───────────────────────────────────────────────────── */

describe('recursiveParse (index.md-driven)', () => {
  describe('FR-001: Workspace with valid index.md', () => {
    it('parses a single model listed in index.md', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['gb_NN.md']))],
        ['gb_NN.md', fakeFile('gb_NN.md', makeModel('Ghostbusters'))],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(1)
      const rootNode = result.nodes[result.rootIds[0]]
      expect(rootNode).toBeDefined()
      expect(rootNode.name).toBe('gb')
      expect(rootNode.kind).toBe('root')
      expect(result.issues).toHaveLength(0)
    })

    it('parses multiple models listed in index.md', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_NN.md', 'modelB_NN.md']))],
        ['modelA_NN.md', fakeFile('modelA_NN.md', makeModel('Model A'))],
        ['modelB_NN.md', fakeFile('modelB_NN.md', makeModel('Model B'))],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(2)
      const names = result.rootIds.map((id) => result.nodes[id].name).sort()
      expect(names).toEqual(['modelA', 'modelB'])
      expect(result.issues).toHaveLength(0)
    })

    it('parses models with elements into a normalized graph', async () => {
      const modelContent = makeModel(
        'Test Model',
        `
# NN index

* [[Problems]]

# NN Problems

## NN Problems: Problem One
  Description of problem one.
## NN Problems: Problem Two
  Description of problem two.
`,
      )

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['test_NN.md']))],
        ['test_NN.md', fakeFile('test_NN.md', modelContent)],
      ])

      const result = await recursiveParse(root)
      expect(result.issues).toHaveLength(0)
      expect(Object.keys(result.nodes).length).toBeGreaterThan(1)

      // Elements should exist in the graph
      const problemOne = Object.values(result.nodes).find((n) => n.name === 'Problem One')
      expect(problemOne).toBeDefined()
      expect(problemOne!.kind).toBe('element')
    })
  })

  describe('FR-001: Missing index.md', () => {
    it('scans for standalone _NN.md files when index.md is missing', async () => {
      const root = fakeDir('workspace', [
        ['gb_NN.md', fakeFile('gb_NN.md', makeModel('Ghostbusters'))],
      ])

      const result = await recursiveParse(root)
      // The model should still be loaded via the fallback scan
      expect(result.rootIds).toHaveLength(1)
      const rootNode = result.nodes[result.rootIds[0]]
      expect(rootNode).toBeDefined()
      expect(rootNode.name).toBe('gb')
      // The missing index.md issue is still reported as the first warning (downgraded when models found)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues[0].message).toContain('No index.md found')
    })

    it('loads multiple standalone _NN.md files when index.md is missing', async () => {
      const root = fakeDir('workspace', [
        ['modelA_NN.md', fakeFile('modelA_NN.md', makeModel('Model A'))],
        ['modelB_NN.md', fakeFile('modelB_NN.md', makeModel('Model B'))],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(2)
      const names = result.rootIds.map((id) => result.nodes[id].name).sort()
      expect(names).toEqual(['modelA', 'modelB'])
      expect(result.issues[0].message).toContain('No index.md found')
    })

    it('returns empty when no .md files with iNNfo frontmatter exist and index.md is missing', async () => {
      const root = fakeDir('workspace', [['readme.md', fakeFile('readme.md', '# Just a readme')]])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(0)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues[0].message).toContain('Missing index.md')
    })

    it('loads models with plain .md filenames (no _NN suffix)', async () => {
      const root = fakeDir('workspace', [
        [
          'DeLorean_Time_Travel.md',
          fakeFile('DeLorean_Time_Travel.md', makeModel('Time Travel Procedure')),
        ],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(1)
      const rootNode = result.nodes[result.rootIds[0]]
      expect(rootNode.name).toBe('DeLorean_Time_Travel')
      expect(rootNode.type).toBe('Time Travel Procedure')
      expect(result.issues[0].message).toContain('No index.md found')
    })

    it('skips .md files without iNNfo frontmatter (no spec_version)', async () => {
      const root = fakeDir('workspace', [
        [
          'not-a-model.md',
          fakeFile('not-a-model.md', '# Just markdown\n\nNo YAML frontmatter here.'),
        ],
        ['real-model.md', fakeFile('real-model.md', makeModel('Real Model'))],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(1)
      expect(result.nodes[result.rootIds[0]].name).toBe('real-model')
    })

    it('reports an issue when a _NN.md file exists but has invalid frontmatter', async () => {
      const root = fakeDir('workspace', [
        [
          'broken_V_1-0-0_business_NN.md',
          fakeFile(
            'broken_V_1-0-0_business_NN.md',
            'X---\nspec_version: "V_0-2-0"\ntitle: "Broken"\n---\n\n# NN Business summary\n\ntext',
          ),
        ],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(0)
      const brokenIssues = result.issues.filter((i) => i.message.includes('spec_version'))
      expect(brokenIssues).toHaveLength(1)
      expect(brokenIssues[0].path).toBe('broken_V_1-0-0_business_NN.md')
    })
  })

  describe('FR-001: Wikilink to non-existent model', () => {
    it('emits a warning and skips missing file', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['exists_NN.md', 'missing_NN.md']))],
        ['exists_NN.md', fakeFile('exists_NN.md', makeModel('Exists'))],
      ])

      const result = await recursiveParse(root)
      // Only one model should be loaded
      expect(result.rootIds).toHaveLength(1)
      expect(result.nodes[result.rootIds[0]].name).toBe('exists')

      // Warning for missing file
      const missingIssues = result.issues.filter((i) => i.message.includes('not found'))
      expect(missingIssues.length).toBeGreaterThan(0)
      expect(missingIssues[0].path).toBe('missing_NN.md')
    })
  })

  describe('FR-001: index.md references with nested paths', () => {
    it('resolves a wikilink pointing into a subdirectory', async () => {
      const modelsDir = fakeDir('models', [
        ['nested_NN.md', fakeFile('nested_NN.md', makeModel('Nested Model'))],
      ])
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['./models/nested_NN.md']))],
        ['models', modelsDir],
      ])

      const result = await recursiveParse(root)
      expect(result.issues).toHaveLength(0)
      expect(result.rootIds).toHaveLength(1)
      expect(result.nodes[result.rootIds[0]].name).toBe('nested')
    })

    it('resolves markdown-link references with ./ paths (films index.md case)', async () => {
      const nnDir = fakeDir('nn', [
        [
          'Casablanca.md',
          fakeFile('Casablanca.md', '# Casablanca\n\nPlain source document, not a model.'),
        ],
        [
          'The_Goonies.md',
          fakeFile('The_Goonies.md', '# The Goonies\n\nPlain source document, not a model.'),
        ],
      ])
      const modelsDir = fakeDir('models', [
        [
          'FilmCatalog_V_0-3-0_film_NN.md',
          fakeFile('FilmCatalog_V_0-3-0_film_NN.md', makeModel('Film Catalog')),
        ],
      ])
      const sourcesDir = fakeDir('sources', [['nn', nnDir]])
      const root = fakeDir('workspace', [
        [
          'index.md',
          fakeFile(
            'index.md',
            makeIndexWithMdLinks([
              'sources/nn/Casablanca.md',
              'sources/nn/The_Goonies.md',
              'models/FilmCatalog_V_0-3-0_film_NN.md',
            ]),
          ),
        ],
        ['sources', sourcesDir],
        ['models', modelsDir],
      ])

      const result = await recursiveParse(root)
      // Plain source docs are skipped silently; only the real model is loaded.
      expect(result.issues).toHaveLength(0)
      expect(result.rootIds).toHaveLength(1)
      expect(result.nodes[result.rootIds[0]].name).toBe('FilmCatalog_V_0-3-0_film')
    })

    it('resolves `_source_NN.md` files inside a `sources/` subdirectory (current films workspace)', async () => {
      const sourcesDir = fakeDir('sources', [
        [
          'Singin_in_the_Rain_source_NN.md',
          fakeFile('Singin_in_the_Rain_source_NN.md', makeModel('Singin Source')),
        ],
        [
          'Casablanca_source_NN.md',
          fakeFile('Casablanca_source_NN.md', makeModel('Casablanca Source')),
        ],
        [
          'The_Goonies_source_NN.md',
          fakeFile('The_Goonies_source_NN.md', makeModel('Goonies Source')),
        ],
        [
          'Una_noche_en_la_opera_source_NN.md',
          fakeFile('Una_noche_en_la_opera_source_NN.md', makeModel('Opera Source')),
        ],
      ])
      const modelsDir = fakeDir('models', [
        [
          'FilmCatalog_V_0-3-0_film_NN.md',
          fakeFile('FilmCatalog_V_0-3-0_film_NN.md', makeModel('Film Catalog')),
        ],
      ])
      const root = fakeDir('films', [
        [
          'index.md',
          fakeFile(
            'index.md',
            makeIndexWithMdLinks([
              'sources/Singin_in_the_Rain_source_NN.md',
              'sources/Casablanca_source_NN.md',
              'sources/The_Goonies_source_NN.md',
              'sources/Una_noche_en_la_opera_source_NN.md',
              'film_V_0-5-0_NN.md',
              'models/FilmCatalog_V_0-3-0_film_NN.md',
            ]),
          ),
        ],
        ['film_V_0-5-0_NN.md', fakeFile('film_V_0-5-0_NN.md', makeModel('Film Template'))],
        ['sources', sourcesDir],
        ['models', modelsDir],
      ])

      const result = await recursiveParse(root)
      // No "Name is not allowed" — every nested reference resolves through its directory.
      expect(result.issues.filter((i) => i.message.includes('Name is not allowed'))).toHaveLength(0)
      // All 4 sources + template + catalog model register as roots.
      expect(result.rootIds).toHaveLength(6)
      const names = result.rootIds.map((id) => result.nodes[id].name)
      expect(names).toEqual(
        expect.arrayContaining([
          'Singin_in_the_Rain_source',
          'Casablanca_source',
          'The_Goonies_source',
          'Una_noche_en_la_opera_source',
          'FilmCatalog_V_0-3-0_film',
        ]),
      )
    })

    it('resolves backslash-separated references on the same shape as forward slashes', async () => {
      const modelsDir = fakeDir('models', [
        ['nested_NN.md', fakeFile('nested_NN.md', makeModel('Nested Model'))],
      ])
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['models\\nested_NN.md']))],
        ['models', modelsDir],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(1)
      expect(result.nodes[result.rootIds[0]].name).toBe('nested')
    })

    it('reports a clear skip issue when a nested target directory is missing', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['./models/missing_NN.md']))],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(0)
      const missingIssue = result.issues.find((i) => i.message.includes('not found'))
      expect(missingIssue).toBeDefined()
      expect(missingIssue!.path).toBe('./models/missing_NN.md')
    })

    it('does not surface "Name is not allowed" for references that escape the root', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['../outside_NN.md']))],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(0)
      const messages = result.issues.map((i) => i.message)
      expect(messages.some((m) => m.includes('Name is not allowed'))).toBe(false)
      expect(messages.some((m) => m.includes('not found'))).toBe(true)
    })
  })

  describe('FR-005: Unique element names across workspace', () => {
    it('reports collision when two models have same element name', async () => {
      const modelA = makeModel(
        'Model A',
        `
# NN index

* [[Database]]

# NN Components

## NN Components: Database
  The database component.
`,
      )

      const modelB = makeModel(
        'Model B',
        `
# NN index

* [[Database]]

# NN Components

## NN Components: Database
  Another database component.
`,
      )

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_NN.md', 'modelB_NN.md']))],
        ['modelA_NN.md', fakeFile('modelA_NN.md', modelA)],
        ['modelB_NN.md', fakeFile('modelB_NN.md', modelB)],
      ])

      const result = await recursiveParse(root)

      // Both root nodes should exist
      expect(result.rootIds).toHaveLength(2)

      // Collision should be detected (both elements named "Database" across models)
      const collisionIssues = result.issues.filter((i) => i.message.includes('appears in both'))
      expect(collisionIssues.length).toBeGreaterThan(0)
      expect(collisionIssues[0].message).toContain('"Database"')
      expect(collisionIssues[0].message).toContain('modelA')
      expect(collisionIssues[0].message).toContain('modelB')
    })

    it('no collision when all element names are unique across models', async () => {
      const modelA = makeModel(
        'Model A',
        `
# NN index

* [[Users]]

# NN Components

## NN Components: Users
  User management.
`,
      )

      const modelB = makeModel(
        'Model B',
        `
# NN index

* [[Orders]]

# NN Components

## NN Components: Orders
  Order management.
`,
      )

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_NN.md', 'modelB_NN.md']))],
        ['modelA_NN.md', fakeFile('modelA_NN.md', modelA)],
        ['modelB_NN.md', fakeFile('modelB_NN.md', modelB)],
      ])

      const result = await recursiveParse(root)
      expect(result.rootIds).toHaveLength(2)
      const elementNames = Object.values(result.nodes)
        .filter((n) => n.kind === 'element')
        .map((n) => n.name)
      expect(elementNames).toEqual(expect.arrayContaining(['Users', 'Orders']))
    })
  })
})

describe('normalizeSingleModel', () => {
  it('parses a single model file directly and returns normalized nodes and issues', () => {
    const modelContent = makeModel(
      'Standalone Model',
      `
# NN index

* [[SingleNode]]

# NN Concepts

## NN Concepts: SingleNode
  Description of single node.
`,
    )
    const { nodes, issues } = normalizeSingleModel(
      modelContent,
      'standalone_NN.md',
      'standalone_NN',
    )
    expect(issues).toHaveLength(0)

    const rootId = 'standalone_NN'
    expect(nodes[rootId]).toBeDefined()
    expect(nodes[rootId].kind).toBe('root')
    expect(nodes[rootId].name).toBe('standalone_NN')

    const elementNode = Object.values(nodes).find((n) => n.name === 'SingleNode')
    expect(elementNode).toBeDefined()
    expect(elementNode!.kind).toBe('element')
  })

  it('returns empty nodes when content is not a model (missing spec_version)', () => {
    const plainMarkdown =
      '# Standalone Document\n\nThis is not a model because it has no spec_version in frontmatter.'
    const { nodes, issues } = normalizeSingleModel(plainMarkdown, 'doc.md', 'doc')
    expect(issues).toHaveLength(0)
    expect(Object.keys(nodes)).toHaveLength(0)
  })

  it('propagates text-concept content into the root node rawSections', () => {
    const modelContent = makeModel(
      'Text Model',
      `
# NN index

* [[Market size]]

# NN Market size

En España fallecieron 439.146 personas en 2024 (INE).

**TAM:** ~500.000 procesos de reparto anuales.
`,
    )
    const { nodes, issues } = normalizeSingleModel(modelContent, 'text_NN.md', 'text_NN')
    expect(issues).toHaveLength(0)

    const rootNode = nodes['text_NN']
    expect(rootNode).toBeDefined()
    expect(rootNode.rawSections).toBeDefined()
    expect(rootNode.rawSections!['Market size']).toContain(
      'En España fallecieron 439.146 personas en 2024 (INE).',
    )
  })

  it('reports an issue when a _NN-named file lacks valid iNNfo frontmatter', () => {
    const broken =
      'X---\nspec_version: "V_0-1-2"\ntitle: "Broken"\n---\n\n# NN Business summary\n\ntext'
    const { nodes, issues } = normalizeSingleModel(broken, 'broken_NN.md', 'broken_NN')
    expect(Object.keys(nodes)).toHaveLength(0)
    expect(issues.some((i) => i.message.includes('spec_version'))).toBe(true)
    expect(issues.some((i) => i.path === 'broken_NN.md')).toBe(true)
  })

  it('resolves a matrix relationship whose header differs only by dash character, emitting a warning issue (Fix 3)', () => {
    const modelContent =
      '---\n' +
      'spec_version: "V_0-1-2"\n' +
      'level: 3\n' +
      'model_version: "V_0-0-1"\n' +
      'title: "Dash Test"\n' +
      'parent: { name: "business_V_0-1-1", url: "https://example.com/business" }\n' +
      'matrices:\n' +
      '  - name: "revenue-roles matrix"\n' +
      '    source: "Work"\n' +
      '    target: "Roles"\n' +
      '---\n' +
      '\n' +
      '# NN index\n' +
      '* [[Revenue-Cost Structure]]\n' +
      '* [[Reviewer]]\n' +
      '\n' +
      '# NN Work\n' +
      '## NN Work: Revenue-Cost Structure\n' +
      '\n' +
      '# NN Roles\n' +
      '## NN Roles: Reviewer\n' +
      '\n' +
      '# NN matrices: revenue-roles matrix\n' +
      '| Work \\ Roles | Reviewer |\n' +
      '| --- | --- |\n' +
      '| Revenue—Cost Structure | ✅ |\n'

    const { nodes, issues } = normalizeSingleModel(modelContent, 'dash_NN.md', 'dash_NN')

    const warning = issues.find((i) => i.message.includes('separator character differs'))
    expect(warning).toBeDefined()
    expect(issues.some((i) => i.message.toLowerCase().includes('dangling'))).toBe(false)

    const sourceNode = Object.values(nodes).find((n) => n.name === 'Revenue-Cost Structure')
    expect(sourceNode).toBeDefined()
    expect(sourceNode!.relationships.length).toBeGreaterThan(0)
    expect(sourceNode!.relationships[0].label).toBe('revenue-roles matrix')
  })
})
