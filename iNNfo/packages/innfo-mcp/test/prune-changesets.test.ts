import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { pruneChangesets } from '../src/tools/prune-changesets.js'

const root = join(import.meta.dirname!, '..', 'temp-test-prune-changesets')
const changesDir = join(root, 'changes')

function changeset(status: string): string {
  return `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "changes"
  url: "specs/changes_V_0-1-0_NN.md"
blueprint_version: "V_0-1-0"
status: ${status}
---

# NN Change

## NN Change: c-01
op:: update_field
target:: m@e&f
to:: x
`
}

const NAMES = {
  proposed: 'm_agent_20261016T120000Z_changes_NN.md',
  conflict: 'm_agent_20261016T120100Z_changes_NN.md',
  partially_applied: 'm_agent_20261016T120200Z_changes_NN.md',
  applied: 'm_agent_20261016T120300Z_changes_NN.md',
  rejected: 'm_agent_20261016T120400Z_changes_NN.md',
  garbage: 'm_agent_20261016T120500Z_changes_NN.md',
}

beforeEach(async () => {
  await rm(root, { recursive: true, force: true })
  await mkdir(changesDir, { recursive: true })
  await mkdir(join(root, 'kNNowledge'), { recursive: true })
  for (const status of ['proposed', 'conflict', 'partially_applied', 'applied', 'rejected'] as const) {
    await writeFile(join(changesDir, NAMES[status]), changeset(status), 'utf-8')
  }
  await writeFile(join(changesDir, NAMES.garbage), 'not a changeset', 'utf-8')
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('pruneChangesets', () => {
  it('never deletes a non-terminal or unreadable changeset', async () => {
    const res = await pruneChangesets(root)
    expect(existsSync(join(changesDir, NAMES.proposed))).toBe(true)
    expect(existsSync(join(changesDir, NAMES.conflict))).toBe(true)
    expect(existsSync(join(changesDir, NAMES.partially_applied))).toBe(true)
    expect(existsSync(join(changesDir, NAMES.garbage))).toBe(true)
    expect(res.kept).toEqual(
      expect.arrayContaining([NAMES.proposed, NAMES.conflict, NAMES.partially_applied, NAMES.garbage]),
    )
  })

  it('deletes unreferenced terminal changesets (applied, rejected)', async () => {
    const res = await pruneChangesets(root)
    expect(res.deleted.sort()).toEqual([NAMES.applied, NAMES.rejected].sort())
    expect(existsSync(join(changesDir, NAMES.applied))).toBe(false)
    expect(existsSync(join(changesDir, NAMES.rejected))).toBe(false)
  })

  it('keeps a terminal changeset that a model cites', async () => {
    await writeFile(
      join(root, 'kNNowledge', 'm_NN.md'),
      `sources:: changes/${NAMES.applied}@## NN Change: c-01\n`,
      'utf-8',
    )
    const res = await pruneChangesets(root)
    expect(res.kept).toContain(NAMES.applied)
    expect(existsSync(join(changesDir, NAMES.applied))).toBe(true)
  })

  it('dry run reports the same set and deletes nothing', async () => {
    const res = await pruneChangesets(root, { dryRun: true })
    expect(res.deleted.sort()).toEqual([NAMES.applied, NAMES.rejected].sort())
    expect(existsSync(join(changesDir, NAMES.applied))).toBe(true)
  })
})
