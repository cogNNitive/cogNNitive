import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { readLineageSnapshot } from '../../src/lineage/fs-snapshot.js'

const SIDECAR = '---\nlevel: 3\nparent_spec:\n  name: sidecar\n---\n'

describe('readLineageSnapshot', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'innfo-snapshot-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  function seed(files: Record<string, string | Buffer>): void {
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(tempDir, relPath)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, content)
    }
  }

  it('walks the whole domaiNN, reads text formats, and prunes excluded paths', () => {
    seed({
      'sources/import/metrics.csv': 'metric,value\nmrr,100',
      'sources/import/metrics.csv_sidecar_NN.md': SIDECAR,
      'sources/import/staging/draft.md': '# Draft should be ignored',
      'sources/conversations/chat_20261002T101500Z.md': '# Chat',
      'kNNowledge/Strategy_NN.md': '---\ntitle: Strategy\nlevel: 3\nparent_spec:\n  name: business\n---\n# Strategy',
      'artifacts/Report.md': '---\ntitle: Report\n---\n# Report',
      'artifacts/Console.html': '<html><script id="innfo-model"></script></html>',
      'artifacts/page.htm': '<html></html>',
      'artifacts/data.json': '{"a": 1}',
      'random_dir/foo.md': '# Loose docs are read too: the projection decides',
      'archive/old.md': '# Ignored root',
      'backups/b.md': '# Ignored root',
      '.hidden/h.md': '# Dot folder',
    })

    const paths = readLineageSnapshot(tempDir).map((s) => s.path)

    expect(paths).toEqual([
      'artifacts/Console.html',
      'artifacts/Report.md',
      'artifacts/data.json',
      'artifacts/page.htm',
      'kNNowledge/Strategy_NN.md',
      'random_dir/foo.md',
      'sources/conversations/chat_20261002T101500Z.md',
      'sources/import/metrics.csv',
      'sources/import/metrics.csv_sidecar_NN.md',
    ])
  })

  it('skips binaries (their sidecars represent them) and the lineage record', () => {
    seed({
      'sources/import/report.pdf': Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]),
      'sources/import/report.pdf_sidecar_NN.md': SIDECAR,
      'artifacts/image.png': Buffer.from([0x89, 0x50]),
      'kNNowledge/Acme_cogNNitive_NN.md': '---\nlevel: 3\nparent_spec:\n  name: cogNNitive\n---\n# NN Sources',
      'domaiNN_NN.md': '---\ntitle: Entry\n---\n',
    })

    const paths = readLineageSnapshot(tempDir).map((s) => s.path)

    expect(paths).toEqual(['sources/import/report.pdf_sidecar_NN.md'])
  })

  it('never snapshots a catalog document as knowledge', () => {
    seed({
      'kNNowledge/Strategy_NN.md': '---\ntitle: Strategy\nlevel: 3\nparent_spec:\n  name: business\n---\n# Strategy',
      'kNNowledge/sources_NN.md': '---\nparent_spec:\n  name: sources\n---\n',
    })

    const paths = readLineageSnapshot(tempDir).map((s) => s.path)

    expect(paths).toEqual(['kNNowledge/Strategy_NN.md'])
  })
})
