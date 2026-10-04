import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { checkLineageDrift } from '../../src/lineage/drift.js'
import {
  findLineageRecord,
  managedSections,
  refreshExistingModel,
  splitTopLevelSections,
} from '../../src/lineage/record.js'
import { readLineageRecord } from '../../src/lineage/fs-snapshot.js'

const SECTIONS = {
  sources:
    '# NN Sources\n\n## NN Sources: a.md\nraw_filename:: sources/import/a.md\nversion:: V1\n\n' +
    '## NN Sources: b.md\nraw_filename:: sources/import/b.md\nversion:: V1\n',
  modelRecords: '# NN ModelRecords\n\n<!-- none -->\n',
  artifacts: '# NN Artifacts\n\n## NN Artifacts: r.md\nartifact_ref:: artifacts/r.md\nartifact_format:: document\n',
}

const BASE_RECORD = [
  '---',
  'level: 3',
  'parent_spec:',
  '  name: "cogNNitive"',
  'title: "Acme Provenance"',
  '---',
  '',
  '# NN index',
  '',
  '* [[Sources]]',
  '',
  '# NN Procedures',
  '',
  '## NN Procedures: scan @ 2026-10-01T00:00:00Z',
  'command:: scan',
  '',
  '# NN External Watch Roots',
  '',
  '- root: /data/external',
  '',
].join('\n')

function syncedRecord(): string {
  return refreshExistingModel(BASE_RECORD, SECTIONS)
}

describe('checkLineageDrift', () => {
  it('passes for a record just regenerated from the same sections', () => {
    expect(checkLineageDrift(syncedRecord(), SECTIONS)).toEqual({ ok: true })
  })

  it('fails on a hand-edited managed section, naming the section and the first differing element', () => {
    const edited = syncedRecord().replace('raw_filename:: sources/import/b.md', 'raw_filename:: sources/import/HACKED.md')
    const result = checkLineageDrift(edited, SECTIONS)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diffs).toHaveLength(1)
    expect(result.diffs[0].section).toBe('# NN Sources')
    expect(result.diffs[0].firstDiff).toContain('## NN Sources: b.md')
    expect(result.diffs[0].firstDiff).toContain('HACKED.md')
  })

  it('fails when the workspace gained an element the record does not list', () => {
    const grown = {
      ...SECTIONS,
      sources: SECTIONS.sources + '\n## NN Sources: c.md\nraw_filename:: sources/import/c.md\nversion:: V1\n',
    }
    const result = checkLineageDrift(syncedRecord(), grown)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diffs.map((d) => d.section)).toEqual(['# NN Sources'])
    expect(result.diffs[0].firstDiff).toContain('c.md')
  })

  it('reports every drifted section, in document order', () => {
    const record = syncedRecord()
      .replace('artifact_format:: document', 'artifact_format:: board')
      .replace('version:: V1\n\n##', 'version:: V9\n\n##')
    const result = checkLineageDrift(record, SECTIONS)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diffs.map((d) => d.section)).toEqual(['# NN Sources', '# NN Artifacts'])
  })

  it('fails when a managed section is missing from the record', () => {
    const record = syncedRecord().replace(/# NN ModelRecords[\s\S]*?(?=# NN Artifacts)/, '')
    const result = checkLineageDrift(record, SECTIONS)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diffs[0].section).toBe('# NN ModelRecords')
    expect(result.diffs[0].firstDiff).toMatch(/missing/i)
  })

  it('ignores the journal, hand-authored blocks, and frontmatter', () => {
    const edited = syncedRecord()
      .replace('command:: scan', 'command:: scan --edited')
      .replace('- root: /data/external', '- root: /somewhere/else')
      .replace('title: "Acme Provenance"', 'title: "Renamed"')
    expect(checkLineageDrift(edited, SECTIONS)).toEqual({ ok: true })
  })

  it('does not normalize line endings: a CRLF record drifts', () => {
    const crlf = syncedRecord().replace(/\n/g, '\r\n')
    const result = checkLineageDrift(crlf, SECTIONS)
    expect(result.ok).toBe(false)
  })
})

describe('record helpers', () => {
  it('splitTopLevelSections and managedSections share one definition of managed', () => {
    const { blocks } = splitTopLevelSections('\n# NN Sources\nx\n## NN Sources: a\n# NN Procedures\ny\n')
    expect(blocks.map((b) => b.heading)).toEqual(['# NN Sources', '# NN Procedures'])
    const managed = managedSections(SECTIONS)
    expect(managed.map((m) => m.name)).toEqual(['# NN Sources', '# NN ModelRecords', '# NN Artifacts'])
  })

  it('refreshExistingModel writes no knowledge_version into the record frontmatter', () => {
    const withVersion = BASE_RECORD.replace('title:', 'knowledge_version: "V_0-2-0"\ntitle:')
    const refreshed = refreshExistingModel(withVersion, SECTIONS)
    expect(refreshed).not.toContain('knowledge_version')
    expect(refreshed).toContain('title: "Acme Provenance"')
    expect(refreshed).toContain('command:: scan')
  })

  it('findLineageRecord picks the cogNNitive record by role, never by folder', () => {
    const files = [
      { path: 'kNNowledge/Doc_business_NN.md', content: '---\nlevel: 3\nparent_spec:\n  name: business\n---\n' },
      { path: 'deep/er/Acme_cogNNitive_NN.md', content: BASE_RECORD },
      { path: 'artifacts/notes.md', content: '# n' },
    ]
    expect(findLineageRecord(files)?.path).toBe('deep/er/Acme_cogNNitive_NN.md')
    expect(findLineageRecord(files.slice(0, 1))).toBeNull()
  })
})

describe('readLineageRecord', () => {
  let tempDir: string
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'innfo-record-test-'))
  })
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns null when the domaiNN has no record (the gate then tolerates absence)', () => {
    fs.writeFileSync(path.join(tempDir, 'notes.md'), '# n')
    expect(readLineageRecord(tempDir)).toBeNull()
    expect(readLineageRecord(path.join(tempDir, 'missing'))).toBeNull()
  })

  it('reads the record bytes untouched, CRLF included, and writes nothing', () => {
    const crlf = BASE_RECORD.replace(/\n/g, '\r\n')
    const file = path.join(tempDir, 'Acme_cogNNitive_NN.md')
    fs.writeFileSync(file, crlf)
    const before = fs.statSync(file).mtimeMs
    const record = readLineageRecord(tempDir)
    expect(record?.path).toBe('Acme_cogNNitive_NN.md')
    expect(record?.content).toBe(crlf)
    expect(fs.readFileSync(file, 'utf8')).toBe(crlf)
    expect(fs.statSync(file).mtimeMs).toBe(before)
    expect(fs.readdirSync(tempDir)).toEqual(['Acme_cogNNitive_NN.md'])
  })
})
