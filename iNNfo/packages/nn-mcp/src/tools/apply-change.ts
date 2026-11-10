import { readFile, writeFile, rm, rmdir, mkdir, stat, rename, readdir, open } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, dirname, join, relative, isAbsolute } from 'node:path'
import {
  parseKnowledge,
  serializeKnowledge,
  validateKnowledge as coreValidate,
  applyMutation as coreApplyMutation,
  resolveBlueprintSchema,
  isExcludedPath,
  isNNName,
  displayStem,
  acquireLock,
  computeProposalSha,
  verifyProposalSha,
  parseChangeset,
  serializeChangeset,
  resolveBatchSlugs,
  evaluateBatchDeleteImpact,
  partitionChangeset,
  isChangeOp,
  isBumpLevel,
  BUMP_LEVELS,
  createFsSourceResolver,
  resolveCitation,
  scaffoldKnowledgeDocument,
  seedExtractedModel,
  subtreeOf,
  fileLocalDiagnostics,
  roleOf,
  canonicalUnitModelId,
  EXECUTION_FACT_KEYS,
  resolvedTarget,
  axisSlug,
  splitEvidence,
  slugifyHeading,
  isChangesetPath,
  isSidecarName,
  reviewGateProblems,
  gateDeclarationProblems,
  reviewGateProvenanceProblems,
  setFieldsProblems,
  setFieldsEntries,
  compactExecutionFacts,
  evidencePath,
  evidencePaths,
  changesetLikeOf,
  resolveChangeFacts,
} from '@cognnitive/nn-core'
import type {
  SpecDocument,
  ParsedKnowledge,
  BlueprintSchema,
  ChangesetDocument,
  ChangeItem,
  ModelVersionTransition,
  ChangeStatus,
  BumpLevel,
} from '@cognnitive/nn-core'
import { findKnowledgeFile, resolveBlueprintWithCache, normalizeId, ModelIdError } from './spec.js'
import { buildNodeDomainIndex, loadDeclarations } from './domain-index.js'
import { canonicalizeTarget, modelIdAliases } from './model-id.js'
import { findElementInModel, mutationArgsForChange, parseTargetAddress } from './change-args.js'
import { writeProposedChangeset } from './propose-changeset.js'
import { findDanglingReferrers } from './move-referrers.js'

import { isInsideRoot, isSafeRelativeId } from './path-guard.js'

import { loadKnowledge, saveKnowledge, resolveBlueprintForKnowledge } from './knowledge-io.js'
import { DEFAULT_WORKSPACE_IGNORE, validateBlueprint } from './validate.js'

/**
 * Ops that record a fact without mutating a model. `review_gate` is such an op
 * (changeset-review-gate "A verdict-only changeset does not touch the model"): the
 * verdict is published by its changeset, never written into the model file.
 */
const NON_MUTATING_OPS: ReadonlySet<string> = new Set(['comment', 'review_gate'])
const isNonMutating = (op: string): boolean => NON_MUTATING_OPS.has(op)

export interface ApplyChangeResult {
  success: boolean
  changesetPath?: string
  changeset?: string
  status?: ChangeStatus | string
  models?: Record<string, ModelVersionTransition>
  appliedCount?: number
  conflictedCount?: number
  model?: ParsedKnowledge
  newPath?: string
  errors?: Array<{ path: string; message: string; code?: string }>
  warnings?: Array<{ path: string; message: string }>
  /** Ids of the models an `add_model` change created in this apply (fresh commits only). */
  createdModels?: string[]
}


interface VersionParts {
  major: number
  minor: number
  patch: number
}

/** Parse `V_0-4-0`, `V_0.4.0`, `0-4-0`, ... into numeric parts. */
function parseVersion(v: string): VersionParts | null {
  const m = v.trim().match(/^V?_?(\d+)[-.](\d+)[-.](\d+)$/i)
  if (!m) return null
  return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10) }
}

function formatVersion(p: VersionParts): string {
  return `V_${p.major}-${p.minor}-${p.patch}`
}

/**
 * Compute the new model version from bump_version args.
 * Either an explicit `version` ("V_0-5-0") or a `bump` of
 * "major" | "minor" | "patch" (default patch) applied to the current
 * `knowledge_version` frontmatter. Returns null when the args are invalid.
 */
function computeNewVersion(
  current: string | undefined,
  args: Record<string, unknown>,
): { version: string } | null {
  if (typeof args.version === 'string' && args.version.trim() !== '') {
    const parsed = parseVersion(args.version)
    if (!parsed) return null
    return { version: formatVersion(parsed) }
  }

  const bump = typeof args.bump === 'string' && args.bump.trim() !== '' ? args.bump.trim() : 'patch'
  if (!['major', 'minor', 'patch'].includes(bump)) return null
  if (!current) return null
  const parts = parseVersion(current)
  if (!parts) return null
  // Semantic versioning: a higher level resets every lower one.
  if (bump === 'major') {
    parts.major += 1
    parts.minor = 0
    parts.patch = 0
  } else if (bump === 'minor') {
    parts.minor += 1
    parts.patch = 0
  } else {
    parts.patch += 1
  }
  return { version: formatVersion(parts) }
}

async function findAllWorkspaceModelFiles(
  dir: string,
  ignore: Set<string>,
  rootDir: string,
): Promise<string[]> {
  const results: string[] = []
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const lowerDir = entry.name.toLowerCase()
      if (entry.name.startsWith('.') || ignore.has(lowerDir) || lowerDir === 'changes' || lowerDir === 'archive') continue
      const sub = await findAllWorkspaceModelFiles(join(dir, entry.name), ignore, rootDir)
      results.push(...sub)
    } else if (
      entry.isFile() &&
      isNNName(entry.name) &&
      entry.name.toLowerCase() !== 'index.md' &&
      !entry.name.endsWith('_changes_NN.md')
    ) {
      // Only `_NN.md` files can carry model references. Without this the
      // pre-check reads non-model markdown (session transcripts under
      // `conversations/`, notes, docs) and reports phantom
      // "missing level/parent_spec" errors (issue #110). Deliberately a
      // name-only check: reading+parsing every candidate's frontmatter here
      // cost seconds on large trees and tripped the test timeout.
      const filePath = join(dir, entry.name)
      const relPath = relative(rootDir, filePath).split('\\').join('/')
      if (isExcludedPath(relPath) || relPath.startsWith('changes/') || relPath.includes('/archive/') || relPath.startsWith('archive/')) continue
      results.push(filePath)
    }
  }
  return results
}

/**
 * Apply the `bump_version` operation to a Level-2 bluepriNNt: set
 * `frontmatter.blueprint_version` in place (the live filename is invariant) and
 * validate before writing, and reject-without-writing on invalid args or a failed
 * validation. A Level-3 model is never bumped here: its bump is a `bump_version`
 * changeset operation.
 */
async function bumpBlueprintVersion(
  rootDir: string,
  filePath: string,
  model: ParsedKnowledge,
  args: Record<string, unknown>,
): Promise<ApplyChangeResult> {
  const prevVersion = String(model.frontmatter.blueprint_version ?? model.frontmatter.knowledge_version ?? '')
  const next = computeNewVersion(prevVersion, args)
  if (!next) {
    return {
      success: false,
      errors: [
        {
          path: 'frontmatter.blueprint_version',
          message:
            'Invalid version args for bump_version: provide { version: "V_x-y-z" } or { bump: "major" | "minor" | "patch" } against a valid version frontmatter',
        },
      ],
    }
  }

  if (model.frontmatter.blueprint_version === undefined && model.frontmatter.knowledge_version !== undefined) {
    model.frontmatter.knowledge_version = next.version
  } else {
    model.frontmatter.blueprint_version = next.version
  }

  const validationResult = await validateBlueprint(rootDir, undefined, serializeKnowledge(model))
  if (!validationResult.valid) {
    return { success: false, errors: validationResult.errors, warnings: validationResult.warnings }
  }

  try {
    await saveKnowledge(filePath, model)
  } catch (err) {
    return { success: false, errors: [{ path: '', message: `Failed to write model: ${err}` }] }
  }
  return { success: true, model, newPath: filePath, warnings: validationResult.warnings }
}

/**
 * Writes data to a temporary file and fsyncs it to disk before returning,
 * ensuring all bytes and metadata are flushed before rename (#188).
 */
async function writeAndSync(filePath: string, data: string): Promise<void> {
  const handle = await open(filePath, 'w')
  try {
    await handle.writeFile(data, 'utf-8')
    await handle.sync()
  } finally {
    await handle.close()
  }
}

/**
 * Replaces `livePath` with the already-written `stagingPath` by an atomic rename.
 * The live file is never removed, moved or copied first, so at every instant (and
 * after a crash) the live path holds a complete model â€” the old one or the new one.
 * On Windows, handles transient EPERM/EBUSY locks with backoff retries (#188).
 * If the rename fails, the staging file is removed and the live file is untouched.
 */
async function persistAtomic(stagingPath: string, livePath: string): Promise<void> {
  const MAX_RETRIES = 5
  let attempt = 0
  while (true) {
    try {
      await rename(stagingPath, livePath)
      return
    } catch (err: any) {
      const isLockError =
        err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES'
      if (isLockError && attempt < MAX_RETRIES) {
        attempt++
        await new Promise((r) => setTimeout(r, attempt * 25))
        continue
      }
      await rm(stagingPath, { force: true }).catch(() => {})
      throw err
    }
  }
}

/**
 * Execution annotation keys: the only per-change lines apply may rewrite. The
 * execution-fact list comes from the changeset core module, so a new fact key
 * (such as `extracted_slugs`) is an annotation everywhere at once.
 */
const ANNOTATION_LINE_RE = new RegExp(
  `^(${['status', 'resolution', 'applied_at', 'batch', ...EXECUTION_FACT_KEYS].join('|')})::`,
)

/**
 * The normative lines of every `## NN Change` block: the heading and every non-blank,
 * non-annotation line, in document order. Used to assert proposal immutability on apply.
 */
function normativeChangeLines(text: string): string[] {
  const out: string[] = []
  let inBlock = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (/^##\s+NN\s+Change:/.test(line.trim())) {
      inBlock = true
      out.push(line.trim())
      continue
    }
    if (/^#{1,6}\s/.test(line)) {
      inBlock = false
      continue
    }
    if (!inBlock) continue
    if (line.trim() === '') continue
    if (ANNOTATION_LINE_RE.test(line.trim())) continue
    out.push(line)
  }
  return out
}

/** True when `writeBack` alters a normative line of any change block relative to `input`. */
function altersNormativeLines(input: string, writeBack: string): boolean {
  const before = normativeChangeLines(input)
  const after = normativeChangeLines(writeBack)
  if (before.length !== after.length) return true
  return before.some((line, i) => line !== after[i])
}

/**
 * Preconditions of the model-level maintenance changes (`bump_version`, `freeze_slugs`):
 * they target a Level-3 kNNowledge model, never the unversioned lineage record, and a
 * bump names a valid level.
 */
function maintenanceChangeProblem(
  change: ChangeItem,
  model: ParsedKnowledge,
  createdInThisApply = false,
): { code: string; message: string } | null {
  if (change.op === 'bump_version' && createdInThisApply) {
    return {
      code: 'BUMP_ON_CREATED_MODEL',
      message: 'a model created by add_model in the same changeset is not bumped; set its initial knowledge_version on add_model',
    }
  }
  if (model.frontmatter.level !== 3) {
    return { code: 'LEVEL3_ONLY', message: `${change.op} applies to a level-3 model only` }
  }
  if (change.op === 'bump_version') {
    const parent = model.frontmatter.parent_spec as { name?: string } | undefined
    if (!isBumpLevel(change.to)) {
      return {
        code: 'INVALID_BUMP_LEVEL',
        message: `bump_version needs "to" to be one of ${BUMP_LEVELS.join(', ')}; got "${change.to ?? ''}"`,
      }
    }
  }
  return null
}

function hasUnfrozenElements(model: ParsedKnowledge): boolean {
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) if (!el.slugExplicit) return true
  }
  return false
}

/** True when an applied `produce_artifact` already records `rel`. */
async function artifactAlreadyRecorded(rootDir: string, rel: string): Promise<boolean> {
  const dir = join(rootDir, 'changes')
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return false
  }
  for (const name of names) {
    if (!isNNName(name)) continue
    let doc: ChangesetDocument
    try {
      doc = parseChangeset(await readFile(join(dir, name), 'utf-8'))
    } catch {
      continue
    }
    const changeset = changesetLikeOf(`changes/${name}`, doc)
    for (const change of doc.changes) {
      if (change.op !== 'produce_artifact' || resolveChangeFacts(change, changeset).status !== 'applied') continue
      if (change.target.replace(/\\/g, '/') === rel) return true
    }
  }
  return false
}

/* â”€â”€ Execution facts (change-provenance) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** The element an address label names, by frozen slug, display name or slugified name. */
function elementByLabel(model: ParsedKnowledge, label: string): { slug?: string; name?: string } | undefined {
  const wanted = String(label ?? '').trim().toLowerCase()
  if (!wanted) return undefined
  for (const [, elements] of model.elements) {
    for (const el of elements) {
      if ((el.slug ?? '').toLowerCase() === wanted) return el
      if ((el.name ?? '').toLowerCase() === wanted) return el
      if (slugifyHeading(el.name ?? '').toLowerCase() === wanted) return el
    }
  }
  return undefined
}

/**
 * The canonical unit address a change resolved to, read from the model AFTER the
 * mutation ran (so the frozen slug, not the address label, is stamped).
 */
function resolvedTargetForChange(
  change: ChangeItem,
  model: ParsedKnowledge,
  modelId: string,
): string | undefined {
  const { parts } = parseTargetAddress(change.target)
  switch (change.op) {
    case 'update_field': {
      // The field is the last segment; the element may contain `&`.
      const atIdx = change.target.indexOf('@')
      const remainder = atIdx !== -1 ? change.target.slice(atIdx + 1) : change.target
      const ampIdx = remainder.lastIndexOf('&')
      const elIdent = ampIdx !== -1 ? remainder.slice(0, ampIdx) : remainder
      const field = ampIdx !== -1 ? remainder.slice(ampIdx + 1) : ''
      if (!field) return undefined
      const el = elementByLabel(model, elIdent)
      return el?.slug ? resolvedTarget.field(modelId, el.slug, field) : undefined
    }
    case 'update_element_text': {
      const el = elementByLabel(model, parts[0] ?? '')
      const slug = change.resolved_slug || el?.slug || change.slug || slugifyHeading(parts[0] ?? '')
      return slug ? resolvedTarget.body(modelId, slug) : undefined
    }
    case 'add_element':
    case 'remove_element':
    case 'rename_element': {
      const el = elementByLabel(model, parts[0] ?? '')
      const slug = change.resolved_slug || el?.slug || change.slug || slugifyHeading(change.name ?? parts[0] ?? '')
      return slug ? resolvedTarget.element(modelId, slug) : undefined
    }
    case 'extract_instance': {
      // The element is no longer in the source (the cut took it), so the stamped
      // address comes from the recorded extraction, not from a fresh lookup.
      const slug = change.extracted_slugs?.[0] ?? parts[0] ?? ''
      return slug ? resolvedTarget.element(modelId, slug) : undefined
    }
    case 'update_concept_text':
    case 'update_concept_field': {
      const concept = change.concept || parts[0]
      if (!concept) return undefined
      const field = change.op === 'update_concept_field' ? parts[1] : undefined
      return resolvedTarget.concept(modelId, concept, field)
    }
    case 'update_matrix_cell': {      const [matIdent, rowLabel, colLabel] = parts
      if (!matIdent || !rowLabel || !colLabel) return undefined
      const wanted = matIdent.toLowerCase()
      const matrix = model.matrices.find(
        (m) =>
          m.name.toLowerCase() === wanted ||
          slugifyHeading(m.name).toLowerCase() === wanted,
      )
      if (!matrix) return undefined
      const matrixSlug = slugifyHeading(matrix.name)
      const rowSlug = axisSlug(rowLabel, elementByLabel(model, rowLabel)?.slug)
      const colSlug = axisSlug(colLabel, elementByLabel(model, colLabel)?.slug)
      return resolvedTarget.cell(modelId, matrixSlug, rowSlug, colSlug)
    }
    case 'produce_artifact':
      return resolvedTarget.artifact(change.target)
    default:
      return undefined
  }
}

/** One sha256 per evidence entry, in order; none for `decision` / `unknown` or an unreadable file. */
async function evidenceShas(rootDir: string, evidence: string | undefined): Promise<string[] | undefined> {
  const items = splitEvidence(evidence)
  if (items.length === 0) return undefined
  const shas: string[] = []
  for (const item of items) {
    const lower = item.toLowerCase()
    if (lower === 'decision' || lower === 'unknown') return undefined
    const filePath = evidencePath(item) ?? item
    try {
      const bytes = await readFile(join(rootDir, filePath))
      shas.push(createHash('sha256').update(bytes).digest('hex'))
    } catch {
      return undefined
    }
  }
  return shas.length === items.length ? shas : undefined
}

/** The latest `applied_at` of any recorded changeset, or `undefined`. */
async function latestAppliedAt(changesDir: string): Promise<string | undefined> {
  let names: string[]
  try {
    names = await readdir(changesDir)
  } catch {
    return undefined
  }
  let latest: string | undefined
  for (const name of names) {
    if (!isNNName(name)) continue
    let doc: ChangesetDocument
    try {
      doc = parseChangeset(await readFile(join(changesDir, name), 'utf-8'))
    } catch {
      continue
    }
    const candidates = [doc.frontmatter.applied_at, ...doc.changes.map((c) => c.applied_at)]
    for (const value of candidates) {
      if (typeof value === 'string' && value.length > 0 && (latest === undefined || value > latest)) {
        latest = value
      }
    }
  }
  return latest
}

/**
 * Execute a two-phase apply of a changeset file: an in-memory compute/validate
 * phase (no writes) followed by a persist phase that rewrites each touched model
 * through an atomic rename. No snapshot of the prior model is kept: history is the
 * ordered change chain (by `target` and `applied_at`). Mutual exclusion is
 * guaranteed via changes/.lock. Persistence is not atomic across models â€” a
 * mid-phase failure leaves earlier models updated and later ones untouched, and
 * the changeset is not annotated, so it is not recorded as applied.
 */
export async function executeChangesetApply(
  rootDir: string,
  changesetPathInput: string,
): Promise<ApplyChangeResult> {
  const resolvedChangesetPath = isAbsolute(changesetPathInput)
    ? changesetPathInput
    : join(rootDir, changesetPathInput)

  // `changesetPathInput` is untrusted (LLM-composed). `isAbsolute`/`join` alone do
  // not prove containment â€” `join(root, '../..')` and absolute paths outside the
  // workspace must never reach `readFile`/`writeFile` below.
  if (!isInsideRoot(rootDir, resolvedChangesetPath)) {
    return {
      success: false,
      changesetPath: changesetPathInput,
      status: 'rejected',
      models: {},
      appliedCount: 0,
      errors: [{ path: changesetPathInput, message: 'Changeset path must resolve inside the workspace root' }],
    }
  }

  const changesetStem = displayStem(basename(resolvedChangesetPath))
  const relChangesetPath = relative(rootDir, resolvedChangesetPath).replace(/\\/g, '/')

  // 1. Single-writer lock acquisition at changes/.lock
  const lockHandle = await acquireLock(rootDir, changesetStem)

  try {
    // 2. Read and parse changeset document
    let rawChangeset: string
    try {
      rawChangeset = await readFile(resolvedChangesetPath, 'utf-8')
    } catch (err) {
      return {
        success: false,
        changesetPath: relChangesetPath,
        status: 'rejected',
        models: {},
        appliedCount: 0,
        errors: [{ path: relChangesetPath, message: `Failed to read changeset file: ${err}` }],
      }
    }

    let csDoc: ChangesetDocument
    try {
      csDoc = parseChangeset(rawChangeset)
    } catch (err) {
      return {
        success: false,
        changesetPath: relChangesetPath,
        status: 'rejected',
        models: {},
        appliedCount: 0,
        errors: [{ path: relChangesetPath, message: `Invalid changeset: ${err}` }],
      }
    }

    /** The target each change was proposed with (apply rewrites targets in memory). */
    const recordedTargets = new Map(csDoc.changes.map((c) => [c.id, c.target]))
    /**
     * The write-back: one block per recorded change, carrying only the execution facts
     * that differ from the batch-wide ones in the frontmatter (change-provenance).
     */
    const writeBack = (doc: ChangesetDocument): string => serializeChangeset(compactExecutionFacts(doc, recordedTargets))

    // Persist a rejection that is intrinsic to the proposal (a malformed operation or
    // add_model, a mutation that can never apply as written). The write-back starts from
    // the raw text, so in-memory execution annotations of this run never leak into the
    // file. Causes that depend on workspace state (an unresolved citation, a failed
    // validation) and environment or integrity failures (tamper, lock, immutability,
    // missing model or bluepriNNt) are returned as `rejected` but NOT recorded: the file
    // stays `proposed` and can be retried once the workspace changes.
    /**
     * A `set_fields` change is applied as one `update_field` sub-item per field (id
     * `<id>&<field>`), so the precondition, staleness, impact and mutation paths are
     * the update_field ones. `parentOf` maps a sub-item back to its recorded change.
     */
    const parentOf = new Map<string, string>()
    const recordedIdOf = (id: string): string => parentOf.get(id) ?? id
    const recordRejection = async (
      errors: NonNullable<ApplyChangeResult['errors']>,
      changeId?: string,
      warnings?: ApplyChangeResult['warnings'],
      persist = true,
    ): Promise<ApplyChangeResult> => {
      const reason = errors
        .map((e) => (e.code && !e.message.startsWith(e.code) ? `${e.code}: ${e.message}` : e.message))
        .join('; ')
      try {
        if (!persist) throw new Error('not persisted')
        const fresh = parseChangeset(rawChangeset)
        fresh.frontmatter.status = 'rejected'
        fresh.frontmatter.resolution = reason
        fresh.frontmatter.proposal_sha = csDoc.frontmatter.proposal_sha
        const recordedId = changeId ? recordedIdOf(changeId) : undefined
        const target = recordedId ? fresh.changes.find((c) => c.id === recordedId) : undefined
        if (target) {
          target.status = 'rejected'
          target.resolution = reason
        }
        const text = writeBack(fresh)
        if (!altersNormativeLines(rawChangeset, text)) {
          await writeFile(resolvedChangesetPath, text, 'utf-8')
        }
      } catch (err) {
        if (persist) console.warn(`[apply-change] Could not persist the rejection of ${relChangesetPath}: ${err}`)
      }
      return {
        success: false,
        changesetPath: relChangesetPath,
        changeset: relChangesetPath,
        status: 'rejected',
        models: {},
        appliedCount: 0,
        errors,
        ...(warnings ? { warnings } : {}),
      }
    }

    // A rejected changeset with unchanged content is final: its recorded reason is returned.
    // An edited one (seal mismatch or removed) re-enters apply and is re-sealed below,
    // like a `conflict` re-proposal.
    const wasRejected = csDoc.frontmatter.status === 'rejected'
    if (wasRejected && csDoc.frontmatter.proposal_sha && verifyProposalSha(csDoc)) {
      const recorded = csDoc.frontmatter.resolution ?? 'The changeset was rejected'
      return {
        success: false,
        changesetPath: relChangesetPath,
        status: 'rejected',
        models: {},
        appliedCount: 0,
        errors: [{ path: relChangesetPath, message: `CHANGESET_REJECTED: ${recorded}`, code: 'CHANGESET_REJECTED' }],
      }
    }

    // 2b. Verdict policy (changeset-review-gate): the shape of every `review_gate`
    // change, then the human provenance of the file. Both are intrinsic to the
    // proposal, so they are persisted as rejected and write nothing.
    const gateShapeProblems = csDoc.changes.flatMap(reviewGateProblems)
    if (gateShapeProblems.length > 0) {
      return recordRejection(
        gateShapeProblems.map((message) => ({
          path: relChangesetPath,
          message,
          code: message.split(':')[0],
        })),
      )
    }
    const governanceProblems = reviewGateProvenanceProblems(csDoc.changes, csDoc.frontmatter)
    if (governanceProblems.length > 0) {
      return recordRejection(
        governanceProblems.map((message) => ({
          path: relChangesetPath,
          message,
          code: message.split(':')[0],
        })),
      )
    }

    // 3. Verify proposal_sha (tamper detection). A draft that arrives WITHOUT a
    // seal (e.g. the console review export) is stamped at intake: the engine
    // owns the canonical hash, so producers never duplicate it. A seal that IS
    // present but does not match the body is a tampered proposal and is rejected â€”
    // EXCEPT when the doc is already in `conflict` status: that is the documented
    // fix-and-retry loop (a previous run annotated status/conflict + resolution
    // and the author then edited the ops), so the edit re-proposes and is re-sealed.
    if (wasRejected) {
      csDoc.frontmatter.status = 'proposed'
      delete csDoc.frontmatter.resolution
      for (const c of csDoc.changes) {
        if (c.status === 'rejected') {
          delete c.status
          delete c.resolution
        }
      }
      csDoc.frontmatter.proposal_sha = computeProposalSha(csDoc.changes, csDoc.frontmatter)
    }
    if (!csDoc.frontmatter.proposal_sha) {
      csDoc.frontmatter.proposal_sha = computeProposalSha(csDoc.changes, csDoc.frontmatter)
    }
    if (!verifyProposalSha(csDoc)) {
      if (csDoc.frontmatter.status === 'conflict') {
        csDoc.frontmatter.proposal_sha = computeProposalSha(csDoc.changes, csDoc.frontmatter)
      } else {
        return {
          success: false,
          changesetPath: relChangesetPath,
          status: 'conflict',
          models: {},
          appliedCount: 0,
          errors: [
            {
              path: 'frontmatter.proposal_sha',
              message:
                'PROPOSAL_TAMPERED: proposal_sha does not match canonical proposed changes. ' +
                'The changeset was edited after validation â€” review the annotated resolutions and ' +
                're-submit as a new proposal (or clear frontmatter.proposal_sha so it is re-sealed at intake).',
              code: 'PROPOSAL_TAMPERED',
            },
          ],
        }
      }
    }

    // 4. Idempotent replay check
    if (csDoc.frontmatter.status === 'applied' || csDoc.frontmatter.status === 'partially_applied') {
      const recordedModels = csDoc.frontmatter.models ?? {}
      let allMatch = Object.keys(recordedModels).length > 0
      for (const [modelSlug, transition] of Object.entries(recordedModels)) {
        let modelFile: string | null = null
        try {
          modelFile = await findKnowledgeFile(rootDir, modelSlug)
        } catch {
          allMatch = false
          break
        }
        if (!modelFile) {
          allMatch = false
          break
        }
        try {
          const liveRaw = await readFile(modelFile, 'utf-8')
          const liveModel = parseKnowledge(liveRaw)
          const liveVersion = String(
            liveModel.frontmatter.knowledge_version ?? liveModel.frontmatter.blueprint_version ?? '',
          )
          if (liveVersion !== transition.result_version) {
            allMatch = false
            break
          }
        } catch {
          allMatch = false
          break
        }
      }

      const csStatus = csDoc.frontmatter.status
      if (allMatch) {
        return {
          success: true,
          changesetPath: relChangesetPath,
          status: csStatus,
          models: recordedModels,
          appliedCount: 0,
          conflictedCount: csDoc.changes.filter((c) => c.status === 'conflict').length,
          warnings: [{ path: '', message: 'Idempotent replay: changeset already applied with matching model versions' }],
        }
      } else {
        return {
          success: true,
          changesetPath: relChangesetPath,
          status: csStatus,
          models: recordedModels,
          appliedCount: 0,
          conflictedCount: csDoc.changes.filter((c) => c.status === 'conflict').length,
          warnings: [{ path: '', message: 'Changeset already applied; no mutations performed' }],
        }
      }
    }

    // 4b. Proposal-time evidence (D1/D2): a change's evidence is written by the proposer
    // and sealed with the proposal; apply only verifies that every evidence that names an
    // artifact resolves. The literal tokens `decision` and `unknown` are not citations and
    // are accepted without resolution. One unresolved evidence rejects the whole changeset,
    // writes nothing and releases the lock â€” the same all-or-nothing shape as PROPOSAL_TAMPERED.
    const citationResolver = createFsSourceResolver(rootDir)
    for (const change of csDoc.changes) {
      // A verdict is published by its changeset; its provenance is the human
      // reviewer, never an evidence citation (changeset-review-gate).
      if (change.op === 'review_gate') continue
      // D2: evidence is mandatory on every change; a changeset with a change that carries
      // none is rejected whole, naming the offending change id.
      if (!change.evidence) {
        return recordRejection(
          [
            {
              path: `changes.${change.id}.evidence`,
              message: `EVIDENCE_REQUIRED: change "${change.id}" carries no evidence`,
              code: 'EVIDENCE_REQUIRED',
            },
          ],
          change.id,
          undefined,
          false,
        )
      }
      if (change.evidence === 'decision' || change.evidence === 'unknown') continue
      let evidenceItems: string[]
      try {
        evidenceItems = splitEvidence(change.evidence)
      } catch (err) {
        return recordRejection(
          [
            {
              path: `changes.${change.id}.evidence`,
              message: err instanceof Error ? err.message : String(err),
              code: 'EVIDENCE_KEYWORD_IN_LIST',
            },
          ],
          change.id,
          undefined,
          false,
        )
      }
      for (const item of evidenceItems) {
        if (item === 'decision' || item === 'unknown') continue
        const resolved = resolveCitation(item, 'evidence', citationResolver, resolvedChangesetPath)
        if (!resolved.exists || resolved.error === 'UNKNOWN_ANCHOR' || resolved.error === 'MALFORMED') {
          return recordRejection(
            [
              {
                path: `changes.${change.id}.evidence`,
                message:
                  `CITATION_UNRESOLVED: change "${change.id}" cites "${item}" ` +
                  `which does not resolve (${resolved.error ?? 'NOT_FOUND'})`,
                code: 'CITATION_UNRESOLVED',
              },
            ],
            change.id,
            undefined,
            false,
          )
        }
      }
    }

    // Phase 1: In-Memory Compute & Validate
    interface LoadedModelEntry {
      modelSlug: string
      filePath: string
      model: ParsedKnowledge
      baseVersion: string
      nextVersion: string
      mutated: boolean
      /** Created by an `add_model` change in this apply (never bumped). */
      created: boolean
      /** Highest level requested by a `bump_version` change; absent means the default patch bump. */
      bumpLevel?: BumpLevel
      /** Resolved bluepriNNt schema, cached per model (null = unresolvable). */
      schema?: BlueprintSchema | null
      /** `move_model`: the id this entry carries after the move. */
      movedTo?: string
      /** `move_model`: the file path this entry had before the move. */
      movedFrom?: string
      /** `move_model`: where the file will live once Phase 2 relocates it. */
      plannedPath?: string
    }
    const loadedModels = new Map<string, LoadedModelEntry>()

    const rejectPhase1 = (code: string, path: string, message: string): ApplyChangeResult => ({
      success: false,
      changesetPath: relChangesetPath,
      status: 'rejected',
      models: {},
      appliedCount: 0,
      errors: [{ path, message: `${code}: ${message}`, code }],
    })
    /** Like rejectPhase1, for a defect of the proposal itself: the rejection is persisted. */
    const rejectProposal = (code: string, path: string, message: string, changeId?: string) =>
      recordRejection([{ path, message: `${code}: ${message}`, code }], changeId)

    // A new model is created under its canonical id (<name>_<blueprint>, no version token).
    // Later changes may address it by the id passed to add_model or by the canonical one;
    // both are rewritten in memory (like D11 below), so the sealed proposal text is untouched.
    const idAliases = modelIdAliases(csDoc.changes)
    for (const change of csDoc.changes) change.target = canonicalizeTarget(change.target, idAliases)

    // add_model pre-checks: ordering, duplicates, existing targets, domain layout.
    const addModelIndex = new Map<string, number>()
    const existingAddModelIds = new Set<string>()
    const blockedChanges = new Map<string, { code: string; message: string }>()
    for (const [index, change] of csDoc.changes.entries()) {
      if (change.op !== 'add_model') continue
      const key = change.target.toLowerCase()
      const hierarchical = typeof change.concept === 'string' && change.concept.trim() !== ''
      if (!isSafeRelativeId(change.target) || (hierarchical ? change.target.includes('\\') : /[\\/]/.test(change.target))) {
        return rejectProposal('ADD_MODEL_INVALID_TARGET', change.target, `change "${change.id}" has an unsafe model id "${change.target}"`, change.id)
      }
      if (addModelIndex.has(key)) {
        return rejectProposal('ADD_MODEL_DUPLICATE', change.target, `more than one add_model change targets "${change.target}"`, change.id)
      }
      addModelIndex.set(key, index)
    }

    /**
     * Where each `add_model` writes and, for an instance model, which root element
     * its skeleton carries (design A9). A change without `concept`, or naming a
     * compact concept, has no plan and keeps the `kNNowledge/<id>_NN.md` path.
     */
    interface AddModelPlan {
      /** Workspace-relative folder with a trailing slash. */
      folder: string
      file: string
      /** Absolute path of the model file. */
      path: string
      /** Root element of a distributed instance model. */
      root?: { concept: string; slug: string; name?: string }
    }
    const addModelPlans = new Map<string, AddModelPlan>()
    const plannedConcepts = new Map<string, string>()
    let nodeIndexCache: Awaited<ReturnType<typeof buildNodeDomainIndex>> | null = null
    const nodeIndex = async () => (nodeIndexCache ??= await buildNodeDomainIndex(rootDir))

    for (const [index, change] of csDoc.changes.entries()) {
      if (change.op !== 'add_model') continue
      const concept = typeof change.concept === 'string' ? change.concept.trim() : ''
      if (!concept) continue
      const blueprintName = String(change.blueprint_name ?? '')
      const blueprintUrl = String(change.blueprint_url ?? '')
      const declared = await loadDeclarations(rootDir, { name: blueprintName, url: blueprintUrl })
      const declaredStorage = declared
        ? [...declared].find(([name]) => name.toLowerCase() === concept.toLowerCase())?.[1]
        : undefined
      const { index: domainIndex } = await nodeIndex()
      const placed = domainIndex.placementFor(concept, change.target, blueprintName)
      if (!('folder' in placed)) {
        // No declarations means the bluepriNNt itself never resolved: report that
        // cause (the same code and wording the load phase uses) rather than the
        // placement it prevented.
        if (!declared) {
          return rejectPhase1(
            'BLUEPRINT_UNRESOLVED',
            change.target,
            `change "${change.id}": bluepriNNt "${blueprintName}" could not be resolved from "${blueprintUrl}"`,
          )
        }
        if (!declaredStorage) {
          return rejectProposal(
            'ADD_MODEL_INVALID_TARGET',
            change.target,
            `change "${change.id}": bluepriNNt "${blueprintName}" declares no concept "${concept}"`,
            change.id,
          )
        }
        return rejectProposal('ADD_MODEL_INVALID_TARGET', change.target, `change "${change.id}": ${placed.message}`, change.id)
      }
      // A compact concept declared explicitly stays on the compact branch: its
      // target is a plain id and the file keeps the `kNNowledge/` name rules.
      if (placed.folder === 'kNNowledge/') continue
      const filePath = join(rootDir, placed.folder, placed.file)
      if (!isInsideRoot(rootDir, filePath)) {
        return rejectProposal('ADD_MODEL_INVALID_TARGET', change.target, `model id "${change.target}" resolves outside the domain`, change.id)
      }
      const segments = change.target.split('/')
      const slug = segments[segments.length - 1]!
      const containerId = segments.slice(0, -1).join('/')
      if (containerId) {
        const containerConcept = declaredStorage?.container
        const createdAt = addModelIndex.get(containerId.toLowerCase())
        const holderConcept = plannedConcepts.get(containerId.toLowerCase())
        const holder = createdAt === undefined ? domainIndex.byId(containerId) : undefined
        if (createdAt !== undefined && createdAt > index) {
          return rejectProposal(
            'ADD_MODEL_ORDER',
            change.target,
            `change "${change.id}" targets container "${containerId}" before the add_model change that creates it`,
            change.id,
          )
        }
        const holderIsContainer =
          holderConcept !== undefined
            ? containerConcept === undefined || holderConcept.toLowerCase() === containerConcept.toLowerCase()
            : holder?.storage.kind === 'instance' &&
              (containerConcept === undefined || holder.storage.concept.toLowerCase() === containerConcept.toLowerCase())
        if (!holderIsContainer) {
          const expected = containerConcept ? `an instance of ${containerConcept}` : 'an instance model'
          return rejectProposal(
            'CONTAINER_MISSING',
            change.target,
            `change "${change.id}": container "${containerId}" is not ${expected}; create the container model first`,
            change.id,
          )
        }
      }
      addModelPlans.set(change.id, {
        folder: placed.folder,
        file: placed.file,
        path: filePath,
        root: { concept, slug, ...(change.name ? { name: change.name } : {}) },
      })
      plannedConcepts.set(change.target.toLowerCase(), concept)
    }

    /**
     * `extract_instance` plans (design A11): a compact element becomes its own
     * instance model. Every check runs before any write, and the destination is
     * computed from the SAME placement rule `add_model` uses.
     */
    interface ExtractPlan {
      changeId: string
      /** The compact model the element is cut from. */
      sourceId: string
      /** The element slug that becomes the instance root. */
      slug: string
      /** Concept of the extracted element; it must be distributed. */
      concept: string
      toId: string
      blueprintName: string
      blueprintUrl: string
      /** Workspace-relative folder with a trailing slash. */
      folder: string
      file: string
      /** Absolute path of the instance file. */
      path: string
    }
    const extractPlans = new Map<string, ExtractPlan>()
    /** Extract changes grouped by source model: one source, one atomic migration set. */
    const extractsBySource = new Map<string, Set<string>>()
    for (const change of csDoc.changes) {
      if (change.op !== 'extract_instance') continue
      const key = parseTargetAddress(change.target).modelSlug.toLowerCase()
      const group = extractsBySource.get(key)
      if (group) group.add(change.id)
      else extractsBySource.set(key, new Set([change.id]))
    }
    for (const change of csDoc.changes) {
      if (change.op !== 'extract_instance') continue
      const blueprintName = String(change.blueprint_name ?? '')
      const blueprintUrl = String(change.blueprint_url ?? '')
      const toId = String(change.to ?? '').trim()
      const { modelSlug: sourceId, parts, error } = parseTargetAddress(change.target)
      const slug = (parts[0] ?? '').trim()
      if (error || !sourceId || !slug || slug.includes('&') || !isSafeRelativeId(sourceId) || !isSafeRelativeId(toId)) {
        return rejectProposal(
          'EXTRACT_INVALID_TARGET',
          change.target,
          `change "${change.id}": extract_instance needs a source element address (<compact-id>@<slug>) and a hierarchical "to" id`,
          change.id,
        )
      }
      const { index: domainIndex, pathOf } = await nodeIndex()
      const source = domainIndex.byId(sourceId)
      if (!source) {
        return rejectPhase1('MODEL_NOT_FOUND', sourceId, `extract_instance source "${sourceId}" does not exist`)
      }
      if (source.storage.kind !== 'compact') {
        return rejectProposal(
          'EXTRACT_REQUIRES_COMPACT',
          sourceId,
          `change "${change.id}": "${sourceId}" is an instance model; extract_instance migrates a compact element into an instance model`,
          change.id,
        )
      }
      const sourcePath = pathOf(sourceId)
      if (!sourcePath) {
        return rejectPhase1('MODEL_NOT_FOUND', sourceId, `extract_instance source "${sourceId}" has no file`)
      }
      const sourceModel = await loadKnowledge(sourcePath)
      const subtree = subtreeOf(sourceModel, slug)
      if (!subtree) {
        const held = [...sourceModel.elements.entries()]
          .flatMap(([, list]) => list.map((el) => el.slug))
          .filter((s): s is string => Boolean(s))
        return rejectProposal(
          'EXTRACT_ELEMENT_NOT_FOUND',
          change.target,
          `change "${change.id}": "${sourceId}" holds no element "${slug}" (slugs: ${held.join(', ') || 'none'})`,
          change.id,
        )
      }
      const declared = await loadDeclarations(rootDir, { name: blueprintName, url: blueprintUrl })
      if (!declared) {
        return rejectPhase1(
          'BLUEPRINT_UNRESOLVED',
          change.target,
          `change "${change.id}": bluepriNNt "${blueprintName}" could not be resolved from "${blueprintUrl}"`,
        )
      }
      const declaredStorage = [...declared].find(
        ([name]) => name.toLowerCase() === subtree.concept.toLowerCase(),
      )?.[1]
      const distributed = [...declared]
        .filter(([, storage]) => storage.mode === 'distributed')
        .map(([name]) => name)
      if (!declaredStorage || declaredStorage.mode !== 'distributed') {
        return rejectProposal(
          'EXTRACT_NOT_DISTRIBUTED',
          change.target,
          `change "${change.id}": "${subtree.concept}" is not a distributed concept of bluepriNNt "${blueprintName}"` +
            ` (distributed: ${distributed.join(', ') || 'none'}); only a distributed concept may become its own model`,
          change.id,
        )
      }
      const targetSlug = toId.split('/').pop() ?? ''
      if (targetSlug.toLowerCase() !== slug.toLowerCase()) {
        return rejectProposal(
          'EXTRACT_SLUG_MISMATCH',
          toId,
          `change "${change.id}": the extracted element "${slug}" must keep its slug, so "to" must end in "${slug}"`,
          change.id,
        )
      }
      const containerConcept = declaredStorage.container
      const containerId = toId.split('/').slice(0, -1).join('/')
      if (containerConcept && containerId) {
        const holder = domainIndex.byId(containerId)
        const planned = plannedConcepts.get(containerId.toLowerCase())
        const ok =
          planned !== undefined
            ? containerConcept === undefined || planned.toLowerCase() === containerConcept.toLowerCase()
            : holder?.storage.kind === 'instance' &&
              holder.storage.concept.toLowerCase() === containerConcept.toLowerCase()
        if (!ok) {
          return rejectProposal(
            'CONTAINER_MISSING',
            toId,
            `change "${change.id}": container "${containerId}" is not an instance of ${containerConcept}; create the container model first`,
            change.id,
          )
        }
      }
      const placed = domainIndex.placementFor(subtree.concept, toId, blueprintName)
      if (!('folder' in placed)) {
        return rejectProposal('EXTRACT_INVALID_TARGET', toId, `change "${change.id}": ${placed.message}`, change.id)
      }
      const path = join(rootDir, placed.folder, placed.file)
      if (!isInsideRoot(rootDir, path)) {
        return rejectProposal('EXTRACT_INVALID_TARGET', toId, `model id "${toId}" resolves outside the domain`, change.id)
      }
      // An existing instance is a conflict, and it is the double-storage case the
      // registry is cleaned of with `remove_element`, never repaired by extract.
      const occupiedById =
        domainIndex.byId(toId) !== undefined || (await stat(path).then((s) => s.isFile(), () => false))
      // The destination folder is created by the extraction: if something already
      // claims it, the migration would write into a foreign folder.
      const occupiedFolder = await stat(dirname(path)).then((s) => s.isDirectory(), () => false)
      if (occupiedById || occupiedFolder) {
        const where = occupiedById
          ? `instance "${toId}" already exists`
          : `"${relative(rootDir, dirname(path)).replace(/\\/g, '/')}/" already exists`
        blockedChanges.set(change.id, {
          code: occupiedById ? 'MODEL_EXISTS' : 'EXTRACT_DESTINATION_OCCUPIED',
          message: `${occupiedById ? 'MODEL_EXISTS' : 'EXTRACT_DESTINATION_OCCUPIED'}: ${where}, so extracting into "${toId}" would write into it; remove the registry copy with remove_element instead`,
        })
        // A-14: extracts of one source are one atomic migration. If one of them
        // cannot land, none of them is attempted.
        for (const otherId of extractsBySource.get(sourceId.toLowerCase()) ?? []) {
          if (otherId === change.id) continue
          blockedChanges.set(otherId, {
            code: 'DEPENDS_ON_CONFLICTED_CHANGE',
            message: `DEPENDS_ON_CONFLICTED_CHANGE: change "${otherId}" extracts from "${sourceId}", whose extraction group conflicted on change "${change.id}"`,
          })
        }
        continue
      }
      extractPlans.set(change.id, {
        changeId: change.id,
        sourceId,
        slug,
        concept: subtree.concept,
        toId,
        blueprintName,
        blueprintUrl,
        folder: placed.folder,
        file: placed.file,
        path,
      })
      plannedConcepts.set(toId.toLowerCase(), subtree.concept)
    }

    for (const [index, change] of csDoc.changes.entries()) {
      if (isNonMutating(change.op) || change.op === 'add_model' || change.op === 'produce_artifact') continue
      const targetModel = parseTargetAddress(change.target).modelSlug
      const createdAt = addModelIndex.get(targetModel.toLowerCase())
      if (createdAt !== undefined && createdAt > index) {
        return rejectProposal(
          'ADD_MODEL_ORDER',
          change.target,
          `change "${change.id}" targets model "${targetModel}" before the add_model change that creates it`,
          change.id,
        )
      }
    }
    // `seed` is the matrix header payload: valid only on add_matrix.
    for (const change of csDoc.changes) {
      if (change.seed !== undefined && change.op !== 'add_matrix') {
        return rejectProposal(
          'INVALID_OPERATION',
          change.target,
          `change "${change.id}": seed is valid only on add_matrix`,
          change.id,
        )
      }
    }

    // `fields` is not a key of the Change concept: a change carries no inline field
    // values. Reject a proposal that still carries one, defensively.
    for (const change of csDoc.changes) {
      if (change.fields !== undefined) {
        return rejectProposal(
          'INVALID_OPERATION',
          change.target,
          `change "${change.id}": a change must not carry inline fields; set them with one set_fields change for the fields that share one evidence, or one update_field change per field whose evidence differs`,
          change.id,
        )
      }
    }
    // The prose body is a knowledge unit, not a field.
    for (const change of csDoc.changes) {
      if (change.op !== 'update_field') continue
      const field = change.target.split('&')[1] ?? ''
      if (field.trim().toLowerCase() === 'description') {
        return rejectProposal(
          'USE_UPDATE_ELEMENT_TEXT',
          change.target,
          `change "${change.id}": the element prose is not a field; use update_element_text on the bare element target`,
          change.id,
        )
      }
    }

    // set_fields: the payload is checked defensively (propose_changeset already did),
    // then the change is expanded into one update_field sub-item per field.
    for (const change of csDoc.changes) {
      const problem = setFieldsProblems(change)[0]
      if (problem) {
        return rejectProposal(problem.code, change.target, `change "${change.id}": ${problem.message}`, change.id)
      }
    }
    /** The changes as recorded in the file: one entry per `## NN Change` block. */
    const recordedChanges = csDoc.changes
    /** set_fields id -> its sub-item ids, in `to` order. */
    const setFieldsParts = new Map<string, string[]>()
    csDoc.changes = csDoc.changes.flatMap((change): ChangeItem[] => {
      if (change.op !== 'set_fields') return [change]
      const subs = setFieldsEntries(change).map((entry): ChangeItem => {
        const id = `${change.id}&${entry.field}`
        parentOf.set(id, change.id)
        return {
          id,
          op: 'update_field',
          target: `${change.target}&${entry.field}`,
          to: entry.to,
          ...(entry.from !== undefined ? { from: entry.from } : {}),
          ...(change.base_hash !== undefined ? { base_hash: change.base_hash } : {}),
          ...(change.concept !== undefined ? { concept: change.concept } : {}),
          ...(change.author !== undefined ? { author: change.author } : {}),
          evidence: change.evidence,
        }
      })
      setFieldsParts.set(change.id, subs.map((sub) => sub.id))
      return subs
    })
    /**
     * The document as it is written back: every recorded change, a set_fields folded
     * back from its sub-items (conflict when any sub-item conflicted, its element
     * address as resolved_target), so the file keeps ONE block per change.
     */
    const recordedDocument = (): ChangesetDocument => {
      const current = new Map(csDoc.changes.map((c) => [c.id, c]))
      const changes = recordedChanges.map((recorded): ChangeItem => {
        const subIds = setFieldsParts.get(recorded.id)
        if (!subIds) return current.get(recorded.id) ?? recorded
        const subs = subIds.map((id) => current.get(id)).filter((c): c is ChangeItem => c !== undefined)
        const folded: ChangeItem = { ...recorded }
        for (const key of ['status', 'resolution', 'resolved_target', 'evidence_sha256', 'applied_at', 'batch'] as const) {
          delete folded[key]
        }
        const failed = subs.find((c) => c.status !== undefined && c.status !== 'applied')
        const first = subs[0]
        if (failed) {
          folded.status = failed.status
          if (failed.resolution !== undefined) folded.resolution = failed.resolution
        } else if (first?.status === 'applied') {
          folded.status = 'applied'
          folded.resolution = first.resolution
          const unit = first.resolved_target
          if (unit) folded.resolved_target = unit.slice(0, unit.lastIndexOf('&'))
          if (first.evidence_sha256) folded.evidence_sha256 = first.evidence_sha256
        }
        if (first?.applied_at !== undefined) folded.applied_at = first.applied_at
        if (first?.batch !== undefined) folded.batch = first.batch
        return folded
      })
      return { ...csDoc, changes }
    }

    // produce_artifact pre-checks: the target is a safe, existing workspace path that is
    // not a model, changeset or sidecar. A second applied record for the same path is a
    // conflict, not a second record.
    for (const change of csDoc.changes) {
      if (change.op !== 'produce_artifact') continue
      const rel = change.target.replace(/\\/g, '/')
      const segments = rel.split('/')
      if (
        !isSafeRelativeId(rel) ||
        isAbsolute(rel) ||
        segments.includes('..') ||
        !isInsideRoot(rootDir, join(rootDir, rel))
      ) {
        return rejectProposal(
          'ARTIFACT_INVALID_PATH',
          rel,
          `change "${change.id}" targets an unsafe artifact path "${change.target}"`,
          change.id,
        )
      }
      const fileName = segments[segments.length - 1] ?? ''
      if (isChangesetPath(rel) || isSidecarName(fileName) || /(^|\/)kNNowledge\//i.test(rel)) {
        return rejectProposal(
          'ARTIFACT_INVALID_PATH',
          rel,
          `change "${change.id}" targets "${rel}", which is a model, changeset or sidecar, not an artifact`,
          change.id,
        )
      }
      const info = await stat(join(rootDir, rel)).catch(() => null)
      if (!info || !info.isFile()) {
        return rejectPhase1(
          'ARTIFACT_NOT_FOUND',
          rel,
          `change "${change.id}" records "${rel}", which does not exist`,
        )
      }
      if (await artifactAlreadyRecorded(rootDir, rel)) {
        blockedChanges.set(change.id, {
          code: 'ARTIFACT_ALREADY_RECORDED',
          message: `ARTIFACT_ALREADY_RECORDED: "${rel}" already has an applied produce_artifact change`,
        })
      }
    }

    let needsKnowledgeDir = false
    for (const change of csDoc.changes) {
      if (change.op !== 'add_model') continue
      const key = change.target.toLowerCase()
      const plan = addModelPlans.get(change.id)
      let exists = false
      try {
        exists = Boolean(await findKnowledgeFile(rootDir, change.target))
      } catch (err) {
        if (err instanceof ModelIdError) exists = true
        else throw err
      }
      // The id can be free while the placement path is already taken: add_model
      // never writes over a file, whether or not that file is a model.
      if (!exists && plan) {
        exists = await stat(plan.path).then((s) => s.isFile(), () => false)
      }
      if (exists) {
        existingAddModelIds.add(key)
        blockedChanges.set(change.id, {
          code: 'MODEL_EXISTS',
          message: `MODEL_EXISTS: model "${change.target}" already exists; add_model never overwrites or repairs a model`,
        })
        for (const other of csDoc.changes) {
          if (other.id === change.id || isNonMutating(other.op) || other.op === 'produce_artifact') continue
          if (parseTargetAddress(other.target).modelSlug.toLowerCase() !== key) continue
          blockedChanges.set(other.id, {
            code: 'DEPENDS_ON_CONFLICTED_CHANGE',
            message: `DEPENDS_ON_CONFLICTED_CHANGE: change "${other.id}" depends on add_model change "${change.id}", which conflicted`,
          })
        }
      } else if (!plan) {
        needsKnowledgeDir = true
      }
    }
    if (needsKnowledgeDir) {
      const kDir = await stat(join(rootDir, 'kNNowledge')).catch(() => null)
      if (!kDir || !kDir.isDirectory()) {
        return rejectPhase1('DOMAIN_LAYOUT_INVALID', 'kNNowledge', 'the domain has no kNNowledge/ directory to create models in')
      }
    }

    /**
     * `move_model` plans (design A10): the old model, the new id, and the folder and
     * file it moves to. Every check runs before any write; nothing is touched here.
     */
    interface MovePlan {
      changeId: string
      fromId: string
      toId: string
      concept: string
      blueprintName: string
      fromPath: string
      toPath: string
    }
    const movePlans = new Map<string, MovePlan>()
    for (const change of csDoc.changes) {
      if (change.op !== 'move_model') continue
      const fromId = change.target.trim()
      const toId = String(change.to ?? '').trim()
      if (!isSafeRelativeId(fromId) || !isSafeRelativeId(toId)) {
        return rejectProposal(
          'MOVE_INVALID_TARGET',
          change.target,
          `change "${change.id}" carries an unsafe model id`,
          change.id,
        )
      }
      const { index: domainIndex, pathOf } = await nodeIndex()
      const from = domainIndex.byId(fromId)
      if (!from) {
        return rejectPhase1('MODEL_NOT_FOUND', fromId, `move_model target "${fromId}" does not exist`)
      }
      const fromStorage = from.storage
      if (fromStorage.kind !== 'instance') {
        return rejectProposal(
          'MOVE_REQUIRES_INSTANCE',
          fromId,
          `change "${change.id}": "${fromId}" is a compact model; move_model moves an instance model only`,
          change.id,
        )
      }
      const concept = fromStorage.concept
      if (domainIndex.byId(toId)) {
        return rejectPhase1(
          'MODEL_EXISTS',
          toId,
          `MODEL_EXISTS: moving "${fromId}" to "${toId}" would overwrite the model that already carries that id`,
        )
      }
      const fromPath = pathOf(fromId)
      if (!fromPath) {
        return rejectPhase1('MODEL_NOT_FOUND', fromId, `move_model target "${fromId}" has no file`)
      }
      const oldModel = await loadKnowledge(fromPath)
      const parent = oldModel.frontmatter.parent_spec as { name?: string; url?: string } | undefined
      const declarations = parent?.name ? await loadDeclarations(rootDir, { name: parent.name, url: parent.url }) : null
      const storage = declarations
        ? [...declarations].find(([name]) => name.toLowerCase() === concept.toLowerCase())?.[1]
        : undefined
      const containerConcept = storage?.container
      const segments = toId.split('/')
      if (containerConcept) {
        const holder = segments.length === 2 ? domainIndex.byId(segments[0]!) : undefined
        if (
          !holder ||
          holder.storage.kind !== 'instance' ||
          holder.storage.concept.toLowerCase() !== containerConcept.toLowerCase()
        ) {
          return rejectPhase1(
            'CONTAINER_MISSING',
            toId,
            `CONTAINER_MISSING: container "${segments[0] ?? ''}" is not an instance of ${containerConcept}; create the container model first`,
          )
        }
      }
      // The index resolves declarations by the pinned bluepriNNt NAME, which keeps its
      // version token (`coNNtent_V_0-1-0`); a version-less name resolves empty.
      const blueprintName = parent?.name ?? from.blueprint.name
      const placed = domainIndex.placementFor(concept, toId, blueprintName)
      if (!('folder' in placed)) {
        return rejectProposal('MOVE_INVALID_TARGET', toId, `change "${change.id}": ${placed.message}`, change.id)
      }
      const toPath = join(rootDir, placed.folder, placed.file)
      if (!isInsideRoot(rootDir, toPath)) {
        return rejectProposal('MOVE_INVALID_TARGET', toId, `model id "${toId}" resolves outside the domain`, change.id)
      }
      const fromDir = dirname(fromPath)
      const toDir = dirname(toPath)
      if (toDir !== fromDir) {
        if (await stat(toDir).then(() => true, () => false)) {
          return rejectPhase1(
            'MOVE_DESTINATION_OCCUPIED',
            toId,
            `moving "${fromId}" to "${toId}" would write into "${relative(rootDir, toDir)}", which already exists`,
          )
        }
      } else if (toPath !== fromPath && (await stat(toPath).then(() => true, () => false))) {
        return rejectPhase1('MODEL_EXISTS', toId, `MODEL_EXISTS: "${toId}" already has a file`)
      }
      movePlans.set(change.id, {
        changeId: change.id,
        fromId,
        toId,
        concept: concept,
        blueprintName,
        fromPath,
        toPath,
      })
    }

    /** Resolve (once per model) the bluepriNNt schema a model conforms to. */
    const schemaFor = async (entry: LoadedModelEntry): Promise<BlueprintSchema | undefined> => {
      if (entry.schema === undefined) {
        try {
          const { template: schemaBlueprint, resolveInclude: schemaInclude } =
            await resolveBlueprintForKnowledge(rootDir, entry.model)
          entry.schema = schemaBlueprint
            ? resolveBlueprintSchema(schemaBlueprint.rawContent, schemaInclude).schema
            : null
        } catch {
          entry.schema = null
        }
      }
      return entry.schema ?? undefined
    }

    for (const change of csDoc.changes) {
      if (change.op === 'comment' || change.op === 'produce_artifact') continue
      const { modelSlug } = parseTargetAddress(change.target)
      if (!modelSlug) continue
      // A model whose add_model conflicted is never loaded: nothing may touch it.
      if (existingAddModelIds.has(modelSlug.toLowerCase())) continue

      if (change.op === 'add_model') {
        const cleanId = normalizeId(change.target)
        const plan = addModelPlans.get(change.id)
        const blueprintName = change.blueprint_name as string
        const blueprintUrl = change.blueprint_url as string
        let resolvedBlueprint: Awaited<ReturnType<typeof resolveBlueprintWithCache>> | null = null
        let resolveFailure = ''
        try {
          resolvedBlueprint = await resolveBlueprintWithCache(rootDir, blueprintUrl, blueprintName)
        } catch (err) {
          resolveFailure = err instanceof Error ? err.message : String(err)
        }
        if (!resolvedBlueprint?.template) {
          const detail = resolveFailure ? ` (${resolveFailure})` : ''
          return rejectPhase1(
            'BLUEPRINT_UNRESOLVED',
            change.target,
            `change "${change.id}": bluepriNNt "${blueprintName}" could not be resolved from "${blueprintUrl}"${detail}`,
          )
        }
        const composed = resolveBlueprintSchema(resolvedBlueprint.template.rawContent, resolvedBlueprint.resolveInclude)
        if (composed.errors.length > 0) {
          const detail = composed.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
          return rejectPhase1(
            'BLUEPRINT_INVALID',
            change.target,
            `change "${change.id}": bluepriNNt "${blueprintName}" does not compose: ${detail}`,
          )
        }
        const content = scaffoldKnowledgeDocument({
          id: cleanId,
          blueprintName,
          blueprintUrl,
          title: change.name,
          knowledgeVersion: change.knowledge_version,
          schema: composed.schema,
          blueprintFrontmatter: resolvedBlueprint.template.frontmatter as unknown as Record<string, unknown>,
          ...(plan?.root ? { root: plan.root } : {}),
        })
        const filePath = plan ? plan.path : join(rootDir, 'kNNowledge', `${cleanId}_NN.md`)
        if (!isInsideRoot(rootDir, filePath)) {
          return rejectPhase1('ADD_MODEL_INVALID_TARGET', change.target, `model id "${change.target}" resolves outside the domain`)
        }
        const created = parseKnowledge(content)
        const initialVersion = String(created.frontmatter.knowledge_version ?? 'V_0-1-0')
        loadedModels.set(modelSlug.toLowerCase(), {
          modelSlug,
          filePath,
          model: created,
          baseVersion: initialVersion,
          nextVersion: initialVersion,
          mutated: true,
          created: true,
          schema: composed.schema,
        })
        continue
      }

      if (!loadedModels.has(modelSlug.toLowerCase())) {
        let modelFile: string | null = null
        try {
          modelFile = await findKnowledgeFile(rootDir, modelSlug)
        } catch (err) {
          if (err instanceof ModelIdError) {
            return {
              success: false,
              changesetPath: relChangesetPath,
              status: 'rejected',
              models: {},
              appliedCount: 0,
              errors: [{ path: change.target, message: err.message }],
            }
          }
          throw err
        }
        if (!modelFile) {
          // A target model part that does not resolve is reported with the ids that
          // share its last segment, and a filename stem is named as the removed form
          // it is (changeset-document-model): neither is ever guessed.
          const { index: di } = await nodeIndex()
          const stem = di.models.find((m) => displayStem(basename(m.path)) === modelSlug)
          if (stem) {
            return {
              success: false,
              changesetPath: relChangesetPath,
              status: 'rejected',
              models: {},
              appliedCount: 0,
              errors: [
                {
                  path: change.target,
                  message: `MODEL_ADDRESSED_BY_STEM: "${modelSlug}" is a filename stem, not a model id; address "${stem.id}" instead`,
                  code: 'MODEL_ADDRESSED_BY_STEM',
                },
              ],
            }
          }
          const last = modelSlug.split('/').pop()
          const candidates = di.models
            .filter((m) => m.id !== modelSlug && m.id.split('/').pop() === last)
            .map((m) => m.id)
          const hint =
            candidates.length > 0 ? `; no model has that id (candidates: ${candidates.join(', ')})` : ''
          return {
            success: false,
            changesetPath: relChangesetPath,
            status: 'rejected',
            models: {},
            appliedCount: 0,
            errors: [{ path: change.target, message: `Model not found: ${modelSlug}${hint}` }],
          }
        }
        const model = await loadKnowledge(modelFile)
        const parentName = (model.frontmatter.parent_spec as { name?: string } | undefined)?.name
        const baseVersion = String(
          model.frontmatter.knowledge_version ?? model.frontmatter.blueprint_version ?? 'V_0-1-0',
        )
        const nextVer = computeNewVersion(baseVersion, { bump: 'patch' })
        const nextVersion = nextVer ? nextVer.version : 'V_0-1-1'

        // A move that changes the slug is the only sanctioned slug change: the
        // instance slug IS the id, so the root element moves with it (design A10).
        const movePlan = [...movePlans.values()].find((plan) => plan.fromId === modelSlug)
        let movedBody = false
        if (movePlan) {
          const oldSlug = movePlan.fromId.split('/').pop() ?? ''
          const newSlug = movePlan.toId.split('/').pop() ?? ''
          if (oldSlug !== newSlug) {
            const rootElements = model.elements.get(movePlan.concept) ?? []
            for (const element of rootElements) {
              if (element.slug !== oldSlug) continue
              element.slug = newSlug
              element.slugExplicit = true
              movedBody = true
            }
            const documentSlug = model.frontmatter.knowledge_slug
            if (typeof documentSlug === 'string' && documentSlug === oldSlug) {
              model.frontmatter.knowledge_slug = newSlug
              movedBody = true
            }
          }
        }

        loadedModels.set(modelSlug.toLowerCase(), {
          modelSlug,
          filePath: modelFile,
          model,
          baseVersion,
          nextVersion,
          mutated: movedBody,
          created: false,
          ...(movePlan ? { movedTo: movePlan.toId, plannedPath: movePlan.toPath } : {}),
        })
      }
    }

    // Load workspace models (for delete impact analysis)
    const workspaceModels = new Map<string, ParsedKnowledge>()
    for (const [, v] of loadedModels) {
      workspaceModels.set(v.modelSlug, v.model)
      if (v.model.frontmatter.knowledge_slug) {
        workspaceModels.set(v.model.frontmatter.knowledge_slug.toLowerCase(), v.model)
      }
    }
    if (csDoc.changes.some((c) => c.op === 'remove_element')) {
      const allFiles = await findAllWorkspaceModelFiles(rootDir, DEFAULT_WORKSPACE_IGNORE, rootDir)
      for (const f of allFiles) {
        const fStem = displayStem(basename(f)).toLowerCase()
        if (!workspaceModels.has(fStem)) {
          try {
            const m = await loadKnowledge(f)
            workspaceModels.set(fStem, m)
            if (m.frontmatter.knowledge_slug) {
              workspaceModels.set(m.frontmatter.knowledge_slug.toLowerCase(), m)
            }
          } catch {
            // ignore unparseable
          }
        }
      }
    }

    // Gate declarations (changeset-review-gate): nn-core holds no gate name, so a
    // verdict is accepted only when the target model's bluepriNNt declares the gate
    // and the unit it accepts. A missing target is a per-change conflict, not a
    // policy failure, so it is left to the conflict partition.
    for (const change of csDoc.changes) {
      if (change.op !== 'review_gate') continue
      const { modelSlug } = parseTargetAddress(change.target)
      const entry = loadedModels.get(modelSlug.toLowerCase())
      if (!entry) continue
      let gates: unknown
      try {
        const { template } = await resolveBlueprintForKnowledge(rootDir, entry.model)
        gates = template?.frontmatter?.gates
      } catch {
        gates = undefined
      }
      const problems = gateDeclarationProblems(change, gates)
      if (problems.length > 0) {
        return recordRejection(
          problems.map((message) => ({
            path: change.target,
            message,
            code: message.split(':')[0],
          })),
          change.id,
        )
      }
    }

    // D11: Batch Slug Resolution & Intra-Batch Rewriting
    const loadedModelAsts = new Map<string, ParsedKnowledge>()
    for (const [, v] of loadedModels) {
      loadedModelAsts.set(v.modelSlug, v.model)
      if (v.model.frontmatter.knowledge_slug) {
        loadedModelAsts.set(v.model.frontmatter.knowledge_slug.toLowerCase(), v.model)
      }
    }
    const slugResolution = resolveBatchSlugs(csDoc.changes, loadedModelAsts)
    csDoc.changes = slugResolution.changes
    // D11 rewrites target/to/name/slug in memory for the model mutation. The changeset
    // file is written back through the raw-text-preserving serializer, which never
    // re-renders a normative line, so the persisted proposal and its seal stay exactly
    // as proposed â€” no re-seal here, or the on-disk seal would no longer match its body.

    // D12: Delete Impact Pre-Computation & Reference Scanning
    const { matrixCascades, referenceConflicts } = evaluateBatchDeleteImpact(
      csDoc.changes,
      loadedModelAsts,
      workspaceModels,
    )

    // D10: Precondition, Staleness & Reference Conflict Partitioning
    const modelBaseVersions = new Map<string, string>()
    for (const [, v] of loadedModels) {
      modelBaseVersions.set(v.modelSlug, v.baseVersion)
      if (v.model.frontmatter.knowledge_slug) {
        modelBaseVersions.set(v.model.frontmatter.knowledge_slug.toLowerCase(), v.baseVersion)
      }
    }
    const changesDir = join(rootDir, 'changes')
    const { cleanSubset, conflictedSubset, conflictDiagnostics } = await partitionChangeset(
      csDoc.changes,
      loadedModelAsts,
      changesDir,
      modelBaseVersions,
      referenceConflicts,
      blockedChanges,
    )

    // set_fields is all or nothing: one conflicted sub-item conflicts every sibling.
    for (const subIds of setFieldsParts.values()) {
      const failed = conflictedSubset.find((c) => subIds.includes(c.id))
      if (!failed) continue
      const diag = conflictDiagnostics.get(failed.id)
      for (let i = cleanSubset.length - 1; i >= 0; i--) {
        const sibling = cleanSubset[i]!
        if (!subIds.includes(sibling.id)) continue
        cleanSubset.splice(i, 1)
        conflictedSubset.push(sibling)
        if (diag) conflictDiagnostics.set(sibling.id, diag)
      }
    }

    // All-Conflicted Exit Guard (D10): Zero model writes, zero snapshots
    const actionableClean = cleanSubset.filter((c) => !isNonMutating(c.op))
    if (actionableClean.length === 0 && conflictedSubset.length > 0) {
      for (const change of csDoc.changes) {
        if (isNonMutating(change.op)) continue
        change.status = 'conflict'
        const diag = conflictDiagnostics.get(change.id)
        change.resolution = diag ? diag.message : (change.resolution || 'Precondition failed')
      }
      csDoc.frontmatter.status = 'conflict'
      csDoc.frontmatter.applied_at = new Date().toISOString()
      csDoc.frontmatter.batch = changesetStem
      const serializedCs = writeBack(recordedDocument())
      if (altersNormativeLines(rawChangeset, serializedCs)) {
        return {
          success: false,
          changesetPath: relChangesetPath,
          status: 'rejected',
          models: {},
          appliedCount: 0,
          errors: [
            {
              path: relChangesetPath,
              message:
                'PROPOSAL_IMMUTABILITY_VIOLATION: the write-back would alter a normative line of a change block',
              code: 'PROPOSAL_IMMUTABILITY_VIOLATION',
            },
          ],
        }
      }
      await writeFile(resolvedChangesetPath, serializedCs, 'utf-8')

      return {
        success: false,
        changesetPath: relChangesetPath,
        changeset: relChangesetPath,
        status: 'conflict',
        models: {},
        appliedCount: 0,
        conflictedCount: new Set(conflictedSubset.map((c) => recordedIdOf(c.id))).size,
        errors: Array.from(conflictDiagnostics.values()).map((d) => ({
          path: relChangesetPath,
          message: d.message,
          code: d.code,
        })),
      }
    }

    // Mark conflicted changes with conflict annotations
    for (const change of conflictedSubset) {
      change.status = 'conflict'
      const diag = conflictDiagnostics.get(change.id)
      change.resolution = diag ? diag.message : (change.resolution || 'Precondition failed')
    }

    // Referrers (design A10): a move is allowed only when every typed reference to
    // the old id (or a descendant) is retargeted by an `update_field` in the SAME
    // changeset. Recorded targets are never rewritten, and referrers are never
    // silently rewritten either: the move is rejected and the caller gets the
    // missing update_field changes.
    if (movePlans.size > 0) {
      const retargets = new Map<string, string>()
      for (const change of cleanSubset) {
        if (change.op !== 'update_field' || change.to === undefined) continue
        retargets.set(change.target, change.to)
      }
      for (const plan of movePlans.values()) {
        const dangling = await findDanglingReferrers(
          rootDir,
          { fromId: plan.fromId, toId: plan.toId, fromPath: plan.fromPath },
          retargets,
        )
        if (dangling.length === 0) continue
        return rejectPhase1(
          'MOVE_LEAVES_DANGLING_REFERENCES',
          plan.fromId,
          `MOVE_LEAVES_DANGLING_REFERENCES: moving "${plan.fromId}" to "${plan.toId}" leaves ` +
            `${dangling.length} reference(s) pointing at the old id (${dangling
              .map((d) => d.unit)
              .join(', ')}); add one update_field per reference to this changeset`,
        )
      }
    }

    // Apply mutations for clean subset in memory
    for (const change of cleanSubset) {
      if (isNonMutating(change.op)) {
        if (change.op === 'review_gate') {
          change.status = 'applied'
          change.resolution = `Recorded verdict "${String(change.verdict ?? '')}" for gate "${String(change.gate ?? '')}"`
        }
        continue
      }
      if (change.op === 'produce_artifact') {
        change.status = 'applied'
        change.resolution = `Recorded artifact ${change.target}`
        continue
      }
      const { modelSlug, parts, remainder } = parseTargetAddress(change.target)
      const entry = loadedModels.get(modelSlug.toLowerCase())
      if (!entry) continue

      // A move carries no element mutation: the slug rewrite (if any) ran at load,
      // and Phase 2 relocates the folder and file inside the atomic persist.
      if (change.op === 'move_model') {
        const plan = movePlans.get(change.id)
        if (!plan) {
          return rejectPhase1('MOVE_INVALID_TARGET', change.target, `change "${change.id}" has no move plan`)
        }
        change.status = 'applied'
        change.resolution = `Moved model "${plan.fromId}" to "${plan.toId}"`
        continue
      }

      // `extract_instance` (design A11): cut the subtree out of the source and
      // write it as a new instance model through the S6a skeleton. The source is
      // mutated (bumped once); the new model records only its result version.
      if (change.op === 'extract_instance') {
        const plan = extractPlans.get(change.id)
        if (!plan) {
          return rejectPhase1('EXTRACT_INVALID_TARGET', change.target, `change "${change.id}" has no extract plan`)
        }
        const mutRes = coreApplyMutation(entry.model, 'extract_instance', {
          elementName: plan.slug,
          conceptName: plan.concept,
        })
        const subtree = mutRes.extracted
        if (!mutRes.success || !subtree) {
          return recordRejection(
            (mutRes.errors ?? [{ path: '', message: `extract_instance "${plan.slug}" failed` }]).map((e) => ({
              ...e,
              code: 'MUTATION_FAILED',
            })),
            change.id,
            mutRes.warnings,
          )
        }
        let extractedBlueprint: Awaited<ReturnType<typeof resolveBlueprintWithCache>> | null = null
        try {
          extractedBlueprint = await resolveBlueprintWithCache(rootDir, plan.blueprintUrl, plan.blueprintName)
        } catch {
          extractedBlueprint = null
        }
        if (!extractedBlueprint?.template) {
          return rejectPhase1(
            'BLUEPRINT_UNRESOLVED',
            change.to ?? '',
            `change "${change.id}": bluepriNNt "${plan.blueprintName}" could not be resolved from "${plan.blueprintUrl}"`,
          )
        }
        const composed = resolveBlueprintSchema(
          extractedBlueprint.template.rawContent,
          extractedBlueprint.resolveInclude,
        )
        if (composed.errors.length > 0) {
          return rejectPhase1(
            'BLUEPRINT_INVALID',
            change.to ?? '',
            `change "${change.id}": bluepriNNt "${plan.blueprintName}" does not compose: ${composed.errors
              .map((e) => `${e.path}: ${e.message}`)
              .join('; ')}`,
          )
        }
        const rootNode = subtree.elements[0]!.node
        const content = scaffoldKnowledgeDocument({
          id: normalizeId(plan.toId),
          blueprintName: plan.blueprintName,
          blueprintUrl: plan.blueprintUrl,
          title: change.name ?? rootNode.name,
          knowledgeVersion: change.knowledge_version,
          schema: composed.schema,
          blueprintFrontmatter: extractedBlueprint.template.frontmatter as unknown as Record<string, unknown>,
          root: {
            concept: plan.concept,
            slug: plan.slug,
            ...(change.name ? { name: change.name } : { name: rootNode.name }),
          },
        })
        const created = parseKnowledge(content)
        // The extracted element IS the instance root, and its descendants
        // replace the skeleton's placeholders: values and citations travel
        // untouched, nothing is re-recorded.
        seedExtractedModel(created, subtree)
        const initialVersion = String(created.frontmatter.knowledge_version ?? 'V_0-1-0')
        entry.mutated = true
        loadedModels.set(plan.toId.toLowerCase(), {
          modelSlug: plan.toId,
          filePath: plan.path,
          model: created,
          baseVersion: initialVersion,
          nextVersion: initialVersion,
          mutated: true,
          created: true,
          schema: composed.schema,
        })
        change.status = 'applied'
        change.resolution = `Extracted "${plan.slug}" from "${plan.sourceId}" into "${plan.toId}"`
        change.extracted_slugs = [...subtree.slugs]
        continue
      }

      if (change.op === 'bump_version' || change.op === 'freeze_slugs') {
        const problem = maintenanceChangeProblem(change, entry.model, entry.created)
        if (problem) return rejectProposal(problem.code, change.target, `change "${change.id}": ${problem.message}`, change.id)
      }

      // Freezing a fully frozen model changes nothing: an applied no-op that must not
      // mark the model touched (and so must not burn a version).
      if (change.op === 'freeze_slugs' && !hasUnfrozenElements(entry.model)) {
        change.status = 'applied'
        change.resolution = 'Slugs already frozen; nothing to do'
        continue
      }

      entry.mutated = true

      if (change.op === 'add_model') {
        // The document was created and registered in the load phase above.
        change.status = 'applied'
        change.resolution = `Created model "${change.target}"`
        continue
      }

      if (change.op === 'bump_version') {
        // The bump is applied once per model below, to the highest requested level.
        const level = change.to as BumpLevel
        const rank = (l: BumpLevel | undefined): number => (l ? BUMP_LEVELS.indexOf(l) + 1 : 0)
        if (rank(level) > rank(entry.bumpLevel)) entry.bumpLevel = level
        change.status = 'applied'
        change.resolution = `Bumped knowledge_version (${level})`
        continue
      }

      // The resolved bluepriNNt schema is passed to the mutation so a concept the
      // bluepriNNt does not declare is rejected when the mutation runs, not only by the
      // post-mutation validation. An add_element cannot be checked without it.
      let renameSchema: BlueprintSchema | undefined
      if (
        change.op === 'rename_element' ||
        change.op === 'add_element' ||
        change.op === 'update_field' ||
        change.op === 'update_concept_field'
      ) {
        renameSchema = await schemaFor(entry)
        if (!renameSchema && change.op === 'add_element') {
          return rejectPhase1(
            'BLUEPRINT_UNRESOLVED',
            change.target,
            `change "${change.id}": the bluepriNNt of model "${entry.modelSlug}" could not be resolved, so the concept cannot be checked`,
          )
        }
      }

      const mutationArgs = mutationArgsForChange(change, entry.model, renameSchema)

      const mutRes = coreApplyMutation(entry.model, change.op, mutationArgs, renameSchema)
      if (!mutRes.success) {
        return recordRejection(
          (mutRes.errors ?? []).map((e) => ({ ...e, code: 'MUTATION_FAILED' })),
          change.id,
          mutRes.warnings,
        )
      }

      // Record successful resolution annotation
      change.status = 'applied'
      if (change.op === 'remove_element') {
        const cascadedCount = mutRes.cascadedMatrixCells ?? (matrixCascades.get(change.id)?.length ?? 0)
        change.resolution = cascadedCount > 0
          ? `Removed element and cascaded ${cascadedCount} matrix cell(s)`
          : 'Removed element successfully'
      } else {
        change.resolution = 'Applied successfully'
      }

      // D20 removed: apply no longer writes a companion citation on the model (the change
      // is the only provenance). `add_element` still records the resolved slug.
      if (change.op === 'add_element') {
        const conceptName = (mutationArgs.conceptName as string) || change.concept
        if (conceptName) {
          const list = entry.model.elements.get(conceptName)
          if (list && list.length > 0) {
            const addedEl = list[list.length - 1]
            if (addedEl.slug) {
              change.resolved_slug = addedEl.slug
            }
          }
        }
      }
    }

    // Bump knowledge_version in frontmatter of touched models ONLY
    for (const [, entry] of loadedModels) {
      if (entry.mutated && !entry.created) {
        // One bump per touched model: the requested level when a bump_version change
        // asked for one, the default patch otherwise. Never both.
        if (entry.bumpLevel) {
          const requested = computeNewVersion(entry.baseVersion, { bump: entry.bumpLevel })
          if (!requested) {
            return recordRejection(
              [
                {
                  path: entry.modelSlug,
                  code: 'INVALID_VERSION',
                  message: `INVALID_VERSION: cannot bump "${entry.baseVersion}" of model "${entry.modelSlug}" by ${entry.bumpLevel}`,
                },
              ],
            )
          }
          entry.nextVersion = requested.version
        }
        entry.model.frontmatter.knowledge_version = entry.nextVersion
      }
    }

    // Schema validation across touched models ONLY
    for (const [, entry] of loadedModels) {
      if (!entry.mutated) continue
      let template: SpecDocument | null = null
      let resolveInclude: (ref: { name: string; url: string }) => string | null = () => null
      try {
        const r = await resolveBlueprintForKnowledge(rootDir, entry.model)
        template = r.template
        resolveInclude = r.resolveInclude
      } catch (err) {
        return {
          success: false,
          changesetPath: relChangesetPath,
          status: 'rejected',
          models: {},
          appliedCount: 0,
          errors: [{ path: entry.modelSlug, message: `Failed to resolve blueprint: ${err}` }],
        }
      }

      const valRes = coreValidate(entry.model, template, null, resolveInclude)
      if (!valRes.valid) {
        return recordRejection(
          valRes.errors.map((e) => ({ ...e, code: 'VALIDATION_FAILED' })),
          undefined,
          valRes.warnings,
          false,
        )
      }
    }

    // Placement gate (design A9, A12): an instance model this changeset touches must
    // sit where its concept's rule puts it, or the address it was just changed
    // through is already wrong. Compact models keep their behaviour unchanged.
    for (const [, entry] of loadedModels) {
      if (!entry.mutated || !entry.modelSlug.includes('/')) continue
      const parent = entry.model.frontmatter.parent_spec as { name?: string; url?: string } | undefined
      if (!parent?.name) continue
      const declarations = await loadDeclarations(rootDir, { name: parent.name, url: parent.url })
      if (!declarations) continue
      const elements: Array<{ concept: string; slug: string }> = []
      for (const [concept, nodes] of entry.model.elements) {
        for (const node of nodes) if (node.slug) elements.push({ concept, slug: node.slug })
      }
      // A moved instance is judged where it will live once Phase 2 renames it.
      const rel = relative(rootDir, entry.plannedPath ?? entry.filePath).replace(/\\/g, '/')
      const findings = fileLocalDiagnostics(
        { path: rel, frontmatter: entry.model.frontmatter, elements },
        declarations,
      ).filter((d) => d.severity === 'error')
      if (findings.length > 0) {
        return recordRejection(
          findings.map((d) => ({ path: rel, message: d.message, code: 'VALIDATION_FAILED' })),
          undefined,
          undefined,
          false,
        )
      }
    }

    // Proposal immutability (D1): the write-back must keep every normative line of every
    // change block byte-identical to the input. A difference aborts before Phase 2:
    // nothing is written and the lock is released (the surrounding finally).
    if (altersNormativeLines(rawChangeset, writeBack(recordedDocument()))) {
      return {
        success: false,
        changesetPath: relChangesetPath,
        status: 'rejected',
        models: {},
        appliedCount: 0,
        errors: [
          {
            path: relChangesetPath,
            message:
              'PROPOSAL_IMMUTABILITY_VIOLATION: the write-back would alter a normative line of a change block',
            code: 'PROPOSAL_IMMUTABILITY_VIOLATION',
          },
        ],
      }
    }

    // Phase 2: Atomic Persistence (touched models ONLY). No snapshot is written.
    const modelsTransitionMap: Record<string, ModelVersionTransition> = {}

    // A created model must still be absent: re-check inside the lock, before any write.
    for (const [, entry] of loadedModels) {
      if (!entry.created) continue
      if (await stat(entry.filePath).then(() => true, () => false)) {
        return rejectPhase1('MODEL_EXISTS', entry.modelSlug, `model "${entry.modelSlug}" appeared while the changeset was being applied`)
      }
    }

    // Pre-record original content of existing mutated models for full cross-model rollback (#188)
    const originalModelsBackup = new Map<string, string>()
    const persistedFiles = new Set<string>()
    /** Folders this run created, deepest last: a failed persist removes exactly these. */
    const createdDirectories: string[] = []
    const ensureDirectory = async (dir: string): Promise<void> => {
      const missing: string[] = []
      let current = dir
      for (;;) {
        const present = await stat(current).then((s) => s.isDirectory(), () => false)
        if (present) break
        missing.push(current)
        const parent = dirname(current)
        if (parent === current) break
        current = parent
      }
      for (const path of missing.reverse()) {
        await mkdir(path)
        createdDirectories.push(path)
      }
    }
    for (const [, entry] of loadedModels) {
      if (entry.mutated && !entry.created) {
        try {
          const content = await readFile(entry.filePath, 'utf-8')
          originalModelsBackup.set(entry.filePath, content)
        } catch {
          // If unreadable, not yet on disk
        }
      }
    }

    /** Moves this run performed, in order: rollback reverses them. */
    const performedMoves: Array<{ fromPath: string; toPath: string }> = []

    // A failure while persisting must rollback all touched models (created AND modified),
    // guaranteeing cross-model atomicity and leaving no orphan staging files (#188).
    const rollbackPersistence = async (): Promise<void> => {
      // 0. Reverse every folder/file relocation first, so the original content can be
      // installed at the original path (the moved id resolves again).
      for (const move of [...performedMoves].reverse()) {
        const oldDir = dirname(move.fromPath)
        const newDir = dirname(move.toPath)
        try {
          if (oldDir !== newDir) await rename(newDir, oldDir)
          const movedFile = oldDir === newDir ? move.toPath : join(oldDir, basename(move.toPath))
          if (movedFile !== move.fromPath) await rename(movedFile, move.fromPath)
        } catch (rollbackErr) {
          console.warn(`[apply-change] Failed to reverse the move of "${move.fromPath}": ${rollbackErr}`)
        }
      }
      // 1. Rollback created models (delete them and their staging files)
      for (const [, entry] of loadedModels) {
        if (!entry.created) continue
        const stem = displayStem(basename(entry.filePath))
        await rm(entry.filePath, { force: true }).catch(() => {})
        await rm(join(dirname(entry.filePath), `${stem}.tmp`), { force: true }).catch(() => {})
      }
      // 2. Rollback modified models that were already written to disk
      for (const [filePath, originalText] of originalModelsBackup) {
        if (!persistedFiles.has(filePath)) continue
        try {
          const stem = displayStem(basename(filePath))
          const stagingPath = join(dirname(filePath), `${stem}.rollback.tmp`)
          await writeAndSync(stagingPath, originalText)
          await persistAtomic(stagingPath, filePath)
        } catch (rollbackErr) {
          console.warn(`[apply-change] Failed to rollback model "${filePath}": ${rollbackErr}`)
        }
      }
      // 3. Clean up any remaining .tmp or .rollback.tmp files. A moved entry has
      // staged under the new path; both are cleaned so nothing survives.
      for (const [, entry] of loadedModels) {
        for (const filePath of [entry.filePath, entry.movedFrom, entry.plannedPath]) {
          if (!filePath) continue
          const stem = displayStem(basename(filePath))
          await rm(join(dirname(filePath), `${stem}.tmp`), { force: true }).catch(() => {})
          await rm(join(dirname(filePath), `${stem}.rollback.tmp`), { force: true }).catch(() => {})
        }
      }
      // 4. Remove the folders this run created, deepest first, and only when the
      // rollback left them empty: a folder that already held files stays.
      for (const path of [...createdDirectories].sort((a, b) => b.length - a.length)) {
        await rmdir(path).catch(() => {})
      }
    }

    try {
      // Relocate every moved model first: the folder rename carries descendants and
      // assets, and a slug change also renames the file stem (design A10).
      for (const plan of movePlans.values()) {
        const entry = loadedModels.get(plan.fromId.toLowerCase())
        if (!entry || entry.filePath === plan.toPath) continue
        const oldPath = entry.filePath
        const oldDir = dirname(oldPath)
        const newDir = dirname(plan.toPath)
        if (oldDir !== newDir) {
          await ensureDirectory(dirname(newDir))
          await rename(oldDir, newDir)
        }
        const relocated = oldDir === newDir ? oldPath : join(newDir, basename(oldPath))
        if (relocated !== plan.toPath) await rename(relocated, plan.toPath)
        performedMoves.push({ fromPath: oldPath, toPath: plan.toPath })
        entry.filePath = plan.toPath
        entry.movedFrom = oldPath
      }

      for (const [, entry] of loadedModels) {
        if (!entry.mutated) continue

        modelsTransitionMap[entry.movedTo ?? entry.modelSlug] = entry.created
          ? { result_version: entry.nextVersion }
          : { base_version: entry.baseVersion, result_version: entry.nextVersion }

        const modelFile = entry.filePath
        const modelStem = displayStem(basename(modelFile))
        const stagingPath = join(dirname(modelFile), `${modelStem}.tmp`)

        // An instance model may live in folders that do not exist yet (design A9).
        await ensureDirectory(dirname(modelFile))
        const serialized = serializeKnowledge(entry.model)
        await writeAndSync(stagingPath, serialized)
        await persistAtomic(stagingPath, modelFile)
        persistedFiles.add(modelFile)
        // A moved model was backed up under its OLD path: once the move is reversed
        // the rollback restores the original content there.
        if (entry.movedFrom) persistedFiles.add(entry.movedFrom)
      }
    } catch (err) {
      await rollbackPersistence()
      throw err
    }

    const createdModelIds = Array.from(loadedModels.values())
      .filter((entry) => entry.created)
      .map((entry) => entry.modelSlug)

    // Annotate changeset document
    const totalActionable = recordedChanges.filter((c) => !isNonMutating(c.op)).length
    const cleanAppliedCount = new Set(
      cleanSubset.filter((c) => !isNonMutating(c.op)).map((c) => recordedIdOf(c.id)),
    ).size
    const overallStatus: ChangeStatus = cleanAppliedCount === totalActionable ? 'applied' : 'partially_applied'

    const batchId = displayStem(basename(resolvedChangesetPath))
    csDoc.frontmatter.status = overallStatus
    csDoc.frontmatter.models = modelsTransitionMap
    // D5: denormalize the execution facts onto every change (excluded from the seal).
    // A later apply never sorts before an earlier one: clamp under the lock.
    const latest = await latestAppliedAt(changesDir)
    const nowMs = Date.now()
    const latestMs = latest ? Date.parse(latest) : Number.NaN
    const appliedAt =
      Number.isFinite(latestMs) && latestMs >= nowMs
        ? new Date(latestMs + 1).toISOString()
        : new Date(nowMs).toISOString()
    // Batch-wide facts are written once, in the frontmatter; every change inherits
    // them (`compactExecutionFacts` drops each equal per-change copy at write-back).
    csDoc.frontmatter.applied_at = appliedAt
    csDoc.frontmatter.batch = batchId
    const evidenceMap: Record<string, string> = {}
    // Execution facts: the canonical unit address and the evidence anchors, written
    // only for changes this run applied. Apply always overwrites them, so a proposal
    // that pre-carried them cannot influence the log.
    for (const change of csDoc.changes) {
      delete change.applied_at
      delete change.batch
      if (change.status !== 'applied') {
        delete change.resolved_target
        delete change.evidence_sha256
        continue
      }
      const { modelSlug } = parseTargetAddress(change.target)
      if (change.op === 'produce_artifact') {
        change.resolved_target = resolvedTarget.artifact(change.target)
      }
      const entry = loadedModels.get(modelSlug.toLowerCase())
      if (entry) {
        const target = resolvedTargetForChange(change, entry.model, canonicalUnitModelId(entry.modelSlug || modelSlug))
        if (target) change.resolved_target = target
        else delete change.resolved_target
      }
      const shas = await evidenceShas(rootDir, change.evidence)
      if (shas) {
        change.evidence_sha256 = shas
        evidencePaths(change.evidence)?.forEach((path, i) => {
          evidenceMap[path] ??= shas[i]!
        })
      } else delete change.evidence_sha256
    }
    if (Object.keys(evidenceMap).length > 0) csDoc.frontmatter.evidence_sha256 = evidenceMap
    else delete csDoc.frontmatter.evidence_sha256

    const serializedCs = writeBack(recordedDocument())
    try {
      const csStaging = join(dirname(resolvedChangesetPath), `${basename(resolvedChangesetPath)}.tmp`)
      await writeAndSync(csStaging, serializedCs)
      await persistAtomic(csStaging, resolvedChangesetPath)
    } catch (err) {
      await rollbackPersistence()
      throw err
    }

    return {
      success: true,
      changesetPath: relChangesetPath,
      changeset: relChangesetPath,
      status: overallStatus,
      models: modelsTransitionMap,
      appliedCount: cleanAppliedCount,
      conflictedCount: new Set(conflictedSubset.map((c) => recordedIdOf(c.id))).size,
      model: loadedModels.size === 1 ? loadedModels.values().next().value?.model : undefined,
      newPath: loadedModels.size === 1 ? loadedModels.values().next().value?.filePath : undefined,
      ...(createdModelIds.length > 0 ? { createdModels: createdModelIds } : {}),
    }
  } finally {
    await lockHandle.release()
  }
}

async function synthesizeAndExecuteChangeset(
  rootDir: string,
  id: string,
  op: string,
  opArgs: Record<string, unknown>,
): Promise<ApplyChangeResult> {
  // `id` is interpolated into a filename below; it must be a safe workspace-relative
  // identifier (no `..`, no absolute/drive-qualified path) or it escapes `changes/`.
  if (!isSafeRelativeId(id)) {
    return {
      success: false,
      errors: [{ path: id, message: 'Invalid knowledge id: must be a safe workspace-relative path' }],
    }
  }
  let target = id
  if (op === 'update_field') {
    const el = (opArgs.elementName as string) || (opArgs.slug as string) || ''
    const field = (opArgs.fieldName as string) || ''
    target = `${id}@${el}&${field}`
  } else if (op === 'add_element') {
    const concept = (opArgs.conceptName as string) || ''
    target = `${id}@${concept}`
  } else if (op === 'update_matrix_cell') {
    const m = (opArgs.matrixName as string) || (opArgs.matrixSlug as string) || ''
    const r = (opArgs.row as string) || ''
    const c = (opArgs.col as string) || ''
    target = `${id}@${m}&${r}&${c}`
  } else if (op === 'rename_element') {
    const el = (opArgs.elementName as string) || (opArgs.slug as string) || ''
    target = `${id}@${el}`
  } else if (op === 'remove_element') {
    const el = (opArgs.elementName as string) || (opArgs.slug as string) || ''
    target = `${id}@${el}`
  } else if (op === 'rename_concept') {
    const c = (opArgs.conceptName as string) || ''
    target = `${id}@${c}`
  } else if (op === 'update_concept_field') {
    const c = (opArgs.conceptName as string) || ''
    const field = (opArgs.fieldName as string) || ''
    target = `${id}@concept:${c}&${field}`
  } else if (op === 'update_element_text') {
    const el = (opArgs.elementName as string) || (opArgs.slug as string) || ''
    target = `${id}@${el}`
  } else if (op === 'remove_matrix') {
    const m = (opArgs.matrixName as string) || ''
    target = `${id}@matrix:${m}`
  } else if (op === 'add_matrix') {
    const m = (opArgs.matrixName as string) || (opArgs.name as string) || ''
    target = `${id}@matrix:${m}`
  } else if (op === 'bump_version' || op === 'freeze_slugs') {
    target = id
  } else if (opArgs.target && typeof opArgs.target === 'string') {
    target = opArgs.target.includes('@') ? opArgs.target : `${id}@${opArgs.target}`
  }

  const isAddMatrix = op === 'add_matrix'
  // add_matrix seeds its headers through the sealed `seed`, never `fields`.
  const asSeedList = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.map((v) => String(v).trim()).filter(Boolean)
      : String(value)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
  const matrixSeed: { columns?: string[]; rows?: string[] } | undefined = isAddMatrix
    ? {
        ...(opArgs.columns !== undefined ? { columns: asSeedList(opArgs.columns) } : {}),
        ...(opArgs.rows !== undefined ? { rows: asSeedList(opArgs.rows) } : {}),
      }
    : undefined

  // A change carries no inline fields: the direct add_element op cannot express them.
  if (!isAddMatrix && op === 'add_element' && opArgs.fields !== undefined) {
    return {
      success: false,
      errors: [
        {
          path: 'fields',
          code: 'INVALID_OPERATION',
          message:
            'INVALID_OPERATION: add_element must not carry inline fields; call update_field once per field, or propose a changeset with one set_fields change for the fields that share one evidence',
        },
      ],
    }
  }

  const changeItem: ChangeItem = {
    id: 'c-01',
    op: op as ChangeItem['op'],
    target,
    from: opArgs.from !== undefined ? String(opArgs.from) : undefined,
    to: isAddMatrix
      ? ((opArgs.targetConcept as string) || (opArgs.to as string) || undefined)
      : op === 'bump_version'
        ? String(opArgs.bump ?? 'patch')
        : opArgs.value !== undefined
          ? String(opArgs.value)
          : opArgs.to !== undefined
            ? String(opArgs.to)
            : opArgs.text !== undefined
              ? String(opArgs.text)
              : (opArgs.newName as string | undefined),
    concept: isAddMatrix ? (opArgs.source as string) || undefined : (opArgs.conceptName as string) || undefined,
    name: isAddMatrix
      ? (opArgs.matrixName as string) || (opArgs.name as string) || undefined
      : (opArgs.newName as string) || (opArgs.elementName as string) || undefined,
    slug: (opArgs.slug as string) || undefined,
    seed: matrixSeed && Object.keys(matrixSeed).length > 0 ? matrixSeed : undefined,
    author: (opArgs.author as string) || 'agent',
    notes: (opArgs.rationale as string) || undefined,
  }

  const written = await writeProposedChangeset(rootDir, {
    changes: [changeItem],
    title: `Synthesized change: ${op}`,
    author: (opArgs.author as string) || 'agent',
  })
  return executeChangesetApply(rootDir, written.path)
}

/**
 * Direct operations that never touch Level-3 content: `generate_index` regenerates the
 * index of a Level-2 bluepriNNt (a Level-3 model is refused). Every operation that
 * mutates a Level-3 kNNowledge model, `freeze_slugs` and `bump_version` included, is a
 * changeset operation, so it is sealed, recorded, versioned and citable.
 * (`bump_version` on a Level-2 bluepriNNt is the one direct exception: bluepriNNts are
 * traced by git and their own `blueprint_version`.)
 */
export const MAINTENANCE_OPS = ['generate_index'] as const

/**
 * Direct operations: Level-2 bluepriNNt authoring (traced by git and the bluepriNNt version).
 * They have no meaning on a Level-3 model, where they fail `SCHEMA_OP_ON_LEVEL3`.
 */
export const SCHEMA_OPS = ['add_concept', 'add_field'] as const

function isDirectOperation(op: string): boolean {
  return (MAINTENANCE_OPS as readonly string[]).includes(op) || (SCHEMA_OPS as readonly string[]).includes(op)
}

/**
 * Apply an intent-level change or changeset to a model.
 */
export async function applyChange(
  rootDir: string,
  idOrChangesetPath: string,
  op?: string,
  args?: Record<string, unknown>,
): Promise<ApplyChangeResult> {
  if (!op || idOrChangesetPath.endsWith('_changes_NN.md') || idOrChangesetPath.startsWith('changes/')) {
    return executeChangesetApply(rootDir, idOrChangesetPath)
  }

  const id = idOrChangesetPath
  const opArgs = args || {}

  if (op === 'bump_version') {
    let filePath: string | null = null
    try {
      filePath = await findKnowledgeFile(rootDir, id)
    } catch (err) {
      if (err instanceof ModelIdError) {
        return { success: false, errors: [{ path: '', message: err.message }] }
      }
      throw err
    }
    if (!filePath) {
      return { success: false, errors: [{ path: '', message: `Model not found: ${id}` }] }
    }
    const model = await loadKnowledge(filePath)
    const parent = model.frontmatter.parent_spec as { name?: string } | undefined
    if (model.frontmatter.level === 2) {
      return bumpBlueprintVersion(rootDir, filePath, model, opArgs)
    }
    if (opArgs.version !== undefined) {
      return {
        success: false,
        errors: [
          {
            path: 'version',
            code: 'INVALID_BUMP_LEVEL',
            message: 'INVALID_BUMP_LEVEL: a level-3 bump_version takes a level ({ bump: "patch" | "minor" | "major" }), not an explicit version',
          },
        ],
      }
    }
    return synthesizeAndExecuteChangeset(rootDir, id, op, opArgs)
  }

  if (op === 'generate_index') {
    let filePath: string | null = null
    try {
      filePath = await findKnowledgeFile(rootDir, id)
    } catch (err) {
      if (err instanceof ModelIdError) {
        return { success: false, errors: [{ path: '', message: err.message }] }
      }
      throw err
    }
    if (!filePath) {
      return { success: false, errors: [{ path: '', message: `Model not found: ${id}` }] }
    }
    const model = await loadKnowledge(filePath)
    if (model.frontmatter.level === 3) {
      return {
        success: false,
        errors: [
          {
            path: 'frontmatter.level',
            message: `generate_index does not apply to a level-3 model (${id}): the level-2 blueprint owns the index`,
          },
        ],
      }
    }
    try {
      const { template: idxBlueprint, resolveInclude: idxInclude } = await resolveBlueprintForKnowledge(
        rootDir,
        model,
      )
      if (idxBlueprint) {
        const { schema } = resolveBlueprintSchema(idxBlueprint.rawContent, idxInclude)
        opArgs.taxonomy = schema.taxonomy.length
          ? schema.taxonomy
          : parseKnowledge(idxBlueprint.rawContent).taxonomy
      }
    } catch (err) {
      console.warn(`[apply-change] Index template resolution failed; using model taxonomy: ${err}`)
    }
    const mutRes = coreApplyMutation(model, op, opArgs)
    if (!mutRes.success) return mutRes
    await saveKnowledge(filePath, model)
    return { success: true, model, newPath: filePath }
  }

  // add_model creates a model and needs a bluepriNNt: it exists only inside a changeset.
  if (op === 'add_model') {
    return {
      success: false,
      errors: [
        {
          path: 'op',
          code: 'ADD_MODEL_REQUIRES_CHANGESET',
          message:
            'ADD_MODEL_REQUIRES_CHANGESET: add_model is only valid inside a changeset; use propose_changeset or init_knowledge',
        },
      ],
    }
  }

  // set_fields is a recorded multi-field change: a bare call has the single-field
  // update_field, so the op exists only inside a changeset.
  if (op === 'set_fields') {
    return {
      success: false,
      errors: [
        {
          path: 'op',
          code: 'SET_FIELDS_REQUIRES_CHANGESET',
          message:
            'SET_FIELDS_REQUIRES_CHANGESET: set_fields is only valid inside a changeset; use propose_changeset, or update_field for one field',
        },
      ],
    }
  }

  // extract_instance creates a model and cuts another one: an unrecorded cut is
  // exactly the drift the migration exists to avoid (design A11).
  if (op === 'extract_instance') {
    return {
      success: false,
      errors: [
        {
          path: 'op',
          code: 'EXTRACT_INSTANCE_REQUIRES_CHANGESET',
          message:
            'EXTRACT_INSTANCE_REQUIRES_CHANGESET: extract_instance migrates a compact element into its own model and is only valid inside a changeset; use propose_changeset',
        },
      ],
    }
  }

  // Direct operations are a closed, classified set. Maintenance and schema operations
  // alter no Level-3 content, so they run straight against the engine and leave no
  // changeset. Anything that is neither a ChangeOp nor in those lists is rejected.
  if (!isChangeOp(op)) {
    if (!isDirectOperation(op)) {
      return {
        success: false,
        errors: [
          {
            path: 'op',
            code: 'UNKNOWN_OPERATION',
            message: `UNKNOWN_OPERATION: "${op}" is neither a changeset operation, a maintenance operation (${MAINTENANCE_OPS.join(', ')}) nor a schema operation (${SCHEMA_OPS.join(', ')})`,
          },
        ],
      }
    }
    const filePath = await findKnowledgeFile(rootDir, id, { includeSpecs: true })
    if (!filePath) {
      return { success: false, errors: [{ path: '', message: `Model not found: ${id}` }] }
    }
    const model = await loadKnowledge(filePath)
    if (model.frontmatter.level === 3) {
      return {
        success: false,
        errors: [
          {
            path: 'frontmatter.level',
            code: 'SCHEMA_OP_ON_LEVEL3',
            message: `SCHEMA_OP_ON_LEVEL3: ${op} authors bluepriNNt primitives and has no meaning on the level-3 model "${id}"; target the parent bluepriNNt, or use add_element/update_field on the model`,
          },
        ],
      }
    }
    const mutRes = coreApplyMutation(model, op, opArgs)
    if (!mutRes.success) return mutRes
    await saveKnowledge(filePath, model)
    return { success: true, model, newPath: filePath }
  }

  return synthesizeAndExecuteChangeset(rootDir, id, op, opArgs)
}
