import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import {
  ENTRYPOINT_FILENAME,
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
  splitEvidence,
  isChangesetPath,
  isSidecarName,
  resolveCitation,
} from '@cognnitive/nn-core'
import type { ChangeItem, ChangesetDocument, SpecDocument } from '@cognnitive/nn-core'
import { findKnowledgeFile, ModelIdError } from './spec.js'
import { canonicalizeTarget, modelIdAliases, modelIdOfTarget } from './model-id.js'
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
    const manifest = await readFile(join(rootDir, ENTRYPOINT_FILENAME), 'utf-8')
    const frontmatter = (parseFrontmatter(manifest) ?? {}) as Record<string, unknown>
    const declared = frontmatter['workspace_id']
    if (typeof declared === 'string' && declared.trim() !== '') return declared.trim()
  } catch {
    // a missing or unreadable manifest falls back to the folder name
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
    // D2: evidence is mandatory. A caller that provides none gets the honest `unknown`
    // (accepted, flagged by validation); a provenance claim is never invented.
    evidence: change.evidence ?? 'unknown',
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
    case 'update_element_text':
      if (!hasElement || target.includes('&')) {
        problems.push(`${label}: update_element_text target must be model@element (the prose body, not a field)`)
      }
      if (change.to === undefined || change.to === null) {
        problems.push(`${label}: update_element_text requires "to"`)
      }
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
    case 'add_matrix':
      if (!target.includes('matrix:')) problems.push(`${label}: add_matrix target must be model@matrix:<name>`)
      need('name', ' (the matrix name)')
      need('concept', ' (the row-axis concept)')
      need('to', ' (the column-axis concept)')
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

async function modelExists(rootDir: string, modelId: string): Promise<boolean> {
  try {
    return Boolean(await findKnowledgeFile(rootDir, modelId))
  } catch (err) {
    if (err instanceof ModelIdError) return true
    throw err
  }
}

async function checkModelTarget(rootDir: string, modelId: string): Promise<'FOUND' | 'NOT_FOUND' | ModelIdError> {
  try {
    const f = await findKnowledgeFile(rootDir, modelId)
    return f ? 'FOUND' : 'NOT_FOUND'
  } catch (err) {
    if (err instanceof ModelIdError) return err
    throw err
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
  // A created model is addressed by its canonical id; the id the caller passed is an alias.
  const aliases = modelIdAliases(operations)
  const canonicalModelOf = (target: string): string => modelIdOfTarget(canonicalizeTarget(target, aliases))
  operations.forEach((change, index) => {
    if (change.op === 'add_model' && change.target) createdLater.set(canonicalModelOf(change.target).toLowerCase(), index)
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

    if (change.op === 'update_field') {
      const field = change.target.split('&')[1] ?? ''
      if (field.trim().toLowerCase() === 'description') {
        errors.push({
          path: label,
          code: 'USE_UPDATE_ELEMENT_TEXT',
          message: `${label}: the element prose is not a field; use update_element_text on the bare element target`,
        })
        continue
      }
    }

    const modelId = canonicalModelOf(change.target)
    const key = modelId.toLowerCase()
    if (change.op === 'add_model') {
      if (created.has(key)) {
        errors.push({ path: label, code: 'ADD_MODEL_DUPLICATE', message: `${label}: add_model for "${modelId}" appears more than once` })
      } else if (await modelExists(rootDir, modelId)) {
        errors.push({ path: label, code: 'MODEL_EXISTS', message: `MODEL_EXISTS: ${label}: model "${modelId}" already exists; add_model never overwrites a model` })
      }
      created.add(key)
      continue
    }
    if (change.op === 'comment' && !change.target.includes('@')) continue
    // produce_artifact addresses a workspace path, never a model.
    if (change.op === 'produce_artifact') continue
    if (created.has(key)) continue
    if ((createdLater.get(key) ?? -1) > index) {
      errors.push({ path: label, code: 'ADD_MODEL_ORDER', message: `ADD_MODEL_ORDER: ${label} targets "${modelId}" before the add_model that creates it` })
    } else {
      const status = await checkModelTarget(rootDir, modelId)
      if (status instanceof ModelIdError) {
        errors.push({ path: label, code: status.code, message: `${label}: ${status.message}` })
      } else if (status === 'NOT_FOUND') {
        errors.push({ path: label, code: 'MODEL_NOT_FOUND', message: `MODEL_NOT_FOUND: ${label}: no model "${modelId}" in this domain` })
      }
    }
  }

  // Evidence citations must resolve now, not only at apply time (same rule as apply_change).
  // The changeset will live in `changes/`, so relative anchors resolve from there.
  const citationResolver = createFsSourceResolver(rootDir)
  const futureChangesetPath = join(rootDir, 'changes', 'proposal_changes_NN.md')
  for (const [index, change] of operations.entries()) {
    if (!change.evidence) continue
    // `decision` and `unknown` are not citations: accepted without resolution, and
    // valid only alone (`splitEvidence` rejects a keyword beside another entry).
    let items: string[]
    try {
      items = splitEvidence(change.evidence)
    } catch (err) {
      errors.push({
        path: `operations[${index}].evidence`,
        code: 'EVIDENCE_KEYWORD_IN_LIST',
        message: err instanceof Error ? err.message : String(err),
      })
      continue
    }
    if (items.length === 0) continue
    if (items.length === 1 && (items[0] === 'decision' || items[0] === 'unknown')) continue
    for (const item of items) {
      const resolved = resolveCitation(item, 'evidence', citationResolver, futureChangesetPath)
      if (!resolved.exists || resolved.error === 'UNKNOWN_ANCHOR' || resolved.error === 'MALFORMED') {
        errors.push({
          path: `operations[${index}].evidence`,
          code: 'CITATION_UNRESOLVED',
          message: `CITATION_UNRESOLVED: operations[${index}] cites "${item}" which does not resolve (${resolved.error ?? 'NOT_FOUND'})`,
        })
      }
    }
  }
  if (errors.length > 0) return errors

  // produce_artifact: the target is a safe, existing workspace path that is not a
  // model, changeset or sidecar (artifact-production-change).
  for (const [index, change] of operations.entries()) {
    if (change.op !== 'produce_artifact') continue
    const rel = String(change.target).replace(/\\/g, '/')
    const segments = rel.split('/')
    const fileName = segments[segments.length - 1] ?? ''
    const label = `operations[${index}].target`
    if (
      rel.length === 0 ||
      rel.startsWith('/') ||
      /^[a-zA-Z]:/.test(rel) ||
      segments.includes('..') ||
      isChangesetPath(rel) ||
      isSidecarName(fileName) ||
      /(^|\/)kNNowledge\//i.test(rel)
    ) {
      errors.push({
        path: label,
        code: 'ARTIFACT_INVALID_PATH',
        message: `ARTIFACT_INVALID_PATH: "${rel}" is not a workspace artifact path`,
      })
      continue
    }
    const info = await stat(join(rootDir, rel)).catch(() => null)
    if (!info || !info.isFile()) {
      errors.push({
        path: label,
        code: 'ARTIFACT_NOT_FOUND',
        message: `ARTIFACT_NOT_FOUND: "${rel}" does not exist`,
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
  'evidence',
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
    if (source['sources'] !== undefined) {
      errors.push({
        path: `operations[${index}]`,
        code: 'INVALID_OPERATION',
        message:
          `operations[${index}].sources is not a change key: a change derives from its "evidence" ` +
          `(a citation, or the literal "decision" / "unknown"), never from a "sources" list`,
      })
      return
    }
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
      // A change carries no inline field values: each field is its own update_field.
      errors.push({
        path: `operations[${index}]`,
        code: 'INVALID_OPERATION',
        message:
          `operations[${index}].fields is not a change key: a change carries no inline fields. ` +
          `Emit one "update_field" change per field (target model@element&field), with its own evidence`,
      })
      return
    }
    const seed = source['seed']
    if (seed !== undefined && seed !== null) {
      if (source['op'] !== 'add_matrix') {
        errors.push({
          path: `operations[${index}]`,
          code: 'INVALID_OPERATION',
          message: `operations[${index}].seed is valid only on add_matrix`,
        })
      } else if (typeof seed !== 'object' || Array.isArray(seed)) {
        errors.push({
          path: `operations[${index}]`,
          code: 'INVALID_OPERATION',
          message: `operations[${index}].seed must be an object {columns?, rows?}`,
        })
      } else {
        const seedObj = seed as Record<string, unknown>
        const asList = (value: unknown, key: string): string[] | undefined => {
          if (value === undefined || value === null) return undefined
          if (!Array.isArray(value)) {
            errors.push({
              path: `operations[${index}].seed.${key}`,
              code: 'INVALID_OPERATION',
              message: `operations[${index}].seed.${key} must be an array of strings`,
            })
            return undefined
          }
          return value.map((v) => String(v))
        }
        const columns = asList(seedObj.columns, 'columns')
        const rows = asList(seedObj.rows, 'rows')
        item['seed'] = { ...(columns ? { columns } : {}), ...(rows ? { rows } : {}) }
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
