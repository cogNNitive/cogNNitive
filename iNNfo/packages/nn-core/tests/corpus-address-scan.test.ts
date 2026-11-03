import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseKnowledge } from '../src/parser/index.js'

/**
 * `distributed-storage` S7b (Q2, resolved: apply): the shipped samples and the
 * test fixtures are kNNowledge documents too, so they follow the one grammar.
 * A typed field value is an address — `@<slug>` inside the model, a
 * hierarchical id for another — and the wikilink form is removed. Prose
 * wikilinks (`* [[Concept]]` index lines) are body text and stay.
 *
 * The corpus below is every L3 model the repository ships or tests against.
 * Blueprint *package* content (specs, procedure bodies) is out of scope: it is
 * not a kNNowledge document, and S7c owns it.
 */

const here = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(here, '..', '..', '..', '..')

const CORPUS_ROOTS = [
  join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts'),
  join(REPO_ROOT, 'test', '_samples_nn'),
  join(REPO_ROOT, 'test', 'ecosystem_NN'),
  join(REPO_ROOT, 'test', 'fixtures', 'testlab'),
  join(REPO_ROOT, 'test', 'simulation', 'fixtures'),
  join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'tests', 'fixtures'),
  join(REPO_ROOT, 'iNNfo', 'packages', 'nn-mcp', 'test'),
  join(REPO_ROOT, 'docs', 'cognitive_nn', 'use-cases'),
]

/** A blueprint package folder (spec + procedures + defaults) is not a kNNowledge document. */
function isBlueprintPackageContent(file: string): boolean {
  const segs = file.split(sep)
  const i = segs.indexOf('bluepriNNts')
  if (i === -1 || i >= segs.length - 1) return false
  return segs[i + 2] !== 'samples'
}

function collectModels(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collectModels(full, acc)
    else if (entry.name.endsWith('_NN.md') && !/_sidecar_NN\.md$/.test(entry.name)) acc.push(full)
  }
  return acc
}

function corpus(): string[] {
  const files: string[] = []
  for (const root of CORPUS_ROOTS) {
    for (const file of collectModels(root)) {
      if (isBlueprintPackageContent(file)) continue
      if (!/^level:\s*3\s*$/m.test(readFileSync(file, 'utf-8'))) continue
      files.push(file)
    }
  }
  return files
}

interface TypedField {
  line: number
  field: string
  value: string
  /** The element the field belongs to, when the field sits inside one. */
  element?: string
}

/** Every `field:: value` line that carries a wikilink in its value. */
function wikilinkTypedFields(text: string): TypedField[] {
  const found: TypedField[] = []
  const lines = text.split(/\r?\n/)
  let element: string | undefined
  lines.forEach((line, index) => {
    const heading = line.match(/^#{2,6}\s+NN\s+(?:[^:]+):\s*(.+?)\s*$/)
    if (heading) element = heading[1].trim()
    else if (/^#{1,6}\s/.test(line)) element = undefined
    const field = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)::(\s*)(.*)$/)
    if (!field) return
    if (!field[3].includes('[[')) return
    found.push({ line: index + 1, field: field[1], value: field[3].trim(), element })
  })
  return found
}

/**
 * Deliberate dangling addresses. Each is a fixture whose whole point is the
 * unresolved case, so it must NOT resolve inside its document.
 */
const INTENTIONAL_DANGLING = new Map<string, string>([
  [
    join('iNNfo', 'packages', 'nn-core', 'tests', 'fixtures', 'programas-golden', 'kNNowledge', 'tutorias_NN.md'),
    'programa-fantasma', // scope/elements.spec.ts: UNKNOWN_PARENT_ELEMENT
  ],
])

/** The slugs a document's own elements answer to (explicit `slug::`, else derived). */
function elementSlugs(text: string): Set<string> {
  const slugs = new Set<string>()
  for (const [, elements] of parseKnowledge(text).elements) {
    for (const element of elements) {
      if (element.slug) slugs.add(element.slug)
    }
  }
  return slugs
}

describe('corpus scan: every shipped sample and fixture model uses addresses (S7b)', () => {
  const files = corpus()

  it('scans a non-empty corpus', () => {
    // A silently empty scan would make every assertion below pass for the wrong reason.
    expect(files.length).toBeGreaterThan(100)
  })

  it('no typed field in the corpus still carries the removed `[[Name]]` form', () => {
    const offenders: string[] = []
    for (const file of files) {
      for (const hit of wikilinkTypedFields(readFileSync(file, 'utf-8'))) {
        offenders.push(
          `${relative(REPO_ROOT, file)}:${hit.line} — ${hit.element ?? '(document)'}.${hit.field} = ${hit.value}`,
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it('every in-model address in the corpus names an element of its own document', () => {
    const offenders: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf-8')
      // A changeset addresses OTHER models by definition (rename from/to, field
      // payloads); its own document is not the resolution context.
      if (/^\s+name:\s*['"]?changes['"]?\s*$/m.test(text.split(/^---\s*$/m)[1] ?? '')) continue
      const slugs = elementSlugs(text)
      const rel = relative(REPO_ROOT, file)
      const allowedDangle = INTENTIONAL_DANGLING.get(rel)
      text.split(/\r?\n/).forEach((line, index) => {
        const field = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)::(\s*)(.*)$/)
        if (!field) return
        for (const address of field[3].matchAll(/(?:^|[\s,\[])(@[a-z0-9][a-z0-9-]*)/g)) {
          const slug = address[1].slice(1)
          if (slugs.has(slug) || slug === allowedDangle) continue
          offenders.push(`${rel}:${index + 1} — ${field[1]} = ${address[1]}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })

  it('the video golden fixture uses the distributed layout and the S7a stems', () => {
    const videoCorpus = files.filter((file) => file.includes(`${sep}video-golden${sep}`))
    expect(videoCorpus.length).toBeGreaterThan(3)
    const retired = videoCorpus.filter((file) => {
      const name = file.split(sep).pop() ?? ''
      if (/_scope_NN\.md$/.test(name)) return true
      // `<slug>_video-script_<series>_NN.md` carried the series name in the instance stem.
      return /_video-script_[a-z0-9][a-z0-9-]*_NN\.md$/.test(name) && !/^[a-z0-9-]+_video-script_NN\.md$/.test(name)
    })
    expect(retired.map((f) => relative(REPO_ROOT, f))).toEqual([])
  })
})
