import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listModels } from '../src/index'

const tempDirs: string[] = []

async function makeRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'innfo-listmodels-'))
  tempDirs.push(dir)
  return dir
}

describe('listModels (recursive scan)', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
  })

  it('finds nested model files recursively and skips ignored directories', async () => {
    const root = await makeRoot()

    // Root-level model.
    await writeFile(join(root, 'Root_V_0-1-0_NN.md'), '# Root', 'utf-8')

    // Nested model inside a normal subdirectory tree.
    await mkdir(join(root, 'models', 'subdir'), { recursive: true })
    await writeFile(
      join(root, 'models', 'subdir', 'Nested_V_0-2-0_NN.md'),
      '# Nested',
      'utf-8',
    )

    // Directories that must be skipped entirely.
    await mkdir(join(root, 'backups'), { recursive: true })
    await writeFile(join(root, 'backups', 'Backup_V_0-0-1_NN.md'), '# Backup', 'utf-8')
    await mkdir(join(root, 'archive'), { recursive: true })
    await writeFile(join(root, 'archive', 'Old_V_0-0-1_NN.md'), '# Old', 'utf-8')
    await mkdir(join(root, 'specs'), { recursive: true })
    await writeFile(join(root, 'specs', 'Spec_NN.md'), '# Spec', 'utf-8')
    await mkdir(join(root, 'node_modules'), { recursive: true })
    await writeFile(join(root, 'node_modules', 'Dep_V_0-0-1_NN.md'), '# Dep', 'utf-8')
    await mkdir(join(root, '.git'), { recursive: true })
    await writeFile(join(root, '.git', 'Git_V_0-0-1_NN.md'), '# Git', 'utf-8')

    // index.md must keep being skipped.
    await writeFile(join(root, 'index.md'), '# Index', 'utf-8')

    const models = await listModels(root)
    const ids = models.map((m) => m.id)

    expect(ids).toContain('Root_V_0-1-0_NN')
    expect(ids).toContain('Nested_V_0-2-0_NN')
    expect(ids).not.toContain('Backup_V_0-0-1_NN')
    expect(ids).not.toContain('Old_V_0-0-1_NN')
    expect(ids).not.toContain('Spec_NN')
    expect(ids).not.toContain('Dep_V_0-0-1_NN')
    expect(ids).not.toContain('Git_V_0-0-1_NN')
    expect(ids).not.toContain('index')

    const nested = models.find((m) => m.id === 'Nested_V_0-2-0_NN')
    expect(nested).toBeDefined()
    expect(nested!.version).toBe('0-2-0')
    expect(nested!.path).toBe(join(root, 'models', 'subdir', 'Nested_V_0-2-0_NN.md'))
  })

  it('returns an empty list for a non-existent root', async () => {
    const models = await listModels(join(tmpdir(), 'does-not-exist-innfo'))
    expect(models).toEqual([])
  })
})
