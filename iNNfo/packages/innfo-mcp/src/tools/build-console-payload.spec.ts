import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { buildConsolePayloadTool } from './build-console-payload.js'

describe('build_console_payload tool', () => {
  it('returns schemaSlot, modelSlot, outputPath, schemaSource, and warnings', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'build-console-test-'))
    try {
      const modelsDir = join(tempDir, 'kNNowledge')
      mkdirSync(modelsDir, { recursive: true })

      const modelContent = `---
title: "Ghostbusters Model"
model_version: "V_0-1-0"
level: 3
---

# NN Mission
## NN Mission: Ghost Catching
  scope:: "New York City"

  We eliminate ghosts.
`
      const modelPath = join(modelsDir, 'Ghostbusters_NN.md')
      writeFileSync(modelPath, modelContent, 'utf8')

      const result = await buildConsolePayloadTool(tempDir, {
        model: 'Ghostbusters',
      })

      expect(result).toBeDefined()
      expect(result.schemaSlot).toBeDefined()
      expect(result.modelSlot).toBeDefined()
      expect(result.outputPath).toBe('artifacts/Ghostbusters_console/Ghostbusters_console.html')
      expect(result.schemaSource).toBeDefined()
      expect(Array.isArray(result.warnings)).toBe(true)

      // Escapes < character
      expect(result.schemaSlot).not.toContain('<')
      expect(result.modelSlot).not.toContain('<')

      // Content inside slots is valid JSON structure when unescaped
      const parsedModel = JSON.parse(result.modelSlot)
      expect(parsedModel.meta.modelId).toBe('kNNowledge/Ghostbusters')
      expect(parsedModel.meta.sources).toEqual(['kNNowledge/Ghostbusters_NN.md'])
      expect(parsedModel.elements).toHaveLength(1)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('throws or returns error for unknown model', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'build-console-missing-'))
    try {
      await expect(
        buildConsolePayloadTool(tempDir, { model: 'NonExistentModel' }),
      ).rejects.toThrow(/not found/i)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('throws when no model identifier is supplied', async () => {
    await expect(buildConsolePayloadTool(process.cwd(), {})).rejects.toThrow(
      /Missing required argument/i,
    )
  })

  it('resolves a blueprint schema when the model declares a parent_spec', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'build-console-parent-'))
    try {
      const modelsDir = join(tempDir, 'kNNowledge')
      mkdirSync(modelsDir, { recursive: true })

      const modelContent = `---
title: "Parented Model"
model_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "https://example.com/business_V_0-1-0_NN.md"
---

# NN Mission
## NN Mission: Parented
  scope:: "Everywhere"

  Body text.
`
      writeFileSync(join(modelsDir, 'Parented_NN.md'), modelContent, 'utf8')

      const result = await buildConsolePayloadTool(tempDir, { model: 'Parented' })

      expect(result.schemaSlot).toBeDefined()
      expect(['blueprint', 'derived']).toContain(result.schemaSource)
      expect(Array.isArray(result.warnings)).toBe(true)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
