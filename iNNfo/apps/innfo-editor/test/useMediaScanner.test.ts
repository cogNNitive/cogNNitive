import { describe, it, expect } from 'vitest'
import { scanNodeMedia } from '../src/composables/useMediaScanner'
import type { DirectoryHandleLike } from '@cognnitive/innfo-core'

function createMockDirectory(files: Record<string, { kind: 'file' | 'directory'; entries?: Record<string, any> }>): DirectoryHandleLike {
  return {
    async getDirectoryHandle(name: string) {
      if (files[name] && files[name].kind === 'directory') {
        const subEntries = files[name].entries ?? {}
        return createMockDirectory(subEntries)
      }
      throw new Error(`Directory not found: ${name}`)
    },
    async getFileHandle() {
      throw new Error('Not implemented')
    },
    async *entries() {
      for (const [name, data] of Object.entries(files)) {
        yield [name, { kind: data.kind }] as [string, { kind: 'file' | 'directory' }]
      }
    },
  } as DirectoryHandleLike
}

describe('useMediaScanner', () => {
  it('includes .xls files alongside .xlsx, .docx, .pdf, and images', async () => {
    const mockRoot = createMockDirectory({
      test_element: {
        kind: 'directory',
        entries: {
          'data.xls': { kind: 'file' },
          'report.xlsx': { kind: 'file' },
          'doc.docx': { kind: 'file' },
          'manual.pdf': { kind: 'file' },
          'photo.png': { kind: 'file' },
        },
      },
    })

    const result = await scanNodeMedia(mockRoot, 'test_element')
    expect(result.assets).toBeDefined()
    expect(result.warnings).toBeDefined()

    const filenames = result.assets.map((a) => a.filename)
    expect(filenames).toContain('data.xls')
    expect(filenames).toContain('report.xlsx')
    expect(filenames).toContain('doc.docx')
    expect(filenames).toContain('manual.pdf')
    expect(filenames).toContain('photo.png')
    expect(result.warnings).toHaveLength(0)
  })

  it('omits unsupported extensions (.exe, .zip, .txt) and emits explicit warnings', async () => {
    const mockRoot = createMockDirectory({
      test_element: {
        kind: 'directory',
        entries: {
          'valid.xls': { kind: 'file' },
          'setup.exe': { kind: 'file' },
          'archive.zip': { kind: 'file' },
          'notes.txt': { kind: 'file' },
        },
      },
    })

    const result = await scanNodeMedia(mockRoot, 'test_element')
    const filenames = result.assets.map((a) => a.filename)

    expect(filenames).toContain('valid.xls')
    expect(filenames).not.toContain('setup.exe')
    expect(filenames).not.toContain('archive.zip')
    expect(filenames).not.toContain('notes.txt')

    expect(result.warnings.length).toBe(3)
    expect(result.warnings.some((w) => w.includes('setup.exe') && w.includes('exe'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('archive.zip') && w.includes('zip'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('notes.txt') && w.includes('txt'))).toBe(true)
  })
})
