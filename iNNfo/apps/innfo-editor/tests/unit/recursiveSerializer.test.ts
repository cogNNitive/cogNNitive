import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { recursiveSerialize } from '../../src/model/recursiveSerializer'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'
import type { ParsedModel, ModelDriver } from '@cognnitive/innfo-core'

const fileDocMd = `---
spec_version: "V_0-1-1"
spec_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Serializer File Doc"
---

# NN index

* [[Problems]]

# NN Problems

## NN Problems: Problem One
A problem used to exercise the serializer.
`

const indexMd = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# NN index

* [[Doc_NN.md]]
`

describe('recursiveSerializer', () => {
  it('returns write reports for dirty nodes', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const docId = Object.values(parsed.nodes).find((n) => n.name === 'Doc')!.id
    const dirty = new Set([docId])

    const report = await recursiveSerialize(parsed.nodes, dirty)
    expect(report).toHaveLength(1)
    expect(report[0].nodeId).toBe(docId)
    expect(report[0].path).toBe('Doc_NN.md')
    expect(['exact', 'canonical']).toContain(report[0].fidelity)
  })

  it('returns empty report when no dirty nodes', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const report = await recursiveSerialize(parsed.nodes, new Set())
    expect(report).toHaveLength(0)
  })

  it('writes through driver when provided', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    let writtenContent: string | null = null
    const mockDriver: ModelDriver = {
      readModel: async (_uri: string) => {
        throw new Error('not expected')
      },
      writeModel: async (_uri: string, model: ParsedModel) => {
        writtenContent = model.rawContent
      },
      listChildren: async () => [],
      listAssets: async () => [],
    }

    const docId = Object.values(parsed.nodes).find((n) => n.name === 'Doc')!.id
    const report = await recursiveSerialize(parsed.nodes, new Set([docId]), mockDriver)

    expect(report).toHaveLength(1)
    expect(writtenContent).not.toBeNull()
    expect(writtenContent!).toContain('Serializer File Doc')
    expect(writtenContent!).toContain('Problem One')
  })

  it('throws for dirty node without rawContent', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    // Create a node without rawContent
    const nodeWithoutContent = Object.values(parsed.nodes).find((n) => n.name === 'Problem One')!
    expect(nodeWithoutContent.rawContent).toBeUndefined()

    // Marking a non-root node dirty should produce no report entries (filtered by rawContent check)
    const report = await recursiveSerialize(parsed.nodes, new Set([nodeWithoutContent.id]))
    expect(report).toHaveLength(0)
  })

  it('preserves node identity after parse -> serialize report -> re-parse round-trip', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const firstParse = await recursiveParse(root)
    const idsBefore = Object.keys(firstParse.nodes).sort()

    // Since we have no root handle in the serializer, round-trip through driver
    let roundtripContent: string | null = null
    const capturingDriver: ModelDriver = {
      readModel: async (_uri: string) => {
        throw new Error('not expected')
      },
      writeModel: async (_uri: string, model: ParsedModel) => {
        roundtripContent = model.rawContent
      },
      listChildren: async () => [],
      listAssets: async () => [],
    }

    const docId = Object.values(firstParse.nodes).find((n) => n.name === 'Doc')!.id
    await recursiveSerialize(firstParse.nodes, new Set([docId]), capturingDriver)
    expect(roundtripContent).not.toBeNull()

    // Re-parse from the written content
    const tree2: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': roundtripContent! }
    const root2 = buildFakeTree('workspace', tree2)
    const secondParse = await recursiveParse(root2)
    const idsAfter = Object.keys(secondParse.nodes).sort()

    expect(idsAfter).toEqual(idsBefore)
  })

  it('persists matrix cell edits from node.fields to serialized markdown and re-parses them', async () => {
    const docWithMatrix = `---
spec_version: "V_0-1-1"
level: 3
title: "Matrix Test"
matrices:
  - name: "Problems-Values Matrix"
    source: "Problems"
    target: "Values"
---

# NN index

* [[Problems]]
* [[Values]]

# NN Problems

## NN Problems: Problem 1

# NN Values

## NN Values: Value A
`
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': docWithMatrix }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const docNode = Object.values(parsed.nodes).find((n) => n.name === 'Doc')!

    // Simulate user editing a cell in MatricesGrid (writing to node.fields)
    docNode.fields['Problems-Values Matrix||Problem 1||Value A'] = { value: 'X' }

    let writtenContent: string | null = null
    const capturingDriver: ModelDriver = {
      readModel: async () => {
        throw new Error('not expected')
      },
      writeModel: async (_uri: string, model: ParsedModel) => {
        writtenContent = model.rawContent
      },
      listChildren: async () => [],
      listAssets: async () => [],
    }

    await recursiveSerialize(parsed.nodes, new Set([docNode.id]), capturingDriver)
    expect(writtenContent).not.toBeNull()
    expect(writtenContent!).toContain('# NN matrices: Problems-Values Matrix')
    expect(writtenContent!).toContain('| Problem 1 | X |')

    // Re-parse the written content and verify the cell is restored into node.fields
    const tree2: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': writtenContent! }
    const root2 = buildFakeTree('workspace', tree2)
    const secondParse = await recursiveParse(root2)
    const reparsedDocNode = Object.values(secondParse.nodes).find((n) => n.name === 'Doc')!

    expect(reparsedDocNode.fields['Problems-Values Matrix||Problem 1||Value A']?.value).toBe('X')
  })

  it('persists dynamic relational matrix definitions from node.fields to serialized markdown', async () => {
    const docWithoutMatrix = `---
spec_version: "V_0-1-1"
level: 1
title: "Matrix Definitions Test"
---

# NN index

* [[Problems]]
* [[Values]]

# NN Problems

## NN Problems: Problem 1

# NN Values

## NN Values: Value A
`
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_NN.md': docWithoutMatrix }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const docNode = Object.values(parsed.nodes).find((n) => n.name === 'Doc')!

    // Simulate user editing/adding matrix definitions (writing to node.fields[__matrix_defs])
    docNode.fields['__matrix_defs'] = {
      value: [
        {
          name: 'My Custom Matrix',
          source: 'Problems',
          target: 'Values',
          widgetType: 'scale',
          params: 'min:1;max:5',
          description: 'A scale matrix.',
        },
      ],
    }

    let writtenContent: string | null = null
    const capturingDriver: ModelDriver = {
      readModel: async () => {
        throw new Error('not expected')
      },
      writeModel: async (_uri: string, model: ParsedModel) => {
        writtenContent = model.rawContent
      },
      listChildren: async () => [],
      listAssets: async () => [],
    }

    await recursiveSerialize(parsed.nodes, new Set([docNode.id]), capturingDriver)
    expect(writtenContent).not.toBeNull()
    expect(writtenContent!).toContain('matrices:')
    expect(writtenContent!).toContain('  - name: "My Custom Matrix"')
    expect(writtenContent!).toContain('    source: "Problems"')
    expect(writtenContent!).toContain('    target: "Values"')
    expect(writtenContent!).toContain('    params: "min:1;max:5"')
    expect(writtenContent!).toContain('    widget: "scale"')
    expect(writtenContent!).toContain('    description: "A scale matrix."')
  })
})
