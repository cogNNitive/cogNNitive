import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(import.meta.dirname!, '..', '..', 'src')

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

describe('no dual document stores (R3)', () => {
  it('has no documentStore or folderStore file anywhere in apps/format-editor/src', () => {
    const files = walk(srcDir)
    const offendingFiles = files.filter((f) => /document[sS]tore|folder[sS]tore/i.test(f))
    expect(offendingFiles).toEqual([])
  })

  it('has no documentStore or folderStore export defined in source', () => {
    const files = walk(srcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.vue'))
    const offendingContent: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      if (/defineStore\(\s*['"](documentStore|folderStore|document|folder)['"]/i.test(content)) {
        offendingContent.push(file)
      }
    }
    expect(offendingContent).toEqual([])
  })
})
