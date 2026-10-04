import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { listKnowledge } from './list-read'
import { syncWorkspaceManifest } from './workspace-sync'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-sidecar-exclusion')

function doc(parent: string, title: string): string {
  return ['---', 'level: 3', 'parent_spec:', `  name: "${parent}"`, `title: "${title}"`, '---', '', '# Body'].join('\n')
}

async function seed(files: Record<string, string>): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(join(rootDir, rel, '..'), { recursive: true })
    await writeFile(join(rootDir, rel), content, 'utf-8')
  }
}

describe('sidecars are never models in MCP discovery', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(rootDir, { recursive: true })
    await seed({
      'domaiNN_NN.md': '# NN Models\n',
      'kNNowledge/Acme_business_NN.md': doc('business_V_0-2-0', 'Acme Business Model'),
      'sources/import/report.pdf_sidecar_NN.md': doc('sidecar', 'Report Sidecar'),
      'sources/import/prices.csv_sidecar_NN.md': doc('business_V_0-2-0', 'Prices Sidecar'),
      'staging/Draft_business_NN.md': doc('business_V_0-2-0', 'Staged Draft'),
    })
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('list_knowledge lists only the real model', async () => {
    const ids = (await listKnowledge(rootDir)).map((m) => m.id)
    expect(ids).toEqual(['Acme_business_NN'])
  })

  it('workspace sync proposes only the real model for ## NN Models', async () => {
    const result = await syncWorkspaceManifest(rootDir, { dry_run: true })
    expect(result.changes).toEqual([
      { kind: 'added', path: 'kNNowledge/Acme_business_NN.md', name: 'Acme Business Model' },
    ])
  })
})
