import { describe, it, expect } from 'vitest'
import {
  ENTRYPOINT_FILENAME,
  SPEC_FILENAME,
  SIDECAR_BLUEPRINT,
  parseName,
  formatNNName,
  formatMemberName,
  sidecarPathOf,
  rawPathOfSidecar,
  displayStem,
  procedureIdOf,
  isExcludedPath,
  roleOf,
  isModelCandidate,
} from '../../src/naming/contract.js'

describe('naming contract constants', () => {
  it('exposes the structural filenames', () => {
    expect(ENTRYPOINT_FILENAME).toBe('domaiNN_NN.md')
    expect(SPEC_FILENAME).toBe('spec_NN.md')
    expect(SIDECAR_BLUEPRINT).toBe('sidecar')
  })
})

describe('parseName', () => {
  it('parses an _NN.md document into stem', () => {
    expect(parseName('Client_business_NN.md')).toEqual({
      kind: 'nn',
      basename: 'Client_business_NN.md',
      stem: 'Client_business',
    })
  })

  it('matches the _NN.md suffix case-insensitively', () => {
    expect(parseName('thing_nn.MD')).toMatchObject({ kind: 'nn', stem: 'thing' })
  })

  it('parses a sidecar and names its subject', () => {
    expect(parseName('report.pdf_sidecar_NN.md')).toEqual({
      kind: 'nn',
      basename: 'report.pdf_sidecar_NN.md',
      stem: 'report.pdf_sidecar',
      sidecarOf: 'report.pdf',
    })
    expect(parseName('prices.csv_sidecar_NN.md')).toMatchObject({ sidecarOf: 'prices.csv' })
  })

  it('does not treat an extensionless "_sidecar" stem as a sidecar', () => {
    expect(parseName('notes_sidecar_NN.md')).toEqual({
      kind: 'nn',
      basename: 'notes_sidecar_NN.md',
      stem: 'notes_sidecar',
    })
  })

  it('parses a plain file with no stamp', () => {
    expect(parseName('report.md')).toEqual({ kind: 'file', basename: 'report.md', key: 'report', ext: 'md' })
  })

  it('keeps digits in the key and strips only a terminal UTC stamp', () => {
    expect(parseName('balance_2026.csv')).toMatchObject({ key: 'balance_2026', ext: 'csv' })
    expect(parseName('balance_2026_20261002T101500Z.csv')).toEqual({
      kind: 'file',
      basename: 'balance_2026_20261002T101500Z.csv',
      key: 'balance_2026',
      ext: 'csv',
      stamp: { stamp: '20261002T101500Z', seq: 1 },
    })
  })

  it('parses the tie-break number after the Z, including -10 after -2', () => {
    expect(parseName('r_20261002T101500Z-2.md')).toMatchObject({ key: 'r', stamp: { stamp: '20261002T101500Z', seq: 2 } })
    expect(parseName('r_20261002T101500Z-10.md')).toMatchObject({ key: 'r', stamp: { stamp: '20261002T101500Z', seq: 10 } })
  })

  it('treats an embedded (non-terminal) stamp as part of the key', () => {
    expect(parseName('a_20261002T101500Z_final.md')).toMatchObject({ key: 'a_20261002T101500Z_final' })
  })

  it('uses the last dot as the extension and tolerates no extension and dotfiles', () => {
    expect(parseName('archive.tar.gz')).toMatchObject({ key: 'archive.tar', ext: 'gz' })
    expect(parseName('LICENSE')).toMatchObject({ key: 'LICENSE', ext: '' })
    expect(parseName('.gitattributes')).toMatchObject({ key: '.gitattributes', ext: '' })
  })

  it('treats a bare ".csv_sidecar" extension as a plain file extension', () => {
    expect(parseName('x.csv_sidecar')).toMatchObject({ kind: 'file', key: 'x', ext: 'csv_sidecar' })
  })
})

describe('formatMemberName round trip', () => {
  const names = [
    'report.md',
    'balance_2026.csv',
    'balance_2026_20261002T101500Z.csv',
    'r_20261002T101500Z-2.md',
    'r_20261002T101500Z-10.md',
    'archive.tar_20261002T101500Z.gz',
    'LICENSE',
    'x.csv_sidecar',
  ]
  for (const name of names) {
    it(`round-trips ${name}`, () => {
      const parsed = parseName(name)
      if (parsed.kind !== 'file') throw new Error('expected file kind')
      expect(formatMemberName(parsed.key, parsed.ext, parsed.stamp)).toBe(name)
    })
  }
})

describe('formatNNName', () => {
  it('collapses stem === blueprint to <bp>_NN.md', () => {
    expect(formatNNName('sources', 'sources')).toBe('sources_NN.md')
    expect(formatNNName('Sources', 'sources')).toBe('Sources_NN.md')
  })

  it('appends _<bp> when the stem does not carry it', () => {
    expect(formatNNName('Client', 'business')).toBe('Client_business_NN.md')
  })

  it('is idempotent when the stem already ends with _<bp>', () => {
    expect(formatNNName('Client_business', 'business')).toBe('Client_business_NN.md')
  })
})

describe('sidecar paths', () => {
  it('maps raw path to sidecar path, keeping the original extension', () => {
    expect(sidecarPathOf('sources/import/balance_2026.csv')).toBe('sources/import/balance_2026.csv_sidecar_NN.md')
  })

  it('maps sidecar path back to the raw path', () => {
    expect(rawPathOfSidecar('sources/import/report.pdf_sidecar_NN.md')).toBe('sources/import/report.pdf')
  })

  it('round-trips both directions', () => {
    const raw = 'a/b/Market_Analysis_20261002T101500Z.md'
    expect(rawPathOfSidecar(sidecarPathOf(raw))).toBe(raw)
  })

  it('returns null for a path that is not a sidecar', () => {
    expect(rawPathOfSidecar('kNNowledge/Client_business_NN.md')).toBeNull()
    expect(rawPathOfSidecar('sources/import/report.pdf')).toBeNull()
  })

  it('tolerates backslash separators', () => {
    expect(rawPathOfSidecar('sources\\import\\report.pdf_sidecar_NN.md')).toBe('sources\\import\\report.pdf')
  })
})

describe('displayStem', () => {
  it('strips _NN.md', () => {
    expect(displayStem('Client_business_NN.md')).toBe('Client_business')
    expect(displayStem('Client_business_nn.md')).toBe('Client_business')
  })

  it('strips a plain .md when there is no _NN', () => {
    expect(displayStem('README.md')).toBe('README')
  })

  it('leaves other names untouched', () => {
    expect(displayStem('data.csv')).toBe('data.csv')
  })
})

describe('procedureIdOf', () => {
  it('drops a trailing _procedures and hyphenates', () => {
    expect(procedureIdOf('generate_video_script_procedures_NN.md')).toBe('generate-video-script')
  })

  it('lower-cases the id, matching the existing list_procedures ids', () => {
    expect(procedureIdOf('Generate_Report_NN.md')).toBe('generate-report')
  })

  it('keeps the stem of a frozen procedure that has no _procedures', () => {
    expect(procedureIdOf('reconcile_feedback_NN.md')).toBe('reconcile-feedback')
  })
})

describe('entry points', () => {
  it('re-exports the contract from index, browser, and the trannsform bundle entry', async () => {
    const [index, browser, primitives] = await Promise.all([
      import('../../src/index.js'),
      import('../../src/browser.js'),
      import('../../src/trannsformPrimitives.js'),
    ])
    for (const mod of [index, browser, primitives]) {
      expect(mod.parseName).toBe(parseName)
      expect(mod.sidecarPathOf).toBe(sidecarPathOf)
    }
  })
})

describe('deep archive exclusion & changeset role', () => {
  it('excludes archive directory at any depth', () => {
    expect(isExcludedPath('kNNowledge/archive/model_NN.md')).toBe(true)
    expect(isExcludedPath('sources/archive/data.csv')).toBe(true)
    expect(isExcludedPath('deeply/nested/archive/file_NN.md')).toBe(true)
    expect(isExcludedPath('kNNowledge/pricing_NN.md')).toBe(false)
  })

  it('classifies changes blueprint documents as changeset role', () => {
    expect(roleOf({ path: 'changes/c1_changes_NN.md', parentSpecName: 'changes' })).toBe('changeset')
    expect(
      roleOf({
        path: 'changes/workspace_agent_20261007T120000Z_changes_NN.md',
        parentSpecName: 'changes',
      }),
    ).toBe('changeset')
  })

  it('excludes changeset documents from model discovery', () => {
    expect(
      isModelCandidate({
        path: 'changes/c1_changes_NN.md',
        frontmatter: {
          level: 3,
          parent_spec: 'changes',
        },
      }),
    ).toBe(false)
    expect(
      isModelCandidate({
        path: 'changes/workspace_agent_20261007T120000Z_changes_NN.md',
        frontmatter: {
          level: 3,
          parent_spec: { name: 'changes' },
        },
      }),
    ).toBe(false)
  })
})


