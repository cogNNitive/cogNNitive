#!/usr/bin/env node
/**
 * scripts/export-console.mjs — `nn export`
 *
 * Unified console artifact export (backlog: feature/console-artifact-export-cli).
 *
 * Scans a workspace for iNNfo Level-3 models and compiles a self-contained
 * `*_console.html` per model against the canonical console blueprint
 * (`iNNfo/specs/templates/console/artifact_blueprint.html`), filling the
 * `innfo-config` / `innfo-schema` / `innfo-model` JSON slots from a direct
 * model scan (no runtime dependency on innfo-core, whose raw `dist/` barrel
 * is not ESM-importable). Vendors `innfo-console.bundle.js` next to each
 * artifact for offline `file://` use.
 *
 * Usage:
 *   node scripts/export-console.mjs <workspaceRoot> --list
 *   node scripts/export-console.mjs <workspaceRoot> --all
 *   node scripts/export-console.mjs <workspaceRoot> <ModelNameSubstring>
 *
 * Output: <workspaceRoot>/export/<Model>_V_<version>_console/<Model>_V_<version>_console.html
 */

import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative, basename, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const blueprintPath = join(
  repoRoot,
  'iNNfo',
  'specs',
  'templates',
  'console',
  'artifact_blueprint.html',
)
const bundlePath = join(
  repoRoot,
  'iNNfo',
  'specs',
  'templates',
  'console',
  'innfo-console.bundle.js',
)

function parseArgs(argv) {
  const args = { root: null, list: false, all: false, model: null }
  for (const a of argv.slice(2)) {
    if (a === '--list') args.list = true
    else if (a === '--all') args.all = true
    else if (args.root === null) args.root = a
    else args.model = a
  }
  return args
}

/** Recursively find every `*_NN.md` file under `dir`, skipping heavy dirs. */
async function findModelFiles(dir) {
  const out = []
  const skip = new Set(['node_modules', '.git', '.cogNNitive', 'export', 'dist', 'docs'])
  async function walk(d) {
    let entries
    try {
      entries = await readdir(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skip.has(e.name)) await walk(join(d, e.name))
      } else if (e.isFile() && /_NN\.md$/i.test(e.name)) {
        out.push(join(d, e.name))
      }
    }
  }
  await walk(dir)
  return out
}

function frontmatterOf(content) {
  const fm = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fm) return {}
  const out = {}
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/)
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '').trim()
  }
  return out
}

function isLevel3(content) {
  const fm = frontmatterOf(content)
  const lvl = fm.level
  return lvl === undefined || Number(lvl) === 3
}

function parseElements(text) {
  const elements = []
  let concept = null
  for (const line of text.split('\n')) {
    const block = line.match(/^## NN ([^:]+): (.+)$/)
    if (block) {
      concept = block[1].trim()
      elements.push({
        id: block[2].trim(),
        concept,
        name: block[2].trim(),
        description: '',
        fields: {},
        markers: {},
      })
      continue
    }
    if (!concept || elements.length === 0) continue
    const last = elements[elements.length - 1]
    const fld = line.match(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)::\s*(.+)$/)
    if (fld) {
      last.fields[fld[1]] = fld[2].replace(/^"|"$/g, '').trim()
    } else if (!line.trim().startsWith('#') && line.trim().length >= 12 && !last.description) {
      last.description = line.trim()
    }
  }
  return elements
}

function elSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function injectSlots(blueprint, config, schema, model) {
  const slot = (id, json) =>
    blueprint.replace(
      new RegExp(`(<script type="application/json" id="${id}">)[\\s\\S]*?(</script>)`),
      `$1\n${JSON.stringify(json, null, 2)}\n$2`,
    )
  let out = blueprint
  out = slot('innfo-config', config)
  out = slot('innfo-schema', schema)
  out = slot('innfo-model', model)
  return out
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.root) {
    console.error('Usage: node scripts/export-console.mjs <workspaceRoot> [--list] [--all] [<ModelName>]')
    process.exit(2)
  }
  const root = resolve(args.root)
  const blueprint = await readFile(blueprintPath, 'utf-8')
  const bundle = existsSync(bundlePath) ? await readFile(bundlePath) : null

  const models = []
  for (const f of await findModelFiles(root)) {
    const content = await readFile(f, 'utf-8')
    if (isLevel3(content)) {
      models.push({ filePath: f, name: basename(f).replace(/\.md$/i, ''), content, fm: frontmatterOf(content) })
    }
  }
  models.sort((a, b) => a.filePath.localeCompare(b.filePath))

  if (args.list) {
    console.log('Models:')
    for (const m of models) console.log(`  ${relative(root, m.filePath).replace(/\\/g, '/')}`)
    console.log(`(${models.length} models)`)
    return
  }

  const selected = args.all
    ? models
    : args.model
      ? models.filter(
          (m) =>
            m.name.toLowerCase().includes(args.model.toLowerCase()) ||
            m.filePath.toLowerCase().includes(args.model.toLowerCase()),
        )
      : []

  if (selected.length === 0) {
    console.error('No models selected. Use --all or pass a model name/id substring.')
    process.exit(1)
  }

  const config = {
    needs: [
      'concept-rail',
      'fulltext-search',
      'matrix-grids',
      'hash-routing',
      'reference-popup',
      'document-view',
    ],
    runtime: {
      cdn: 'https://cdn.jsdelivr.net/gh/cogNNitive/cogNNitive@innfo-console-v0.1.0/iNNfo/specs/templates/console/innfo-console.bundle.js',
      fallback:
        'https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/console/innfo-console.bundle.js',
    },
  }

  for (const m of selected) {
    const stem = m.name
    const modelVersion = String(m.fm.model_version ?? 'V_0-1-0')
    const elements = parseElements(m.content)
    const meta = {
      model: relative(root, m.filePath).replace(/\\/g, '/'),
      title: m.fm.title ?? stem,
      modelVersion,
      template: m.fm['parent_spec'] ? m.fm['parent_spec'] : undefined,
      generated: new Date().toISOString(),
      slug: elSlug(stem),
    }
    const model = { meta, elements, matrices: [] }
    const schema = { concepts: [], markers: [], matrices: [] }

    const outDir = join(root, 'export', `${stem}_console`)
    await mkdir(outDir, { recursive: true })
    const outFile = join(outDir, `${stem}_console.html`)
    const html = injectSlots(blueprint, config, schema, model)
    await writeFile(outFile, html, 'utf-8')
    if (bundle) await cp(bundlePath, join(outDir, 'innfo-console.bundle.js'))
    console.log(`✔ ${stem}_console.html → ${outFile.replace(root, '.')}`)
  }
  console.log(`Exported ${selected.length} console artifact(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})