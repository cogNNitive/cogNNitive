#!/usr/bin/env node
/**
 * Drift report: where the values of a domaiNN deviate from what their scope offers.
 *
 *   node scripts/dev/scope-drift.mjs <domain-dir> [--unit leaf|doc] [--keys a,b] [--ignore slug,title]
 *                                    [--none a,b] [--all] [--json]
 *
 * Read-only: it reads documents and prints; it never writes into the domain. Thin by
 * design: it discovers the documents that declare `scope_elements`, builds one chain per
 * leaf element with nn-core (`listScopeElements` + `loadElementChain`), calls `driftReport`
 * and prints. All the logic is in nn-core. Needs nn-core built
 * (`npm --workspace=@cognnitive/nn-core run build`).
 *
 *   --unit leaf   one unit per leaf element (default)
 *   --unit doc    one unit per document (use it when the leaf is a Scene and the deviation
 *                 is a property of the script)
 *   --none a,b    keys compared with the `none` strategy (contractual or identity values:
 *                 never inherited, so no baseline); every other key is `override`
 *   --all         text view: list every row; by default only the scopes that declare the
 *                 key themselves (and `none` keys) are listed, so a root that declares
 *                 nothing does not list every value as drift
 *   --json        print the raw `driftReport` (all rows), nothing else on stdout
 *
 * Elements that cannot be placed (an unresolved parent reference, an ambiguous marker) are
 * listed on stderr and left out; the run continues. Exit codes: 0 report printed, 1 no
 * domaiNN found (the searched list is printed), 2 usage error.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CORE_DIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js')
const USAGE =
  'usage: node scripts/dev/scope-drift.mjs <domain-dir> [--unit leaf|doc] [--keys a,b] [--ignore slug,title] [--none a,b] [--all] [--json]'
/** Directories never scanned: sources are imports, the rest is tooling or history. */
const SKIPPED_DIRS = new Set(['node_modules', 'sources', 'changes'])

const die = (message, code) => {
  console.error(message)
  process.exit(code)
}
const list = (value) => (value ? value.split(',').map((s) => s.trim()).filter(Boolean) : undefined)

let parsed
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      unit: { type: 'string', default: 'leaf' },
      keys: { type: 'string' },
      ignore: { type: 'string' },
      none: { type: 'string' },
      all: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  })
} catch (error) {
  die(`${error.message}\n${USAGE}`, 2)
}
const { values: opts, positionals } = parsed
if (positionals.length !== 1) die(USAGE, 2)
if (opts.unit !== 'leaf' && opts.unit !== 'doc') die(`--unit must be leaf or doc\n${USAGE}`, 2)
const dir = resolve(positionals[0])
if (!existsSync(dir) || !statSync(dir).isDirectory()) die(`not a directory: ${positionals[0]}\n${USAGE}`, 2)
if (!existsSync(CORE_DIST)) die('nn-core is not built: npm --workspace=@cognnitive/nn-core run build', 2)
const core = await import(pathToFileURL(CORE_DIST).href)

const found = core.findScopeChain(dir)
if (!found.ok) {
  die(`${found.code}: no domaiNN_NN.md in the ancestry of ${dir}\nsearched:\n${(found.searched ?? []).map((d) => `  ${d}`).join('\n')}`, 1)
}
const root = found.chain.root

/** Documents under `start` whose frontmatter declares `scope_elements`, sorted. */
function declaringDocs(start) {
  const out = []
  for (const entry of readdirSync(start, { withFileTypes: true })) {
    const full = join(start, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !SKIPPED_DIRS.has(entry.name)) out.push(...declaringDocs(full))
    } else if (entry.name.endsWith('.md') && /^scope_elements:/m.test(readFileSync(full, 'utf-8'))) {
      out.push(full)
    }
  }
  return out.sort()
}

const problems = []
const chains = []
let floor = null
for (const path of declaringDocs(dir)) {
  const listed = core.listScopeElements(path)
  if (!listed.ok) {
    problems.push(`${relative(root, path).split(sep).join('/')}: ${listed.code}`)
    continue
  }
  const placed = []
  for (const element of listed.elements) {
    const r = core.loadElementChain(path, { concept: element.concept, slug: element.slug })
    if (!r.ok) {
      problems.push(`${listed.doc}: ${element.concept}/${element.slug}: ${r.code}`)
      continue
    }
    floor ??= r.loaded.floor
    placed.push(r.loaded.nodes)
  }
  // A leaf is an element no other element of the document hangs from.
  const parents = new Set(placed.flatMap((nodes) => nodes.slice(0, -1).map((n) => n.id)))
  for (const nodes of placed) {
    const leaf = nodes[nodes.length - 1]
    if (!parents.has(leaf.id)) chains.push({ unit: opts.unit === 'doc' ? listed.doc : leaf.id, nodes })
  }
}

const noneKeys = list(opts.none) ?? []
const report = core.driftReport({
  floor,
  chains,
  keys: list(opts.keys),
  ignore: list(opts.ignore),
  strategies: Object.fromEntries(noneKeys.map((k) => [k, 'none'])),
})

if (problems.length > 0) {
  console.error(`${problems.length} element(s) left out:\n${problems.map((p) => `  ${p}`).join('\n')}`)
}
if (opts.json) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

const show = (v) => JSON.stringify(v)
const noneSet = new Set(noneKeys)
const rows = report.rows.filter((r) => opts.all || noneSet.has(r.key) || r.baseline.from?.scope === r.scope)
console.log(`domaiNN ${root}`)
console.log(`${chains.length} chain(s), unit = ${opts.unit}, ${rows.length} of ${report.rows.length} row(s)`)
for (const r of rows) {
  const baseline = r.baseline.present ? show(r.baseline.value) : '(absent)'
  const variants = r.variants.map((v) => `${show(v.value)} x${v.units}`).join(', ')
  const tag = r.units.uniform ? ' uniform' : ''
  console.log(`${r.scope || '(root)'} | ${r.key} | baseline ${baseline} | ${r.units.deviating}/${r.units.total}${tag}${variants ? ` | ${variants}` : ''}`)
}
for (const s of report.skipped) console.log(`skipped: ${s.key} (${s.reason})`)
