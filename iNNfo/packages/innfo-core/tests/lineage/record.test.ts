import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { readLineageSnapshot } from '../../src/lineage/fs-snapshot.js'
import { projectLineage } from '../../src/lineage/project.js'
import { roleOf } from '../../src/naming/contract.js'
import { createFsSourceResolver, resolveCitation } from '../../src/index.js'

const CHANGESET_FILENAME = 'ws_reviewer_20261010T120000Z_changes_NN.md'

const CHANGESET = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-2-0"
status: applied
title: "Review"
author: "reviewer"
---

# NN index

* [[Change]]

# NN Change

## NN Change: fb-001
op:: comment
target:: strategy@vision&statement
notes:: "please review the vision"
`

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Work
## NN Work: Vision
statement:: Accelerate green energy
`

describe('lineage record — changesets as lineage nodes', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'innfo-lineage-changeset-'))
    fs.mkdirSync(path.join(tempDir, 'changes'), { recursive: true })
    fs.mkdirSync(path.join(tempDir, 'kNNowledge'), { recursive: true })
    fs.writeFileSync(path.join(tempDir, 'changes', CHANGESET_FILENAME), CHANGESET)
    fs.writeFileSync(path.join(tempDir, 'kNNowledge', 'strategy_NN.md'), MODEL)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('an L3 changes document has role changeset', () => {
    expect(
      roleOf({ path: `changes/${CHANGESET_FILENAME}`, parentSpecName: 'changes' }),
    ).toBe('changeset')
  })

  it('projects the changeset as a lineage node', () => {
    const snapshot = readLineageSnapshot(tempDir)
    expect(snapshot.map((s) => s.path)).toContain(`changes/${CHANGESET_FILENAME}`)

    const projection = projectLineage(snapshot)
    expect(projection.changesets.map((c) => c.changeset_ref)).toContain(
      `changes/${CHANGESET_FILENAME}`,
    )
    expect(projection.changesets[0]?.changes).toContain('fb-001')
  })

  it('resolves a citation into a change block', () => {
    const resolver = createFsSourceResolver(tempDir)
    const resolved = resolveCitation(
      `changes/${CHANGESET_FILENAME}@## NN Change: fb-001`,
      'sources',
      resolver,
      path.join(tempDir, 'changes', CHANGESET_FILENAME),
    )
    expect(resolved.exists).toBe(true)
    expect(resolved.error).toBeUndefined()
  })
})
