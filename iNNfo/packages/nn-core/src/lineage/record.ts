/**
 * Lineage record structure (browser-safe, pure).
 *
 * The record `*_cogNNitive_NN.md` is a single living document. Three of its
 * top-level sections are managed: regenerated from the projection on every
 * `--lineage` run and compared byte for byte by the drift gate. This module is
 * the one definition of "managed" shared by the generator and the gate. Every
 * other block (index, the append-only journal, hand-authored blocks) passes
 * through untouched.
 */
import { parseKnowledge } from '../parser/core.js'
import type { FileSnapshot } from '../queryUnits.js'
import { isExcludedPath, isNNName, roleOf } from '../naming/contract.js'

export const RECORD_BLUEPRINT = 'cogNNitive'
export const RECORD_TEMPLATE_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md'
export const RECORD_INNFO_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md'

/** The rendered text of the three managed sections. */
export interface RenderedSections {
  sources: string
  modelRecords: string
  artifacts: string
}

export interface TopLevelBlock {
  heading: string
  lines: string[]
}

export interface ManagedSection {
  /** The section heading as the gate reports it, e.g. `# NN Sources`. */
  name: string
  re: RegExp
  render: () => string
}

const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?)/

/** Splits a record into its frontmatter block (verbatim, or empty) and the body. */
export function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const match = FRONTMATTER_RE.exec(text)
  const frontmatter = match ? match[1] : ''
  return { frontmatter, body: text.slice(frontmatter.length) }
}

/** Splits a body into its preamble and top-level `# ` sections. Splits on `\n` only: no EOL normalization. */
export function splitTopLevelSections(body: string): { preamble: string; blocks: TopLevelBlock[] } {
  const blocks: TopLevelBlock[] = []
  const preamble: string[] = []
  let current: TopLevelBlock | null = null
  for (const line of body.split('\n')) {
    if (/^# (?!#)/.test(line)) {
      if (current) blocks.push(current)
      current = { heading: line, lines: [] }
    } else if (current) {
      current.lines.push(line)
    } else {
      preamble.push(line)
    }
  }
  if (current) blocks.push(current)
  return { preamble: preamble.join('\n'), blocks }
}

/** The three filesystem-synced sections, in document order. */
export function managedSections(sections: RenderedSections): ManagedSection[] {
  return [
    { name: '# NN Sources', re: /^# NN Sources\b/, render: () => sections.sources },
    { name: '# NN ModelRecords', re: /^# NN ModelRecords\b/, render: () => sections.modelRecords },
    { name: '# NN Artifacts', re: /^# NN Artifacts\b/, render: () => sections.artifacts },
  ]
}

/** A block as it is written to the record: heading, body, exactly one trailing newline. */
export function blockText(heading: string, lines: string[]): string {
  return (heading + '\n' + lines.join('\n')).replace(/\n+$/, '') + '\n'
}

/** The record frontmatter. The record is a single living file, so it carries no version key. */
export function renderRecordFrontmatter(title: string): string {
  return (
    '---\n' +
    'specification_version: "V_0-3-0"\n' +
    `specification_url: "${RECORD_INNFO_URL}"\n` +
    'level: 3\n' +
    'parent_spec:\n' +
    `  name: "${RECORD_BLUEPRINT}"\n` +
    `  url: "${RECORD_TEMPLATE_URL}"\n` +
    `title: "${title}"\n` +
    '---\n'
  )
}

/**
 * Re-synchronises the three managed sections of an existing record from the
 * rendered projection. Every other section is passed through untouched.
 */
export function refreshExistingModel(existing: string, sections: RenderedSections): string {
  const { body } = splitFrontmatter(existing)
  const titleMatch = /^title:\s*"?(.*?)"?\s*$/m.exec(existing)

  const { preamble, blocks } = splitTopLevelSections(body)
  const managed = managedSections(sections)
  const rendered = managed.map((m) => m.render().replace(/\n+$/, '') + '\n')
  const present = new Array<boolean>(managed.length).fill(false)

  const rebuilt = blocks.map((b) => {
    const idx = managed.findIndex((m) => m.re.test(b.heading))
    if (idx !== -1) {
      present[idx] = true
      return rendered[idx]
    }
    return blockText(b.heading, b.lines)
  })

  // Insert any missing managed section just after `# NN index` (or at the top),
  // keeping Sources, ModelRecords, Artifacts order.
  const anchor = rebuilt.findIndex((s) => /^# NN index\b/.test(s))
  let insertAt = anchor >= 0 ? anchor + 1 : 0
  for (let i = 0; i < managed.length; i++) {
    if (present[i]) {
      insertAt = rebuilt.findIndex((s) => managed[i].re.test(s)) + 1
      continue
    }
    rebuilt.splice(insertAt, 0, rendered[i])
    insertAt++
  }

  const notice = preamble.replace(/^\n+|\n+$/g, '')
  return (
    renderRecordFrontmatter(titleMatch ? titleMatch[1] : 'Provenance') +
    '\n' +
    (notice ? notice + '\n\n' : '') +
    rebuilt.join('\n') +
    '\n'
  )
}

/**
 * The lineage record among `files`, found by role (`lineage-record`), never by
 * folder. A domaiNN has at most one; if several exist the first by path wins.
 */
export function findLineageRecord(files: readonly FileSnapshot[]): FileSnapshot | null {
  const candidates = files
    .filter((f) => isNNName(f.path) && !isExcludedPath(f.path))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  for (const file of candidates) {
    const parentSpecName = parseKnowledge(file.content).frontmatter?.parent_spec?.name
    if (roleOf({ path: file.path, parentSpecName }) === 'lineage-record') return file
  }
  return null
}
