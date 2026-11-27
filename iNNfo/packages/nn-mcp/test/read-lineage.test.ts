/**
 * `read_lineage` (computed-lineage-view): the read-only view of the domain's
 * computed lineage.
 *
 * Inventory comes from the filesystem, edges and drift from the change log. It
 * writes nothing: the record (`sync_lineage`) is still present until S4b, but
 * nothing in this tool depends on it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { readLineageTool } from '../src/tools/read-lineage.js'
import { toolDefinitions } from '../src/server.js'
import { checkDomain } from '../src/tools/check-workspace.js'

const root = join(import.meta.dirname!, '..', 'temp-test-read-lineage')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const artifactsDir = join(root, 'artifacts')

const MODEL = `---
level: 3
parent_spec:
  name: "TestLab_V_0-1-0"
  url: "specs/TestLab_NN.md"
knowledge_version: "V_0-1-0"
title: "Goal Model"
---

# NN Concept 1
## NN Concept 1: Goal 1
slug:: goal-1
owner:: Bea
`

const CHANGESET = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-6-0"
status: applied
title: "Goal Changes"
applied_at: "2026-10-10T12:00:00.000Z"
---

# NN Change

## NN Change: c-01
op:: update_field
target:: goal@goal-1&owner
to:: Bea
evidence:: sources/import/a.md
`

beforeEach(async () => {
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, changesDir, artifactsDir, join(root, 'sources', 'import')]) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(join(knowledgeDir, 'goal_NN.md'), MODEL, 'utf-8')
  await writeFile(join(changesDir, 'dom_agent_20261010T120000Z_changes_NN.md'), CHANGESET, 'utf-8')
  await writeFile(join(root, 'sources', 'import', 'a.md'), '# A\n', 'utf-8')
  await writeFile(join(artifactsDir, 'Report_20261002T101500Z.md'), '# Report\n', 'utf-8')
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('read_lineage', () => {
  it('is registered and sync_lineage is retired', () => {
    const names = toolDefinitions.map((tool) => tool.name)
    expect(names).toContain('read_lineage')
    expect(names).not.toContain('sync_lineage')
  })

  it('returns the six sections and writes nothing', async () => {
    const before = await readFile(join(knowledgeDir, 'goal_NN.md'), 'utf-8')
    const view = await readLineageTool(root, {})

    // The overview: every section's first page, plus totals and cursors.
    expect(Object.keys(view).sort()).toEqual(
      [
        'artifacts',
        'changes',
        'diagnostics',
        'edges',
        'limit',
        'models',
        'next_cursor',
        'scope',
        'sources',
        'totals',
      ].sort(),
    )
    expect(view.models.map((m) => m.model_ref)).toEqual(['kNNowledge/goal_NN.md'])
    expect(view.changes.map((c) => c.changeset_ref)).toEqual([
      'changes/dom_agent_20261010T120000Z_changes_NN.md',
    ])
    expect(view.edges.some((edge) => edge.kind === 'evidence')).toBe(true)
    expect(view.diagnostics.some((d) => d.code === 'ARTIFACT_WITHOUT_RECORD')).toBe(true)

    expect(await readFile(join(knowledgeDir, 'goal_NN.md'), 'utf-8')).toBe(before)
  })

  it('narrows every section to a focus substring', async () => {
    const view = await readLineageTool(root, { focus: 'kNNowledge' })
    expect(view.models).toHaveLength(1)
    expect(view.artifacts).toEqual([])
    expect(view.changes).toEqual([])
    expect(view.edges.every((edge) => `${edge.from} ${edge.to}`.includes('kNNowledge'))).toBe(true)
  })

  it('keeps superseded evidence only in the all-time scope', async () => {
    const live = await readLineageTool(root, {})
    const allTime = await readLineageTool(root, { scope: 'all-time' })
    expect(allTime.edges.length).toBeGreaterThanOrEqual(live.edges.length)
  })

  it('indexes declared deliverables and execution run artifacts in artifacts', async () => {
    const entregablesDir = join(root, 'entregables', 'acme')
    await mkdir(entregablesDir, { recursive: true })
    await writeFile(join(entregablesDir, 'entregable-acme.md'), '# Deliverable\n', 'utf-8')
    const view = await readLineageTool(root, {})
    expect(
      view.artifacts.some((a) => a.artifact_ref === 'entregables/acme/entregable-acme.md'),
    ).toBe(true)
  })
})

describe('check_domain.provenance carries projection diagnostics', () => {
  it('reports ARTIFACT_WITHOUT_RECORD as a warning', async () => {
    const report = await checkDomain(root, { offline: true })
    const artifact = report.provenance.diagnostics.filter(
      (d) => d.code === 'ARTIFACT_WITHOUT_RECORD',
    )
    expect(artifact).toHaveLength(1)
    expect(artifact[0].severity).toBe('warning')
  })
})
