/**
 * S07 — Opening the workspace we ship to new users.
 *
 * `_samples_nn` is the single source of truth for every template sample and the
 * first thing a new user sees. It has to validate clean. Anything it reports is
 * something a first-time user will hit on day one.
 */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNodeDirectoryHandle } from '../lib/nodeFs.mjs'
import { createScenario, ROOT } from '../lib/harness.mjs'
import { loadCore } from '../lib/core.mjs'

const WS = join(ROOT, '_samples_nn')
const TEMPLATES = join(ROOT, 'iNNfo', 'specs', 'templates')

export default async function run() {
  const { recursiveParse, validateWorkspaceSources, validateDocument, extractHeadings, SOURCE_FIELD_NAMES } =
    await loadCore()
  const s = createScenario('S07', 'Opening the shipped sample workspace',
    'A new user opens the workspace we ship. Everything they see on day one is what this scenario measures.')

  try {
    const parsed = await recursiveParse(createNodeDirectoryHandle(WS))
    s.expect(
      'The shipped workspace parses without issues',
      {
        entrypoint: parsed.entrypointPath,
        models: Object.values(parsed.nodes).filter((n) => n.kind === 'root').length,
        issueCount: parsed.issues.length,
        issueKinds: summarizeIssues(parsed.issues),
      },
      (v) => v.issueCount === 0 && v.models >= 11,
      'all sample models load with zero parse issues — this is the first thing a new user sees',
    )

    // Per-file document hygiene, the same pass the editor and MCP both run.
    const files = (await readdir(join(WS, 'models'))).filter((f) => f.endsWith('.md')).sort()
    const perFile = []
    for (const f of files) {
      const report = validateDocument(await readFile(join(WS, 'models', f), 'utf-8'), { fileName: f })
      perFile.push({ file: f, errors: report.errors.map((e) => e.code ?? e.path), warnings: report.warnings.length })
    }
    s.expect(
      'Every shipped sample passes document hygiene with no errors',
      perFile.filter((r) => r.errors.length > 0),
      (bad) => bad.length === 0,
      'zero hygiene errors across the eleven samples',
    )

    // Citation integrity across the shipped workspace.
    const resolver = (refPath) => {
      const full = join(WS, refPath)
      if (!existsSync(full)) return { exists: false }
      const content = readFileSync(full, 'utf-8')
      return { exists: true, content, headings: extractHeadings(content).map((h) => h.slug) }
    }
    const sourceDiags = validateWorkspaceSources(parsed, resolver)
    s.expect(
      'Every citation in the shipped workspace resolves',
      sourceDiags.map((d) => ({ code: d.code, severity: d.severity, path: d.path })),
      (d) => d.filter((x) => x.severity === 'error').length === 0,
      'a new user opening the sample sees no broken provenance',
    )

    // Does the flagship workspace actually demonstrate the flagship feature?
    const sourcesDir = join(WS, 'sources', 'nn')
    const sourceFiles = existsSync(sourcesDir) ? await readdir(sourcesDir) : []
    s.expect(
      'The shipped workspace contains the sources its models cite',
      { sourcesDir: 'sources/nn/', files: sourceFiles },
      (v) => v.files.length > 0,
      'source traceability is the headline capability — the demo must demonstrate it',
    )

    const artifactsDir = join(WS, 'artifacts')
    s.expect(
      'The shipped workspace contains the compiled console artifact its manifest declares',
      { declared: 'artifacts/workspace_hub.html', present: existsSync(artifactsDir) ? await readdir(artifactsDir) : [] },
      (v) => v.present.length > 0,
      'workspace_NN.md registers `## NN Artifacts: Workspace Hub Dashboard`; the file should exist',
    )

    // Field NAME vs field TYPE: the citation vocabulary is keyed on the name.
    const docSpec = await readFile(join(TEMPLATES, 'documentation', 'spec_NN.md'), 'utf-8')
    const declaredType = docSpec.match(/## NN Field Definition: source\n(?:.*\n)*?type:: (\S+)/)?.[1]
    s.expect(
      'A field named `source` that is declared as a content path is not treated as a citation',
      {
        template: 'documentation',
        declaredType,
        citationFieldNames: [...SOURCE_FIELD_NAMES],
        diagnosticsOnDocumentationSample: sourceDiags.filter((d) => d.path.includes('documentation')).map((d) => d.code),
      },
      (v) => v.diagnosticsOnDocumentationSample.length === 0,
      'the Citation vocabulary should key on the declared field TYPE, not on the field NAME',
    )
  } catch (err) {
    s.crash('scenario execution', err)
  }
  return s
}

function summarizeIssues(issues) {
  const out = {}
  for (const i of issues) {
    const kind = /Slug collision/.test(i.message)
      ? 'slug-collision'
      : /appears in both/.test(i.message)
        ? 'cross-model-name-collision'
        : 'other'
    out[kind] = (out[kind] ?? 0) + 1
  }
  return out
}
