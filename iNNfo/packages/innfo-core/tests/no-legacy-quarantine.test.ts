import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const PKG_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(PKG_ROOT, '..', '..', '..')

// Built from parts so this file does not match its own scan.
const RETIRED_TOKENS = ['detect' + 'Legacy', 'legacy' + '-detect', 'legacy' + '-hint', 'DetectLegacy' + 'Result']

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|js|mjs|cjs)$/.test(name)) out.push(full)
  }
  return out
}

describe('legacy quarantine is removed from innfo-core', () => {
  it('package.json declares no ./legacy export', () => {
    const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'))
    expect(Object.keys(pkg.exports)).not.toContain('./legacy')
  })

  it('has no src/legacy module and no tests/legacy fixtures', () => {
    expect(existsSync(join(PKG_ROOT, 'src', 'legacy'))).toBe(false)
    expect(existsSync(join(PKG_ROOT, 'tests', 'legacy'))).toBe(false)
  })

  it('no source in core, MCP or the preflight scripts references the legacy detector or hint', () => {
    const roots = [
      join(PKG_ROOT, 'src'),
      join(REPO_ROOT, 'iNNfo', 'packages', 'innfo-mcp', 'src'),
      join(REPO_ROOT, 'skills', 'nn-preflight', 'scripts'),
    ]
    const offenders: string[] = []
    for (const root of roots) {
      for (const file of walk(root)) {
        if (/\.test\.(ts|js|mjs)$/.test(file) || /\.spec\.ts$/.test(file)) continue
        const text = readFileSync(file, 'utf8')
        for (const token of RETIRED_TOKENS) {
          if (text.includes(token)) offenders.push(`${relative(REPO_ROOT, file)} -> ${token}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('the MCP package has no legacy-hint module and no ./legacy vitest alias', () => {
    const mcp = join(REPO_ROOT, 'iNNfo', 'packages', 'innfo-mcp')
    expect(existsSync(join(mcp, 'src', 'tools', 'legacy' + '-hint.ts'))).toBe(false)
    expect(readFileSync(join(mcp, 'vitest.config.ts'), 'utf8')).not.toContain('innfo-core/legacy')
  })
})
