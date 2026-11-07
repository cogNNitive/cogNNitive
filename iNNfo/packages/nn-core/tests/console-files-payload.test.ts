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
  buildOrigins,
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
    // Mirrored models are sources.
    assert.equal(classifyFileCategory('sources/sync/org/organization_NN.md'), 'source')
    // A file that matches no known layout is never promoted to a source.
    assert.equal(classifyFileCategory('misc/notes.bin'), 'unclassified')
    assert.equal(classifyFileCategory('external/doc.txt'), 'unclassified')
    assert.equal(classifyFileCategory('watch/inbox/doc.txt'), 'unclassified')
    assert.equal(classifyFileCategory('imported/other-domain/domaiNN_NN.md'), 'unclassified')
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

  it('does not count the sources catalog as a missing sidecar', () => {
    const catalog: FileInventoryEntry = {
      sha256: 'a'.repeat(64),
      mimeType: 'text/markdown',
      excerptCount: 0,
      id: 'sources/sources_NN.md',
      path: 'sources/sources_NN.md',
      category: 'source',
      size: 100,
      citationsCount: 0,
      changesCount: 0,
      uncited: false,
      sidecar: { path: 'sources/sources_NN.md_sidecar_NN.md', exists: false, valid: false },
    }
    assert.equal(calculateFilesStats([catalog]).sidecarMissingCount, 0)
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
        id: 'misc/loose.bin',
        path: 'misc/loose.bin',
        category: 'unclassified',
        size: 250,
        citationsCount: 0,
        changesCount: 0,
        uncited: false,
        sidecar: { path: 'misc/loose.bin_sidecar_NN.md', exists: false, valid: false },
      },
      {
        ...base,
        id: 'sources/sync/org/organization_NN.md',
        path: 'sources/sync/org/organization_NN.md',
        category: 'source',
        size: 0,
        citationsCount: 1,
        changesCount: 0,
        uncited: false,
        sidecar: { path: 'sources/sync/org/organization_NN.md_sidecar_NN.md', exists: false, valid: false },
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

    const stats = calculateFilesStats(inventory)

    assert.equal(stats.totalFiles, 7)
    assert.equal(stats.totalBytes, 10250)
    assert.equal(stats.categoryCounts.source, 5)
    assert.equal(stats.categoryCounts.unclassified, 1)
    assert.equal(stats.categoryCounts.artifact, 1)
    assert.equal('watch_root' in stats.categoryCounts, false)
    assert.equal('imported_domain' in stats.categoryCounts, false)
    assert.equal('watch_root' in stats.storageByCategory, false)
    assert.equal(stats.storageByCategory.source, 5000)
    assert.equal(stats.storageByCategory.unclassified, 250)
    assert.equal(stats.storageByCategory.artifact, 5000)

    // 5 sources, 1 uncited -> 4/5 = 0.8. The unclassified file is neither.
    assert.equal(stats.uncitedSourceCount, 1)
    assert.equal(stats.sourceCoverageRate, 0.8)

    // doc4 has no sidecar, doc3 has an invalid one, doc2's digest drifted.
    // The unclassified file and the mirrored model (no sidecar by design) are not gaps.
    assert.equal(stats.sidecarMissingCount, 1)
    assert.equal(stats.sidecarInvalidCount, 1)
    assert.equal(stats.sidecarMismatchCount, 1)

    assert.equal(stats.excerptCount, 1)
  })

  it('reads the origin keys of a sidecar', () => {
    const doc = [
      '---',
      'source_file: sources/import/org/a.pdf',
      `sha256: ${SHA_A}`,
      'synchronization: org',
      'origin_uri: /shared/org',
      'origin_path: docs/a.pdf',
      'retrieved_at: 2026-11-01T12:14:00Z',
      '---',
      '',
    ].join('\n')
    const sidecar = parseAndValidateSidecar(doc, 'sources/import/org/a.pdf_sidecar_NN.md', SHA_A)
    assert.equal(sidecar.synchronization, 'org')
    assert.equal(sidecar.originUri, '/shared/org')
    assert.equal(sidecar.originPath, 'docs/a.pdf')
    const plain = parseAndValidateSidecar(SIDECAR_MD('a.pdf', SHA_A), 'a.pdf_sidecar_NN.md')
    assert.equal(plain.synchronization, undefined)
    assert.equal(plain.originUri, undefined)
  })
})

describe('buildOrigins', () => {
  const entry = (path: string, sidecar?: Record<string, unknown>): FileInventoryEntry => ({
    id: path,
    path,
    category: classifyFileCategory(path),
    size: 1,
    sha256: SHA_A,
    mimeType: 'application/octet-stream',
    citationsCount: 0,
    excerptCount: 0,
    changesCount: 0,
    uncited: false,
    ...(sidecar ? { sidecar: { path: path + '_sidecar_NN.md', exists: true, valid: true, ...sidecar } } : {}),
  })

  it('is empty without Synchronization elements or sidecar origin keys, whatever the folders are called', () => {
    const inventory = [entry('sources/import/a.pdf', {}), entry('external/x.txt'), entry('sources/watch/y.txt')]
    assert.deepEqual(buildOrigins([], inventory), [])
  })

  it('builds one origin per Synchronization with its mirror and landed files', () => {
    const inventory = [
      entry('sources/sync/org/organization_NN.md'),
      entry('sources/sync/org/teams/team_NN.md'),
      entry('sources/import/org/docs/a_1.pdf', {
        synchronization: 'org',
        originUri: '/shared/org',
        originPath: 'docs/a.pdf',
      }),
      entry('sources/import/b.pdf', {}),
    ]
    const origins = buildOrigins(
      [
        { alias: 'org', origin: '/shared/org', kind: 'folder', state: 'active' },
        { alias: 'idle', origin: '/shared/idle', kind: 'folder', state: 'paused' },
      ],
      inventory,
    )
    assert.deepEqual(origins, [
      {
        id: 'org',
        alias: 'org',
        origin: '/shared/org',
        kind: 'folder',
        state: 'active',
        files: [
          'sources/import/org/docs/a_1.pdf',
          'sources/sync/org/organization_NN.md',
          'sources/sync/org/teams/team_NN.md',
        ],
      },
      { id: 'idle', alias: 'idle', origin: '/shared/idle', kind: 'folder', state: 'paused', files: [] },
    ])
  })

  it('turns sidecar origin keys without a Synchronization into adhoc origins', () => {
    const inventory = [
      entry('sources/import/web/page.html', { originUri: 'https://example.com/page', originPath: 'page' }),
      entry('sources/import/web/page2.html', { originUri: 'https://example.com/page', originPath: 'page2' }),
      entry('sources/import/lost/a.txt', { synchronization: 'gone', originUri: '/old/place', originPath: 'a.txt' }),
    ]
    assert.deepEqual(buildOrigins([], inventory), [
      {
        id: 'gone',
        origin: '/old/place',
        kind: 'file',
        state: 'adhoc',
        files: ['sources/import/lost/a.txt'],
      },
      {
        id: 'https://example.com/page',
        origin: 'https://example.com/page',
        kind: 'url',
        state: 'adhoc',
        files: ['sources/import/web/page.html', 'sources/import/web/page2.html'],
      },
    ])
  })
})
