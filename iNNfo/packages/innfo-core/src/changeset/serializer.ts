import { stringify as stringifyYaml } from 'yaml'
import type { ChangesetDocument, ChangeItem } from './types.js'

function formatPropertyValue(val: string): string {
  if (val.includes('"') || val.includes('\n') || val.includes(':') || val.includes(' ')) {
    return JSON.stringify(val)
  }
  return val
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
  if (item.concept !== undefined) {
    lines.push(`concept:: ${item.concept}`)
  }
  if (item.name !== undefined) {
    lines.push(`name:: ${formatPropertyValue(item.name)}`)
  }
  if (item.slug !== undefined) {
    lines.push(`slug:: ${item.slug}`)
  }
  if (item.fields !== undefined) {
    lines.push(`fields:: ${JSON.stringify(item.fields)}`)
  }
  if (item.author !== undefined) {
    lines.push(`author:: ${item.author}`)
  }
  if (item.notes !== undefined) {
    lines.push(`notes:: ${item.notes}`)
  }

  // Execution annotations
  if (item.status !== undefined) {
    lines.push(`status:: ${item.status}`)
  }
  if (item.resolution !== undefined) {
    lines.push(`resolution:: ${item.resolution}`)
  }
  if (item.resolved_slug !== undefined) {
    lines.push(`resolved_slug:: ${item.resolved_slug}`)
  }

  return lines.join('\n')
}

/**
 * Serializes a ChangesetDocument back into normative Markdown syntax.
 */
export function serializeChangeset(doc: ChangesetDocument): string {
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
    `> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/).`,
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
