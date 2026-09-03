import { describe, it, expect } from 'vitest'
import {
  recursiveParse,
  validateTaxonomyHierarchy,
  validateDocument,
  extractTemplateSchema,
  parseModel,
} from '../src/index'
import { normalizeElementsIntoGraph } from '../src/recursiveParser/normalize'
import type { DirectoryHandleLike, FileHandleLike } from '../src/fs-types'
import type { ParseContext } from '../src/recursiveParser/types'
import { IdentityRegistry } from '../src/identity'

function createFakeDirectoryHandle(files: Record<string, string>): DirectoryHandleLike {
  const fileHandles = new Map<string, FileHandleLike>()
  for (const [path, content] of Object.entries(files)) {
    const handle: FileHandleLike = {
      kind: 'file',
      name: path.split('/').pop()!,
      getFile: async () => ({ text: async () => content } as File),
    }
    fileHandles.set(path, handle)
  }

  const handle: DirectoryHandleLike = {
    kind: 'directory',
    name: 'root',
    async getFileHandle(name: string) {
      if (fileHandles.has(name)) return fileHandles.get(name)!
      throw Object.assign(new Error(`file not found: ${name}`), { name: 'NotFoundError' })
    },
    async getDirectoryHandle(name: string) {
      const prefix = name + '/'
      const subFiles: Record<string, string> = {}
      let found = false
      for (const [k, v] of Object.entries(files)) {
        if (k.startsWith(prefix)) {
          found = true
          subFiles[k.slice(prefix.length)] = v
        }
      }
      if (found) return createFakeDirectoryHandle(subFiles)
      throw Object.assign(new Error(`directory not found: ${name}`), { name: 'NotFoundError' })
    },
    async *entries() {
      for (const [name] of Object.entries(files)) {
        if (!name.includes('/')) {
          yield [name, { kind: 'file', name }] as [string, FileHandleLike]
        }
      }
    },
  }
  return handle
}

describe('Workspace Taxonomy and Submodels (Phase 1 innfo-core)', () => {
  describe('4.1 Core Parser: Entrypoint resolution & ModelRef path extraction', () => {
    it('loads primary workspace_01.md entrypoint and extracts ModelRef path submodels', async () => {
      const files: Record<string, string> = {
        'workspace_01.md': `---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: workspace_spec_01
  url: https://example.com/workspace_spec_01.md
model_version: V_0-1-0
title: Root Workspace
---
> [!NOTE]
> Workspace root document.

# NN ModelRef

## NN ModelRef: Subsystem A
path:: models/subsystem_a_01.md
status:: active
`,
        'models/subsystem_a_01.md': `---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: subsystem_spec_01
  url: https://example.com/subsystem_spec_01.md
model_version: V_0-1-0
title: Subsystem A
---
# NN Components
## NN Components: Engine
description:: Core engine component.
`,
      }

      const rootHandle = createFakeDirectoryHandle(files)
      const result = await recursiveParse(rootHandle)

      expect(Object.keys(result.nodes).length).toBeGreaterThan(0)
      const rootNode = Object.values(result.nodes).find((n) => n.name === 'workspace_01')
      expect(rootNode).toBeDefined()
      const subNode = Object.values(result.nodes).find((n) => n.name === 'subsystem_a_01')
      expect(subNode).toBeDefined()
      expect(result.issues.filter((i) => i.message.includes('No index.md'))).toHaveLength(0)
    })

    it('falls back to index.md when workspace_NN.md is absent', async () => {
      const files: Record<string, string> = {
        'index.md': `---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: spec_01
  url: https://example.com/spec.md
model_version: V_0-1-0
title: Legacy Index Workspace
---
# NN index
* [[models/subsystem_b_01.md]]
`,
        'models/subsystem_b_01.md': `---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: spec_01
  url: https://example.com/spec.md
model_version: V_0-1-0
title: Subsystem B
---
# NN Components
## NN Components: Widget
`,
      }

      const rootHandle = createFakeDirectoryHandle(files)
      const result = await recursiveParse(rootHandle)

      const subNode = Object.values(result.nodes).find((n) => n.name === 'subsystem_b_01')
      expect(subNode).toBeDefined()
    })

    it('falls back to root directory scan when neither workspace_NN.md nor index.md exists', async () => {
      const files: Record<string, string> = {
        'standalone_01.md': `---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: spec_01
  url: https://example.com/spec.md
model_version: V_0-1-0
title: Standalone Model
---
# NN Components
## NN Components: Solo
`,
      }

      const rootHandle = createFakeDirectoryHandle(files)
      const result = await recursiveParse(rootHandle)

      const soloNode = Object.values(result.nodes).find((n) => n.name === 'standalone_01')
      expect(soloNode).toBeDefined()
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues[0].message).toContain('No index.md found')
    })
  })

  describe('4.2 Core Validation: type:: model concepts and fields', () => {
    it('parses type:: model concept and field definitions cleanly in extractTemplateSchema', () => {
      const templateContent = `---
spec_version: V_1-0-0
level: 2
parent_spec:
  name: iNNfo_V_0-1-0
  url: https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-1-0_NN.md
title: Workspace Template
---
# NN Concept Definition

## NN Concept Definition: ModelRef
type:: model
description:: Submodel reference primitive.

# NN Field Definition

## NN Field Definition: submodel_path
concept:: ModelRef
type:: model
description:: Path to submodel file.
`

      const schema = extractTemplateSchema(parseModel(templateContent))
      const modelRefConcept = schema.concepts.find((c) => c.name === 'ModelRef')
      expect(modelRefConcept).toBeDefined()
      expect(modelRefConcept?.type).toBe('model')

      const pathField = modelRefConcept?.fields?.find((f) => f.name === 'submodel_path')
      expect(pathField).toBeDefined()
      expect(pathField?.type).toBe('model')
    })

    it('validates document containing type:: model fields without unknown-type errors', () => {
      const templateDoc = {
        name: 'workspace_spec_01',
        level: 2 as const,
        frontmatter: {
          spec_version: 'V_1-0-0',
          level: 2,
          parent_spec: { name: 'iNNfo_V_0-1-0', url: 'https://example.com' },
          title: 'Workspace Spec',
        },
        rawContent: `---
spec_version: V_1-0-0
level: 2
parent_spec:
  name: iNNfo_V_0-1-0
  url: https://example.com
title: Workspace Spec
---
# NN Concept Definition
## NN Concept Definition: ModelRef
type:: model

# NN Field Definition
## NN Field Definition: path
concept:: ModelRef
type:: model
`,
      }

      const modelContent = `---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: workspace_spec_01
  url: https://example.com
model_version: V_0-1-0
title: Workspace Model
---
> [!NOTE]
> Workspace model.

# NN ModelRef
## NN ModelRef: Engine
path:: models/engine_01.md
`

      const res = validateDocument(modelContent, {
        fileName: 'workspace_01.md',
        template: templateDoc,
      })

      expect(res.errors.filter((e) => e.message.includes('Invalid concept type') || e.message.includes('Dangling reference'))).toHaveLength(0)
    })
  })

  describe('4.3 Core Taxonomy: Index-free Level 3 models inheriting parent template taxonomy', () => {
    it('inherits taxonomy from parent template in normalizeElementsIntoGraph when # NN index is absent', () => {
      const modelContent = `---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: spec_01
  url: https://example.com
model_version: V_0-1-0
title: Index-Free Model
---
# NN Component
## NN Component: System Core

# NN Subcomponent
## NN Subcomponent: Subsystem Alpha
`

      const parsed = parseModel(modelContent)
      expect(parsed.taxonomy).toHaveLength(0) // No # NN index section

      const parentTemplateTaxonomy = [
        { parent: 'Component', child: 'Subcomponent' },
      ]

      const ctx: ParseContext = { nodes: {}, identity: new IdentityRegistry(), issues: [] }
      normalizeElementsIntoGraph(parsed, 'root_1', 'model_01.md', ctx, parentTemplateTaxonomy)

      const alphaNode = Object.values(ctx.nodes).find((n) => n.name === 'Subsystem Alpha')
      expect(alphaNode).toBeDefined()
    })

    it('validates taxonomy hierarchy cleanly against parent template taxonomy when model has no index section', () => {
      const parsedModel = parseModel(`---
spec_version: V_1-0-0
level: 3
parent_spec:
  name: spec_01
  url: https://example.com
model_version: V_0-1-0
title: Model
---
# NN Component
## NN Component: C1

# NN Subcomponent
## NN Subcomponent: S1
parent_component:: C1
`)

      const templateConcepts = [
        { name: 'Component', type: 'weight' },
        { name: 'Subcomponent', type: 'weight' },
      ]

      const templateTaxonomy = [
        { parent: 'Component', child: 'Subcomponent' },
      ]

      const diags = validateTaxonomyHierarchy(parsedModel, templateConcepts, templateTaxonomy)
      expect(diags).toHaveLength(0)
    })
  })
})
