import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createFsSourceResolver } from '../src/console/fs-source-resolver.js'

describe('createFsSourceResolver', () => {
  it('resolves source via ancestor sources/ directory walk', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'fs-resolver-test-'))
    try {
      // Structure:
      // tempDir/
      //   sources/
      //     root-source.md
      //   sub/
      //     sources/
      //       sub-source.md
      //     model.md
      const rootSourcesDir = join(tempDir, 'sources')
      const subDir = join(tempDir, 'sub')
      const subSourcesDir = join(subDir, 'sources')

      mkdirSync(rootSourcesDir, { recursive: true })
      mkdirSync(subSourcesDir, { recursive: true })

      writeFileSync(join(rootSourcesDir, 'root-source.md'), '# Root Source\n\n## Overview\nRoot content\n', 'utf8')
      writeFileSync(join(subSourcesDir, 'sub-source.md'), '# Sub Source\n\n## Details\nSub content\n', 'utf8')

      const resolver = createFsSourceResolver(tempDir)

      // Resolve from sub/model.md to sub-source.md
      const subResult = resolver('sources/sub-source.md', join(subDir, 'model.md'))
      expect(subResult.exists).toBe(true)
      expect(subResult.content).toContain('Sub content')
      expect(subResult.headings).toContain('details')

      // Resolve from sub/model.md up to root-source.md
      const rootResult = resolver('sources/root-source.md', join(subDir, 'model.md'))
      expect(rootResult.exists).toBe(true)
      expect(rootResult.content).toContain('Root content')
      expect(rootResult.headings).toContain('overview')

      // Non-existent source
      const nonExistent = resolver('sources/missing.md', join(subDir, 'model.md'))
      expect(nonExistent.exists).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('refuses path traversal / escape out of candidate roots', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'fs-resolver-escape-'))
    try {
      const secretDir = join(tempDir, 'secret')
      const workspaceDir = join(tempDir, 'workspace')
      const sourcesDir = join(workspaceDir, 'sources')

      mkdirSync(secretDir, { recursive: true })
      mkdirSync(sourcesDir, { recursive: true })

      writeFileSync(join(secretDir, 'passwords.txt'), 'supersecret', 'utf8')
      writeFileSync(join(sourcesDir, 'doc.md'), '# Document\n', 'utf8')

      const resolver = createFsSourceResolver(workspaceDir)

      // Attempt escape
      const escapeResult = resolver('../secret/passwords.txt', join(workspaceDir, 'model.md'))
      expect(escapeResult.exists).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
