import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// S5: `iNNfo/apps/innfo-editor` is deleted. The gates must not name it and
// `docs/innfo/app/` holds only the static notice page. Replaced by the S5d
// no-editor-references guard (B7.1).

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
  'scripts/guard-text-encoding.js',
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

describe('the editor is deleted and the hosted app address serves a notice page', () => {
  it('the editor source is gone', () => {
    assert.ok(!existsSync(join(repoRoot, EDITOR_DIR)), `${EDITOR_DIR} must be deleted`)
  })

  it('docs/innfo/app holds exactly the static notice page', () => {
    const app = join(repoRoot, 'docs/innfo/app')
    assert.deepEqual(readdirSync(app), ['index.html'])
    const html = readFileSync(join(app, 'index.html'), 'utf8')
    assert.ok(!/<script/i.test(html), 'the notice page must not ship JavaScript')
    assert.ok(!/assets\//.test(html), 'the notice page must not load the retired bundle')
    assert.match(html, /retired/i)
    assert.match(html, /regenerate_console/)
  })

  it('every internal link of the notice page resolves to a docs file', () => {
    const html = readFileSync(join(repoRoot, 'docs/innfo/app/index.html'), 'utf8')
    const hrefs = [...html.matchAll(/href="(\/[^"#]*)(#\/([^"]+))?"/g)]
    assert.ok(hrefs.length > 0)
    for (const [, path, , route] of hrefs) {
      if (route) {
        const page = join(repoRoot, 'docs', path, `${route}.md`)
        assert.ok(existsSync(page), `${path}#/${route} has no ${page}`)
      } else if (path.endsWith('/')) {
        assert.ok(existsSync(join(repoRoot, 'docs', path, 'index.html')) || existsSync(join(repoRoot, 'docs', path, 'index.md')), `${path} missing`)
      } else {
        assert.ok(existsSync(join(repoRoot, 'docs', path)), `${path} missing`)
      }
    }
  })
})
