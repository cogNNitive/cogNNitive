import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// S5: the Vue editor (iNNfo/apps/innfo-editor) and its hosted app are deleted.
// docs/innfo/app/ keeps one static retirement notice page. This guard keeps
// the names of both out of every tracked file except the allowlist below.

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

const EDITOR_DIR = 'iNNfo/apps/innfo-editor'
const REFERENCE = /innfo-editor|innfo\/app\/|iNNfo[\\/]+apps[\\/]/

// The S5 change directory is named after the editor. Naming the change is not
// a reference to the editor, so the name is removed before scanning.
const CHANGE_NAME = '2026-10-13-s5-retire-innfo-editor'

// Allowlist: path prefix (ends with a slash) or exact path, each with its reason.
const ALLOWLIST = [
  // SDD history and living specs describe the retired editor by design.
  ['openspec/', 'SDD specs, changes, archive and backlog are the permanent record'],
  // The one page that explains the retirement at the old address.
  ['docs/innfo/app/index.html', 'static retirement notice page'],
  // Dated research notes.
  ['docs/research/', 'historical research notes'],
  // The badge immutability guard keeps normalising the old badge URL because
  // published write-once specs still carry it.
  ['scripts/guard-template-immutability.js', 'old badge URL normalisation'],
  ['scripts/guard-template-immutability.test.js', 'old badge URL normalisation test'],
  // This guard names the tokens it forbids.
  ['test/no-editor-references.test.mjs', 'the guard itself'],
  // Generated artifacts that embed published write-once specs verbatim
  // (iNNfo_V_0-3-0 and defiNNition_V_0-1-0 still show the original badge).
  ['iNNfo/packages/innfo-core/src/schema/canonical-registry.ts', 'embeds write-once specs'],
  ['iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js', 'embeds write-once specs'],
  ['iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs', 'embeds write-once specs'],
  // Frozen stamped console runtimes of earlier exports (history of the fixture).
  ['test/fixtures/testlab/artifacts/', 'stamped console exports of earlier runtimes'],
]

// Published write-once specs and the versioned samples next to them.
const WRITE_ONCE = /^iNNfo\/specs\/.*_V_/

export function isAllowed(rel) {
  if (WRITE_ONCE.test(rel)) return true
  return ALLOWLIST.some(([entry]) => (entry.endsWith('/') ? rel.startsWith(entry) : rel === entry))
}

/** Returns file:line for every line of text that names the retired editor or app. */
export function findEditorReferences(file, text) {
  const hits = []
  text
    .replaceAll(CHANGE_NAME, '')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (REFERENCE.test(line)) hits.push(`${file}:${i + 1}`)
    })
  return hits
}

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, maxBuffer: 1 << 28 })
  return out.toString('utf8').split(String.fromCharCode(0)).filter(Boolean)
}

function readText(rel) {
  const abs = join(repoRoot, rel)
  if (!existsSync(abs)) return null
  const buf = readFileSync(abs)
  return buf.includes(0) ? null : buf.toString('utf8')
}

// Gated surfaces: nothing here may build, test, lint, version-sync or name the
// editor, and none of them is allowlisted.
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

describe('the retired editor and hosted app are named nowhere', () => {
  it('the scanner can go red: it flags a planted reference', () => {
    assert.deepEqual(
      findEditorReferences('x.yml', 'run: npm --workspace=@cognnitive/innfo-editor test\n'),
      ['x.yml:1'],
    )
    assert.deepEqual(findEditorReferences('x.md', '[app](https://cognnitive.com/innfo/app/)'), ['x.md:1'])
    assert.deepEqual(findEditorReferences('x.json', '"iNNfo/apps/*"'), ['x.json:1'])
    assert.deepEqual(findEditorReferences('y.yml', 'run: npm test\n'), [])
    assert.deepEqual(findEditorReferences('z.mjs', `see openspec/changes/${CHANGE_NAME}/`), [])
  })

  it('the allowlist admits write-once specs and the notice page, and nothing broader', () => {
    assert.ok(isAllowed('iNNfo/specs/iNNfo_V_0-3-0_NN.md'))
    assert.ok(isAllowed('docs/innfo/app/index.html'))
    assert.ok(!isAllowed('docs/innfo/index.html'))
    assert.ok(!isAllowed('docs/innfo/app/other.html'))
    assert.ok(!isAllowed('iNNfo/specs/bluepriNNts/business/spec_NN.md'))
    assert.ok(!isAllowed('skills/nn-innfo/SKILL.md'))
  })

  it('no tracked file outside the allowlist names the editor or the hosted app', () => {
    const hits = []
    for (const rel of trackedFiles()) {
      if (isAllowed(rel)) continue
      const text = readText(rel)
      if (text !== null) hits.push(...findEditorReferences(rel, text))
    }
    assert.deepEqual(hits, [])
  })

  it('no gated surface is allowlisted or references the editor', () => {
    const workflows = readdirSync(join(repoRoot, '.github/workflows'))
      .filter((n) => /\.ya?ml$/.test(n))
      .map((n) => `.github/workflows/${n}`)
    for (const rel of [...GATED_FILES, ...workflows]) {
      assert.ok(!isAllowed(rel), `${rel} must not be allowlisted`)
      assert.deepEqual(findEditorReferences(rel, readText(rel) ?? ''), [])
    }
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
    assert.ok(!/<script/i.test(html), 'the notice page must not ship JavaScript')
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
        assert.ok(
          existsSync(join(repoRoot, 'docs', path, 'index.html')) ||
            existsSync(join(repoRoot, 'docs', path, 'index.md')),
          `${path} missing`,
        )
      } else {
        assert.ok(existsSync(join(repoRoot, 'docs', path)), `${path} missing`)
      }
    }
  })
})
