import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import {
  computeProposalSha,
  verifyProposalSha,
  parseChangeset,
  serializeChangeset,
  parseKnowledge,
  parseFrontmatter,
  validateDocument,
  findCanonicalBlueprint,
  getCanonicalSpecContent,
  addModelProblems,
  isChangeOp,
  isBumpLevel,
  BUMP_LEVELS,
  formatUtcStamp,
  slugify,
  createFsSourceResolver,
  resolveCitation,
} from '@cognnitive/innfo-core'
import type { ChangeItem, ChangesetDocument, SpecDocument } from '@cognnitive/innfo-core'
import { findKnowledgeFile } from './spec.js'
import { findManifestPath } from './workspace-sync.js'
import { buildNextSteps, regenerateConsole, type ConsoleOutcome, type NextSteps, type RegenerateOptions } from './console-regeneration.js'

/**
 * The single writer of proposed changesets. Every code path that leaves a sealed
 * `status: proposed` changeset on disk goes through `writeProposedChangeset`:
 * `propose_changeset`, the `init_knowledge` wrapper and the single-operation synthesis
 * `apply_change` uses for bare intent calls.
 */

const CHANGES_SPEC_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md'
const CHANGESET_SPEC_VERSION = 'V_0-4-0'

/** The current `changes` bluepriNNt version, from the canonical registry. */
function changesBlueprintVersion(): string {
  return findCanonicalBlueprint('changes')!.version
}

/** A file-name segment: letters, digits, dot, dash and underscore only. */
function fileSegment(value: string, fallback: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '')
  return cleaned === '' ? fallback : cleaned
}

/**
 * `workspace_id` of the domain: the manifest `workspace_id`, or the slug of the domain
 * folder name when the manifest declares none.
 */
export async function resolveWorkspaceId(rootDir: string): Promise<string> {
  try {
    const manifestPath = await findManifestPath(rootDir)
    if (manifestPath) {
      const frontmatter = (parseFrontmatter(await readFile(manifestPath, 'utf-8')) ?? {}) as Record<string, unknown>
      const declared = frontmatter['workspace_id']
      if (typeof declared === 'string' && declared.trim() !== '') return declared.trim()
    }
  } catch {
    // an unreadable manifest falls back to the folder name
  }
  return slugify(basename(resolve(rootDir))) || 'domain'
}

export interface WriteProposedChangesetInput {
  changes: ChangeItem[]
  title?: string
  /** Default `agent`. */
  author?: string
  /** Overrides the manifest / folder derived `workspace_id`. */
  workspaceId?: string
  now?: Date
}

export interface WrittenChangeset {
  /** Workspace-relative path, e.g. `changes/acme_agent_20261014T120000Z_changes_NN.md`. */
  path: string
  absolutePath: string
  document: ChangesetDocument
}

/** Assigns ids `c-01`, `c-02`, ... in order and defaults each author. */
function numberChanges(changes: ChangeItem[], author: string): ChangeItem[] {
  return changes.map((change, index) => ({
    ...change,
    id: `c-${String(index + 1).padStart(2, '0')}`,
    author: change.author ?? author,
  }))
}

/** Builds the sealed, unwritten Level-3 changeset document for `changes`. */
export function buildProposedChangeset(
  changes: ChangeItem[],
  meta: { title?: string; author: string; workspaceId: string },
): ChangesetDocument {
  const numbered = numberChanges(changes, meta.author)
  return {
    frontmatter: {
      spec_version: CHANGESET_SPEC_VERSION,
      level: 3,
      parent_spec: { name: 'changes', url: CHANGES_SPEC_URL },
      blueprint_version: changesBlueprintVersion(),
      status: 'proposed',
      proposal_sha: computeProposalSha(numbered),
      ...(meta.title ? { title: meta.title } : {}),
      author: meta.author,
      workspace_id: meta.workspaceId,
    },
    changes: numbered,
  }
}

export async function writeProposedChangeset(
  rootDir: string,
  input: WriteProposedChangesetInput,
): Promise<WrittenChangeset> {
  const author = input.author?.trim() || 'agent'
  const workspaceId = input.workspaceId?.trim() || (await resolveWorkspaceId(rootDir))
  const document = buildProposedChangeset(input.changes, { title: input.title, author, workspaceId })
  const text = serializeChangeset(document)

  const changesDir = join(rootDir, 'changes')
  await mkdir(changesDir, { recursive: true })
  const base = input.now ?? new Date()
  for (let attempt = 0; attempt < 60; attempt++) {
    const stamp = formatUtcStamp(new Date(base.getTime() + attempt * 1000))
    const fileName = `${fileSegment(workspaceId, 'domain')}_${fileSegment(author, 'agent')}_${stamp}_changes_NN.md`
    const absolutePath = join(changesDir, fileName)
    try {
      // 'wx': never overwrite a changeset written in the same second.
      await writeFile(absolutePath, text, { encoding: 'utf-8', flag: 'wx' })
      return { path: `changes/${fileName}`, absolutePath, document }
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'EEXIST') throw err
    }
  }
  throw new Error('Could not allocate a unique changeset file name in changes/')
}

export interface ProposalError {
  path: string
  message: string
  code: string
}

/** Keys each operation requires, beyond `op` (add_model has its own check). */
function requiredKeyProblems(change: ChangeItem, label: string): string[] {
  const problems: string[] = []
  const need = (key: keyof ChangeItem, hint = ''): void => {
    const value = change[key]
    if (value === undefined || value === null || value === '') {
      problems.push(`${label}: ${change.op} requires "${key}"${hint}`)
    }
  }
  need('target')
  const target = change.target ?? ''
  const hasElement = target.includes('@') && target.split('@')[1].trim() !== ''
  switch (change.op) {
    case 'update_field':
      if (!target.includes('&')) problems.push(`${label}: update_field target must be model@element&field`)
      // An empty `to` is a clear: it removes the field line. Only a missing
      // `to` (undefined/null) is invalid.
      if (change.to === undefined || change.to === null) {
        problems.push(`${label}: update_field requires "to"`)
      }
      break
    case 'add_element':
      need('concept')
      need('name')
      break
    case 'remove_element':
      if (!hasElement) problems.push(`${label}: remove_element target must be model@element`)
      break
    case 'rename_element':
      if (!hasElement) problems.push(`${label}: rename_element target must be model@element`)
      if (!change.name && !change.to) problems.push(`${label}: rename_element requires "name"`)
      break
    case 'rename_concept':
      if (!hasElement) problems.push(`${label}: rename_concept target must be model@concept`)
      if (!change.name && !change.to) problems.push(`${label}: rename_concept requires "name"`)
      break
    case 'update_matrix_cell':
      if (target.split('&').length < 3) problems.push(`${label}: update_matrix_cell target must be model@matrix&row&col`)
      need('to')
      break
    case 'comment':
      need('notes')
      break
    case 'freeze_slugs':
      if (target.includes('@') || target.includes('&')) {
        problems.push(`${label}: freeze_slugs target must be a bare model id`)
      }
      break
    case 'bump_version':
      if (target.includes('@') || target.includes('&')) {
        problems.push(`${label}: bump_version target must be a bare model id`)
      }
      if (!isBumpLevel(change.to)) {
        problems.push(`${label}: bump_version requires "to" to be one of ${BUMP_LEVELS.join(', ')}`)
      }
      break
    default:
      break
  }
  return problems
}

/** The `changes` bluepriNNt as a template, from the embedded canonical copy (no network). */
function changesTemplate(): SpecDocument | null {
  const raw = getCanonicalSpecContent('changes')
  if (!raw) return null
  const parsed = parseKnowledge(raw)
  return {
    name: 'changes',
    level: 2,
    parentName: parsed.frontmatter.parent_spec?.name,
    parentUrl: parsed.frontmatter.parent_spec?.url,
    frontmatter: parsed.frontmatter as unknown as SpecDocument['frontmatter'],
    rawContent: raw,
  }
}

/**
 * Validates a proposal's operations before anything is written. Returns every problem
 * found; an empty list means the proposal may be written.
 */
export async function validateProposal(rootDir: string, operations: ChangeItem[]): Promise<ProposalError[]> {
  const errors: ProposalError[] = []
  if (operations.length === 0) {
    return [{ path: 'operations', code: 'EMPTY_PROPOSAL', message: 'A proposal needs at least one operation' }]
  }

  const created = new Set<string>()
  const createdLater = new Map<string, number>()
  operations.forEach((change, index) => {
    if (change.op === 'add_model' && change.target) createdLater.set(change.target.toLowerCase(), index)
  })

  for (const [index, change] of operations.entries()) {
    const label = `operations[${index}]`
    if (!isChangeOp(change.op)) {
      errors.push({ path: label, code: 'UNKNOWN_OPERATION', message: `${label}: "${String(change.op)}" is not a changeset operation` })
      continue
    }
    const shape = [
      ...requiredKeyProblems(change, label),
      ...addModelProblems({ ...change, id: `c-${String(index + 1).padStart(2, '0')}` }),
    ]
    for (const message of shape) errors.push({ path: label, code: 'INVALID_OPERATION', message })
    if (shape.length > 0 || !change.target) continue

    const modelId = change.target.split('@')[0].trim()
    const key = modelId.toLowerCase()
    if (change.op === 'add_model') {
      if (created.has(key)) {
        errors.push({ path: label, code: 'ADD_MODEL_DUPLICATE', message: `${label}: add_model for "${modelId}" appears more than once` })
      } else if (await findKnowledgeFile(rootDir, modelId)) {
        errors.push({ path: label, code: 'MODEL_EXISTS', message: `MODEL_EXISTS: ${label}: model "${modelId}" already exists; add_model never overwrites a model` })
      }
      created.add(key)
      continue
    }
    if (change.op === 'comment' && !change.target.includes('@')) continue
    if (created.has(key)) continue
    if ((createdLater.get(key) ?? -1) > index) {
      errors.push({ path: label, code: 'ADD_MODEL_ORDER', message: `ADD_MODEL_ORDER: ${label} targets "${modelId}" before the add_model that creates it` })
    } else if (!(await findKnowledgeFile(rootDir, modelId))) {
      errors.push({ path: label, code: 'MODEL_NOT_FOUND', message: `MODEL_NOT_FOUND: ${label}: no model "${modelId}" in this domain` })
    }
  }

  // Evidence citations must resolve now, not only at apply time (same rule as apply_change).
  // The changeset will live in `changes/`, so relative anchors resolve from there.
  const citationResolver = createFsSourceResolver(rootDir)
  const futureChangesetPath = join(rootDir, 'changes', 'proposal_changes_NN.md')
  for (const [index, change] of operations.entries()) {
    if (!change.sources) continue
    const resolved = resolveCitation(change.sources, 'sources', citationResolver, futureChangesetPath)
    if (!resolved.exists || resolved.error === 'UNKNOWN_ANCHOR' || resolved.error === 'MALFORMED') {
      errors.push({
        path: `operations[${index}].sources`,
        code: 'CITATION_UNRESOLVED',
        message: `CITATION_UNRESOLVED: operations[${index}] cites "${change.sources}" which does not resolve (${resolved.error ?? 'NOT_FOUND'})`,
      })
    }
  }
  if (errors.length > 0) return errors

  // The document that would be written must round-trip and validate as a Level-3 changeset.
  const document = buildProposedChangeset(operations, { title: 'Proposal', author: 'agent', workspaceId: 'domain' })
  const text = serializeChangeset(document)
  try {
    const reparsed = parseChangeset(text)
    // The seal covers every normative key, so equal seals mean the same changes.
    if (
      reparsed.changes.length !== document.changes.length ||
      computeProposalSha(reparsed.changes) !== computeProposalSha(document.changes) ||
      !verifyProposalSha(reparsed)
    ) {
      errors.push({ path: 'operations', code: 'ROUNDTRIP_MISMATCH', message: 'The serialized proposal does not parse back to the same changes' })
    }
  } catch (err) {
    errors.push({ path: 'operations', code: 'INVALID_OPERATION', message: err instanceof Error ? err.message : String(err) })
  }
  const template = changesTemplate()
  if (template) {
    const result = validateDocument(text, { fileName: 'proposal_changes_NN.md', template, resolveInclude: () => null })
    for (const e of result.errors) {
      // A changeset is versioned by `blueprint_version` and identified by its seal; the
      // generic Level-3 `knowledge_version` identity check does not apply to it.
      if (e.path === 'format.fm-version' || e.path === 'frontmatter.knowledge_version') continue
      errors.push({ path: e.path, code: 'CHANGESET_INVALID', message: `The proposal is not a valid changes document: ${e.message}` })
    }
  }
  return errors
}

const STRING_KEYS = [
  'op',
  'target',
  'from',
  'to',
  'concept',
  'name',
  'slug',
  'author',
  'notes',
  'base_hash',
  'sources',
  'blueprint_name',
  'blueprint_url',
  'knowledge_version',
] as const

/**
 * Narrows the agent's loosely typed `operations` to changeset items. Unknown keys are
 * dropped (the agent cannot smuggle execution annotations into a sealed proposal).
 */
export function normalizeOperations(raw: unknown): { operations: ChangeItem[]; errors: ProposalError[] } {
  const errors: ProposalError[] = []
  if (!Array.isArray(raw)) {
    return {
      operations: [],
      errors: [{ path: 'operations', code: 'INVALID_OPERATION', message: 'operations must be an array of change objects' }],
    }
  }
  const operations: ChangeItem[] = []
  raw.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      errors.push({ path: `operations[${index}]`, code: 'INVALID_OPERATION', message: `operations[${index}] must be an object` })
      return
    }
    const source = entry as Record<string, unknown>
    const item: Record<string, unknown> = { id: `c-${String(index + 1).padStart(2, '0')}` }
    for (const key of STRING_KEYS) {
      const value = source[key]
      if (value === undefined || value === null) continue
      if (typeof value !== 'string') {
        errors.push({ path: `operations[${index}]`, code: 'INVALID_OPERATION', message: `operations[${index}].${key} must be a string` })
        continue
      }
      item[key] = value
    }
    const fields = source['fields']
    if (fields !== undefined && fields !== null) {
      if (typeof fields !== 'object' || Array.isArray(fields)) {
        errors.push({ path: `operations[${index}]`, code: 'INVALID_OPERATION', message: `operations[${index}].fields must be an object` })
      } else {
        item['fields'] = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)]))
      }
    }
    operations.push(item as unknown as ChangeItem)
  })
  return { operations, errors }
}

export interface ProposeChangesetArgs {
  operations: unknown
  title?: string
  author?: string
  /** Open the regenerated console in a browser tab (default true). */
  open?: boolean
}

export interface ProposeChangesetResult {
  success: boolean
  changeset?: string
  status?: 'proposed'
  proposal_sha?: string
  changes?: number
  console?: ConsoleOutcome
  next_steps?: NextSteps
  errors?: ProposalError[]
}

/**
 * Writes a sealed `status: proposed` changeset for the agent's operations and
 * regenerates (and opens) the domain console. It validates first and writes nothing on
 * failure. It never applies the changeset: approval returns through `apply_change`.
 */
export async function proposeChangeset(
  rootDir: string,
  args: ProposeChangesetArgs,
  regenerate: RegenerateOptions = {},
): Promise<ProposeChangesetResult> {
  const { operations, errors: shapeErrors } = normalizeOperations(args.operations)
  if (shapeErrors.length > 0) return { success: false, errors: shapeErrors }
  const errors = await validateProposal(rootDir, operations)
  if (errors.length > 0) return { success: false, errors }

  const written = await writeProposedChangeset(rootDir, {
    changes: operations,
    title: args.title,
    author: args.author,
  })
  const outcome = await regenerateConsole(rootDir, { ...regenerate, open: args.open ?? regenerate.open ?? true })
  return {
    success: true,
    changeset: written.path,
    status: 'proposed',
    proposal_sha: written.document.frontmatter.proposal_sha,
    changes: written.document.changes.length,
    console: outcome,
    next_steps: buildNextSteps('proposal', { console: outcome, changeset: written.path }),
  }
}
