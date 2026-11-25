import { describe, it, expect, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { CONSOLE_BUNDLE, resolveConsoleBundlePath } from './locate-writer.js'

describe('resolveConsoleBundlePath (trusted locations only)', () => {
  const dirs: string[] = []
  const scratch = (): string => {
    const d = mkdtempSync(join(tmpdir(), 'nn-bundle-path-'))
    dirs.push(d)
    return d
  }
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
  })

  it('prefers $INNFO_CONSOLE_DIR, then the installed ~/.agents/console, and is null when none holds it', () => {
    const consoleDir = scratch()
    const home = scratch()
    const installed = join(home, '.agents', 'console')
    mkdirSync(installed, { recursive: true })
    writeFileSync(join(installed, CONSOLE_BUNDLE), '/* installed */')
    expect(resolveConsoleBundlePath({ env: {}, home, devRoot: null })).toBe(
      join(installed, CONSOLE_BUNDLE),
    )

    writeFileSync(join(consoleDir, CONSOLE_BUNDLE), '/* env */')
    expect(
      resolveConsoleBundlePath({ env: { INNFO_CONSOLE_DIR: consoleDir }, home, devRoot: null }),
    ).toBe(join(consoleDir, CONSOLE_BUNDLE))

    expect(resolveConsoleBundlePath({ env: {}, home: scratch(), devRoot: null })).toBeNull()
  })

  it('finds the composed bundle of the dev checkout this module lives in', () => {
    const found = resolveConsoleBundlePath({ env: {}, home: scratch() })
    expect(found).not.toBeNull()
    expect(found!.split(sep).join('/')).toMatch(
      /iNNfo\/specs\/bluepriNNts\/console\/nn-console\.bundle\.js$/,
    )
  })
})
