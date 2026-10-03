import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { readLineageSnapshot } from '../../src/lineage/fs-snapshot.js'

describe('readLineageSnapshot', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'innfo-snapshot-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('scans only in-scope files and excludes staging and cogNNitive record', () => {
    const filesToCreate: Record<string, string> = {
      'sources/nn/interview.md': '---\nsource_file: interview.txt\n---\n# Notes',
      'sources/nn/metrics.csv': 'metric,value\nmrr,100',
      'sources/nn/staging/draft.md': '# Draft should be ignored',
      'sources/archive/interview/V1/interview.md': '---\nversion: V1\n---\n# Archived',
      'sources/export/Report_Promoted.md': '---\nsources: []\n---\n# Promoted',
      'kNNowledge/Strategy_NN.md': '---\ntitle: Strategy\n---\n# Strategy',
      'kNNowledge/Lineage_Record_NN.md': '---\ntitle: Lineage\nparent_spec:\n  name: cogNNitive\n---\n# Record',
      'export/Report.md': '---\ntitle: Report\n---\n# Report',
      'export/Console.html': '<html><script id="innfo-model"></script></html>',
      'export/data.csv': 'a,b\n1,2',
      'export/data.json': '{"a": 1}',
      'export/image.png': 'binary-ignored',
      'random_dir/foo.md': '# Ignored',
    }

    for (const [relPath, content] of Object.entries(filesToCreate)) {
      const fullPath = path.join(tempDir, relPath)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, content, 'utf8')
    }

    const snapshots = readLineageSnapshot(tempDir)
    const paths = snapshots.map((s) => s.path)

    expect(paths).toContain('sources/nn/interview.md')
    expect(paths).toContain('sources/nn/metrics.csv')
    expect(paths).toContain('sources/archive/interview/V1/interview.md')
    expect(paths).toContain('sources/export/Report_Promoted.md')
    expect(paths).toContain('kNNowledge/Strategy_NN.md')
    expect(paths).toContain('export/Report.md')
    expect(paths).toContain('export/Console.html')
    expect(paths).toContain('export/data.csv')
    expect(paths).toContain('export/data.json')

    // Excluded files
    expect(paths).not.toContain('sources/nn/staging/draft.md')
    expect(paths).not.toContain('kNNowledge/Lineage_Record_NN.md')
    expect(paths).not.toContain('export/image.png')
    expect(paths).not.toContain('random_dir/foo.md')

    // Content verification
    const interview = snapshots.find((s) => s.path === 'sources/nn/interview.md')
    expect(interview?.content).toContain('# Notes')
  })
})
