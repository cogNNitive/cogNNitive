import { parse as parseYaml } from 'yaml'
import { addModelProblems, extractInstanceProblems, isChangeOp, isChangeStatus, moveModelProblems, reviewGateProblems } from './types.js'
import { splitSourceFieldValue } from '../sourceRef.js'
import type {
  ChangesetDocument,
  ChangesetFrontmatter,
  ChangeItem,
} from './types.js'

export { reviewGateProblems } from './types.js'

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

/** Parses a `{...}` JSON object argument (`seed::`), or `undefined` when malformed. */
function parseJsonObject(str: string): Record<string, unknown> | undefined {
  const trimmed = str.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return undefined
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((v) => String(v))
}

function parseFieldsValue(str: string): Record<string, string> | undefined {  const trimmed = str.trim()
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

/** Error code thrown when a changeset frontmatter is missing a required L3 key. */
export const CHANGESET_FRONTMATTER_INVALID = 'CHANGESET_FRONTMATTER_INVALID'

function invalidFrontmatter(detail: string): never {
  throw new Error(`${CHANGESET_FRONTMATTER_INVALID}: ${detail}`)
}

/**
 * Validates and narrows the parsed YAML frontmatter to the L3 changeset contract.
 * No default frontmatter is substituted: a missing or wrong key is rejected.
 */
function validateFrontmatter(fm: Record<string, unknown>): ChangesetFrontmatter {
  if (fm.level !== 3) {
    invalidFrontmatter('level must be 3')
  }
  const parent = fm.parent_spec
  if (typeof parent !== 'object' || parent === null || Array.isArray(parent)) {
    invalidFrontmatter('parent_spec must be an object with name and url')
  }
  const parentObj = parent as Record<string, unknown>
  if (parentObj.name !== 'changes') {
    invalidFrontmatter('parent_spec.name must be "changes"')
  }
  if (typeof parentObj.url !== 'string' || parentObj.url.length === 0) {
    invalidFrontmatter('missing parent_spec.url')
  }
  if (typeof fm.spec_version !== 'string' || fm.spec_version.length === 0) {
    invalidFrontmatter('missing spec_version')
  }
  if (typeof fm.blueprint_version !== 'string' || fm.blueprint_version.length === 0) {
    invalidFrontmatter('missing blueprint_version')
  }
  if (!isChangeStatus(fm.status)) {
    invalidFrontmatter(
      'status must be one of proposed|applied|partially_applied|rejected|conflict',
    )
  }
  return fm as unknown as ChangesetFrontmatter
}

/**
 * Parses a changeset markdown string conforming to the `changes` bluepriNNt L3 contract.
 * A file without a frontmatter block, or whose `level`, `parent_spec.name`,
 * `parent_spec.url`, `spec_version`, `blueprint_version` or `status` is missing or wrong,
 * is rejected with `CHANGESET_FRONTMATTER_INVALID` naming the offending key.
 */
export function parseChangeset(rawContent: string): ChangesetDocument {
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(rawContent.trimStart())

  if (!frontmatterMatch) {
    invalidFrontmatter('missing frontmatter block')
  }

  const yamlText = frontmatterMatch[1]
  const body = frontmatterMatch[2]

  let parsedYaml: unknown
  try {
    parsedYaml = parseYaml(yamlText)
  } catch {
    invalidFrontmatter('frontmatter is not valid YAML')
  }
  if (typeof parsedYaml !== 'object' || parsedYaml === null || Array.isArray(parsedYaml)) {
    invalidFrontmatter('missing frontmatter block')
  }

  const frontmatter = validateFrontmatter(parsedYaml as Record<string, unknown>)

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
      case 'evidence':
        currentChange.evidence = stripQuotes(rawVal)
        break
      case 'gate':
        currentChange.gate = stripQuotes(rawVal)
        break
      case 'verdict':
        currentChange.verdict = stripQuotes(rawVal)
        break
      case 'reviewed_hash':
        currentChange.reviewed_hash = stripQuotes(rawVal)
        break
      case 'plan_hash':
        currentChange.plan_hash = stripQuotes(rawVal)
        break
      case 'blueprint_name':
        currentChange.blueprint_name = stripQuotes(rawVal)
        break
      case 'blueprint_url':
        currentChange.blueprint_url = stripQuotes(rawVal)
        break
      case 'knowledge_version':
        currentChange.knowledge_version = stripQuotes(rawVal)
        break
      case 'applied_at':
        currentChange.applied_at = stripQuotes(rawVal)
        break
      case 'batch':
        currentChange.batch = stripQuotes(rawVal)
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
      case 'resolved_target':
        currentChange.resolved_target = rawVal
        break
      case 'evidence_sha256': {
        const shas = splitSourceFieldValue(rawVal)
        if (shas.length > 0) currentChange.evidence_sha256 = shas
        break
      }
      case 'extracted_slugs': {
        // Execution fact written by `extract_instance` apply: the slug set the
        // fold re-keys (design A11). Positional, `[intro, 00-gancho]`.
        const slugs = splitSourceFieldValue(rawVal)
        if (slugs.length > 0) currentChange.extracted_slugs = slugs
        break
      }
      case 'seed': {
        const parsedSeed = parseJsonObject(rawVal)
        if (parsedSeed) {
          const seed: { columns?: string[]; rows?: string[] } = {}
          const columns = parseStringArray(parsedSeed.columns)
          const rows = parseStringArray(parsedSeed.rows)
          if (columns) seed.columns = columns
          if (rows) seed.rows = rows
          currentChange.seed = seed
        }
        break
      }
      default:
        // Record every key so a per-op validator can reject undeclared ones
        // (review_gate has no fallback-compatible keys).
        currentChange.rawKeys = currentChange.rawKeys ?? []
        currentChange.rawKeys.push(key)
        break
    }
  }

  if (currentChange && currentChange.id && currentChange.op && currentChange.target) {
    changes.push(currentChange as ChangeItem)
  }

  const problems = changes.flatMap(addModelProblems)
  if (problems.length > 0) {
    throw new Error(`Invalid add_model change: ${problems.join('; ')}`)
  }
  const moveProblems = changes.flatMap(moveModelProblems)
  if (moveProblems.length > 0) {
    throw new Error(`Invalid move_model change: ${moveProblems.join('; ')}`)
  }
  const extractProblems = changes.flatMap(extractInstanceProblems)
  if (extractProblems.length > 0) {
    throw new Error(`Invalid extract_instance change: ${extractProblems.join('; ')}`)
  }

  // A file carrying any review_gate change must declare the three provenance
  // markers (author_kind human, origin, reviewer) — verified here and at apply.
  const hasGate = changes.some((c) => c.op === 'review_gate')
  if (hasGate) {
    for (const key of ['author_kind', 'origin', 'reviewer'] as const) {
      if (frontmatter[key] === undefined || frontmatter[key] === null || String(frontmatter[key]).trim() === '') {
        throw new Error(`Invalid review_gate changeset: missing frontmatter "${key}" (required for verdicts)`)
      }
    }
  }

  return {
    frontmatter,
    changes,
    rawContent,
  }
}
