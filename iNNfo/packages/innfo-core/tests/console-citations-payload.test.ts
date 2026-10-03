import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveCitation } from '../src/console/citations.js'

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

// Skipped pending SDD delivery of compile_model_console_NN.md procedure refactor (backlog item 27)
describe.skip('compile_model_console_NN.md — procedure contract', () => {
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

/**
 * `citation-source-resolution` delta: a normalized source under `sources/nn/`
 * carries BOTH the original `sha256` and, when a derivative exists, the
 * `media_sha256` of its companion. `resolveCitation` must surface both so the
 * `ingest-visual-catalog` SOP can verify original <-> derivative traceability.
 * An absent `media_sha256` must be OMITTED, never defaulted to a placeholder.
 */
describe('resolveCitation — media_sha256 provenance', () => {
  it('surfaces sha256 and media_sha256 from the cited normalized source frontmatter', () => {
    const resolver = (filePath: string) =>
      filePath === 'sources/nn/photo.md'
        ? {
            exists: true,
            content: [
              '---',
              'sha256: "abc123"',
              'media_file: "assets/photo.webp"',
              'media_sha256: "def456"',
              '---',
              '',
              '## Capture',
              'A photo.',
              '',
            ].join('\n'),
          }
        : { exists: false }

    const result = resolveCitation('sources/nn/photo.md@## Capture', 'source', resolver)

    expect(result.exists).toBe(true)
    expect(result.sha256).toBe('abc123')
    expect(result.media_sha256).toBe('def456')
  })

  it('omits media_sha256 when the source declares no derivative hash', () => {
    const resolver = (filePath: string) =>
      filePath === 'sources/nn/photo.md'
        ? {
            exists: true,
            content: ['---', 'sha256: "abc123"', '---', '', '## Capture', 'A photo.', ''].join('\n'),
          }
        : { exists: false }

    const result = resolveCitation('sources/nn/photo.md@## Capture', 'source', resolver)

    expect(result.sha256).toBe('abc123')
    expect(result.media_sha256).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(result, 'media_sha256')).toBe(false)
  })
})
