import { describe, it, expect, vi } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'

describe('createSpecsBackupZip crc32 runtime floor', () => {
  it('throws clear error message when node:zlib crc32 is undefined', async () => {
    vi.doMock('node:zlib', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:zlib')>()
      return {
        ...actual,
        crc32: undefined,
      }
    })

    const { createSpecsBackupZip } = await import('../src/tools/spec-backup.js')

    const tempDir = await mkdtemp(join(tmpdir(), 'innfo-mcp-backup-'))
    try {
      const specDir = join(tempDir, 'specs')
      await mkdir(specDir, { recursive: true })
      await writeFile(join(specDir, 'test.md'), '# test\n')

      await expect(createSpecsBackupZip(tempDir)).rejects.toThrow(
        'Node >= 20.15 required for spec backups (node:zlib.crc32)',
      )
    } finally {
      await rm(tempDir, { recursive: true, force: true })
      vi.doUnmock('node:zlib')
    }
  })
})
