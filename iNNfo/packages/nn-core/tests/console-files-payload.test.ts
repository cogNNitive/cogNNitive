import { createHash } from 'node:crypto'
import {
  classifyFileCategory,
  computeFileSha256,
  mimeTypeFromPath,
  parseAndValidateSidecar,
  resolveArtifactReverseLineage,
  calculateFilesStats,
  isSidecarPath,
  sidecarSubjectPath,
  isTextMime,
} from '../dist/console/files-inventory.js'
import type { FileInventoryEntry } from '../dist/console/files-inventory.js'

let describe: any
let it: any
let assert: any

if (process.env.VITEST) {
  const v = await import('vitest')
  describe = v.describe
  it = v.it
  assert = v.assert
} else {
  const t = await import('node:test')
  const a = await import('node:assert/strict')
  describe = t.describe
  it = t.it
  assert = a.default
}

const SIDECAR_MD = (sourceFile: string, sha256: string) => `---
level: 3
parent_spec:
  name: sidecar
source_file: ${sourceFile}
sha256: ${sha256}
size_bytes: 52868
source_format: pdf
normalized_at: 2026-11-01T12:14:00Z
author: jose.rivas
---

# Body

Normalized text of the source document.
`

const SHA_A = 'a'.repeat(64)
const SHA_B = 'b'.repeat(64)

describe('Domain Console Files Payload Precomputation', () => {
  it('classifies real workspace paths into the six canonical categories', () => {
    // sources/import/ holds the raw imported documents, not a foreign domain.
    assert.equal(classifyFileCategory('sources/import/factura.pdf'), 'source')
    assert.equal(classifyFileCategory('sources/conversations/2026-10-chat.txt'), 'source')
    assert.equal(classifyFileCategory('sources/archive/old.md'), 'source')
    assert.equal(classifyFileCategory('conversations/2026-10-chat.txt'), 'source')
    // Media and evidence nested under sources/ keep their own category.
    assert.equal(classifyFileCategory('sources/assets/images/logo.png'), 'asset')
    assert.equal(classifyFileCategory('sources/evidence/bench.csv'), 'evidence')
    assert.equal(classifyFileCategory('assets/diagram.png'), 'asset')
    assert.equal(classifyFileCategory('evidence/survey.csv'), 'evidence')
    assert.equal(classifyFileCategory('artifacts/report.html'), 'artifact')
    assert.equal(classifyFileCategory('domaiNN_console.html'), 'artifact')
    assert.equal(classifyFileCategory('watch/inbox/doc.txt'), 'watch_root')
    // Foreign domain snapshots.
    assert.equal(classifyFileCategory('imported/other-domain/domaiNN_NN.md'), 'imported_domain')
    assert.equal(classifyFileCategory('.domains/other/kNNowledge/x_NN.md'), 'imported_domain')
  })

  it('detects MIME types from paths', () => {
    assert.equal(mimeTypeFromPath('notes.md'), 'text/markdown')
    assert.equal(mimeTypeFromPath('data.json'), 'application/json')
    assert.equal(mimeTypeFromPath('image.png'), 'image/png')
    assert.equal(mimeTypeFromPath('doc.pdf'), 'application/pdf')
    assert.equal(mimeTypeFromPath('unknown.bin'), 'application/octet-stream')
    assert.equal(isTextMime('text/markdown'), true)
    assert.equal(isTextMime('application/pdf'), false)
  })

  it('hashes raw bytes, so binary files are not UTF-8 reinterpreted', () => {
    const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe, 0x00, 0x80])
    assert.equal(computeFileSha256(binary), createHash('sha256').update(binary).digest('hex'))
    // Guard against the lossy `Buffer -> utf8 string` round-trip.
    assert.notEqual(computeFileSha256(binary), createHash('sha256').update(binary.toString('utf8')).digest('hex'))
    assert.equal(computeFileSha256('hello world'), createHash('sha256').update('hello world').digest('hex'))
  })

  it('recognises the canonical `<file>.<ext>_sidecar_NN.md` sidecar names', () => {
    assert.equal(isSidecarPath('sources/import/a.pdf_sidecar_NN.md'), true)
    assert.equal(isSidecarPath('sources/import/a.pdf.source.json'), false)
    assert.equal(sidecarSubjectPath('sources/import/a.pdf_sidecar_NN.md'), 'sources/import/a.pdf')
  })

  it('parses a valid sidecar and verifies its recorded digest', () => {
    const sidecar = parseAndValidateSidecar(
      SIDECAR_MD('sources/import/a.pdf', SHA_A),
      'sources/import/a.pdf_sidecar_NN.md',
      SHA_A,
    )
    assert.equal(sidecar.exists, true)
    assert.equal(sidecar.valid, true)
    assert.equal(sidecar.sourceFile, 'sources/import/a.pdf')
    assert.equal(sidecar.sourceFormat, 'pdf')
    assert.equal(sidecar.sha256Matches, true)
    assert.equal(sidecar.error, undefined)
  })

  it('flags a sidecar whose digest no longer matches the subject file', () => {
    const sidecar = parseAndValidateSidecar(
      SIDECAR_MD('sources/import/a.pdf', SHA_A),
      'sources/import/a.pdf_sidecar_NN.md',
      SHA_B,
    )
    assert.equal(sidecar.valid, true)
    assert.equal(sidecar.sha256Matches, false)
  })

  it('degrades gracefully on malformed sidecars', () => {
    const missing = parseAndValidateSidecar('no frontmatter here', 'x.pdf_sidecar_NN.md')
    assert.equal(missing.exists, true)
    assert.equal(missing.valid, false)
    assert.equal(typeof missing.error, 'string')

    const noDigest = parseAndValidateSidecar(
      '---\nsource_file: sources/import/a.pdf\n---\n\nbody',
      'a.pdf_sidecar_NN.md',
    )
    assert.equal(noDigest.valid, false)
    assert.equal(noDigest.sourceFile, 'sources/import/a.pdf')

    const absent = parseAndValidateSidecar(undefined, 'a.pdf_sidecar_NN.md')
    assert.equal(absent.exists, false)
    assert.equal(absent.valid, false)
  })

  it('resolves multi-tier artifact reverse lineage', () => {
    const artifacts = [
      {
        id: 'artifacts/exec-summary.html',
        path: 'artifacts/exec-summary.html',
        unitIds: ['initiative-pricing'],
      },
    ]
    const elements = [
      {
        id: 'initiative-pricing',
        slug: 'initiative-pricing',
        citations: {
          source: [{ path: 'sources/market-survey.csv' }],
        },
        history: [{ changeset: '2026-10-01-pricing' }],
      },
    ]
    const changes = [
      {
        id: '2026-10-01-pricing',
        changes: [{ id: 'ch-1', target: 'initiative-pricing', evidence: 'sources/market-survey.csv' }],
      },
    ]
    const sources = [{ id: 'sources/market-survey.csv', path: 'sources/market-survey.csv' }]

    const lineage = resolveArtifactReverseLineage(artifacts, elements, changes, sources)
    const entry = lineage['artifacts/exec-summary.html']

    assert.ok(entry)
    assert.equal(entry.artifactId, 'artifacts/exec-summary.html')
    assert.ok(entry.unitIds.includes('initiative-pricing'))
    assert.ok(entry.changesetIds.includes('2026-10-01-pricing'))
    assert.ok(entry.sourcePaths.includes('sources/market-survey.csv'))
  })

  it('falls back gracefully when upstream lineage links are missing', () => {
    const artifacts = [
      {
        id: 'artifacts/standalone.pdf',
        path: 'artifacts/standalone.pdf',
        unitIds: ['orphan-unit'],
      },
    ]
    const elements = [{ id: 'orphan-unit', slug: 'orphan-unit' }]
    const lineage = resolveArtifactReverseLineage(artifacts, elements, [], [])
    const entry = lineage['artifacts/standalone.pdf']

    assert.ok(entry)
    assert.deepEqual(entry.unitIds, ['orphan-unit'])
    assert.deepEqual(entry.changesetIds, [])
    assert.deepEqual(entry.sourcePaths, [])
  })

  it('computes coverage, sidecar integrity and excerpt metrics', () => {
    const base = {
      sha256: 'a'.repeat(64),
      mimeType: 'text/markdown',
      excerptCount: 0,
    }
    const inventory: FileInventoryEntry[] = [
      {
        ...base,
        id: 'sources/import/doc1.pdf',
        path: 'sources/import/doc1.pdf',
        category: 'source',
        size: 1000,
        citationsCount: 2,
        excerptCount: 1,
        changesCount: 0,
        uncited: false,
        sidecar: { path: 'sources/import/doc1.pdf_sidecar_NN.md', exists: true, valid: true, sha256Matches: true },
      },
      {
        ...base,
        id: 'sources/import/doc2.pdf',
        path: 'sources/import/doc2.pdf',
        category: 'source',
        size: 2000,
        citationsCount: 0,
        changesCount: 0,
        uncited: true,
        sidecar: { path: 'sources/import/doc2.pdf_sidecar_NN.md', exists: true, valid: true, sha256Matches: false },
      },
      {
        ...base,
        id: 'sources/import/doc3.pdf',
        path: 'sources/import/doc3.pdf',
        category: 'source',
        size: 1500,
        citationsCount: 0,
        changesCount: 1,
        uncited: false,
        sidecar: { path: 'sources/import/doc3.pdf_sidecar_NN.md', exists: true, valid: false, error: 'Missing source_file' },
      },
      {
        ...base,
        id: 'sources/import/doc4.pdf',
        path: 'sources/import/doc4.pdf',
        category: 'source',
        size: 500,
        citationsCount: 1,
        changesCount: 0,
        uncited: false,
        sidecar: { path: 'sources/import/doc4.pdf_sidecar_NN.md', exists: false, valid: false },
      },
      {
        ...base,
        id: 'imported/finance/kNNowledge/finance_NN.md',
        path: 'imported/finance/kNNowledge/finance_NN.md',
        category: 'imported_domain',
        size: 250,
        citationsCount: 0,
        changesCount: 0,
        uncited: true,
      },
      {
        ...base,
        id: 'artifacts/output.html',
        path: 'artifacts/output.html',
        category: 'artifact',
        size: 5000,
        mimeType: 'text/html',
        citationsCount: 0,
        changesCount: 0,
        uncited: false,
      },
    ]

    const stats = calculateFilesStats(inventory, [{ path: 'sources', status: 'active', fileCount: 4 }])

    assert.equal(stats.totalFiles, 6)
    assert.equal(stats.totalBytes, 10250)
    assert.equal(stats.categoryCounts.source, 4)
    assert.equal(stats.categoryCounts.imported_domain, 1)
    assert.equal(stats.categoryCounts.artifact, 1)
    assert.equal(stats.categoryCounts.watch_root, 1)
    assert.equal(stats.storageByCategory.source, 5000)
    assert.equal(stats.storageByCategory.artifact, 5000)

    // 5 source-like files (4 sources + 1 imported domain), 2 uncited -> 3/5 = 0.6
    assert.equal(stats.uncitedSourceCount, 2)
    assert.equal(stats.sourceCoverageRate, 0.6)

    // doc4 has no sidecar, doc3 has an invalid one, doc2's digest drifted.
    assert.equal(stats.sidecarMissingCount, 1)
    assert.equal(stats.sidecarInvalidCount, 1)
    assert.equal(stats.sidecarMismatchCount, 1)

    assert.equal(stats.excerptCount, 1)
  })
})
