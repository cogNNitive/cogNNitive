import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const validModelMd = `---
spec_version: "V_0-1-1"
spec_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Valid Model"
---

# NN Business summary

A valid single-file model.
`

const validIndexMd = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# NN index

* [[modelA_NN.md]]
`

describe('recursiveParser: index.md-driven parser', () => {
  it('parses a workspace with index.md and model file into the graph', async () => {
    const tree: FakeTree = {
      'index.md': validIndexMd,
      'modelA_NN.md': validModelMd,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)
    const names = Object.values(result.nodes).map((n) => n.name)
    expect(names).toContain('modelA')
  })

  it('reports an issue when index.md is missing', async () => {
    const tree: FakeTree = {
      'modelA_NN.md': validModelMd,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].message).toContain('No index.md found')
    expect(result.rootIds).toHaveLength(1)
  })

  it('reports a warning when a wikilink target does not exist', async () => {
    const indexMd = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# NN index

* [[exists_NN.md]]
* [[missing_NN.md]]
`

    const tree: FakeTree = {
      'index.md': indexMd,
      'exists_NN.md': validModelMd,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.rootIds).toHaveLength(1)
    expect(result.nodes[result.rootIds[0]].name).toBe('exists')

    const missingIssues = result.issues.filter((i) => i.message.includes('not found'))
    expect(missingIssues.length).toBeGreaterThan(0)
  })

  it('reports a collision issue when two models share same element name', async () => {
    const modelWithElement = (title: string, elementName: string) => `---
spec_version: "V_0-1-1"
spec_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "${title}"
---

# NN index

* [[${elementName}]]

# NN Components

## NN Components: ${elementName}
Description of ${elementName}.
`

    const indexMd = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# NN index

* [[modelA_NN.md]]
* [[modelB_NN.md]]
`

    const tree: FakeTree = {
      'index.md': indexMd,
      'modelA_NN.md': modelWithElement('Model A', 'Database'),
      'modelB_NN.md': modelWithElement('Model B', 'Database'),
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    const collisionIssues = result.issues.filter((i) => i.message.includes('appears in both'))
    expect(collisionIssues.length).toBeGreaterThan(0)
  })

  it('parses model elements into the normalized graph', async () => {
    const modelWithElements = `---
spec_version: "V_0-1-1"
spec_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Full Model"
---

# NN index

* [[Problems]]
* [[Value propositions]]

# NN Problems

## NN Problems: Alpha
Description of Alpha.
## NN Problems: Beta
Description of Beta.

# NN Value propositions

## NN Value propositions: Gamma
Description of Gamma.
`

    const tree: FakeTree = {
      'index.md': validIndexMd,
      'modelA_NN.md': modelWithElements,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)

    const names = Object.values(result.nodes).map((n) => n.name)
    expect(names).toContain('Alpha')
    expect(names).toContain('Beta')
    expect(names).toContain('Gamma')
  })
})
