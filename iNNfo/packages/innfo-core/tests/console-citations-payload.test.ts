import { describe, it, expect } from 'vitest'
import { resolveCitation } from '../src/console/citations.js'

/**
 * `citation-source-resolution` delta: a normalized source under `sources/import/`
 * carries BOTH the original `sha256` and, when a derivative exists, the
 * `media_sha256` of its companion. `resolveCitation` must surface both so the
 * `ingest-visual-catalog` SOP can verify original <-> derivative traceability.
 * An absent `media_sha256` must be OMITTED, never defaulted to a placeholder.
 */
describe('resolveCitation — media_sha256 provenance', () => {
  it('surfaces sha256 and media_sha256 from the cited normalized source frontmatter', () => {
    const resolver = (filePath: string) =>
      filePath === 'sources/import/photo.md'
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

    const result = resolveCitation('sources/import/photo.md@## Capture', 'source', resolver)

    expect(result.exists).toBe(true)
    expect(result.sha256).toBe('abc123')
    expect(result.media_sha256).toBe('def456')
  })

  it('omits media_sha256 when the source declares no derivative hash', () => {
    const resolver = (filePath: string) =>
      filePath === 'sources/import/photo.md'
        ? {
            exists: true,
            content: ['---', 'sha256: "abc123"', '---', '', '## Capture', 'A photo.', ''].join('\n'),
          }
        : { exists: false }

    const result = resolveCitation('sources/import/photo.md@## Capture', 'source', resolver)

    expect(result.sha256).toBe('abc123')
    expect(result.media_sha256).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(result, 'media_sha256')).toBe(false)
  })
})
