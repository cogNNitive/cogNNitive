import { parse as parseYaml } from 'yaml'
import { isChangeOp, isChangeStatus } from './types.js'
import type {
  ChangesetDocument,
  ChangesetFrontmatter,
  ChangeItem,
} from './types.js'

function stripQuotes(str: string): string {
  const trimmed = str.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'string') return parsed
    } catch {
      // not valid JSON; fall through to strip the wrapping quotes
    }
    return trimmed.slice(1, -1)
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseFieldsValue(str: string): Record<string, string> | undefined {
  const trimmed = str.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed !== null) {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed)) {
          out[k] = String(v)
        }
        return out
      }
    } catch {
      // fallback
    }
  }
  return undefined
}

/**
 * Parses a changeset markdown string conforming to blueprint 'changes'.
 */
export function parseChangeset(rawContent: string): ChangesetDocument {
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(rawContent.trimStart())

  let frontmatter: ChangesetFrontmatter = {
    spec_version: 'V_0-4-0',
    parent_spec: 'changes',
    blueprint_version: '0.1.0',
    status: 'proposed',
    proposal_sha: '',
  }
  let body = rawContent

  if (frontmatterMatch) {
    const yamlText = frontmatterMatch[1]
    body = frontmatterMatch[2]
    try {
      const parsedYaml = parseYaml(yamlText)
      if (typeof parsedYaml === 'object' && parsedYaml !== null) {
        frontmatter = {
          ...frontmatter,
          ...parsedYaml,
        }
      }
    } catch {
      // retain default frontmatter
    }
  }

  // Parse ## NN Change: <id> headings and property lines
  const changeHeadingRegex = /^##\s+NN\s+Change:\s*(.+)$/i
  const lines = body.split(/\r?\n/)
  const changes: ChangeItem[] = []

  let currentChange: Partial<ChangeItem> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headingMatch = changeHeadingRegex.exec(line.trim())

    if (headingMatch) {
      if (currentChange && currentChange.id && currentChange.op && currentChange.target) {
        changes.push(currentChange as ChangeItem)
      }
      currentChange = {
        id: headingMatch[1].trim(),
      }
      continue
    }

    if (!currentChange) continue

    const propMatch = /^([a-zA-Z0-9_-]+)::\s*(.*)$/.exec(line.trim())
    if (!propMatch) continue

    const key = propMatch[1].trim()
    const rawVal = propMatch[2].trim()

    switch (key) {
      case 'op':
        if (!isChangeOp(rawVal)) {
          throw new Error(`Invalid changeset op: "${rawVal}"`)
        }
        currentChange.op = rawVal
        break
      case 'target':
        currentChange.target = rawVal
        break
      case 'from':
        currentChange.from = stripQuotes(rawVal)
        break
      case 'to':
        currentChange.to = stripQuotes(rawVal)
        break
      case 'base_hash':
        currentChange.base_hash = stripQuotes(rawVal)
        break
      case 'concept':
        currentChange.concept = rawVal
        break
      case 'name':
        currentChange.name = stripQuotes(rawVal)
        break
      case 'slug':
        currentChange.slug = rawVal
        break
      case 'fields': {
        const parsedObj = parseFieldsValue(rawVal)
        if (parsedObj) {
          currentChange.fields = parsedObj
        }
        break
      }
      case 'author':
        currentChange.author = stripQuotes(rawVal)
        break
      case 'notes':
        currentChange.notes = stripQuotes(rawVal)
        break
      case 'status':
        if (!isChangeStatus(rawVal)) {
          throw new Error(`Invalid changeset status: "${rawVal}"`)
        }
        currentChange.status = rawVal
        break
      case 'resolution':
        currentChange.resolution = stripQuotes(rawVal)
        break
      case 'resolved_slug':
        currentChange.resolved_slug = rawVal
        break
      default:
        // Ignore unrecognized keys or comments
        break
    }
  }

  if (currentChange && currentChange.id && currentChange.op && currentChange.target) {
    changes.push(currentChange as ChangeItem)
  }

  return {
    frontmatter,
    changes,
    rawContent,
  }
}
