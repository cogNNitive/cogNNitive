import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { buildConsolePayloadTool } from '../src/tools/build-console-payload.js'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..', '..')
const cliScriptPath = resolve(repoRoot, 'scripts', 'export-console.mjs')

async function runCli(args: string[], opts: { cwd?: string; env?: Record<string, string> } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliScriptPath, ...args], {
      cwd: opts.cwd || repoRoot,
      env: { ...process.env, ...opts.env },
    })
    return { code: 0, stdout, stderr }
  } catch (err: any) {
    return {
      code: err.code ?? (err.status || 1),
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
    }
  }
}

function normalizeSlot(slotStr: string): string {
  return slotStr
    .replace(/"generated":\s*"[^"]+"/g, '"generated": "NORM_TIMESTAMP"')
    .replace(/"citationsResolvedAt":\s*"[^"]+"/g, '"citationsResolvedAt": "NORM_TIMESTAMP"')
    .trim()
}

describe('Console Golden Parity (MCP build_console_payload vs CLI export-console)', () => {
  let tempDir: string
  let oldCacheDir: string | undefined
  let oldGlobalDir: string | undefined
  let oldSkillsDir: string | undefined

  beforeEach(async () => {
    oldCacheDir = process.env.INNFO_CACHE_DIR
    oldGlobalDir = process.env.INNFO_GLOBAL_DIR
    oldSkillsDir = process.env.INNFO_SKILLS_DIR
    tempDir = await mkdtemp(join(tmpdir(), 'console-golden-test-'))
    process.env.INNFO_CACHE_DIR = join(tempDir, '.cache')
    // Isolate the global/skill tiers so resolution exercises the fixture
    // blueprint, never a developer's real ~/.agents install.
    process.env.INNFO_GLOBAL_DIR = join(tempDir, 'global-bluepriNNts')
    process.env.INNFO_SKILLS_DIR = join(tempDir, 'global-skills')
    await mkdir(process.env.INNFO_GLOBAL_DIR, { recursive: true })
    await mkdir(process.env.INNFO_SKILLS_DIR, { recursive: true })
    const modelsDir = join(tempDir, 'models')
    const sourcesDir = join(tempDir, 'sources')
    const blueprintsDir = join(tempDir, 'specs', 'bluepriNNts', 'business')

    await mkdir(modelsDir, { recursive: true })
    await mkdir(sourcesDir, { recursive: true })
    await mkdir(blueprintsDir, { recursive: true })

    // 1. Source file
    await writeFile(
      join(sourcesDir, 'brief.md'),
      '# Initial Brief\n\n## Mission\nWe eliminate paranormal threats.\n',
      'utf-8',
    )

    // 2. Blueprint (Tier 1)
    await writeFile(
      join(blueprintsDir, 'spec_NN.md'),
      `---
spec_version: "V_0-3-0"
level: 2
title: "Business Blueprint"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "https://example.com/iNNfo_V_0-3-0_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Mission
type:: map

# NN Concept Definition: Service
type:: list
`,
      'utf-8',
    )

    // 3. Model
    const modelContent = `---
title: "Ghostbusters"
model_version: "V_1-0-0"
level: 3
parent_spec:
  name: "business"
  url: "https://example.com/business_V_0-3-0_NN.md"
---

# NN Mission
## NN Mission: Ghostbusters Mission
  sources:: "sources/brief.md#mission"

  We eliminate ghosts and entities across New York.

# NN Service
## NN Service: Ghost Removal
  price:: "$5,000"

  Standard ghost removal service.
`
    await writeFile(join(modelsDir, 'Ghostbusters_NN.md'), modelContent, 'utf-8')

    // 4. Ledger
    const ledgerContent =
      JSON.stringify({
        v: 1,
        at: '2026-10-01T10:00:00Z',
        source: {
          kind: 'console-json',
          path: 'sources/import/feedback/round1.json',
          sha256: 'abc1234567890123456789012345678901234567890123456789012345678901',
        },
        item: 'fb-001',
        model_id: 'models/Ghostbusters',
        model_version: 'V_1-0-0',
        element_id: 'mission-ghostbusters-mission',
        status: 'applied',
        by: 'lead',
      }) + '\n'
    await writeFile(join(tempDir, 'feedback-ledger.jsonl'), ledgerContent, 'utf-8')
  })

  afterEach(async () => {
    if (oldCacheDir !== undefined) {
      process.env.INNFO_CACHE_DIR = oldCacheDir
    } else {
      delete process.env.INNFO_CACHE_DIR
    }
    if (oldGlobalDir !== undefined) {
      process.env.INNFO_GLOBAL_DIR = oldGlobalDir
    } else {
      delete process.env.INNFO_GLOBAL_DIR
    }
    if (oldSkillsDir !== undefined) {
      process.env.INNFO_SKILLS_DIR = oldSkillsDir
    } else {
      delete process.env.INNFO_SKILLS_DIR
    }
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('MCP slot strings match CLI slot text exactly and procedure outputPath reports fresh in status', async () => {
    // 1. Export via CLI
    const cliRes = await runCli([tempDir, '--all'], {
      env: {
        INNFO_CACHE_DIR: join(tempDir, '.cache'),
        INNFO_GLOBAL_DIR: join(tempDir, 'global-bluepriNNts'),
        INNFO_SKILLS_DIR: join(tempDir, 'global-skills'),
      },
    })
    expect(cliRes.code).toBe(0)

    // The CLI writes a new suffixed member of the console family; the MCP outputPath names the family.
    const consoleDir = join(tempDir, 'artifacts', 'Ghostbusters_console')
    const members = (await readdir(consoleDir)).filter((n) =>
      /^Ghostbusters_console_\d{8}T\d{6}Z(-\d+)?\.html$/.test(n),
    )
    expect(members).toHaveLength(1)
    const cliHtmlPath = join(consoleDir, members[0])
    expect(existsSync(cliHtmlPath)).toBe(true)
    const cliHtml = await readFile(cliHtmlPath, 'utf-8')

    const cliSchemaMatch = cliHtml.match(
      /<script type="application\/json" id="innfo-schema">([\s\S]*?)<\/script>/,
    )
    const cliModelMatch = cliHtml.match(
      /<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/,
    )
    expect(cliSchemaMatch).toBeDefined()
    expect(cliModelMatch).toBeDefined()

    // 2. Build via MCP tool
    const mcpResult = await buildConsolePayloadTool(tempDir, {
      model: 'Ghostbusters',
    })

    expect(mcpResult.outputPath).toBe('artifacts/Ghostbusters_console/Ghostbusters_console.html')

    // The fixture blueprint MUST resolve through the shared path. Without this
    // guard the parity assertion below could pass trivially with both producers
    // emitting the derived stub.
    expect(mcpResult.schemaSource).toBe('blueprint')

    // 3. Compare normalized slots
    const normCliSchema = normalizeSlot(cliSchemaMatch![1])
    const normMcpSchema = normalizeSlot(mcpResult.schemaSlot)
    expect(normCliSchema).toContain('"type": "map"')
    expect(normMcpSchema).toContain('"type": "map"')
    expect(normMcpSchema).toBe(normCliSchema)

    const normCliModel = normalizeSlot(cliModelMatch![1])
    const normMcpModel = normalizeSlot(mcpResult.modelSlot)
    expect(normMcpModel).toBe(normCliModel)

    // 4. Verify --status reports fresh
    const statusRes = await runCli([tempDir, '--status'])
    expect(statusRes.code).toBe(0)
    expect(statusRes.stdout).toContain('[fresh]')
  })
})
