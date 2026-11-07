import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { buildChangeLog, isChangesetPath } from '../../src/changelog/load.js'
import { readLineageSnapshot } from '../../src/lineage/fs-snapshot.js'

const CHANGESET = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: applied
author: "lucas"
applied_at: "2026-10-10T12:00:00.000Z"
---

# NN Change

## NN Change: c-01
op:: update_field
target:: m@goal-1&owner
to:: Ana
evidence:: decision
`

const KNOWLEDGE = '---\nlevel: 3\nparent_spec:\n  name: business\n---\n# Strategy'
const SIDECAR = '---\nlevel: 3\nparent_spec:\n  name: sidecar\n---\n'

describe('changesets copied under the root sources/ folder', () => {
  it('is not a changeset path', () => {
    expect(isChangesetPath('sources/import/org/x_agent_20261010T120000Z_changes_NN.md')).toBe(false)
    expect(isChangesetPath('Sources/sync/org/x_changes_NN.md')).toBe(false)
  })

  it('still accepts a changeset under changes/', () => {
    expect(isChangesetPath('changes/x_agent_20261010T120000Z_changes_NN.md')).toBe(true)
  })

  it('contributes nothing to the change log', () => {
    const log = buildChangeLog([
      { path: 'sources/import/org/x_agent_20261010T120000Z_changes_NN.md', content: CHANGESET },
    ])
    expect(log.all).toEqual([])
    const real = buildChangeLog([{ path: 'changes/x_agent_20261010T120000Z_changes_NN.md', content: CHANGESET }])
    expect(real.all.map((c) => c.id)).toEqual(['c-01'])
  })
})

describe('readLineageSnapshot and the mirror folder', () => {
  let tempDir: string
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-sync-snapshot-'))
  })
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('prunes sources/sync but keeps sources/import, sidecars and changes/', () => {
    const files: Record<string, string> = {
      'sources/sync/org/organization_NN.md': KNOWLEDGE,
      'sources/sync/org/teams/ops_NN.md': KNOWLEDGE,
      'sources/import/org/report.pdf_sidecar_NN.md': SIDECAR,
      'sources/import/metrics.csv': 'a,b\n1,2',
      'changes/x_agent_20261010T120000Z_changes_NN.md': CHANGESET,
      'kNNowledge/Strategy_NN.md': KNOWLEDGE,
    }
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(tempDir, rel)
      fs.mkdirSync(path.dirname(full), { recursive: true })
      fs.writeFileSync(full, content)
    }
    expect(readLineageSnapshot(tempDir).map((s) => s.path)).toEqual([
      'changes/x_agent_20261010T120000Z_changes_NN.md',
      'kNNowledge/Strategy_NN.md',
      'sources/import/metrics.csv',
      'sources/import/org/report.pdf_sidecar_NN.md',
    ])
  })
})
