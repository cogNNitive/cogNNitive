import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { parseChangeset } from '../../src/changeset/parser.js'

const repoRoot = join(import.meta.dirname!, '..', '..', '..', '..', '..')

/** Every tracked changeset fixture in the repo, excluding archived model snapshots. */
function trackedChangesets(): string[] {
  const out = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf-8' })
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /_changes_NN\.md$/.test(l))
    .filter((l) => !/(^|\/)archive\//.test(l))
}

describe('repo-wide changeset fixtures', () => {
  it('every tracked changeset fixture parses as an L3 changes document', () => {
    const files = trackedChangesets()
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const content = readFileSync(join(repoRoot, file), 'utf-8')
      const doc = parseChangeset(content)
      expect(doc.frontmatter.level, `${file}: level`).toBe(3)
      expect(doc.frontmatter.parent_spec.name, `${file}: parent_spec.name`).toBe('changes')
    }
  })
})
