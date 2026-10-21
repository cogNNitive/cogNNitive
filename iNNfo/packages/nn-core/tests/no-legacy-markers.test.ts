import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const PKG_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(PKG_ROOT, '..', '..', '..')

// Built from concatenated parts so this test file does not match its own scan.
const RETIRED_TOKENS = [
  'node' + 'Markers',
  'concept' + 'Markers',
  'concept' + 'Tags',
  'set_' + 'marker',
  'item-' + 'markers',
]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|js|mjs|cjs)$/.test(name)) out.push(full)
  }
  return out
}

describe('Task 3.8: no-legacy-markers: live src has no legacy marker or tag constructs outside removed-constructs.ts', () => {
  it('no live source in nn-core/src or nn-mcp/src references legacy tokens', () => {
    const roots = [
      join(PKG_ROOT, 'src'),
      join(REPO_ROOT, 'iNNfo', 'packages', 'nn-mcp', 'src'),
    ]

    const offenders: string[] = []

    for (const root of roots) {
      for (const file of walk(root)) {
        // Exclude test files
        if (/\.test\.(ts|js|mjs)$/.test(file) || /\.spec\.ts$/.test(file)) continue
        // Exclude removed-constructs.ts (which specifically detects and reports them)
        if (file.endsWith('removed-constructs.ts')) continue
        // Exclude canonical-registry.ts (which embeds historical specs like iNNfo_V_0-3-0 verbatim)
        if (file.endsWith('canonical-registry.ts')) continue

        const text = readFileSync(file, 'utf8')
        for (const token of RETIRED_TOKENS) {
          if (text.includes(token)) {
            offenders.push(`${relative(REPO_ROOT, file)} -> ${token}`)
          }
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
