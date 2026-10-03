/**
 * Lineage drift gate comparator (browser-safe, pure, read-only).
 *
 * Compares the managed sections of an on-disk lineage record with a fresh
 * rendering of the projection, byte for byte. The journal, hand-authored
 * blocks, and frontmatter are never compared. The record text is taken as is:
 * no line-ending conversion (the domaiNN `.gitattributes` `* -text` makes the
 * byte comparison safe).
 *
 * The CLI `--lineage --check`, `scripts/verify.js`, and the MCP
 * `check_workspace` tool all call this one function.
 */
import {
  blockText,
  managedSections,
  splitFrontmatter,
  splitTopLevelSections,
  type RenderedSections,
} from './record.js'

export interface LineageSectionDiff {
  /** The managed section heading, e.g. `# NN Sources`. */
  section: string
  /** The first differing element and line, described for a human. */
  firstDiff: string
}

export type LineageDriftResult = { ok: true } | { ok: false; diffs: LineageSectionDiff[] }

function describeFirstDiff(expected: string, actual: string): string {
  const exp = expected.split('\n')
  const act = actual.split('\n')
  const max = Math.max(exp.length, act.length)
  let element: string | undefined
  for (let i = 0; i < max; i++) {
    const e = exp[i]
    const a = act[i]
    if (e !== undefined && e.startsWith('## ')) element = e
    if (e === a) continue
    if (element === undefined && a !== undefined && a.startsWith('## ')) element = a
    const where = element ? `${element}: ` : ''
    const want = e === undefined ? '<end of section>' : JSON.stringify(e)
    const found = a === undefined ? '<end of section>' : JSON.stringify(a)
    return `${where}line ${i + 1}: expected ${want}, found ${found}`
  }
  return 'sections differ'
}

/** Fails for every managed section of `record` whose text differs from `rendered`. */
export function checkLineageDrift(record: string, rendered: RenderedSections): LineageDriftResult {
  const { blocks } = splitTopLevelSections(splitFrontmatter(record).body)
  const diffs: LineageSectionDiff[] = []
  for (const managed of managedSections(rendered)) {
    const expected = managed.render().replace(/\n+$/, '') + '\n'
    const block = blocks.find((b) => managed.re.test(b.heading))
    if (!block) {
      diffs.push({ section: managed.name, firstDiff: `missing section ${managed.name} in the record` })
      continue
    }
    const actual = blockText(block.heading, block.lines)
    if (actual !== expected) diffs.push({ section: managed.name, firstDiff: describeFirstDiff(expected, actual) })
  }
  return diffs.length === 0 ? { ok: true } : { ok: false, diffs }
}
