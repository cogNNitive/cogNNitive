import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { findRepoRoot } from './repo-root'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-repo-root')
// Outside the repo tree entirely, so no ancestor .git can be found —
// isolates the "no repo root exists" branch from this repo's own .git.
const isolatedDir = join(tmpdir(), 'innfo-mcp-repo-root-test-no-git')

describe('findRepoRoot', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await rm(isolatedDir, { recursive: true, force: true })
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await rm(isolatedDir, { recursive: true, force: true })
  })

  it('finds the repo root from a directory that directly contains .git', async () => {
    await mkdir(join(rootDir, '.git'), { recursive: true })
    expect(findRepoRoot(rootDir)).toBe(rootDir)
  })

  it('walks up nested subdirectories to find a .git directory', async () => {
    await mkdir(join(rootDir, '.git'), { recursive: true })
    const nested = join(rootDir, 'packages', 'innfo-mcp', 'src', 'tools')
    await mkdir(nested, { recursive: true })
    expect(findRepoRoot(nested)).toBe(rootDir)
  })

  it('recognizes a .git worktree/submodule file (not just a directory)', async () => {
    await mkdir(rootDir, { recursive: true })
    await writeFile(join(rootDir, '.git'), 'gitdir: ../.git/worktrees/foo', 'utf-8')
    const nested = join(rootDir, 'nested')
    await mkdir(nested, { recursive: true })
    expect(findRepoRoot(nested)).toBe(rootDir)
  })

  it('returns null when no .git is found before the filesystem root', async () => {
    const nested = join(isolatedDir, 'nested', 'deeper')
    await mkdir(nested, { recursive: true })
    expect(findRepoRoot(nested)).toBeNull()
  })
})
