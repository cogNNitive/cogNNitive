import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { syncLineageTool } from './sync-lineage.js'
import {
  checkLineageDrift,
  projectLineage,
  readLineageSnapshot,
  renderLineageSections,
} from '@cognnitive/nn-core'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-sync-lineage')
const importDir = join(rootDir, 'sources', 'import')
const knowledgeDir = join(rootDir, 'kNNowledge')

describe('sync_lineage tool', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(importDir, { recursive: true })
    await mkdir(knowledgeDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('creates a fresh lineage record when none exists', async () => {
    await writeFile(join(importDir, 'doc.md'), '# Doc\n', 'utf-8')
    await writeFile(
      join(importDir, 'doc.md_sidecar_NN.md'),
      '---\nlevel: 3\nsource_file: "sources/import/doc.md"\nsha256: "abc"\n---\n# Overview\n',
      'utf-8',
    )

    const res = await syncLineageTool(rootDir, { projectName: 'Acme' })
    expect(res.status).toBe('created')
    expect(res.sourceCount).toBe(1)
    expect(res.modelCount).toBe(0)
    expect(existsSync(res.recordPath)).toBe(true)

    const content = await readFile(res.recordPath, 'utf-8')
    expect(content).toContain('# NN Sources')
    expect(content).toContain('doc.md')
    expect(content).toContain('# NN Procedures')
  })

  it('refreshes an existing drifted lineage record and restores drift ok: true', async () => {
    // 1. Initial sync
    await writeFile(join(importDir, 'initial.md'), '# Initial\n', 'utf-8')
    await writeFile(
      join(importDir, 'initial.md_sidecar_NN.md'),
      '---\nlevel: 3\nsource_file: "sources/import/initial.md"\nsha256: "123"\n---\n',
      'utf-8',
    )
    const initial = await syncLineageTool(rootDir, { projectName: 'Acme' })
    expect(initial.status).toBe('created')

    // 2. Add a model citing the source
    await writeFile(
      join(knowledgeDir, 'Plan_business_NN.md'),
      '---\nlevel: 3\nknowledge_version: "V_0-1-0"\nparent_spec:\n  name: "business"\ntitle: "Business Plan"\n---\n\n# NN Stakeholders\n\n## NN Stakeholders: Clients\nsources:: [sources/import/initial.md_sidecar_NN.md@## Overview]\n',
      'utf-8',
    )

    // Now check drift: should detect drift because Plan_NN.md is not yet in the lineage record
    const beforeContent = await readFile(initial.recordPath, 'utf-8')
    const renderedBefore = renderLineageSections(projectLineage(readLineageSnapshot(rootDir)))
    const driftBefore = checkLineageDrift(beforeContent, renderedBefore)
    expect(driftBefore.ok).toBe(false)

    // 3. Run syncLineageTool to repair
    const res = await syncLineageTool(rootDir, { projectName: 'Acme' })
    expect(res.status).toBe('refreshed')
    expect(res.modelCount).toBe(1)

    // 4. Drift check is now clean
    const afterContent = await readFile(initial.recordPath, 'utf-8')
    const renderedAfter = renderLineageSections(projectLineage(readLineageSnapshot(rootDir)))
    const driftAfter = checkLineageDrift(afterContent, renderedAfter)
    expect(driftAfter).toEqual({ ok: true })
  })
})
