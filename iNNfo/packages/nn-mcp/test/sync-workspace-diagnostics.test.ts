import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { collectWorkspaceDiagnostics } from '../src/tools/validate.js'

const rootDir = join(import.meta.dirname!, '..', 'temp-test-sync-diagnostics')

const catalog = (...aliases: string[]): string =>
  `---
level: 3
title: "Sources"
---

# NN Synchronization

${aliases
  .map((alias, i) => `## NN Synchronization: Origin ${i}\nalias:: ${alias}\norigin_uri:: ../origin\nkind:: folder\nstate:: active\n`)
  .join('\n')}`

describe('collectWorkspaceDiagnostics: synchronization catalog', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(join(rootDir, 'sources'), { recursive: true })
  })
  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('reports an invalid and a duplicate alias against the catalog', async () => {
    await writeFile(join(rootDir, 'sources', 'sources_NN.md'), catalog('../x', 'org', 'org'), 'utf-8')
    const diagnostics = await collectWorkspaceDiagnostics(rootDir, null)
    const codes = diagnostics.map((d) => d.code)
    expect(codes).toContain('SYNC_ALIAS_INVALID')
    expect(codes).toContain('SYNC_ALIAS_DUPLICATE')
    expect(diagnostics.every((d) => d.path.startsWith('sources/sources_NN.md#') || d.code !== 'SYNC_ALIAS_INVALID')).toBe(true)
  })

  it('reports nothing for a clean catalog', async () => {
    await writeFile(join(rootDir, 'sources', 'sources_NN.md'), catalog('org', 'finance'), 'utf-8')
    const diagnostics = await collectWorkspaceDiagnostics(rootDir, null)
    expect(diagnostics.filter((d) => d.code?.startsWith('SYNC_'))).toEqual([])
  })

  it('tolerates a mirror folder holding a model', async () => {
    await mkdir(join(rootDir, 'sources', 'sync', 'org'), { recursive: true })
    await writeFile(
      join(rootDir, 'sources', 'sync', 'org', 'organization_NN.md'),
      '---\nlevel: 3\ntitle: "Org"\n---\n\n# NN Role\n\n## NN Role: Gerente\n',
      'utf-8',
    )
    await expect(collectWorkspaceDiagnostics(rootDir, null)).resolves.toBeDefined()
  })
})
