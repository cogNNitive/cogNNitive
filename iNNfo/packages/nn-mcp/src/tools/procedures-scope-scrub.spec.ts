import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * A real read failure (EACCES) of a procedure document, in the domain root and in a floor package
 * that lives OUTSIDE the root, must reach the caller without an absolute machine path.
 */
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: ((path: unknown, ...rest: unknown[]) => {
      if (String(path).includes('unreadable_procedures_NN.md')) {
        throw Object.assign(new Error(`EACCES: permission denied, open '${String(path)}'`), { code: 'EACCES' })
      }
      return (actual.readFileSync as (...a: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readFileSync,
  }
})

import { listBlueprintProcedures } from './spec'

const FIX = resolve(import.meta.dirname!, '..', '..', '..', 'nn-core', 'tests', 'fixtures', 'scoped-portfolio')
const P1 = 'programs/alpha/projects/p1/p1_NN.md'

let scratch: string

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'nn-procedures-scrub-')))
})

afterAll(() => rmSync(scratch, { recursive: true, force: true }))

describe('listBlueprintProcedures({ path }): diagnostics carry no absolute path', () => {
  it('scrubs an unreadable root procedure and an unreadable floor procedure of a package outside the root', async () => {
    const dir = join(scratch, 'domain')
    cpSync(FIX, dir, { recursive: true })
    writeFileSync(join(dir, 'procedures', 'unreadable_procedures_NN.md'), '---\nlevel: 3\n---\n')

    const globalDir = join(scratch, 'global')
    const pkg = join(globalDir, 'settings')
    mkdirSync(join(pkg, 'procedures'), { recursive: true })
    writeFileSync(join(pkg, 'spec_NN.md'), '---\nlevel: 2\nspec_version: "V_0-1-0"\n---\n')
    writeFileSync(join(pkg, 'procedures', 'unreadable_procedures_NN.md'), '---\nlevel: 3\n---\n')
    const skillsDir = join(scratch, 'skills')
    mkdirSync(skillsDir)

    const r = await listBlueprintProcedures(dir, { path: P1 }, { globalDir, skillsDir })
    expect(r).toMatchObject({ ok: true })
    if (!r.ok) throw new Error('unreachable')

    const unreadable = r.diagnostics.filter((d) => d.code === 'UNREADABLE_DOCUMENT')
    expect(unreadable.map((d) => d.scope).sort()).toEqual(['', 'bluepriNNt:settings'])

    const text = JSON.stringify(r)
    for (const abs of [dir, globalDir, scratch]) {
      for (const form of [abs, abs.replaceAll('\\', '/'), abs.replaceAll('\\', '\\\\')]) expect(text).not.toContain(form)
    }
    expect(text).toContain('EACCES')
  })
})
