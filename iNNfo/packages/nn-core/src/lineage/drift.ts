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

function formatSnippet(s: string): string {
  const snippet = s.slice(0, 100) + (s.length > 100 ? '…' : '')
  return `(${s.length} chars) ${JSON.stringify(snippet)}`
}

function formatLineDiff(e: string | undefined, a: string | undefined): string {
  if (e === undefined) {
    const found = a === undefined ? '<end of section>' : a.length <= 120 ? JSON.stringify(a) : formatSnippet(a)
    return `expected <end of section>, found ${found}`
  }
  if (a === undefined) {
    const want = e.length <= 120 ? JSON.stringify(e) : formatSnippet(e)
    return `expected ${want}, found <end of section>`
  }

  if (Math.max(e.length, a.length) <= 120) {
    return `expected ${JSON.stringify(e)}, found ${JSON.stringify(a)}`
  }

  let firstDivergence = 0
  const minLen = Math.min(e.length, a.length)
  while (firstDivergence < minLen && e[firstDivergence] === a[firstDivergence]) {
    firstDivergence++
  }

  const windowStart = Math.max(0, firstDivergence - 30)
  const expEnd = Math.min(e.length, firstDivergence + 90)
  const actEnd = Math.min(a.length, firstDivergence + 90)

  const expWindow = (windowStart > 0 ? '…' : '') + e.slice(windowStart, expEnd) + (expEnd < e.length ? '…' : '')
  const actWindow = (windowStart > 0 ? '…' : '') + a.slice(windowStart, actEnd) + (actEnd < a.length ? '…' : '')

  return `diverges at offset ${firstDivergence}: expected (${e.length} chars) ${JSON.stringify(expWindow)}, found (${a.length} chars) ${JSON.stringify(actWindow)}`
}

function describeSectionDiff(expected: string, actual: string): string {
  const exp = expected.split('\n')
  const act = actual.split('\n')
  const max = Math.max(exp.length, act.length)
  let currentElement = ''
  const elementMismatches = new Map<string, string[]>()

  for (let i = 0; i < max; i++) {
    const e = exp[i]
    const a = act[i]
    if (e !== undefined && e.startsWith('## ')) currentElement = e
    else if (!currentElement && a !== undefined && a.startsWith('## ')) currentElement = a
    if (e === a) continue

    const key = currentElement || '<preamble>'
    if (!elementMismatches.has(key)) {
      elementMismatches.set(key, [])
    }
    elementMismatches.get(key)!.push(`line ${i + 1}: ${formatLineDiff(e, a)}`)
  }

  if (elementMismatches.size === 0) return 'sections differ'

  const parts: string[] = []
  for (const [elem, mismatches] of elementMismatches) {
    const where = elem !== '<preamble>' ? `${elem}: ` : ''
    if (mismatches.length === 1) {
      parts.push(`${where}${mismatches[0]}`)
    } else {
      const list = mismatches.slice(0, 10).join('; ')
      const more = mismatches.length > 10 ? `; ... and ${mismatches.length - 10} more` : ''
      parts.push(`${where}(${mismatches.length} mismatches: ${list}${more})`)
    }
  }

  return parts.slice(0, 10).join(' | ') + (parts.length > 10 ? ` | ... and ${parts.length - 10} more elements` : '')
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
    if (actual !== expected) {
      diffs.push({ section: managed.name, firstDiff: describeSectionDiff(expected, actual) })
    }
  }
  return diffs.length === 0 ? { ok: true } : { ok: false, diffs }
}
