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
        value: 'sources/nn/guide.md@## Overview',
        referringPath: 'kNNowledge/Client_NN.md',
        element: 'Enterprise Clients',
        field: 'sources',
      },
    ]
    const resolver = contentResolver({
      'sources/nn/guide.md': '# Guide\n\n## Overview\nContent here.\n',
    })

    const diags = validateCitations(sites, resolver)
    expect(diags).toEqual([])
  })

  it('reports KU_DANGLING_FILE with site and target populated on missing file', () => {
    const site: CitationSite = {
      value: 'sources/nn/missing.md@## Overview',
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
      target: 'sources/nn/missing.md',
      site,
    })
  })

  it('reports KU_UNKNOWN_SLUG when heading anchor does not exist', () => {
    const site: CitationSite = {
      value: 'sources/nn/guide.md@## NonExistent',
      referringPath: 'kNNowledge/Client_NN.md',
      element: 'Enterprise Clients',
      field: 'sources',
    }
    const resolver = contentResolver({
      'sources/nn/guide.md': '# Guide\n\n## Overview\nContent here.\n',
    })

    const diags = validateCitations([site], resolver)
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({
      code: 'KU_UNKNOWN_SLUG',
      severity: 'warning',
      path: 'kNNowledge/Client_NN.md#Enterprise Clients.sources',
      target: 'sources/nn/guide.md',
      site,
    })
  })

  it('reports KU_UNKNOWN_ROW and KU_UNKNOWN_COLUMN for CSV citations', () => {
    const csvContent = 'id,name,price\n101,Widget,50\n'
    const resolver = contentResolver({ 'sources/nn/data.csv': csvContent })

    const rowSite: CitationSite = {
      value: 'sources/nn/data.csv@999',
      referringPath: 'export/summary.md',
      field: 'sources',
    }
    const rowDiags = validateCitations([rowSite], resolver)
    expect(rowDiags).toHaveLength(1)
    expect(rowDiags[0]).toMatchObject({
      code: 'KU_UNKNOWN_ROW',
      severity: 'error',
      path: 'export/summary.md#sources',
      target: 'sources/nn/data.csv',
      site: rowSite,
    })

    const colSite: CitationSite = {
      value: 'sources/nn/data.csv@101&nonexistent_col',
      referringPath: 'export/summary.md',
      field: 'sources',
    }
    const colDiags = validateCitations([colSite], resolver)
    expect(colDiags).toHaveLength(1)
    expect(colDiags[0]).toMatchObject({
      code: 'KU_UNKNOWN_COLUMN',
      severity: 'error',
      path: 'export/summary.md#sources',
      target: 'sources/nn/data.csv',
      site: colSite,
    })
  })

  it('reports KU_MALFORMED for models/ prefix with explicit message', () => {
    const site: CitationSite = {
      value: 'models/Client_NN.md@## Overview',
      referringPath: 'export/report.md',
      field: 'sources',
    }

    const diags = validateCitations([site], emptyResolver)
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({
      code: 'KU_MALFORMED',
      severity: 'error',
      path: 'export/report.md#sources',
      target: 'models/Client_NN.md@## Overview',
      site,
    })
    expect(diags[0].message).toContain('`models/` was removed; use `kNNowledge/`')
  })

  it('validates file-level bare paths without anchor and without KU_DEPRECATED_HASH', () => {
    const site: CitationSite = {
      value: 'kNNowledge/Client_NN.md',
      referringPath: 'export/console.html',
      field: 'meta.sources',
    }
    const resolver: SourceResolver = (p) => ({ exists: p === 'kNNowledge/Client_NN.md' })

    const diags = validateCitations([site], resolver)
    expect(diags).toEqual([])
  })
})
