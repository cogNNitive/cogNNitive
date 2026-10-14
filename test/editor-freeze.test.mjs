import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// S5-freeze (variant A3): `iNNfo/apps/innfo-editor` is kept in place but frozen.
// It must stay out of npm workspaces and every gate, while FROZEN.md and the
// committed static build of the hosted app exist. Replaced by the S5d
// no-editor-references guard when the editor is deleted (S5-delete).

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

const EDITOR_DIR = 'iNNfo/apps/innfo-editor'
const REFERENCE = /innfo-editor|iNNfo[\\/]+apps|iNNfo['"],\s*['"]apps/

// Gated surfaces: nothing here may build, test, lint, version-sync or even name the editor.
const GATED_FILES = [
  'package.json',
  'package-lock.json',
  '.githooks/pre-push',
  'scripts/build-docs.mjs',
  'scripts/sync-versions.mjs',
  'scripts/check-integrity.js',
  'scripts/verify.js',
  'scripts/lib/legacy-write-guard.js',
  'scripts/lib/nn-name-regex-guard.js',
]
const GATED_DIRS = [{ dir: '.github/workflows', ext: /\.ya?ml$/ }]

/** Returns `file:line` for every line of `text` that names the frozen editor. */
export function findEditorReferences(file, text) {
  const hits = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (REFERENCE.test(line)) hits.push(`${file}:${i + 1}`)
  })
  return hits
}

function gatedSources() {
  const out = GATED_FILES.map((rel) => ({ rel, abs: join(repoRoot, rel) }))
  for (const { dir, ext } of GATED_DIRS) {
    for (const name of readdirSync(join(repoRoot, dir))) {
      if (ext.test(name)) out.push({ rel: `${dir}/${name}`, abs: join(repoRoot, dir, name) })
    }
  }
  return out
}

describe('frozen editor stays out of every gate', () => {
  it('the scanner can go red: it flags a planted reference', () => {
    assert.deepEqual(
      findEditorReferences('x.yml', 'run: npm --workspace=@cognnitive/innfo-editor test\n'),
      ['x.yml:1'],
    )
    assert.deepEqual(findEditorReferences('x.json', '"iNNfo/apps/*"'), ['x.json:1'])
    assert.deepEqual(findEditorReferences('x.mjs', "path.join(root, 'iNNfo', 'apps', 'a')"), ['x.mjs:1'])
    assert.deepEqual(findEditorReferences('y.yml', 'run: npm test\n'), [])
  })

  it('no gated surface references the editor', () => {
    const hits = gatedSources().flatMap(({ rel, abs }) => findEditorReferences(rel, readFileSync(abs, 'utf8')))
    assert.deepEqual(hits, [])
  })

  it('root workspaces are packages only', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
    assert.deepEqual(pkg.workspaces, ['iNNfo/packages/*'])
  })

  it('jsdom and happy-dom are root devDependencies (gated suites import them)', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
    assert.ok(pkg.devDependencies.jsdom, 'jsdom missing from root devDependencies')
    assert.ok(pkg.devDependencies['happy-dom'], 'happy-dom missing from root devDependencies')
  })
})

describe('the frozen editor is documented and its hosted app is committed', () => {
  it('FROZEN.md exists next to the editor source and says how to thaw it', () => {
    const file = join(repoRoot, EDITOR_DIR, 'FROZEN.md')
    assert.ok(existsSync(file), 'FROZEN.md missing')
    const text = readFileSync(file, 'utf8')
    assert.match(text, /thaw/i)
    assert.match(text, /workspaces/)
  })

  it('docs/innfo/app carries the static snapshot the Pages publish will serve', () => {
    const app = join(repoRoot, 'docs/innfo/app')
    assert.ok(existsSync(join(app, 'index.html')), 'docs/innfo/app/index.html missing')
    const assets = join(app, 'assets')
    assert.ok(existsSync(assets) && statSync(assets).isDirectory(), 'docs/innfo/app/assets missing')
    assert.ok(readdirSync(assets).some((f) => f.endsWith('.js')), 'no JS in docs/innfo/app/assets')
  })

  it('the editor source is still in place (frozen, not deleted)', () => {
    assert.ok(existsSync(join(repoRoot, EDITOR_DIR, 'package.json')))
    assert.ok(existsSync(join(repoRoot, EDITOR_DIR, 'src')))
  })
})
