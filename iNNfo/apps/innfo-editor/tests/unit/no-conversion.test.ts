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

describe('no in-place storage mode conversion (R8, R19 partial)', () => {
  it('has no code path that assigns a new storageMode to an existing node (no conversion action)', () => {
    const files = walk(srcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.vue'))
    const offending: string[] = []
    for (const file of files) {
      // Assignment to `.storageMode =` outside of node construction (object
      // literal properties like `storageMode: 'FILE'` are the initial,
      // parse-time assignment and are allowed; a *mutation* like
      // `node.storageMode = 'FOLDER'` would be a conversion code path).
      const content = readFileSync(file, 'utf-8')
      if (/\.storageMode\s*=\s*['"]/.test(content)) {
        offending.push(file)
      }
    }
    expect(offending).toEqual([])
  })

  it('has no UI/control named toward conversion (convert/toConversion) anywhere in src', () => {
    const files = walk(srcDir)
    const offending = files.filter((f) => /convert/i.test(f))
    expect(offending).toEqual([])
  })
})
