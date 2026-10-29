import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findDomainRoot, isDomainRoot } from './root.js'

let base: string

beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'nn-scope-root-')))
})

afterEach(() => {
  rmSync(base, { recursive: true, force: true })
})

function touch(path: string, content = '# NN Models\n'): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

describe('isDomainRoot', () => {
  it('is true for a directory holding the entrypoint file', () => {
    touch(join(base, 'acme', 'domaiNN_NN.md'))
    expect(isDomainRoot(join(base, 'acme'))).toBe(true)
  })

  it('is false when the entrypoint name is a directory, or absent', () => {
    mkdirSync(join(base, 'odd', 'domaiNN_NN.md'), { recursive: true })
    expect(isDomainRoot(join(base, 'odd'))).toBe(false)
    expect(isDomainRoot(join(base, 'nowhere'))).toBe(false)
  })

  it('does not take a directory named like the entrypoint for a root', () => {
    mkdirSync(join(base, 'acme', 'sub', 'domaiNN_NN.md'), { recursive: true })
    touch(join(base, 'acme', 'domaiNN_NN.md'))
    expect(findDomainRoot(join(base, 'acme', 'sub'))).toBe(join(base, 'acme'))
  })
})

describe('findDomainRoot', () => {
  it('finds the root from a deep document', () => {
    touch(join(base, 'acme', 'domaiNN_NN.md'))
    const doc = join(base, 'acme', 'programs', 'alpha', 'projects', 'p1', 'plan_01.md')
    touch(doc)
    expect(findDomainRoot(doc)).toBe(join(base, 'acme'))
  })

  it('finds the root from a directory path, marker directory included', () => {
    touch(join(base, 'acme', 'domaiNN_NN.md'))
    mkdirSync(join(base, 'acme', 'programs'), { recursive: true })
    expect(findDomainRoot(join(base, 'acme'))).toBe(join(base, 'acme'))
    expect(findDomainRoot(join(base, 'acme', 'programs'))).toBe(join(base, 'acme'))
  })

  it('works for a domaiNN with no .git anywhere', () => {
    touch(join(base, 'plain', 'domaiNN_NN.md'))
    touch(join(base, 'plain', 'sub', 'a_NN.md'))
    expect(findDomainRoot(join(base, 'plain', 'sub', 'a_NN.md'))).toBe(join(base, 'plain'))
  })

  it('ignores a .git directory above the root', () => {
    mkdirSync(join(base, '.git'), { recursive: true })
    touch(join(base, 'acme', 'domaiNN_NN.md'))
    touch(join(base, 'acme', 'docs', 'a_NN.md'))
    expect(findDomainRoot(join(base, 'acme', 'docs', 'a_NN.md'))).toBe(join(base, 'acme'))
  })

  it('treats a repository root without a marker as no root (null, no throw)', () => {
    mkdirSync(join(base, 'repo', '.git'), { recursive: true })
    touch(join(base, 'repo', 'docs', 'a_NN.md'))
    expect(findDomainRoot(join(base, 'repo', 'docs', 'a_NN.md'))).toBeNull()
    expect(findDomainRoot(join(base, 'repo'))).toBeNull()
  })

  it('treats a nested domaiNN_NN.md as its own root', () => {
    touch(join(base, 'outer', 'domaiNN_NN.md'))
    touch(join(base, 'outer', 'vendor', 'inner', 'domaiNN_NN.md'))
    const doc = join(base, 'outer', 'vendor', 'inner', 'docs', 'a_01.md')
    touch(doc)
    expect(findDomainRoot(doc)).toBe(join(base, 'outer', 'vendor', 'inner'))
  })

  it('does not accept a directory named domaiNN_NN.md as a marker', () => {
    mkdirSync(join(base, 'acme', 'domaiNN_NN.md'), { recursive: true })
    expect(findDomainRoot(join(base, 'acme'))).toBeNull()
  })
})
