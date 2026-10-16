import { readFile, writeFile, rm, stat, rename, readdir, mkdir } from 'node:fs/promises'
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
  rewriteFieldCitation,
  resolveBatchSlugs,
  evaluateBatchDeleteImpact,
  partitionChangeset,
  formatUtcStamp,
  isChangeOp,
  isBumpLevel,
  BUMP_LEVELS,
  createFsSourceResolver,
  resolveCitation,
  scaffoldKnowledgeDocument,
  RECORD_BLUEPRINT,
} from '@cognnitive/innfo-core'
import type {
  SpecDocument,
  ParsedKnowledge,
  BlueprintSchema,
  ChangesetDocument,
  ChangeItem,
  ModelVersionTransition,
  ChangeStatus,
  BumpLevel,
} from '@cognnitive/innfo-core'
import { findKnowledgeFile, resolveBlueprintWithCache, normalizeId } from './spec.js'
import { writeProposedChangeset } from './propose-changeset.js'

import { isInsideRoot, isSafeRelativeId } from './path-guard.js'

import { loadKnowledge, saveKnowledge, resolveBlueprintForKnowledge } from './knowledge-io.js'
import { DEFAULT_WORKSPACE_IGNORE, validateBlueprint } from './validate.js'

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
 * Replaces `livePath` with the already-written `stagingPath` by an atomic rename.
 * The live file is never removed, moved or copied first, so at every instant (and
 * after a crash) the live path holds a complete model — the old one or the new one.
 * If the rename fails, the staging file is removed and the live file is untouched.
 */
async function persistAtomic(stagingPath: string, livePath: string): Promise<void> {
  try {
    await rename(stagingPath, livePath)
  } catch (err) {
    await rm(stagingPath, { force: true })
    throw err
  }
}

/** Execution annotation keys: the only per-change lines apply may rewrite. */
const ANNOTATION_LINE_RE = /^(status|resolution|resolved_slug|replaced_sources)::/

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
    if (parent?.name === RECORD_BLUEPRINT) {
      return {
        code: 'RECORD_UNVERSIONED',
        message: 'The lineage record is unversioned by design and cannot be bumped',
      }
    }
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

function parseTargetAddress(target: string): {
  modelSlug: string
  remainder: string
  parts: string[]
} {
  const atIdx = target.indexOf('@')
  if (atIdx === -1) {
    return { modelSlug: target.trim(), remainder: '', parts: [] }
  }
  const modelSlug = target.slice(0, atIdx).trim()
  const remainder = target.slice(atIdx + 1).trim()
  const parts = remainder.split('&').map((p) => p.trim())
  return { modelSlug, remainder, parts }
}

function findElementInModel(
  model: ParsedKnowledge,
  conceptName?: string,
  elementIdent?: string,
): { concept: string; element: any } | null {
  if (!elementIdent) return null
  const lowerIdent = elementIdent.toLowerCase()
  if (conceptName) {
    const list = model.elements.get(conceptName)
    if (list) {
      for (const el of list) {
        if (el.name.toLowerCase() === lowerIdent || (el.slug && el.slug.toLowerCase() === lowerIdent)) {
          return { concept: conceptName, element: el }
        }
      }
    }
  }
  for (const [c, list] of model.elements.entries()) {
    for (const el of list) {
      if (el.name.toLowerCase() === lowerIdent || (el.slug && el.slug.toLowerCase() === lowerIdent)) {
        return { concept: c, element: el }
      }
    }
  }
  return null
}

/**
 * Execute a two-phase apply of a changeset file: an in-memory compute/validate
 * phase (no writes) followed by a persist phase that rewrites each touched model
 * through an atomic rename. No snapshot of the prior model is kept: history is the
 * changeset chain plus each change's `replaced_sources`. Mutual exclusion is
 * guaranteed via changes/.lock. Persistence is not atomic across models — a
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
  // not prove containment — `join(root, '../..')` and absolute paths outside the
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

    // Persist a rejection that is intrinsic to the proposal (a malformed operation or
    // add_model, a mutation that can never apply as written). The write-back starts from
    // the raw text, so in-memory execution annotations of this run never leak into the
    // file. Causes that depend on workspace state (an unresolved citation, a failed
    // validation) and environment or integrity failures (tamper, lock, immutability,
    // missing model or bluepriNNt) are returned as `rejected` but NOT recorded: the file
    // stays `proposed` and can be retried once the workspace changes.
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
        const target = changeId ? fresh.changes.find((c) => c.id === changeId) : undefined
        if (target) {
          target.status = 'rejected'
          target.resolution = reason
        }
        const text = serializeChangeset(fresh)
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

    // 3. Verify proposal_sha (tamper detection). A draft that arrives WITHOUT a
    // seal (e.g. the console review export) is stamped at intake: the engine
    // owns the canonical hash, so producers never duplicate it. A seal that IS
    // present but does not match the body is a tampered proposal and is rejected —
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
      csDoc.frontmatter.proposal_sha = computeProposalSha(csDoc.changes)
    }
    if (!csDoc.frontmatter.proposal_sha) {
      csDoc.frontmatter.proposal_sha = computeProposalSha(csDoc.changes)
    }
    if (!verifyProposalSha(csDoc)) {
      if (csDoc.frontmatter.status === 'conflict') {
        csDoc.frontmatter.proposal_sha = computeProposalSha(csDoc.changes)
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
                'The changeset was edited after validation — review the annotated resolutions and ' +
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
        const modelFile = await findKnowledgeFile(rootDir, modelSlug)
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

    // 4b. Proposal-time evidence citation (D3): a change's `sources` is written by the
    // proposer and sealed with the proposal; apply only verifies that every citation
    // resolves. One unresolved citation rejects the whole changeset, writes nothing and
    // releases the lock — the same all-or-nothing shape as PROPOSAL_TAMPERED.
    const citationResolver = createFsSourceResolver(rootDir)
    for (const change of csDoc.changes) {
      if (!change.sources) continue
      const resolved = resolveCitation(
        change.sources,
        'sources',
        citationResolver,
        resolvedChangesetPath,
      )
      if (!resolved.exists || resolved.error === 'UNKNOWN_ANCHOR' || resolved.error === 'MALFORMED') {
        return recordRejection(
          [
            {
              path: `changes.${change.id}.sources`,
              message:
                `CITATION_UNRESOLVED: change "${change.id}" cites "${change.sources}" ` +
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

    // add_model pre-checks: ordering, duplicates, existing targets, domain layout.
    const addModelIndex = new Map<string, number>()
    const existingAddModelIds = new Set<string>()
    const blockedChanges = new Map<string, { code: string; message: string }>()
    for (const [index, change] of csDoc.changes.entries()) {
      if (change.op !== 'add_model') continue
      const key = change.target.toLowerCase()
      if (!isSafeRelativeId(change.target) || /[\\/]/.test(change.target)) {
        return rejectProposal('ADD_MODEL_INVALID_TARGET', change.target, `change "${change.id}" has an unsafe model id "${change.target}"`, change.id)
      }
      if (addModelIndex.has(key)) {
        return rejectProposal('ADD_MODEL_DUPLICATE', change.target, `more than one add_model change targets "${change.target}"`, change.id)
      }
      addModelIndex.set(key, index)
    }
    for (const [index, change] of csDoc.changes.entries()) {
      if (change.op === 'comment' || change.op === 'add_model') continue
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
    let needsKnowledgeDir = false
    for (const change of csDoc.changes) {
      if (change.op !== 'add_model') continue
      const key = change.target.toLowerCase()
      if (await findKnowledgeFile(rootDir, change.target)) {
        existingAddModelIds.add(key)
        blockedChanges.set(change.id, {
          code: 'MODEL_EXISTS',
          message: `MODEL_EXISTS: model "${change.target}" already exists; add_model never overwrites or repairs a model`,
        })
        for (const other of csDoc.changes) {
          if (other.id === change.id || other.op === 'comment') continue
          if (parseTargetAddress(other.target).modelSlug.toLowerCase() !== key) continue
          blockedChanges.set(other.id, {
            code: 'DEPENDS_ON_CONFLICTED_CHANGE',
            message: `DEPENDS_ON_CONFLICTED_CHANGE: change "${other.id}" depends on add_model change "${change.id}", which conflicted`,
          })
        }
      } else {
        needsKnowledgeDir = true
      }
    }
    if (needsKnowledgeDir) {
      const kDir = await stat(join(rootDir, 'kNNowledge')).catch(() => null)
      if (!kDir || !kDir.isDirectory()) {
        return rejectPhase1('DOMAIN_LAYOUT_INVALID', 'kNNowledge', 'the domain has no kNNowledge/ directory to create models in')
      }
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
      if (change.op === 'comment') continue
      const { modelSlug } = parseTargetAddress(change.target)
      if (!modelSlug) continue
      // A model whose add_model conflicted is never loaded: nothing may touch it.
      if (existingAddModelIds.has(modelSlug.toLowerCase())) continue

      if (change.op === 'add_model') {
        const cleanId = normalizeId(change.target)
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
        })
        const filePath = join(rootDir, 'kNNowledge', `${cleanId}_NN.md`)
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
        const modelFile = await findKnowledgeFile(rootDir, modelSlug)
        if (!modelFile) {
          return {
            success: false,
            changesetPath: relChangesetPath,
            status: 'rejected',
            models: {},
            appliedCount: 0,
            errors: [{ path: change.target, message: `Model not found: ${modelSlug}` }],
          }
        }
        const model = await loadKnowledge(modelFile)
        const baseVersion = String(
          model.frontmatter.knowledge_version ?? model.frontmatter.blueprint_version ?? 'V_0-1-0',
        )
        const nextVer = computeNewVersion(baseVersion, { bump: 'patch' })
        const nextVersion = nextVer ? nextVer.version : 'V_0-1-1'

        loadedModels.set(modelSlug.toLowerCase(), {
          modelSlug,
          filePath: modelFile,
          model,
          baseVersion,
          nextVersion,
          mutated: false,
          created: false,
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
    // as proposed — no re-seal here, or the on-disk seal would no longer match its body.

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

    // All-Conflicted Exit Guard (D10): Zero model writes, zero snapshots
    const actionableClean = cleanSubset.filter((c) => c.op !== 'comment')
    if (actionableClean.length === 0 && conflictedSubset.length > 0) {
      for (const change of csDoc.changes) {
        if (change.op === 'comment') continue
        change.status = 'conflict'
        const diag = conflictDiagnostics.get(change.id)
        change.resolution = diag ? diag.message : (change.resolution || 'Precondition failed')
      }
      csDoc.frontmatter.status = 'conflict'
      csDoc.frontmatter.applied_at = new Date().toISOString()
      const serializedCs = serializeChangeset(csDoc)
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
        conflictedCount: conflictedSubset.length,
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

    // Apply mutations for clean subset in memory
    for (const change of cleanSubset) {
      if (change.op === 'comment') continue
      const { modelSlug, parts, remainder } = parseTargetAddress(change.target)
      const entry = loadedModels.get(modelSlug.toLowerCase())
      if (!entry) continue

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
      if (change.op === 'rename_element' || change.op === 'add_element') {
        renameSchema = await schemaFor(entry)
        if (!renameSchema && change.op === 'add_element') {
          return rejectPhase1(
            'BLUEPRINT_UNRESOLVED',
            change.target,
            `change "${change.id}": the bluepriNNt of model "${entry.modelSlug}" could not be resolved, so the concept cannot be checked`,
          )
        }
      }

      let mutationArgs: Record<string, unknown> = {}
      if (change.op === 'update_field') {
        const elIdent = parts[0]
        const fieldIdent = parts.length > 1 ? parts[1] : ''
        mutationArgs = {
          elementName: elIdent,
          fieldName: fieldIdent,
          value: change.to,
          to: change.to,
          target: change.target,
        }
      } else if (change.op === 'add_element') {
        const conceptName = change.concept || (remainder && !remainder.includes('&') ? remainder : '')
        const elementName = change.name || change.slug || ''
        mutationArgs = {
          conceptName,
          elementName,
          slug: change.resolved_slug || change.slug,
          description: change.notes || '',
        }
        if (change.fields) {
          Object.assign(mutationArgs, change.fields)
        }
        // Use the declared spelling of the concept (matching is case-insensitive).
        const declaredConcept = renameSchema?.concepts.find(
          (c) => c.name.toLowerCase() === String(conceptName).toLowerCase(),
        )
        if (declaredConcept) mutationArgs.conceptName = declaredConcept.name
      } else if (change.op === 'update_matrix_cell') {
        mutationArgs = {
          // The console emits the matrix display name (`Concept 1-Concept 2
          // Matrix`), not a slug. Pass it as BOTH: `matchesMatrix` accepts an
          // exact name or a slugified name/slug, so name and slug targets both
          // resolve.
          matrixName: parts[0],
          matrixSlug: parts[0],
          row: parts[1],
          col: parts[2],
          value: change.to,
          to: change.to,
        }
      } else if (change.op === 'remove_element') {
        const elIdent = change.name || parts[0] || remainder
        let conceptName = change.concept
        if (!conceptName) {
          const found = findElementInModel(entry.model, undefined, elIdent)
          conceptName = found?.concept
        }
        mutationArgs = { conceptName, elementName: elIdent }
      } else if (change.op === 'rename_element') {
        const elIdent = parts[0] || remainder
        let conceptName = change.concept
        if (!conceptName) {
          const found = findElementInModel(entry.model, undefined, elIdent)
          conceptName = found?.concept
        }
        mutationArgs = {
          conceptName,
          elementName: elIdent,
          newName: change.name || change.to,
        }
      } else if (change.op === 'rename_concept') {
        const conceptName = change.concept || remainder
        mutationArgs = { conceptName, newName: change.name || change.to }
      } else if (change.op === 'update_concept_text') {
        const conceptName = change.concept || remainder
        mutationArgs = {
          conceptName,
          text: change.to || (change as any).text || (change as any).content || '',
        }
      } else {
        mutationArgs = { target: change.target, value: change.to, to: change.to }
      }

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

      // Citation rewriting per D20
      const citationRef = `${relChangesetPath}@## NN Change: ${change.id}`
      if (change.op === 'update_field') {
        const elIdent = parts[0]
        const fieldIdent = parts.length > 1 ? parts[1] : ''
        const found = findElementInModel(entry.model, change.concept, elIdent)
        if (found) {
          const replaced = rewriteFieldCitation(found.element, fieldIdent, citationRef)
          // D3: keep the replaced citation in the change's execution annotation so the
          // lineage walk reaches the field's previous origin without a model snapshot.
          if (replaced !== undefined) {
            change.replaced_sources = replaced
          }
        }
      } else if (change.op === 'add_element') {
        const conceptName = (mutationArgs.conceptName as string) || change.concept
        if (conceptName) {
          const list = entry.model.elements.get(conceptName)
          if (list && list.length > 0) {
            const addedEl = list[list.length - 1]
            if (addedEl.slug) {
              change.resolved_slug = addedEl.slug
            }
            rewriteFieldCitation(addedEl, 'sources', citationRef)
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

    // Proposal immutability (D1): the write-back must keep every normative line of every
    // change block byte-identical to the input. A difference aborts before Phase 2:
    // nothing is written and the lock is released (the surrounding finally).
    if (altersNormativeLines(rawChangeset, serializeChangeset(csDoc))) {
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

    // A failure while persisting must not strand models this run created: without a changeset
    // annotation a replay would hit MODEL_EXISTS forever. Pre-existing models are never removed.
    const rollbackCreatedModels = async (): Promise<void> => {
      for (const [, entry] of loadedModels) {
        if (!entry.created) continue
        const stem = displayStem(basename(entry.filePath))
        await rm(entry.filePath, { force: true }).catch(() => {})
        await rm(join(dirname(entry.filePath), `${stem}.tmp`), { force: true }).catch(() => {})
      }
    }

    try {
      for (const [, entry] of loadedModels) {
        if (!entry.mutated) continue

        modelsTransitionMap[entry.modelSlug] = entry.created
          ? { result_version: entry.nextVersion }
          : { base_version: entry.baseVersion, result_version: entry.nextVersion }

        const modelFile = entry.filePath
        const modelStem = displayStem(basename(modelFile))
        const stagingPath = join(dirname(modelFile), `${modelStem}.tmp`)

        const serialized = serializeKnowledge(entry.model)
        await writeFile(stagingPath, serialized, 'utf-8')
        await persistAtomic(stagingPath, modelFile)

        if (
          csDoc.changes.some(
            (c) =>
              c.op === 'rename_element' &&
              parseTargetAddress(c.target).modelSlug.toLowerCase() === entry.modelSlug.toLowerCase(),
          )
        ) {
          for (const c of csDoc.changes) {
            if (c.op === 'rename_element') {
              try {
                const modelDir = dirname(modelFile)
                const oldSlug = parseTargetAddress(c.target).parts[0].toLowerCase().replace(/[^a-z0-9-]/g, '_')
                const newSlug = (c.name || c.to || '').toLowerCase().replace(/[^a-z0-9-]/g, '_')
                const oldAssetDir = join(modelDir, 'assets', oldSlug)
                const newAssetDir = join(modelDir, 'assets', newSlug)
                const st = await stat(oldAssetDir).catch(() => null)
                if (st && st.isDirectory()) {
                  await rename(oldAssetDir, newAssetDir)
                }
              } catch (err) {
                console.warn(`[apply-change] Asset dir rename failed: ${err}`)
              }
            }
          }
        }
      }
    } catch (err) {
      await rollbackCreatedModels()
      throw err
    }

    const createdModelIds = Array.from(loadedModels.values())
      .filter((entry) => entry.created)
      .map((entry) => entry.modelSlug)

    // Annotate changeset document
    const totalActionable = csDoc.changes.filter((c) => c.op !== 'comment').length
    const cleanAppliedCount = cleanSubset.filter((c) => c.op !== 'comment').length
    const overallStatus: ChangeStatus = cleanAppliedCount === totalActionable ? 'applied' : 'partially_applied'

    csDoc.frontmatter.status = overallStatus
    csDoc.frontmatter.applied_at = new Date().toISOString()
    csDoc.frontmatter.models = modelsTransitionMap

    const serializedCs = serializeChangeset(csDoc)
    try {
      await writeFile(resolvedChangesetPath, serializedCs, 'utf-8')
    } catch (err) {
      await rollbackCreatedModels()
      throw err
    }

    return {
      success: true,
      changesetPath: relChangesetPath,
      changeset: relChangesetPath,
      status: overallStatus,
      models: modelsTransitionMap,
      appliedCount: cleanAppliedCount,
      conflictedCount: conflictedSubset.length,
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
  } else if (op === 'bump_version' || op === 'freeze_slugs') {
    target = id
  } else if (opArgs.target && typeof opArgs.target === 'string') {
    target = opArgs.target.includes('@') ? opArgs.target : `${id}@${opArgs.target}`
  }

  const changeItem: ChangeItem = {
    id: 'c-01',
    op: op as ChangeItem['op'],
    target,
    from: opArgs.from !== undefined ? String(opArgs.from) : undefined,
    to:
      op === 'bump_version'
        ? String(opArgs.bump ?? 'patch')
        : opArgs.value !== undefined
          ? String(opArgs.value)
          : opArgs.to !== undefined
            ? String(opArgs.to)
            : (opArgs.newName as string | undefined),
    concept: (opArgs.conceptName as string) || undefined,
    name: (opArgs.newName as string) || (opArgs.elementName as string) || undefined,
    slug: (opArgs.slug as string) || undefined,
    fields: (opArgs.fields as Record<string, string>) || undefined,
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
export const SCHEMA_OPS = ['add_concept', 'add_field', 'set_marker'] as const

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
    const filePath = await findKnowledgeFile(rootDir, id)
    if (!filePath) {
      return { success: false, errors: [{ path: '', message: `Model not found: ${id}` }] }
    }
    const model = await loadKnowledge(filePath)
    const parent = model.frontmatter.parent_spec as { name?: string } | undefined
    if (model.frontmatter.level === 2) {
      return bumpBlueprintVersion(rootDir, filePath, model, opArgs)
    }
    if (parent?.name === RECORD_BLUEPRINT) {
      return {
        success: false,
        errors: [
          {
            path: 'frontmatter',
            message: `The lineage record is unversioned by design and cannot be bumped: ${id}`,
          },
        ],
      }
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
    const filePath = await findKnowledgeFile(rootDir, id)
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
    const filePath = await findKnowledgeFile(rootDir, id)
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
