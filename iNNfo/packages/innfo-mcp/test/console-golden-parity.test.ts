import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
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

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'console-golden-test-'))
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
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('MCP slot strings match CLI slot text exactly and procedure outputPath reports fresh in status', async () => {
    // 1. Export via CLI
    const cliRes = await runCli([tempDir, '--all'])
    expect(cliRes.code).toBe(0)

    const cliHtmlPath = join(tempDir, 'export', 'Ghostbusters_console', 'Ghostbusters_console.html')
    expect(existsSync(cliHtmlPath)).toBe(true)
    const cliHtml = await readFile(cliHtmlPath, 'utf-8')

    const cliSchemaMatch = cliHtml.match(/<script type="application\/json" id="innfo-schema">([\s\S]*?)<\/script>/)
    const cliModelMatch = cliHtml.match(/<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/)
    expect(cliSchemaMatch).toBeDefined()
    expect(cliModelMatch).toBeDefined()

    // 2. Build via MCP tool
    const mcpResult = await buildConsolePayloadTool(tempDir, {
      model: 'Ghostbusters',
    })

    expect(mcpResult.outputPath).toBe('export/Ghostbusters_console/Ghostbusters_console.html')

    // 3. Compare normalized slots
    const normCliSchema = normalizeSlot(cliSchemaMatch![1])
    const normMcpSchema = normalizeSlot(mcpResult.schemaSlot)
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
