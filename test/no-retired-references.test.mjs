import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// One table-driven guard for retired names: the Vue editor and hosted app (S5),
// the S2c provenance surface, the Workspace Hub (D14) and the preview-URL
// review path (S6). Each row says which files to scan, what is forbidden and
// what is exempt. Positive assertions (deleted dirs, notice page, workspaces)
// are plain `it`s below the table.

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const SELF = 'test/no-retired-references.test.mjs'

const prefixAllow = (entries) => (rel) =>
  entries.some((entry) => (entry.endsWith('/') ? rel.startsWith(entry) : rel === entry))

// --- editor + hosted app (S5) ---------------------------------------------
// docs/innfo/app/ keeps one static retirement notice page.
const EDITOR_DIR = 'iNNfo/apps/innfo-editor'
// The S5 change directory is named after the editor; the name is removed before scanning.
const CHANGE_NAME = '2026-10-13-s5-retire-innfo-editor'
const EDITOR_ALLOWLIST = [
  'openspec/', // SDD specs, changes, archive and backlog are the permanent record
  'docs/innfo/app/index.html', // static retirement notice page
  'docs/404.html', // 404 shim redirecting old app links to the notice page
  'docs/innfo/404.html', // 404 shim redirecting old app links to the notice page
  'docs/research/', // historical research notes
  'scripts/guard-template-immutability.js', // old badge URL normalisation
  'scripts/guard-template-immutability.test.js', // old badge URL normalisation test
  SELF, // this guard names the tokens it forbids
  'iNNfo/packages/nn-core/src/schema/canonical-registry.ts', // embeds write-once specs
  'iNNfo/packages/nn-mcp/bin/innfo-mcp.bundle.js', // embeds write-once specs (legacy name)
  'iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js', // embeds write-once specs
  'iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs', // embeds write-once specs
  'test/fixtures/testlab/artifacts/', // stamped console exports of earlier runtimes
]
// Published write-once specs: root-level `<name>_V_x-y-z_NN.md`. Versioned samples under
// bluepriNNts/ are mutable and are NOT exempt.
const WRITE_ONCE_SPEC = /^iNNfo\/specs\/[^/]+_V_\d+-\d+-\d+_NN\.md$/
const editorAllowed = (rel) => WRITE_ONCE_SPEC.test(rel) || prefixAllow(EDITOR_ALLOWLIST)(rel)

// --- retired provenance surface (S2c) ---------------------------------------
// Files that legitimately name a retired symbol to pin its ABSENCE.
const PROVENANCE_ABSENCE_PINS = new Set([
  SELF,
  'test/console-export.test.mjs',
  'iNNfo/packages/nn-core/tests/console-payload-builder.test.ts',
  'iNNfo/packages/nn-core/tests/exports.test.ts',
  'iNNfo/packages/nn-core/tests/naming/contract.test.ts',
  'iNNfo/packages/nn-mcp/src/server.spec.ts',
])
const PROVENANCE_SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'temp', '.verify-logs', 'openspec', '_samples_nn'])
const PROVENANCE_SKIP_PREFIXES = ['test/fixtures/', 'iNNfo/packages/nn-core/tests/fixtures/']
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip|mp4|webm|svg)$/i
const provenanceAllowed = (rel) => {
  const dirs = rel.split('/').slice(0, -1)
  if (dirs.some((d) => PROVENANCE_SKIP_DIRS.has(d) || (d.startsWith('.') && d !== '.agents'))) return true
  return (
    PROVENANCE_ABSENCE_PINS.has(rel) ||
    PROVENANCE_SKIP_PREFIXES.some((p) => rel.startsWith(p)) ||
    /_V_\d+-\d+-\d+/.test(rel) ||
    BINARY_EXT.test(rel)
  )
}

// --- Workspace Hub (D14) ----------------------------------------------------
// Permanent history and maintainer logs are exempt; nothing else may name the hub.
const HUB_ALLOWLIST = [
  'openspec/changes/archive/',
  'openspec/changes/2026-10-09-domain-console-views/',
  'openspec/changes/2026-10-09-nn-procedure-executor/',
  'openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/',
  'openspec/changes/2026-10-13-s5-retire-innfo-editor/',
  'openspec/changes/single-console-shell/',
  'openspec/specs/',
  'iNNfo/packages/nn-core/tests/fixtures/simulacro-refactorizacion/',
  'test/fixtures/testlab/',
  'simulation/FINDINGS.md',
  'simulation/results/',
  'openspec/backlog.md',
  SELF,
]
const HUB_NEEDLES = ['workspacehub', 'workspaceconsoleshub', 'workspaceconsolehub', 'consolehubview', 'compileworkspacehub', 'compilehub']
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// --- preview-URL review path (S6) -------------------------------------------
// Changes are reviewed in the static domain console (a file), never in a hosted
// app or a live-preview URL.
const PREVIEW_FILES = [
  'iNNfo/packages/nn-mcp/src/tools/console-regeneration.ts',
  'iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts',
  'iNNfo/packages/nn-mcp/src/tools/init-domain.ts',
  'iNNfo/packages/nn-mcp/src/tools/init-knowledge.ts',
  'iNNfo/packages/nn-mcp/README.md',
  'scripts/export-console.mjs',
  'skills/nn-innfo/SKILL.md',
]

// --- retired distribution prefix (nn-prefix-rename cleanup, D12) -------------
// Live distribution file/name stems retired by the `innfo-*` -> `nn-*` cutover.
// Frozen history, the trees the maintainer deferred by scope, and the permanent
// migration/reader code that necessarily names the old strings are allowlisted.
const DISTRIBUTION_RETIRED_RE = /innfo-(core|mcp)\b/
const DISTRIBUTION_RETIRED_PATTERNS = [
  DISTRIBUTION_RETIRED_RE, // the package and distribution names
  /innfo-console\.bundle\.js/, // retired console bundle file name
  /innfo-ui\.css/, // retired console stylesheet
  /@cognnitive\/innfo-/, // retired package scope
  /scripts\/innfo-mcp\./, // retired wrapper scripts
  /innfo-mcp_/, // retired MCP tool prefix
  /innfo-(mcp|console)-v/, // legacy release tag families
  /@innfo-console-v/, // legacy console shell pin
  /innfo\/cdn\/innfo-/, // legacy published CDN files
]
const DISTRIBUTION_ALLOWLIST = [
  'openspec/', // SDD specs, changes, archive and backlog are the permanent record
  'docs/', // published docs prose deferred by scope
  '.agents/', // maintainer-only skills prose deferred by scope
  'simulation/', // executable simulation of the shipped contract, never distributed
  '_samples_nn/', // sample workspace deferred by scope
  'test/fixtures/', // stamped console exports and simulacro fixtures
  'iNNfo/packages/nn-core/tests/fixtures/', // frozen simulacro and scaffold fixtures
  'dev/', // maintainer handoff and planning notes
  'iNNfo/specs/', // published blueprints, catalog and the vocabulary dictionary
  'iNNfo/packages/nn-mcp/test/', // test temp-dir prefixes and describe labels
  'README.md',
  'THIRD_PARTY.md',
  'scripts/lib/skills-commands.js', // D10 migration literals (kept permanently)
  'scripts/lib/mcp-config-adapter.js', // D10 user-config migration literals
  'scripts/lib/mcp-config-adapter.test.js', // D10 tests
  'scripts/skills-manager.test.js', // D10 tests
  'scripts/manifest/lib/manifest-rules.js', // legacy-entry rejection (D12)
  'scripts/manifest/lib/entry-version.js', // reader alias for a legacy section id
  'scripts/manifest/lib/entry-version.test.js',
  'scripts/manifest/generate-manifest.test.js',
  'scripts/manifest/validate-manifest.test.js',
  'scripts/release/release-keys.js', // legacy CDN glob preserved as read-only history
  'scripts/export-console.mjs', // reader accepts the legacy console pin/file for stamped exports
  'scripts/build-console-shells.mjs', // documents the legacy pin the shell guard also reads
  'scripts/lib/publish-web-tree.test.js', // asserts legacy CDN files survive a Pages push
  'scripts/lib/docs-facts.test.mjs', // fixtures that use the retired name as arbitrary content
  'scripts/generate-about-twin.test.mjs', // fixture mirrors the deferred about.html prose
  'skills/nn-skills-lifecycle/scripts/skills-manager.js', // generated D10 bundle
  SELF,
]

/**
 * name      row label
 * patterns  forbidden RegExps
 * files     'tracked' (every git ls-files entry) or an explicit list (must exist)
 * allow     (rel) => true when the file is exempt from this row
 * prepare   optional text transform applied before matching
 * lines     report file:line for every offending line (default: once per file)
 * maxBytes  optional size cap; larger files are skipped
 * plant     a string the row must flag (proves the scanner can go red)
 */
const GUARDS = [
  {
    name: 'retired editor and hosted app',
    patterns: [/innfo-editor|innfo\/app\/|iNNfo[\/]+apps[\/]/],
    files: 'tracked',
    allow: editorAllowed,
    prepare: (text) => text.replaceAll(CHANGE_NAME, ''),
    lines: true,
    plant: 'run: npm --workspace=@cognnitive/innfo-editor test\n',
  },
  {
    name: 'retired provenance surface',
    patterns: [
      /feedback-ledger/,
      /feedbackState/,
      /evaluate_feedback_items/,
      /record_feedback_verdict/,
      /feedback\.schema\.json/,
      /reconcile_feedback/,
      /agentModification/,
      /AGENT_MODIFICATION_CONCEPT/,
      /change-log\.js/,
    ],
    files: 'tracked',
    allow: provenanceAllowed,
    maxBytes: 2_000_000,
    plant: 'const x = record_feedback_verdict()',
  },
  {
    name: 'retired workspace hub',
    patterns: HUB_NEEDLES.map((n) => new RegExp(n)),
    files: 'tracked',
    allow: prefixAllow(HUB_ALLOWLIST),
    prepare: normalize,
    plant: 'Workspace-Hub view',
  },
  {
    name: 'preview-URL review path',
    patterns: [/PREVIEW_APP_URL|preview_app_url|INNFO_PREVIEW|live[- ]preview|hosted app|cognnitive[.]com[/]innfo[/]app/i],
    files: PREVIEW_FILES,
    allow: () => false,
    plant: 'open the Hosted App to review',
  },
  {
    // PR 3 of the nn-prefix-rename cutover renamed the MCP server to `nn-mcp`.
    // Blueprint procedures name it in `tool:: [[innfo-mcp]]` and
    // `## NN Tools: innfo-mcp`; those references are write-once, so the rename
    // ships through a blueprint version bump, never an in-place edit. The frozen
    // `workspace` procedures (C9) are the only remaining allowlist entry.
    name: 'retired MCP name in blueprint procedures',
    patterns: [/tool::\s*\[\[innfo-mcp\b/, /##\s*NN Tools:\s*innfo-mcp\b/],
    files: 'tracked',
    allow: prefixAllow([
      'openspec/', // frozen change/spec history
      'iNNfo/specs/bluepriNNts/workspace/', // frozen_blueprints (C9)
      'iNNfo/packages/nn-core/tests/fixtures/', // frozen simulacro fixtures
      '_samples_nn/', // deferred sample workspace
      SELF,
    ]),
    lines: true,
    plant: 'tool:: [[innfo-mcp]]',
  },
  {
    // Guarded in nn-innfo only, where the tool prefix `innfo-mcp_*` was prose the
    // PR rewrote; the migration literals in skills-commands.js stay by design (D10).
    name: 'retired MCP tool prefix in the nn-innfo skill',
    patterns: [/innfo-mcp[_.]/],
    files: ['skills/nn-innfo/SKILL.md'],
    allow: () => false,
    plant: 'call innfo-mcp_validate_knowledge',
  },
  {
    // Cleanup commit (D12): no live file may reintroduce a retired distribution stem.
    name: 'retired distribution prefix',
    patterns: DISTRIBUTION_RETIRED_PATTERNS,
    files: 'tracked',
    allow: prefixAllow(DISTRIBUTION_ALLOWLIST),
    lines: true,
    plant: 'see iNNfo/packages/innfo-mcp/package.json',
  },
]

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, maxBuffer: 1 << 28 })
  return out.toString('utf8').split(String.fromCharCode(0)).filter(Boolean)
}

function readText(rel, maxBytes) {
  const abs = join(repoRoot, rel)
  if (!existsSync(abs)) return null
  if (maxBytes && statSync(abs).size > maxBytes) return null
  const buf = readFileSync(abs)
  return buf.includes(0) ? null : buf.toString('utf8')
}

/** Returns the locations (file or file:line) where `text` matches a row's patterns. */
export function scan(guard, rel, text) {
  const prepared = guard.prepare ? guard.prepare(text) : text
  if (guard.lines) {
    return prepared
      .split(/\r?\n/)
      .flatMap((line, i) => (guard.patterns.some((re) => re.test(line)) ? [`${rel}:${i + 1}`] : []))
  }
  const hit = guard.patterns.find((re) => re.test(prepared))
  return hit ? [`${rel} -> ${hit}`] : []
}

describe('retired names appear nowhere outside their allowlists', () => {
  for (const guard of GUARDS) {
    describe(guard.name, () => {
      it('the scanner can go red: it flags a planted reference', () => {
        assert.equal(scan(guard, 'planted', guard.plant).length > 0, true)
      })

      it('no file outside the allowlist names it', () => {
        const explicit = guard.files !== 'tracked'
        const hits = []
        for (const rel of explicit ? guard.files : trackedFiles()) {
          if (guard.allow(rel)) continue
          const text = readText(rel, guard.maxBytes)
          if (text === null) {
            assert.ok(!explicit, `${rel} must exist`)
            continue
          }
          hits.push(...scan(guard, rel, text))
        }
        assert.deepEqual(hits, [])
      })
    })
  }
})

/**
 * PR 1 of the nn-prefix-rename cutover moved the two package directories and renamed
 * the generated core mirror. `git ls-files` is read directly, so the row goes red the
 * moment one of those paths comes back.
 *
 * Deliberately narrow: the CDN bundle file name, the wrapper scripts and the three
 * public doc files still carry an `innfo-*` name on purpose until PR 3 retires them,
 * so this row matches the package directories and the generated mirror, not every
 * `innfo-*` path.
 */
const RETIRED_PATH_STEMS = [
  /(^|\/)iNNfo\/packages\/innfo-(core|mcp)(\/|$)/, // the package directories
  /(^|\/)innfo-core\.generated\.cjs$/, // the generated core mirror
  /(^|\/)scripts\/innfo-mcp\.(sh|ps1|cmd)$/, // pre-cutover wrapper scripts (PR 3)
  /(^|\/)iNNfo\/packages\/nn-mcp\/bin\/innfo-mcp\.bundle\.js$/, // pre-cutover MCP bundle (PR 3)
  /(^|\/)docs\/innfo\/documentation\/(innfo-core|innfo-mcp|opencode-innfo-agent)\.md$/, // pre-cutover public docs (PR 3)
]

/** Paths whose old names are expected at this point of the cutover. */
const FROZEN_PATH_PREFIXES = [
  'openspec/changes/', // frozen change history
  'iNNfo/specs/', // published blueprint specs and generated console artifacts
  'test/fixtures/', // frozen fixtures
  'simulation/', // sample domain, never distributed
  'iNNfo/packages/nn-core/tests/fixtures/', // frozen simulacro fixtures
]

/** @param {string[]} rels @returns {string[]} the paths that still use a retired stem. */
export function retiredPathHits(rels) {
  return rels.filter(
    (rel) =>
      !FROZEN_PATH_PREFIXES.some((prefix) => rel.startsWith(prefix)) &&
      RETIRED_PATH_STEMS.some((re) => re.test(rel)),
  )
}

describe('the renamed package and generated paths stay retired', () => {
  it('the scanner can go red: it flags a planted path', () => {
    for (const planted of [
      'iNNfo/packages/innfo-core/src/index.ts',
      'iNNfo/packages/innfo-mcp/package.json',
      'skills/nn-sources/scripts/lib/innfo-core.generated.cjs',
      'scripts/innfo-mcp.sh',
      'iNNfo/packages/nn-mcp/bin/innfo-mcp.bundle.js',
      'docs/innfo/documentation/innfo-mcp.md',
    ]) {
      assert.deepEqual(retiredPathHits([planted]), [planted], `${planted} must be flagged`)
    }
  })

  it('a frozen path is exempt', () => {
    assert.deepEqual(retiredPathHits(['openspec/changes/archive/x/innfo-core.generated.cjs']), [])
  })

  it('no tracked path outside the frozen prefixes uses them', () => {
    assert.deepEqual(retiredPathHits(trackedFiles()), [])
  })

  it('the MCP-name guard flags procedures/visual-catalog and exempts the frozen workspace', () => {
    const guard = GUARDS.find((g) => g.name === 'retired MCP name in blueprint procedures')
    assert.ok(guard, 'the MCP-name guard row must exist')
    assert.deepEqual(
      scan(guard, 'iNNfo/specs/bluepriNNts/visual-catalog/procedures/x_NN.md', 'tool:: [[innfo-mcp]]'),
      ['iNNfo/specs/bluepriNNts/visual-catalog/procedures/x_NN.md:1'],
    )
    assert.deepEqual(
      scan(guard, 'iNNfo/specs/bluepriNNts/procedures/procedures/x_NN.md', '## NN Tools: innfo-mcp Server'),
      ['iNNfo/specs/bluepriNNts/procedures/procedures/x_NN.md:1'],
    )
    assert.equal(guard.allow('iNNfo/specs/bluepriNNts/workspace/procedures/x_NN.md'), true)
    assert.equal(guard.allow('iNNfo/specs/bluepriNNts/procedures/procedures/x_NN.md'), false)
  })
})

describe('the retired editor and hosted app', () => {
  it('the scanner flags every reference shape and ignores the S5 change name', () => {
    const editor = GUARDS[0]
    assert.deepEqual(scan(editor, 'x.md', '[app](https://cognnitive.com/innfo/app/)'), ['x.md:1'])
    assert.deepEqual(scan(editor, 'x.json', '"iNNfo/apps/*"'), ['x.json:1'])
    assert.deepEqual(scan(editor, 'y.yml', 'run: npm test\n'), [])
    assert.deepEqual(scan(editor, 'z.mjs', `see openspec/changes/${CHANGE_NAME}/`), [])
  })

  it('the allowlist admits write-once specs and the notice page, and nothing broader', () => {
    assert.ok(editorAllowed('iNNfo/specs/iNNfo_V_0-3-0_NN.md'))
    assert.ok(editorAllowed('docs/innfo/app/index.html'))
    assert.ok(!editorAllowed('docs/innfo/index.html'))
    assert.ok(!editorAllowed('docs/innfo/app/other.html'))
    assert.ok(!editorAllowed('iNNfo/specs/bluepriNNts/business/spec_NN.md'))
    assert.ok(!editorAllowed('skills/nn-innfo/SKILL.md'))
  })

  // Gated surfaces: nothing here may build, test, lint, version-sync or name the
  // editor, and none of them is allowlisted.
  it('no gated surface is allowlisted or references the editor', () => {
    const gated = [
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
      ...readdirSync(join(repoRoot, '.github/workflows'))
        .filter((n) => /\.ya?ml$/.test(n))
        .map((n) => `.github/workflows/${n}`),
    ]
    for (const rel of gated) {
      assert.ok(!editorAllowed(rel), `${rel} must not be allowlisted`)
      assert.deepEqual(scan(GUARDS[0], rel, readText(rel) ?? ''), [])
    }
  })

  it('root workspaces are packages only', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
    assert.deepEqual(pkg.workspaces, ['iNNfo/packages/*'])
  })

  it('jsdom is a root devDependency and happy-dom is gone (gated suites import jsdom)', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
    assert.ok(pkg.devDependencies.jsdom, 'jsdom missing from root devDependencies')
    assert.ok(!pkg.devDependencies['happy-dom'], 'happy-dom must not return; DOM suites run under jsdom')
  })

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

describe('the workspace hub is deleted', () => {
  const DELETED = [
    'iNNfo/specs/bluepriNNts/workspace/assets/workspace_hub.html',
    'iNNfo/specs/bluepriNNts/workspace/procedures/compile_workspace_hub_NN.md',
    '_samples_nn/procedures/compile_workspace_hub_procedures_NN.md',
    'docs/innfo/documentation/workspace-console-hub.md',
    'iNNfo/packages/nn-core/tests/workspace-hub.test.ts',
  ]
  it('requires every hub file to be deleted', () => {
    for (const rel of DELETED) {
      assert.equal(existsSync(join(repoRoot, rel)), false, `${rel} must be deleted`)
    }
  })
})
