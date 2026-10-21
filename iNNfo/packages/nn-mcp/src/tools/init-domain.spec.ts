import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { parseKnowledge } from '@cognnitive/nn-core'
import { initDomain } from './init-domain'
import { checkDomain } from './check-workspace'
import { validateKnowledge } from './validate'
import { applyChange } from './apply-change'
import { proposeChangeset } from './propose-changeset'
import { SPEC_L0, SPEC_L1 } from '../../test/helpers/scaffold-fixtures'

const base = join(import.meta.dirname!, '..', '..', 'temp-test-init-domain')
const domainDir = join(base, 'acme-domain')
const DOMAIN_SPEC = readFileSync(
  join(import.meta.dirname!, '..', '..', '..', '..', 'specs', 'bluepriNNts', 'domaiNN', 'spec_NN.md'),
  'utf-8',
)
const BUSINESS = `---
blueprint_version: "V_0-2-0"
level: 2
title: "Local Business"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "https://example.com/iNNfo_V_0-3-0_NN.md"
---

# NN Concept Definition

## NN Concept Definition: Work
type:: list
`

/** Offline specs for the domain created by the tool (written AFTER init: it needs an empty dir). */
async function stubSpecs(root: string) {
  const specs = join(root, 'specs')
  await mkdir(specs, { recursive: true })
  await writeFile(join(specs, 'iNNfo_V_0-3-0_NN.md'), SPEC_L1, 'utf-8')
  await writeFile(join(specs, 'defiNNition_V_0-1-0_NN.md'), SPEC_L0, 'utf-8')
  await writeFile(join(specs, 'domaiNN_NN.md'), DOMAIN_SPEC, 'utf-8')
  await writeFile(join(specs, 'business_V_0-2-0_NN.md'), BUSINESS, 'utf-8')
}

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(base, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(base, { recursive: true, force: true })
  await mkdir(base, { recursive: true })
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(base, { recursive: true, force: true })
})

describe('init_domain', () => {
  it('scaffolds an empty conformant domaiNN', async () => {
    const result = await initDomain(domainDir, 'ACME')
    expect(result.success).toBe(true)
    expect(result.workspace_id).toBe('acme')

    for (const dir of ['kNNowledge', 'sources/import', 'sources/conversations', 'conversations', 'artifacts', 'procedures', 'staging', 'changes']) {
      expect((await stat(join(domainDir, dir))).isDirectory(), dir).toBe(true)
    }
    expect(await readFile(join(domainDir, '.gitattributes'), 'utf-8')).toBe('* -text\n')
    expect((await readdir(domainDir)).filter((f) => f.endsWith('.tmp'))).toEqual([])

    await stubSpecs(domainDir)
    const report = await checkDomain(domainDir, { offline: true })
    const text = JSON.stringify(report)
    expect(text).not.toMatch(/"severity":"error"/)

    const validation = await validateKnowledge(domainDir, 'domaiNN')
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
    const manifest = parseKnowledge(await readFile(join(domainDir, 'domaiNN_NN.md'), 'utf-8'))
    expect(manifest.frontmatter.parent_spec?.name).toBe('domaiNN')
  })

  it('refuses a non-empty directory and writes nothing', async () => {
    await mkdir(domainDir, { recursive: true })
    await writeFile(join(domainDir, 'notes.txt'), 'keep me', 'utf-8')

    const result = await initDomain(domainDir, 'ACME')

    expect(result.success).toBe(false)
    expect(result.errors?.[0].code).toBe('DOMAIN_DIR_NOT_EMPTY')
    expect(await readdir(domainDir)).toEqual(['notes.txt'])
  })

  it('accepts an existing empty directory', async () => {
    await mkdir(domainDir, { recursive: true })
    expect((await initDomain(domainDir, 'ACME', 'acme-ws')).workspace_id).toBe('acme-ws')
  })

  it('rejects a missing name and an unsafe workspace_id', async () => {
    expect((await initDomain(domainDir, '  ')).success).toBe(false)
    expect((await initDomain(domainDir, 'ACME', '../evil')).errors?.[0].code).toBe('INVALID_ARGUMENT')
  })

  it('an add_model changeset then applies into the new domain, and propose_changeset names it by workspace_id', async () => {
    await initDomain(domainDir, 'ACME')
    await stubSpecs(domainDir)

    const proposed = await proposeChangeset(
      domainDir,
      {
        operations: [
          { op: 'add_model', target: 'strategy', blueprint_name: 'business_V_0-2-0', blueprint_url: 'specs/business_V_0-2-0_NN.md' },
        ],
        open: false,
      },
      { writer: async () => ({ path: join(domainDir, 'domaiNN_console.html'), status: 'written', opened: false }) },
    )
    expect(proposed.success).toBe(true)
    expect(proposed.changeset).toMatch(/^changes\/acme_agent_/)

    const applied = await applyChange(domainDir, proposed.changeset!)
    expect(applied.status).toBe('applied')
    expect((await stat(join(domainDir, 'kNNowledge', 'strategy_business_NN.md'))).isFile()).toBe(true)
  })
})
