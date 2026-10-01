import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A4.5 — "Compile Model Console Procedure" contract assertions.
 *
 * `compile_model_console_NN.md` is a thin procedure that delegates payload
 * construction to the `build_console_payload` MCP tool and pastes the slots verbatim.
 */

const here = dirname(fileURLToPath(import.meta.url))
const procedurePath = join(
  here,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'workspace',
  'procedures',
  'compile_model_console_NN.md',
)
const procedure = readFileSync(procedurePath, 'utf8')

describe('compile_model_console_NN.md — procedure contract', () => {
  it('calls the build_console_payload MCP tool', () => {
    expect(procedure).toContain('build_console_payload')
  })

  it('has no hand-built JSON contracts or manual resolution steps', () => {
    expect(procedure).not.toContain('## NN Work: Resolve Model Schema')
    expect(procedure).not.toContain('## NN Work: Serialize Model Data')
    expect(procedure).not.toContain('## NN Work: Resolve Element Citations')
    expect(procedure).not.toContain('## NN Artifact: Schema JSON Contract')
    expect(procedure).not.toContain('## NN Artifact: Model JSON Contract')
  })

  it('pastes schemaSlot and modelSlot verbatim into the shell at outputPath', () => {
    expect(procedure).toContain('schemaSlot')
    expect(procedure).toContain('modelSlot')
    expect(procedure).toContain('outputPath')
    expect(procedure).toContain('innfo-schema')
    expect(procedure).toContain('innfo-model')
  })

  it('has bumped model_version to V_0-2-0', () => {
    expect(procedure).toMatch(/model_version:\s*["']V_0-2-0["']/)
  })

  it('points the reference shell at the workspace-level asset', () => {
    expect(procedure).toContain(
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/workspace/assets/model_console.html',
    )
  })
})
