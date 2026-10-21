import { stringify as stringifyYaml } from 'yaml'
import type { ChangesetDocument, ChangesetFrontmatter, ChangeItem } from './types.js'

/** Execution annotation keys — the only per-change lines the raw path rewrites. */
const ANNOTATION_RE = /^(status|resolution|resolved_slug|replaced_sources)::/
const CHANGE_HEADING_RE = /^##\s+NN\s+Change:\s*(.+)$/i

function detectEol(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

function formatPropertyValue(val: string): string {
  // Only quote when a value would otherwise break the `key:: value` line grammar:
  // a newline ends the line, and a leading/trailing quote would be misparsed.
  if (val.includes('"') || val.includes('\n')) {
    return JSON.stringify(val)
  }
  return val
}

function annotationLines(item: ChangeItem): string[] {
  const lines: string[] = []
  if (item.status !== undefined) {
    lines.push(`status:: ${item.status}`)
  }
  if (item.resolution !== undefined) {
    lines.push(`resolution:: ${formatPropertyValue(item.resolution)}`)
  }
  if (item.resolved_slug !== undefined) {
    lines.push(`resolved_slug:: ${item.resolved_slug}`)
  }
  if (item.replaced_sources !== undefined) {
    lines.push(`replaced_sources:: ${formatPropertyValue(item.replaced_sources)}`)
  }
  return lines
}

function formatChangeItem(item: ChangeItem): string {
  const lines: string[] = []
  lines.push(`## NN Change: ${item.id}`)
  lines.push(`op:: ${item.op}`)
  lines.push(`target:: ${item.target}`)

  if (item.from !== undefined) {
    lines.push(`from:: ${formatPropertyValue(item.from)}`)
  }
  if (item.to !== undefined) {
    lines.push(`to:: ${formatPropertyValue(item.to)}`)
  }
  if (item.base_hash !== undefined) {
    lines.push(`base_hash:: ${item.base_hash}`)
  }
  if (item.concept !== undefined) {
    lines.push(`concept:: ${item.concept}`)
  }
  if (item.name !== undefined) {
    lines.push(`name:: ${formatPropertyValue(item.name)}`)
  }
  if (item.slug !== undefined) {
    lines.push(`slug:: ${item.slug}`)
  }
  if (item.blueprint_name !== undefined) {
    lines.push(`blueprint_name:: ${formatPropertyValue(item.blueprint_name)}`)
  }
  if (item.blueprint_url !== undefined) {
    lines.push(`blueprint_url:: ${formatPropertyValue(item.blueprint_url)}`)
  }
  if (item.knowledge_version !== undefined) {
    lines.push(`knowledge_version:: ${formatPropertyValue(item.knowledge_version)}`)
  }
  if (item.fields !== undefined) {
    lines.push(`fields:: ${JSON.stringify(item.fields)}`)
  }
  if (item.author !== undefined) {
    lines.push(`author:: ${item.author}`)
  }
  if (item.notes !== undefined) {
    lines.push(`notes:: ${formatPropertyValue(item.notes)}`)
  }
  // Normative evidence citation (sealed with the proposal)
  if (item.sources !== undefined) {
    lines.push(`sources:: ${formatPropertyValue(item.sources)}`)
  }

  // Execution annotations
  lines.push(...annotationLines(item))

  return lines.join('\n')
}

/**
 * Rewrites the frontmatter execution keys (`status`, `resolution`, `applied_at`, `models`) in place,
 * leaving every other frontmatter line byte-identical.
 */
function rewriteFrontmatter(
  yamlText: string,
  fm: ChangesetFrontmatter,
  eol: string,
): string {
  const lines = yamlText.split(/\r?\n/)

  const blockEnd = (start: number): number => {
    let end = start + 1
    while (end < lines.length && /^[ \t]+\S/.test(lines[end])) end++
    return end
  }
  const findKey = (key: string): number =>
    lines.findIndex((l) => new RegExp(`^${key}[ \\t]*:`).test(l))

  const upsert = (key: string, valueLines: string[] | null): void => {
    const idx = findKey(key)
    if (valueLines === null) {
      if (idx >= 0) lines.splice(idx, blockEnd(idx) - idx)
      return
    }
    if (idx >= 0) {
      lines.splice(idx, blockEnd(idx) - idx, ...valueLines)
    } else {
      lines.push(...valueLines)
    }
  }

  // `proposal_sha` is engine-owned: apply seals an unsealed proposal and re-seals a
  // conflict re-proposal at intake, and that seal must be persisted with the write-back.
  upsert(
    'proposal_sha',
    fm.proposal_sha !== undefined && fm.proposal_sha !== ''
      ? [`proposal_sha: ${fm.proposal_sha}`]
      : null,
  )
  upsert('status', [`status: ${fm.status}`])
  upsert(
    'resolution',
    fm.resolution !== undefined ? [`resolution: ${JSON.stringify(fm.resolution)}`] : null,
  )
  upsert(
    'applied_at',
    fm.applied_at !== undefined ? [`applied_at: ${fm.applied_at}`] : null,
  )
  upsert(
    'models',
    fm.models !== undefined
      ? stringifyYaml({ models: fm.models }).trim().split(/\r?\n/)
      : null,
  )

  return lines.join(eol)
}

/**
 * Rewrites only the execution annotation lines of each change block, appending them after
 * the block's last normative line. Every other byte of the body is copied verbatim.
 */
function rewriteBodyAnnotations(
  body: string,
  changes: ChangeItem[],
  eol: string,
): string {
  const lines = body.split(/\r?\n/)
  const byId = new Map(changes.map((c) => [c.id, c]))

  const heads: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (CHANGE_HEADING_RE.test(lines[i].trim())) heads.push(i)
  }
  if (heads.length === 0) return body

  const out: string[] = []
  for (let i = 0; i < heads[0]; i++) out.push(lines[i])

  for (let h = 0; h < heads.length; h++) {
    const start = heads[h]
    const end = h + 1 < heads.length ? heads[h + 1] : lines.length
    const id = CHANGE_HEADING_RE.exec(lines[start].trim())![1].trim()

    const blockLines: string[] = []
    for (let i = start; i < end; i++) {
      const t = lines[i].replace(/\r$/, '').trim()
      if (i > start && ANNOTATION_RE.test(t)) continue
      blockLines.push(lines[i])
    }

    let trailingBlanks = 0
    while (
      blockLines.length > 0 &&
      blockLines[blockLines.length - 1].replace(/\r$/, '').trim() === ''
    ) {
      blockLines.pop()
      trailingBlanks++
    }

    const item = byId.get(id)
    if (item) blockLines.push(...annotationLines(item))

    out.push(...blockLines)
    for (let b = 0; b < trailingBlanks; b++) out.push('')
  }

  return out.join(eol)
}

function serializePreservingRaw(doc: ChangesetDocument): string {
  const raw = doc.rawContent as string
  const m = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n?)([\s\S]*)$/.exec(raw)
  if (!m) return serializeStructural(doc)

  const eol = detectEol(raw)
  const yamlText = m[1]
  const afterFmEol = m[2]
  const body = m[3]

  const newYaml = rewriteFrontmatter(yamlText, doc.frontmatter, eol)
  const newBody = rewriteBodyAnnotations(body, doc.changes, eol)

  return `---${eol}${newYaml}${eol}---${afterFmEol}${newBody}`
}

/**
 * Renders a document built in memory (no `rawContent`) structurally.
 */
function serializeStructural(doc: ChangesetDocument): string {
  const frontmatterClean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc.frontmatter)) {
    if (v !== undefined) {
      frontmatterClean[k] = v
    }
  }

  const yamlPart = stringifyYaml(frontmatterClean).trim()

  const sections: string[] = [
    `---`,
    yamlPart,
    `---`,
    ``,
    `> [!NOTE]`,
    `> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.`,
    ``,
    `# NN index`,
    ``,
    `* [[Change]]`,
    ``,
    `# NN Change`,
    ``,
  ]

  const changeBlocks = doc.changes.map(formatChangeItem)
  sections.push(changeBlocks.join('\n\n'))
  sections.push('')

  return sections.join('\n')
}

/**
 * Serializes a ChangesetDocument back into normative Markdown syntax.
 *
 * When the document carries the `rawContent` it was parsed from, every byte is copied
 * verbatim except the frontmatter execution keys (`status`, `resolution`, `applied_at`, `models`) and
 * the per-change execution annotation lines (`status::`, `resolution::`, `resolved_slug::`,
 * `replaced_sources::`). A document built in memory is rendered structurally.
 */
export function serializeChangeset(doc: ChangesetDocument): string {
  if (doc.rawContent !== undefined) {
    return serializePreservingRaw(doc)
  }
  return serializeStructural(doc)
}
