import { describe, it, expect } from 'vitest'
import {
  validateCitations,
  type CitationSite,
  type SourceResolver,
} from '../src/index.js'

describe('validateCitations', () => {
  const contentResolver =
    (files: Record<string, string>): SourceResolver =>
    (refPath) => {
      const content = files[refPath]
      if (content === undefined) return { exists: false }
      const lines = content.split('\n')
      const headings = lines
        .filter((l) => l.startsWith('#'))
        .map((l) => l.replace(/^#+\s*/, '').toLowerCase().replace(/\s+/g, '-'))
      return { exists: true, headings, content }
    }

  const emptyResolver: SourceResolver = () => ({ exists: false })

  it('validates canonical @ heading citations cleanly when target exists', () => {
    const sites: CitationSite[] = [
      {
        value: 'sources/import/guide.md@## Overview',
        referringPath: 'kNNowledge/Client_NN.md',
        element: 'Enterprise Clients',
        field: 'sources',
      },
    ]
    const resolver = contentResolver({
      'sources/import/guide.md': '# Guide\n\n## Overview\nContent here.\n',
    })

    const diags = validateCitations(sites, resolver)
    expect(diags).toEqual([])
  })

  it('reports KU_DANGLING_FILE with site and target populated on missing file', () => {
    const site: CitationSite = {
      value: 'sources/import/missing.md@## Overview',
      referringPath: 'kNNowledge/Client_NN.md',
      element: 'Enterprise Clients',
      field: 'sources',
    }

    const diags = validateCitations([site], emptyResolver)
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({
      code: 'KU_DANGLING_FILE',
      severity: 'error',
      path: 'kNNowledge/Client_NN.md#Enterprise Clients.sources',
      target: 'sources/import/missing.md',
      site,
    })
  })

  it('reports KU_UNKNOWN_SLUG when heading anchor does not exist', () => {
    const site: CitationSite = {
      value: 'sources/import/guide.md@## NonExistent',
      referringPath: 'kNNowledge/Client_NN.md',
      element: 'Enterprise Clients',
      field: 'sources',
    }
    const resolver = contentResolver({
      'sources/import/guide.md': '# Guide\n\n## Overview\nContent here.\n',
    })

    const diags = validateCitations([site], resolver)
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({
      code: 'KU_UNKNOWN_SLUG',
      severity: 'warning',
      path: 'kNNowledge/Client_NN.md#Enterprise Clients.sources',
      target: 'sources/import/guide.md',
      site,
    })
  })

  it('reports KU_UNKNOWN_ROW and KU_UNKNOWN_COLUMN for CSV citations', () => {
    const csvContent = 'id,name,price\n101,Widget,50\n'
    const resolver = contentResolver({ 'sources/import/data.csv': csvContent })

    const rowSite: CitationSite = {
      value: 'sources/import/data.csv@999',
      referringPath: 'artifacts/summary.md',
      field: 'sources',
    }
    const rowDiags = validateCitations([rowSite], resolver)
    expect(rowDiags).toHaveLength(1)
    expect(rowDiags[0]).toMatchObject({
      code: 'KU_UNKNOWN_ROW',
      severity: 'error',
      path: 'artifacts/summary.md#sources',
      target: 'sources/import/data.csv',
      site: rowSite,
    })

    const colSite: CitationSite = {
      value: 'sources/import/data.csv@101&nonexistent_col',
      referringPath: 'artifacts/summary.md',
      field: 'sources',
    }
    const colDiags = validateCitations([colSite], resolver)
    expect(colDiags).toHaveLength(1)
    expect(colDiags[0]).toMatchObject({
      code: 'KU_UNKNOWN_COLUMN',
      severity: 'error',
      path: 'artifacts/summary.md#sources',
      target: 'sources/import/data.csv',
      site: colSite,
    })
  })

  it('validates file-level bare paths without anchor and without KU_DEPRECATED_HASH', () => {
    const site: CitationSite = {
      value: 'kNNowledge/Client_NN.md',
      referringPath: 'artifacts/console.html',
      field: 'meta.sources',
    }
    const resolver: SourceResolver = (p) => ({ exists: p === 'kNNowledge/Client_NN.md' })

    const diags = validateCitations([site], resolver)
    expect(diags).toEqual([])
  })
})

describe('validateCitations: any domaiNN-relative path (S3a)', () => {
  const site = (value: string): CitationSite => ({
    value,
    referringPath: 'kNNowledge/Client_NN.md',
    element: 'Enterprise Clients',
    field: 'sources',
  })
  const seen: string[] = []
  const resolver: SourceResolver = (refPath) => {
    seen.push(refPath)
    return refPath === 'sources/import/a.md'
      ? { exists: true, headings: ['intro'], content: '## Intro\n' }
      : { exists: false }
  }

  it('resolves a sources/import path as written', () => {
    expect(validateCitations([site('sources/import/a.md@## Intro')], resolver)).toEqual([])
    expect(seen).toContain('sources/import/a.md')
  })

  it('reports KU_DANGLING_FILE for retired prefixes with no special message', () => {
    const diags = validateCitations(
      [site('sources/nn/a.md@## Intro'), site('models/Client_NN.md@## NN Stakeholders: X')],
      resolver,
    )
    expect(diags.map((d) => d.code)).toEqual(['KU_DANGLING_FILE', 'KU_DANGLING_FILE'])
    expect(diags[1].message).not.toMatch(/removed/)
  })

  it('reports KU_BINARY_TARGET suggesting the sidecar', () => {
    const diags = validateCitations([site('sources/import/report.pdf@## Summary')], resolver)
    expect(diags).toHaveLength(1)
    expect(diags[0].code).toBe('KU_BINARY_TARGET')
    expect(diags[0].message).toContain('sources/import/report.pdf_sidecar_NN.md')
  })

  it('reports KU_EXCLUDED_PATH for a staging target', () => {
    const diags = validateCitations([site('staging/scratch.md@## Intro')], resolver)
    expect(diags.map((d) => d.code)).toEqual(['KU_EXCLUDED_PATH'])
  })
})
