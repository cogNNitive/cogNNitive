import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guard for design.md D3's "additional finding": three source files hardcode
 * `${SAMPLE_BASE}/.../samples/..._NN.md` starter-sample URLs that assert the
 * CURRENT default sample for a template. Every template referenced here ships
 * a `_V_0-2-0_` sample on disk, so none of these URLs may still point at a
 * `_V_0-1-0_` sample, and every referenced path must resolve under `specs/`.
 */
const repoRoot = join(import.meta.dirname!, '..', '..', '..', '..')
const editorSrc = join(repoRoot, 'apps', 'innfo-editor', 'src')

const SOURCE_FILES = [
  join(editorSrc, 'views', 'HomeView.vue'),
  join(editorSrc, 'components', 'layout', 'SetupWizard.vue'),
  join(editorSrc, 'composables', 'useWorkspaceScaffolding.ts'),
]

/** `${SAMPLE_BASE}/<template-relative path>_NN.md` literals. */
const SAMPLE_URL_RE = /\$\{SAMPLE_BASE\}\/([A-Za-z0-9_./-]+_NN\.md)/g

function extractSampleUrls(file: string): string[] {
  const text = readFileSync(file, 'utf-8')
  return [...text.matchAll(SAMPLE_URL_RE)].map((m) => m[1])
}

const allRefs = SOURCE_FILES.flatMap((file) =>
  extractSampleUrls(file).map((rel) => ({ file, rel })),
)

describe('starter-sample URLs — V_0-2-0 adoption (D3 additional finding)', () => {
  it('finds the starter-sample URL literals it is meant to guard', () => {
    expect(allRefs.length).toBeGreaterThanOrEqual(9)
  })

  it('every starter-sample URL points at a _V_0-2-0_ sample', () => {
    const stale = allRefs.filter(({ rel }) => rel.includes('_V_0-1-0_'))
    expect(stale.map(({ file, rel }) => `${file} -> ${rel}`)).toEqual([])
  })

  it('every referenced starter-sample path exists under specs/templates/', () => {
    const missing = allRefs.filter(
      ({ rel }) => !existsSync(join(repoRoot, 'specs', 'templates', rel)),
    )
    expect(missing.map(({ file, rel }) => `${file} -> ${rel}`)).toEqual([])
  })
})
