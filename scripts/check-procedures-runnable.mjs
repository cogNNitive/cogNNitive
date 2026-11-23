#!/usr/bin/env node

/**
 * scripts/check-procedures-runnable.mjs
 *
 * Every shipped procedure document is runnable: nn-core's `procedureGraph`, the parser
 * the procedure runner itself uses (`procedure_start`, `procedure_state`), reports no
 * error for it. A procedure in the old form (no `slug::`, `next:: [[Wikilink]]` to a
 * step that is not one, two starts, a loop) is listed with its file, its container and
 * its step, so it cannot ship unrunnable again.
 *
 * Discovery is shared with `check-procedures-version.mjs` (every `*_NN.md` directly under
 * a bluepriNNt's `procedures/` directory), narrowed to the `*_procedures_NN.md` documents
 * the runner loads. A document holding several root containers (each a sub-procedure,
 * addressed `<doc>@<container-slug>`) is checked once per container, exactly as the
 * runner reads it; any other document is checked whole.
 *
 * nn-core is imported from its built `dist/` (CI builds it before verify.js). The guard
 * FAILS; it never rewrites a procedure.
 *
 * Usage:
 *   node scripts/check-procedures-runnable.mjs          # check (default); exit 1 on failure
 *   node scripts/check-procedures-runnable.mjs --json   # machine-readable failures
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { discoverProcedureFiles } from './check-procedures-version.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const BLUEPRINTS_ROOT = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts')
const CORE_DIST = path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js')
const PROCEDURE_DOC_RE = /_procedures_NN\.md$/

/** nn-core's parser and graph, from its built dist. */
export async function loadCore(distFile = CORE_DIST) {
  if (!fs.existsSync(distFile)) {
    throw new Error(
      `nn-core is not built (${path.relative(REPO_ROOT, distFile)} is missing): ` +
        'run `npm --workspace=@cognnitive/nn-core run build` first.',
    )
  }
  const core = await import(pathToFileURL(distFile).href)
  return { parseKnowledge: core.parseKnowledge, procedureGraph: core.procedureGraph }
}

/** The reference tokens of a `parent::` value: `[[Name]]`, `@slug` or plain text. */
function parentTokens(value) {
  if (value === undefined || value === null || value === '') return []
  const text = String(value)
  const links = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1])
  return (links.length > 0 ? links : [text.replace(/^\[|\]$/g, '')])
    .flatMap((p) => p.split(','))
    .map((p) => p.trim().replace(/^@/, ''))
    .filter((p) => p !== '')
}

/** The unparented Works that other Works name as their parent: the document's sub-procedures. */
export function rootContainers(model) {
  const work = model.elements.get('Work') ?? []
  const named = new Set(
    work.flatMap((n) => parentTokens(n.fields['parent'])).map((t) => t.toLowerCase()),
  )
  return work
    .filter((n) => parentTokens(n.fields['parent']).length === 0)
    .filter((n) => named.has(String(n.slug ?? '').toLowerCase()) || named.has(n.name.toLowerCase()))
    .map((n) => n.slug ?? '')
}

/**
 * @param {{ blueprintsRoot?: string, core?: { parseKnowledge: Function, procedureGraph: Function } }} [options]
 *   `core` is the nn-core pair from `loadCore()`; loaded from dist when omitted.
 * @returns {Promise<{ ok: boolean, checked: number, failures: Array<{target:string, container:string|null, step:string|null, code:string, detail:string}> }>}
 */
export async function checkProceduresRunnable({ blueprintsRoot = BLUEPRINTS_ROOT, core } = {}) {
  const { parseKnowledge, procedureGraph } = core ?? (await loadCore())
  const failures = []
  const files = discoverProcedureFiles(blueprintsRoot).filter((f) =>
    PROCEDURE_DOC_RE.test(path.basename(f)),
  )
  for (const file of files) {
    const target = path.relative(blueprintsRoot, file).split(path.sep).join('/')
    const model = parseKnowledge(fs.readFileSync(file, 'utf8'))
    const roots = rootContainers(model)
    const containers = roots.length > 1 ? roots : [null]
    for (const container of containers) {
      const graph = procedureGraph(model, container ?? undefined)
      for (const d of graph.diagnostics) {
        if (d.severity !== 'error') continue
        failures.push({ target, container, step: d.step ?? null, code: d.code, detail: d.detail })
      }
    }
  }
  return { ok: failures.length === 0, checked: files.length, failures }
}

// ── CLI ────────────────────────────────────────────────────────────────
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const asJson = process.argv.includes('--json')
  let result
  try {
    result = await checkProceduresRunnable()
  } catch (err) {
    console.error(`❌ ${err.message}`)
    process.exit(1)
  }
  const { ok, checked, failures } = result

  if (asJson) {
    console.log(JSON.stringify({ ok, checked, failures }, null, 2))
  } else if (ok) {
    console.log(
      `✅ ${checked} shipped procedure document(s) are runnable (procedureGraph reports no error).`,
    )
  } else {
    console.error('❌ Unrunnable shipped procedures:')
    for (const f of failures) {
      const where = [f.container ? `@${f.container}` : null, f.step ? `step ${f.step}` : null]
        .filter(Boolean)
        .join(' ')
      console.error(`  - ${f.target}${where ? ` (${where})` : ''} [${f.code}] ${f.detail}`)
    }
    console.error('\nEvery runnable Work carries `slug::`, `next::` names `@slug` addresses of')
    console.error('steps of the same procedure, there is exactly one start, and there is no loop.')
  }

  process.exit(ok ? 0 : 1)
}
