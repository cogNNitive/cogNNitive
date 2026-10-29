import { describe, it, expect, vi, afterAll } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/** A real I/O failure (EACCES) while reading defaults/ is an error, not "no floor". */
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readdir: ((path: string, ...rest: unknown[]) => {
      if (String(path).endsWith('defaults')) {
        return Promise.reject(Object.assign(new Error(`EACCES: permission denied, scandir '${path}'`), { code: 'EACCES' }))
      }
      return (actual.readdir as (...a: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readdir,
  }
})

import { resolveEffective } from './resolve-effective'

const FIX = resolve(import.meta.dirname!, '..', '..', '..', 'nn-core', 'tests', 'fixtures', 'scoped-portfolio')
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'nn-floor-doc-')))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

describe('locateFloor I/O failures', () => {
  it('FLOOR_UNREADABLE when defaults/ cannot be read, without a machine path', async () => {
    const dir = join(scratch, 'portfolio')
    cpSync(FIX, dir, { recursive: true })
    const pkg = join(dir, 'specs', 'bluepriNNts', 'settings')
    mkdirSync(join(pkg, 'defaults'), { recursive: true })
    writeFileSync(join(pkg, 'spec_NN.md'), '---\nlevel: 2\nspec_version: "V_0-1-0"\n---\n')
    const isolated = { globalDir: join(scratch, 'global'), skillsDir: join(scratch, 'skills') }
    mkdirSync(isolated.globalDir)
    mkdirSync(isolated.skillsDir)
    const r = await resolveEffective(dir, { path: 'programs/alpha/projects/p1/p1_NN.md', key: 'health', strategy: 'override' }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'FLOOR_UNREADABLE' })
    expect(JSON.stringify(r)).not.toContain(dir.replaceAll('\\', '\\\\'))
    expect(JSON.stringify(r)).not.toContain(dir)
  })
})
