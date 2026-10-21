import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { assertNever } from '../src/assertNever.js'

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
const fixture = (name: string): string => fileURLToPath(new URL(`./fixtures/exhaustive/${name}.ts`, import.meta.url))

function compile(name: string): { status: number | null; output: string } {
  const r = spawnSync(
    process.execPath,
    [
      tsc,
      '--noEmit',
      '--strict',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--target',
      'ES2022',
      '--skipLibCheck',
      '--types',
      'node',
      fixture(name),
    ],
    { encoding: 'utf8' },
  )
  return { status: r.status, output: `${r.stdout}${r.stderr}` }
}

describe('exhaustive unit.kind dispatch', () => {
  it('a switch over every KnowledgeUnit kind compiles', { timeout: 60_000 }, () => {
    const r = compile('ok')
    expect(r.output).toBe('')
    expect(r.status).toBe(0)
  })

  it('a switch missing a kind is a compile error', { timeout: 60_000 }, () => {
    const r = compile('missing-case')
    expect(r.status).not.toBe(0)
    expect(r.output).toMatch(/matrix/i)
    expect(r.output).toMatch(/never/)
  })

  it('a fake extra kind makes every unhandled switch a compile error', { timeout: 60_000 }, () => {
    const r = compile('fake-kind')
    expect(r.status).not.toBe(0)
    expect(r.output).toMatch(/fake/)
  })

  it('assertNever throws naming the unhandled value at runtime', () => {
    expect(() => assertNever({ kind: 'fake' } as never)).toThrow(/Unhandled.*fake/)
    expect(() => assertNever('x' as never, 'unit kind')).toThrow(/Unhandled unit kind/)
  })
})
