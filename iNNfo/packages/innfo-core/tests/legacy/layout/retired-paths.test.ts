import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..', '..', '..')

// Live code roots. Frozen content (docs, samples, published specs) is not scanned.
const LIVE_ROOTS = [
  'iNNfo/packages/innfo-core/src',
  'iNNfo/packages/innfo-mcp/src',
  'scripts',
  'skills/nn-sources/scripts',
  'skills/nn-preflight/scripts',
  'skills/nn-upgrade/scripts',
]

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'fixtures'])
const SCANNED_EXT = /\.(ts|vue|js|mjs|cjs)$/
const SKIPPED_FILE = /(\.generated\.|\.test\.|\.spec\.|bundle|canonical-registry\.ts$)/

// Retired layouts: `export/` and `sources/export/` (now `artifacts/`), `sources/original/` (now
// `sources/import/`), the `sources/nn/` mirror tree (sidecars are co-located), and `sources/archive/`.
const RETIRED: Array<{ name: string; re: RegExp }> = [
  { name: 'export/ folder', re: /(?<![\w/.-])export\//},
  { name: 'innfo/export/ folder', re: /innfo\/export\// },
  { name: 'sources/original', re: /sources\/original|sources['"`, ]+original\b|\(sourcesDir, 'original'\)/ },
  { name: 'sources/nn|export|archive', re: /sources\/(nn|export|archive)|sources['\"`, ]+(nn|export|archive)/ },
  { name: "join(root, 'export')", re: /join\(\s*(?:projectDir|rootDir|root|cwd|workspaceRoot)\s*,\s*'export'/ },
  { name: "'export' directory entry", re: /^\s*'export',?\s*(\/\/.*)?$|,\s*'export',\s*'artifacts'/ },
]

// A file carrying a `legacy:cognitivize-in-place/<id>` marker is quarantined legacy code
// (the ledger guard enforces marker to ledger entry 1:1) and may name retired layouts.
const MARKER = 'legacy:cognitivize-in-place/'

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out)
    } else if (SCANNED_EXT.test(name) && !SKIPPED_FILE.test(name)) {
      out.push(full)
    }
  }
}

describe('retired layout paths are absent from live code', () => {
  it('names no retired folder outside marked legacy files', () => {
    const files: string[] = []
    for (const root of LIVE_ROOTS) walk(join(repoRoot, root), files)
    expect(files.length).toBeGreaterThan(50)

    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (text.includes(MARKER)) continue
      text.split('\n').forEach((line, i) => {
        const rel = relative(repoRoot, file).replace(/\\/g, '/')
        for (const { name, re } of RETIRED) {
          if (re.test(line)) {
            hits.push(`${rel}:${i + 1} [${name}] ${line.trim().slice(0, 100)}`)
          }
        }
      })
    }
    expect(hits).toEqual([])
  })
})
