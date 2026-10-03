import { describe, it, expect } from 'vitest'
import { parseCitation, resolveUnitPath } from '../src/index.js'

describe('parseCitation', () => {
  describe('canonical @ markdown citations', () => {
    it('parses source heading citation with level', () => {
      const cit = parseCitation('sources/nn/interview.md@## Clients')
      expect(cit).toEqual({
        filePath: 'sources/nn/interview.md',
        fileName: 'interview.md',
        kind: 'source',
        raw: 'sources/nn/interview.md@## Clients',
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

    it('parses sources/export/ markdown heading citation', () => {
      const cit = parseCitation('sources/export/report.md@### Findings')
      expect(cit).toEqual({
        filePath: 'sources/export/report.md',
        fileName: 'report.md',
        kind: 'source',
        raw: 'sources/export/report.md@### Findings',
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
      const cit = parseCitation('sources/nn/doc.md@## Overview&summary')
      expect(cit).toEqual({
        filePath: 'sources/nn/doc.md',
        fileName: 'doc.md',
        kind: 'source',
        raw: 'sources/nn/doc.md@## Overview&summary',
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
      const cit = parseCitation('sources/nn/prices.csv@R12&price')
      expect(cit).toEqual({
        filePath: 'sources/nn/prices.csv',
        fileName: 'prices.csv',
        kind: 'source',
        raw: 'sources/nn/prices.csv@R12&price',
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
        filePath: 'sources/nn/data.csv',
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

    it('parses sources/nn/ bare path', () => {
      const cit = parseCitation('sources/nn/interview.md')
      expect(cit).toEqual({
        filePath: 'sources/nn/interview.md',
        fileName: 'interview.md',
        kind: 'source',
        raw: 'sources/nn/interview.md',
      })
      expect(cit?.unit).toBeUndefined()
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses sources/export/ bare path', () => {
      const cit = parseCitation('sources/export/deliverable.md')
      expect(cit).toEqual({
        filePath: 'sources/export/deliverable.md',
        fileName: 'deliverable.md',
        kind: 'source',
        raw: 'sources/export/deliverable.md',
      })
      expect(cit?.unit).toBeUndefined()
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses unqualified bare path as sources/nn/', () => {
      const cit = parseCitation('notes.md')
      expect(cit).toEqual({
        filePath: 'sources/nn/notes.md',
        fileName: 'notes.md',
        kind: 'source',
        raw: 'notes.md',
      })
      expect(cit?.unit).toBeUndefined()
      expect(cit?.legacyHash).toBeUndefined()
    })

    it('parses bare CSV path', () => {
      const cit = parseCitation('sources/nn/dataset.csv')
      expect(cit).toEqual({
        filePath: 'sources/nn/dataset.csv',
        fileName: 'dataset.csv',
        kind: 'source',
        raw: 'sources/nn/dataset.csv',
      })
      expect(cit?.unit).toBeUndefined()
    })
  })

  describe('legacy #slug citations', () => {
    it('parses legacy #slug on sources/nn/ path with legacyHash: true', () => {
      const cit = parseCitation('sources/nn/a.md#intro')
      expect(cit).toEqual({
        filePath: 'sources/nn/a.md',
        fileName: 'a.md',
        slug: 'intro',
        kind: 'source',
        raw: 'sources/nn/a.md#intro',
        legacyHash: true,
      })
    })

    it('parses legacy #slug on unqualified path with legacyHash: true', () => {
      const cit = parseCitation('a.md#intro')
      expect(cit).toEqual({
        filePath: 'sources/nn/a.md',
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
    it('rejects models/ prefix', () => {
      expect(parseCitation('models/Client_NN.md@## Stakeholders')).toBeNull()
      expect(parseCitation('models/Client_NN.md#intro')).toBeNull()
      expect(parseCitation('models/Client_NN.md')).toBeNull()
    })

    it('rejects line-range anchors', () => {
      expect(parseCitation('sources/nn/a.md@L10-L20')).toBeNull()
      expect(parseCitation('sources/nn/a.md#L10-L20')).toBeNull()
      expect(parseCitation('sources/nn/a.md#L15')).toBeNull()
    })

    it('rejects src-NNN wrappers', () => {
      expect(parseCitation('src-001')).toBeNull()
      expect(parseCitation('src-123 sources/nn/a.md')).toBeNull()
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
  it('accepts sources/nn/, sources/export/, and kNNowledge/', () => {
    expect(resolveUnitPath('sources/nn/a.md')).toEqual({
      filePath: 'sources/nn/a.md',
      kind: 'source',
    })
    expect(resolveUnitPath('sources/export/report.md')).toEqual({
      filePath: 'sources/export/report.md',
      kind: 'source',
    })
    expect(resolveUnitPath('kNNowledge/Client_NN.md')).toEqual({
      filePath: 'kNNowledge/Client_NN.md',
      kind: 'model',
    })
  })

  it('rejects models/ prefix', () => {
    expect(resolveUnitPath('models/Client_NN.md')).toBeNull()
    expect(resolveUnitPath('models/x.md')).toBeNull()
  })

  it('resolves unqualified paths to sources/nn/', () => {
    expect(resolveUnitPath('custom.md')).toEqual({
      filePath: 'sources/nn/custom.md',
      kind: 'source',
    })
    expect(resolveUnitPath('data.csv')).toEqual({
      filePath: 'sources/nn/data.csv',
      kind: 'source',
    })
  })
})
