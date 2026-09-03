import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const appRoot = join(import.meta.dirname!, '..', '..')

describe('no ESLint FILE<->FOLDER import wall (R17)', () => {
  it('has no ESLint config file in apps/format-editor', () => {
    const candidates = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.ts',
    ]
    const found = candidates.filter((f) => existsSync(join(appRoot, f)))
    expect(found).toEqual([])
  })

  it('has no lint rule name referencing the old FILE/FOLDER boundary anywhere in the app (repo-search assertion)', () => {
    const files = walk(join(appRoot, 'src'))
    const offending = files
      .filter((f) => f.endsWith('.ts') || f.endsWith('.vue') || f.endsWith('.json'))
      .filter((f) => /no-file-folder|file-folder-boundary|restricted-imports.*folder/i.test(f))
    expect(offending).toEqual([])
  })

  it('shared/ and modelStore are already imported from components regardless of node storage mode (R17 "Cross-import allowed")', () => {
    // NodeForm.vue was deleted in Phase 6 (replaced by BlockSheet/BlockFeed).
    // Verify cross-import freedom using the current layout/editor components.
    const conceptTreeNodeSrc = readFileSync(
      join(appRoot, 'src', 'components', 'layout', 'ConceptTreeNode.vue'),
      'utf-8',
    )
    const widgetFieldSrc = readFileSync(
      join(appRoot, 'src', 'shared', 'widgets', 'WidgetField.vue'),
      'utf-8',
    )

    // components/layout/ freely imports from stores/modelStore.
    expect(conceptTreeNodeSrc).toMatch(/from ['"]\.\.\/\.\.\/stores\/modelStore['"]/)
    // shared/ freely imports from stores/modelStore too — no direction is walled off.
    expect(widgetFieldSrc).toMatch(/from ['"]\.\.\/\.\.\/stores\/modelStore['"]/)
  })
})

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}
