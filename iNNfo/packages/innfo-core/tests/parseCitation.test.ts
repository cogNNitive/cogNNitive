import { describe, it, expect } from 'vitest'
import { parseCitation, resolveUnitPath } from '../src/index.js'

describe('parseCitation', () => {
  describe('canonical @ markdown citations', () => {
    it('parses source heading citation with level', () => {
      const cit = parseCitation('sources/import/interview.md@## Clients')
      expect(cit).toEqual({
        filePath: 'sources/import/interview.md',
        fileName: 'interview.md',
        kind: 'source',
        raw: 'sources/import/interview.md@## Clients',
        slug: 'clients',
        unit: {
          kind: 'header',
          level: 2,
          text: 'Clients',
          slug: 'clients',
        },
        subunits: [],
      })
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses kNNowledge model heading citation with concept and element', () => {
      const cit = parseCitation('kNNowledge/Client_NN.md@## NN Stakeholders: Enterprise Clients')
      expect(cit).toEqual({
        filePath: 'kNNowledge/Client_NN.md',
        fileName: 'Client_NN.md',
        kind: 'model',
        raw: 'kNNowledge/Client_NN.md@## NN Stakeholders: Enterprise Clients',
        slug: 'nn-stakeholders--enterprise-clients',
        unit: {
          kind: 'header',
          level: 2,
          text: 'NN Stakeholders: Enterprise Clients',
          slug: 'nn-stakeholders--enterprise-clients',
        },
        subunits: [],
      })
    })

    it('parses artifacts/ markdown heading citation', () => {
      const cit = parseCitation('artifacts/report.md@### Findings')
      expect(cit).toEqual({
        filePath: 'artifacts/report.md',
        fileName: 'report.md',
        kind: 'source',
        raw: 'artifacts/report.md@### Findings',
        slug: 'findings',
        unit: {
          kind: 'header',
          level: 3,
          text: 'Findings',
          slug: 'findings',
        },
        subunits: [],
      })
    })

    it('parses heading citation with subunit field', () => {
      const cit = parseCitation('sources/import/doc.md@## Overview&summary')
      expect(cit).toEqual({
        filePath: 'sources/import/doc.md',
        fileName: 'doc.md',
        kind: 'source',
        raw: 'sources/import/doc.md@## Overview&summary',
        slug: 'overview',
        unit: {
          kind: 'header',
          level: 2,
          text: 'Overview',
          slug: 'overview',
        },
        subunits: ['summary'],
      })
    })
  })

  describe('canonical @ CSV citations', () => {
    it('parses CSV row citation with subunit column', () => {
      const cit = parseCitation('sources/import/prices.csv@R12&price')
      expect(cit).toEqual({
        filePath: 'sources/import/prices.csv',
        fileName: 'prices.csv',
        kind: 'source',
        raw: 'sources/import/prices.csv@R12&price',
        unit: {
          kind: 'row',
          id: 'R12',
        },
        subunits: ['price'],
      })
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses unqualified CSV row citation', () => {
      const cit = parseCitation('data.csv@RowID&col')
      expect(cit).toEqual({
        filePath: 'data.csv',
        fileName: 'data.csv',
        kind: 'source',
        raw: 'data.csv@RowID&col',
        unit: {
          kind: 'row',
          id: 'RowID',
        },
        subunits: ['col'],
      })
    })
  })

  describe('file-level bare path citations (no anchor)', () => {
    it('parses kNNowledge bare path without unit or legacyHash', () => {
      const cit = parseCitation('kNNowledge/Client_NN.md')
      expect(cit).toEqual({
        filePath: 'kNNowledge/Client_NN.md',
        fileName: 'Client_NN.md',
        kind: 'model',
        raw: 'kNNowledge/Client_NN.md',
      })
      expect(cit?.unit).toBeUndefined()
      expect(cit?.slug).toBeUndefined()
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses sources/import/ bare path', () => {
      const cit = parseCitation('sources/import/interview.md')
      expect(cit).toEqual({
        filePath: 'sources/import/interview.md',
        fileName: 'interview.md',
        kind: 'source',
        raw: 'sources/import/interview.md',
      })
      expect(cit?.unit).toBeUndefined()
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses artifacts/ bare path', () => {
      const cit = parseCitation('artifacts/deliverable.md')
      expect(cit).toEqual({
        filePath: 'artifacts/deliverable.md',
        fileName: 'deliverable.md',
        kind: 'source',
        raw: 'artifacts/deliverable.md',
      })
      expect(cit?.unit).toBeUndefined()
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses an unqualified bare path as written', () => {
      const cit = parseCitation('notes.md')
      expect(cit).toEqual({
        filePath: 'notes.md',
        fileName: 'notes.md',
        kind: 'source',
        raw: 'notes.md',
      })
      expect(cit?.unit).toBeUndefined()
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses bare CSV path', () => {
      const cit = parseCitation('sources/import/dataset.csv')
      expect(cit).toEqual({
        filePath: 'sources/import/dataset.csv',
        fileName: 'dataset.csv',
        kind: 'source',
        raw: 'sources/import/dataset.csv',
      })
      expect(cit?.unit).toBeUndefined()
    })
  })

  describe('legacy #slug citations', () => {
    it('parses legacy #slug on a domaiNN-relative path with legacyHash: true', () => {
      const cit = parseCitation('sources/import/a.md#intro')
      expect(cit).toEqual({
        filePath: 'sources/import/a.md',
        fileName: 'a.md',
        slug: 'intro',
        kind: 'source',
        raw: 'sources/import/a.md#intro',
        legacyHash: true,
      })
    })

    it('parses legacy #slug on an unqualified path as written, with no sources/import/ prefix', () => {
      const cit = parseCitation('a.md#intro')
      expect(cit).toEqual({
        filePath: 'a.md',
        fileName: 'a.md',
        slug: 'intro',
        kind: 'source',
        raw: 'a.md#intro',
        legacyHash: true,
      })
    })

    it('parses legacy #slug on kNNowledge path with legacyHash: true', () => {
      const cit = parseCitation('kNNowledge/Client_NN.md#stakeholders')
      expect(cit).toEqual({
        filePath: 'kNNowledge/Client_NN.md',
        fileName: 'Client_NN.md',
        slug: 'stakeholders',
        kind: 'model',
        raw: 'kNNowledge/Client_NN.md#stakeholders',
        legacyHash: true,
      })
    })
  })

  describe('rejected and invalid citations', () => {
    it('gives the retired models/ prefix no special meaning in the legacy hash form', () => {
      expect(parseCitation('models/Client_NN.md#intro')).toEqual({
        filePath: 'models/Client_NN.md',
        fileName: 'Client_NN.md',
        slug: 'intro',
        kind: 'model',
        raw: 'models/Client_NN.md#intro',
        legacyHash: true,
      })
    })

    it('rejects line-range anchors', () => {
      expect(parseCitation('sources/import/a.md@L10-L20')).toBeNull()
      expect(parseCitation('sources/import/a.md#L10-L20')).toBeNull()
      expect(parseCitation('sources/import/a.md#L15')).toBeNull()
    })

    it('rejects src-NNN wrappers', () => {
      expect(parseCitation('src-001')).toBeNull()
      expect(parseCitation('src-123 sources/import/a.md')).toBeNull()
    })

    it('rejects URLs and empty inputs', () => {
      expect(parseCitation('')).toBeNull()
      expect(parseCitation(null as unknown as string)).toBeNull()
      expect(parseCitation('https://example.com/doc.md')).toBeNull()
      expect(parseCitation('http://example.com/doc.md@## Intro')).toBeNull()
    })
  })
})

describe('resolveUnitPath', () => {
  it('accepts any domaiNN-relative md/csv/json path with no implicit prefix', () => {
    expect(resolveUnitPath('sources/import/a.md')).toEqual({
      filePath: 'sources/import/a.md',
      kind: 'source',
    })
    expect(resolveUnitPath('custom.md')).toEqual({ filePath: 'custom.md', kind: 'source' })
    expect(resolveUnitPath('data/prices.csv')).toEqual({
      filePath: 'data/prices.csv',
      kind: 'source',
    })
    expect(resolveUnitPath('sources/import/d.json')).toEqual({
      filePath: 'sources/import/d.json',
      kind: 'source',
    })
  })

  it('treats retired prefixes as plain paths (they dangle later, not here)', () => {
    expect(resolveUnitPath('sources/import/a.md')).toEqual({ filePath: 'sources/import/a.md', kind: 'source' })
    expect(resolveUnitPath('models/x.md')).toEqual({ filePath: 'models/x.md', kind: 'source' })
    expect(resolveUnitPath('sources/archive/m/V1/m.md')).toEqual({
      filePath: 'sources/archive/m/V1/m.md',
      kind: 'source',
    })
  })

  it('derives kind from the naming-contract role: model iff knowledge', () => {
    expect(resolveUnitPath('kNNowledge/Client_NN.md')).toEqual({
      filePath: 'kNNowledge/Client_NN.md',
      kind: 'model',
    })
    expect(resolveUnitPath('anywhere/Client_business_NN.md')?.kind).toBe('model')
    expect(resolveUnitPath('sources/import/report.pdf_sidecar_NN.md')?.kind).toBe('source')
    expect(resolveUnitPath('domaiNN_NN.md')?.kind).toBe('source')
  })

  it('rejects traversal, absolute paths, URLs, and unsupported extensions', () => {
    expect(resolveUnitPath('../a.md')).toBeNull()
    expect(resolveUnitPath('/etc/a.md')).toBeNull()
    expect(resolveUnitPath('C:\\a.md')).toBeNull()
    expect(resolveUnitPath('https://x.io/a.md')).toBeNull()
    expect(resolveUnitPath('sources/import/report.pdf')).toBeNull()
  })
})
