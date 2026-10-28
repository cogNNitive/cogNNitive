#!/usr/bin/env node
// scripts/strip-document-badge.mjs
//
// One-shot migration: remove the retired boilerplate document badge from every
// maintained markdown file.
//
// The badge used to be emitted into every iNNfo document:
//
//   > [!NOTE]
//   > This is an **iNNfo document** — a plain-text Markdown file. ...
//
// The preamble channel it lived in is still supported (and is now a purely
// author-owned slot), but the boilerplate content is gone. This script rewrites
// the documents that already carry it.
//
// Exclusions, both deliberate:
//   - `_V_x-y-z_` versioned filenames are published snapshots; they are never
//     rewritten in place.
//   - `openspec/` is normative prose about the capability, edited by hand.
//
// Usage:
//   node scripts/strip-document-badge.mjs --dry-run
//   node scripts/strip-document-badge.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DRY_RUN = process.argv.includes('--dry-run')

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'temp', '.atl', 'coverage'])
const VERSIONED = /_V_\d+-\d+-\d+_/i

const NOTE_LINE = /^> \[!NOTE\]$/
const BADGE_LINE = /^> This is an \*\*iNNfo document\*\*/
const BADGE_ANY = /^> This is an \*\*iNNfo document\*\*/m

function stripBadge(text) {
  const lines = text.split(/\r?\n/)
  const out = []
  let removed = 0

  for (let i = 0; i < lines.length; i += 1) {
    if (NOTE_LINE.test(lines[i]) && i + 1 < lines.length && BADGE_LINE.test(lines[i + 1])) {
      i += 1 // consume the badge line too
      removed += 1
      // Collapse the blank line the badge left behind: `---`, '', '', '# NN`
      const prevBlank = out.length > 0 && out[out.length - 1].trim() === ''
      const nextBlank = i + 1 < lines.length && lines[i + 1].trim() === ''
      if (prevBlank && nextBlank) i += 1
      continue
    }
    if (BADGE_LINE.test(lines[i])) {
      removed += 1
      const prevBlank = out.length > 0 && out[out.length - 1].trim() === ''
      const nextBlank = i + 1 < lines.length && lines[i + 1].trim() === ''
      if (prevBlank && nextBlank) i += 1
      continue
    }
    out.push(lines[i])
  }

  return { text: out.join('\n'), removed }
}

async function walk(dir, hits) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(path.join(dir, entry.name), hits)
      continue
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue

    const abs = path.join(dir, entry.name)
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/')
    if (rel.startsWith('openspec/')) continue
    if (VERSIONED.test(entry.name)) continue

    const before = await readFile(abs, 'utf8')
    if (!BADGE_ANY.test(before)) continue

    const { text, removed } = stripBadge(before)
    if (text === before) continue
    hits.push({ rel, removed })
    if (!DRY_RUN) await writeFile(abs, text, 'utf8')
  }
}

const hits = []
await walk(ROOT, hits)

for (const hit of hits) console.log(`${DRY_RUN ? '[dry-run] ' : ''}${hit.rel}`)
console.log(
  `${DRY_RUN ? 'Would strip' : 'Stripped'} the badge from ${hits.length} file(s)` +
    (DRY_RUN ? '.' : '.'),
)
