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

      // Non-existent source with non-existent parent directory
      const parentMissingResult = resolver('sources/missing_dir/file.md', join(subDir, 'model.md'))
      expect(parentMissingResult.exists).toBe(false)
      expect(parentMissingResult.parentExists).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('reports suggestions for near-miss file names in existing directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'fs-resolver-sugg-'))
    try {
      const sourcesDir = join(tempDir, 'sources')
      mkdirSync(sourcesDir, { recursive: true })
      writeFileSync(join(sourcesDir, 'annual_reports.md'), '# Annual Reports\n', 'utf8')

      const resolver = createFsSourceResolver(tempDir)
      const nearMiss = resolver('sources/annual_repots.md')
      expect(nearMiss.exists).toBe(false)
      expect(nearMiss.parentExists).toBe(true)
      expect(nearMiss.suggestions).toContain('annual_reports.md')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('resolves an imported-domain alias prefix inside the sibling domain', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'fs-resolver-alias-'))
    try {
      const originDir = join(tempDir, 'iNNtake_NN')
      const consumerDir = join(tempDir, 'consumer_NN')
      mkdirSync(join(originDir, 'sources', 'import', 'nnews'), { recursive: true })
      mkdirSync(consumerDir, { recursive: true })

      writeFileSync(
        join(originDir, 'sources', 'import', 'nnews', 'article.md'),
        '# Chess engine\n\n## Could a modern chess engine have defeated Kasparov\n\nBody\n',
        'utf8',
      )
      writeFileSync(
        join(consumerDir, 'domaiNN_NN.md'),
        '# NN Imported Domain\n\n## NN Imported Domain: iNNtake\npath:: ../iNNtake_NN\n',
        'utf8',
      )
      writeFileSync(join(consumerDir, 'secret.md'), '# Secret\n', 'utf8')

      const resolver = createFsSourceResolver(consumerDir)

      const result = resolver('iNNtake>sources/import/nnews/article.md', 'kNNowledge/model_NN.md')
      expect(result.exists).toBe(true)
      expect(result.content).toContain('Body')
      expect(result.headings).toContain(
        'could-a-modern-chess-engine-have-defeated-kasparov',
      )

      // The alias is a root, not a traversal hatch.
      const escaped = resolver('iNNtake>../consumer_NN/secret.md', 'kNNowledge/model_NN.md')
      expect(escaped.exists).toBe(false)

      // An undeclared alias never resolves.
      const undeclared = resolver('nnowhere>sources/x.md', 'kNNowledge/model_NN.md')
      expect(undeclared.exists).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('validates an alias-prefixed citation end to end', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'fs-resolver-alias-e2e-'))
    try {
      const originDir = join(tempDir, 'iNNtake_NN')
      const consumerDir = join(tempDir, 'consumer_NN')
      mkdirSync(join(originDir, 'sources', 'import'), { recursive: true })
      mkdirSync(consumerDir, { recursive: true })
      writeFileSync(
        join(originDir, 'sources', 'import', 'article.md'),
        '# Chess engine\n\n## Could a modern chess engine win\n\nBody\n',
        'utf8',
      )
      writeFileSync(
        join(consumerDir, 'domaiNN_NN.md'),
        '# NN Imported Domain\n\n## NN Imported Domain: iNNtake\npath:: ../iNNtake_NN\n',
        'utf8',
      )

      const { validateCitations } = await import('../src/validator/workspaceSources.js')
      const diagnostics = validateCitations(
        [
          {
            value: 'iNNtake>sources/import/article.md@## Could a modern chess engine win',
            referringPath: 'kNNowledge/model_NN.md',
            field: 'sources',
          },
        ],
        createFsSourceResolver(consumerDir),
      )
      expect(diagnostics).toEqual([])
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
