#!/usr/bin/env node

/**
 * skills/nn-upgrade/scripts/migrate-domain.js
 *
 * Domain utility CLI for iNNfo domains. There is no in-place migration of an old domain:
 * an old or broken domain is migrated by creating a NEW domain and importing the old one
 * as a Source.
 *
 * Modes:
 *   --freeze-slugs [--apply]                 freeze the element slugs of every Level 3 model
 *   --import-as-source --new-domain-dir <d>  scaffold a new domaiNN and import the old tree
 */

const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

let _corePromise = null
function loadInnfoCore() {
  if (!_corePromise) {
    const corePath = path.resolve(__dirname, '../../../iNNfo/packages/innfo-core/dist/index.js')
    _corePromise = import(pathToFileURL(corePath).href)
  }
  return _corePromise
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

async function runImportAsSource(legacyDir, newDomainDir) {
  const srcDir = path.resolve(legacyDir)
  const targetDir = path.resolve(newDomainDir)

  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    throw new Error(`Source legacy domain directory not found: ${srcDir}`)
  }

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`)
  }

  fs.mkdirSync(targetDir, { recursive: true })
  fs.mkdirSync(path.join(targetDir, 'kNNowledge'), { recursive: true })
  fs.mkdirSync(path.join(targetDir, 'sources', 'legacy'), { recursive: true })

  // Scaffold standard domaiNN_NN.md
  const scaffold = `---
blueprint_version: "0.1.0"
blueprint_name: "domaiNN"
knowledge_dir: "kNNowledge"
blueprints_dir: "specs/bluepriNNts"
parent_spec:
  url: "https://raw.githubusercontent.com/cognnitive/innfo/main/iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md"
---
# domaiNN Definition

- Domain Type:: domaiNN
- Legacy Source:: sources/legacy

## kNNowledge

## Sources

- Legacy Domain:: sources/legacy
`
  fs.writeFileSync(path.join(targetDir, 'domaiNN_NN.md'), scaffold, 'utf-8')

  // Copy legacy domain tree under sources/legacy (excluding .git / node_modules)
  function copyTree(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      if (['.git', 'node_modules', 'dist', 'coverage', 'backups'].includes(entry.name)) continue
      const srcFull = path.join(src, entry.name)
      const destFull = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        fs.mkdirSync(destFull, { recursive: true })
        copyTree(srcFull, destFull)
      } else if (entry.isFile()) {
        fs.copyFileSync(srcFull, destFull)
      }
    }
  }

  copyTree(srcDir, path.join(targetDir, 'sources', 'legacy'))

  console.log('════════════════════════════════════════════════════════════')
  console.log('           Import Legacy Domain as Read-Only Source         ')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`New Canonical domaiNN created at: ${targetDir}`)
  console.log(`Legacy domain imported into:      ${path.join(targetDir, 'sources', 'legacy')}\n`)
  console.log('Your legacy files remain unchanged as an archival source.')
}

/**
 * Scans a domain directory for Level 3 models and freezes any unfrozen element slugs.
 *
 * @param {string} domainDir
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ scanned: number, modified: number, frozenModels: Array<{ file: string, frozenCount: number, slugs: string[] }> }>}
 */
async function freezeDomainSlugs(domainDir, options = {}) {
  const dryRun = options.dryRun === true
  const { parseKnowledge, serializeKnowledge, freeze_slugs } = await loadInnfoCore()
  const ws = path.resolve(domainDir)
  const candidateDirs = [path.join(ws, 'kNNowledge'), path.join(ws, 'models'), ws]

  const markdownFiles = new Set()
  for (const d of candidateDirs) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          if (d === ws && (entry.name.startsWith('domaiNN_') || entry.name.startsWith('workspace_'))) {
            continue
          }
          markdownFiles.add(path.join(d, entry.name))
        }
      }
    }
  }

  let scanned = 0
  let modified = 0
  const frozenModels = []

  for (const file of markdownFiles) {
    const rel = path.relative(ws, file).replace(/\\/g, '/')
    let content
    try {
      content = fs.readFileSync(file, 'utf-8')
    } catch {
      continue
    }

    let parsed
    try {
      parsed = parseKnowledge(content)
    } catch {
      continue
    }

    const fm = parsed.frontmatter || {}
    const isLevel3 = fm.level === 3 || fm.role === 'knowledge' || Boolean(fm.parent_spec)
    if (!isLevel3) continue

    scanned++
    let unfrozenCount = 0
    for (const [, elements] of parsed.elements.entries()) {
      for (const el of elements) {
        if (!el.slugExplicit) {
          unfrozenCount++
        }
      }
    }

    if (unfrozenCount > 0) {
      freeze_slugs(parsed)
      const frozenSlugs = []
      for (const [, elements] of parsed.elements.entries()) {
        for (const el of elements) {
          if (el.slug) frozenSlugs.push(el.slug)
        }
      }
      modified++
      frozenModels.push({ file: rel, frozenCount: unfrozenCount, slugs: frozenSlugs })
      if (!dryRun) {
        const serialized = serializeKnowledge(parsed)
        fs.writeFileSync(file, serialized, 'utf-8')
      }
    }
  }

  return { scanned, modified, frozenModels }
}

const USAGE =
  'Usage: node migrate-domain.js --domain-dir <dir> (--freeze-slugs [--apply] [--json] | --import-as-source --new-domain-dir <dir>)'

/** Every option the CLI accepts; anything else starting with "--" is rejected. */
const OPTIONS_WITH_VALUE = new Set(['--domain-dir', '--workspace-dir', '--new-domain-dir'])
const OPTIONS_FLAG = new Set(['--freeze-slugs', '--import-as-source', '--json'])

/**
 * Returns the first unknown option in `argv`, or null. `--apply` is only valid with
 * `--freeze-slugs` (it is the write switch of that mode, not a migration apply).
 *
 * @param {string[]} argv
 * @returns {string | null}
 */
function findUnknownOption(argv) {
  const isFreeze = argv.includes('--freeze-slugs')
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    if (OPTIONS_WITH_VALUE.has(arg)) {
      i++
      continue
    }
    if (OPTIONS_FLAG.has(arg)) continue
    if (arg === '--apply' && isFreeze) continue
    return arg
  }
  return null
}

async function main() {
  const unknown = findUnknownOption(process.argv.slice(2))
  if (unknown) {
    console.error(`Error: unknown option: ${unknown}`)
    console.error(USAGE)
    process.exit(1)
  }

  const isJson = process.argv.includes('--json')
  const isApply = process.argv.includes('--apply')
  const domainDirArg = getArg('--domain-dir') || getArg('--workspace-dir')
  const importAsSourceArg = process.argv.includes('--import-as-source')
  const newDomainDirArg = getArg('--new-domain-dir')

  if (!domainDirArg) {
    console.error(USAGE)
    process.exit(1)
  }

  const ws = path.resolve(domainDirArg)
  if (!fs.existsSync(ws) || !fs.statSync(ws).isDirectory()) {
    console.error(`Error: Domain directory not found: ${ws}`)
    process.exit(1)
  }

  // Freeze slugs flow
  if (process.argv.includes('--freeze-slugs')) {
    const dryRun = !isApply
    const result = await freezeDomainSlugs(ws, { dryRun })
    if (isJson) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(dryRun ? 'Domain Slug Freezing (DRY RUN):' : 'Domain Slug Freezing (APPLIED):')
      console.log(`  Scanned: ${result.scanned} models`)
      console.log(`  Models with unfrozen slugs: ${result.modified}`)
      for (const m of result.frozenModels) {
        console.log(`    ${m.file}: froze ${m.frozenCount} slugs (${m.slugs.join(', ')})`)
      }
      if (dryRun && result.modified > 0) {
        console.log('\nRun with --apply to freeze slugs in place.')
      }
    }
    return
  }

  // Import as source flow
  if (importAsSourceArg) {
    if (!newDomainDirArg) {
      console.error('Error: --new-domain-dir <dir> is required when using --import-as-source.')
      process.exit(1)
    }
    await runImportAsSource(ws, newDomainDirArg)
    return
  }

  console.error(USAGE)
  process.exit(1)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

module.exports = {
  main,
  freezeDomainSlugs,
  findUnknownOption,
}
