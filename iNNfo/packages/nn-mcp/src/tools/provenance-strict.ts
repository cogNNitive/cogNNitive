/**
 * Strict provenance for `check_domain {strict: true}` (change-provenance: Strict
 * mode).
 *
 * Fold mode (S2a) compares the applied changes with the file unit by unit and
 * ignores formatting. Strict mode rebuilds the model from its `add_model`
 * skeleton and replays every applied change through `replayMutations`, then
 * compares the serialized BODY of the result with the serialized body of the
 * file. A hand edit of a single byte — including whitespace between fields — is
 * therefore drift in strict mode and not in fold mode.
 *
 * Frontmatter is excluded: `knowledge_version` is bump-driven, and the replay does
 * not reproduce version bumps. A model with no applied `add_model` change cannot
 * be rebuilt and is not strictly checked; evidence diagnostics (`EVIDENCE_UNKNOWN`,
 * `EVIDENCE_SOURCE_CHANGED`) come from the same fold pass in both modes.
 */
import { readFile } from 'node:fs/promises'
import {
  buildChangeLog,
  canonicalUnitModelId,
  checkProvenance,
  parseChangeset,
  parseKnowledge,
  readLineageSnapshot,
  replayMutations,
  resolveBlueprintSchema,
  scaffoldKnowledgeDocument,
  serializeKnowledge,
  slugifyHeading,
  type ChangeItem,
  type FileSnapshot,
  type LoggedChange,
  type ModelId,
  type ParsedKnowledge,
  type ProvenanceDiagnostic,
  type ProvenanceModel,
  type ProvenanceReport,
} from '@cognnitive/nn-core'
import { listKnowledge } from './list-read.js'
import { resolveBlueprintWithCache } from './spec.js'
import { mutationArgsForChange } from './change-args.js'
import { collectProvenanceModels } from './provenance-models.js'

export interface StrictProvenanceOptions {
  strict?: boolean
  /** Current sha256 of a cited file, for `EVIDENCE_SOURCE_CHANGED`. */
  sha256?: (path: string) => string | undefined
}

/**
 * Ops the replay does not run: they write no body. `move_model` is here because
 * the replay skeleton is already built under the model's CURRENT id, which is
 * what the move produced (design A10); the identity chain carries it.
 */
const NON_REPLAY_OPS = new Set(['add_model', 'bump_version', 'comment', 'produce_artifact', 'move_model'])

const EVIDENCE_CODES = new Set(['EVIDENCE_UNKNOWN', 'EVIDENCE_SOURCE_CHANGED'])

/** The model id a change contributes to (`resolved_target` when stamped). */
function modelOfChange(change: LoggedChange): string {
  const unit = change.resolvedTarget ?? change.target
  const at = unit.indexOf('@')
  return canonicalUnitModelId(at === -1 ? unit : unit.slice(0, at))
}

/** Every level-3 model of the workspace, as the drift check needs it. */
export { collectProvenanceModels } from './provenance-models.js'

/** The serialized document body: everything after the closing frontmatter fence. */
export function bodyOf(serialized: string): string {
  if (!serialized.startsWith('---')) return serialized
  const end = serialized.indexOf('\n---', 3)
  if (end === -1) return serialized
  const bodyStart = serialized.indexOf('\n', end + 4)
  return bodyStart === -1 ? '' : serialized.slice(bodyStart + 1)
}

function firstDifference(expected: string, actual: string): { expected: string; actual: string } {
  const expectedLines = expected.split('\n')
  const actualLines = actual.split('\n')
  const max = Math.max(expectedLines.length, actualLines.length)
  for (let i = 0; i < max; i++) {
    if ((expectedLines[i] ?? '') === (actualLines[i] ?? '')) continue
    return { expected: expectedLines[i] ?? '', actual: actualLines[i] ?? '' }
  }
  return { expected: '', actual: '' }
}

/** `changes/<file>` -> the canonical model ids the apply recorded for it. */
function creationModelsByChangeset(files: ReadonlyArray<FileSnapshot>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const file of files) {
    if (!file.path.endsWith('.md')) continue
    let doc
    try {
      doc = parseChangeset(file.content)
    } catch {
      continue
    }
    const models = doc.frontmatter.models
    if (!models) continue
    out.set(file.path, new Set(Object.keys(models).map((id) => canonicalUnitModelId(id))))
  }
  return out
}

/**
 * The applied `add_model` change that created `modelId`, plus the ids it was
 * addressed by. `add_model` keeps the caller's id in `target` while the created
 * file carries the canonical id, so the changeset's `models` map is the bridge.
 */
function creationOf(
  log: ReturnType<typeof buildChangeLog>,
  createdIds: ReadonlyMap<string, Set<string>>,
  modelId: string,
): { change: LoggedChange; aliases: Set<string> } | null {
  // A move renames the id but not the creation: the chain links the current id
  // to the ids the `add_model` (and later changes) addressed (design A10).
  const chain = [modelId, ...log.identities(modelId as ModelId)].map((id) => id.toLowerCase())
  const chainSet = new Set(chain)
  for (const change of log.all) {
    if (!change.applied || change.op !== 'add_model') continue
    const addressedId = canonicalUnitModelId(change.target)
    const recorded = createdIds.get(change.changeset)
    const createdThis =
      (recorded ? [...recorded].some((id) => chainSet.has(canonicalUnitModelId(id).toLowerCase())) : false) ||
      chainSet.has(addressedId.toLowerCase())
    if (!createdThis) continue
    const aliases = new Set<string>([...chain, addressedId.toLowerCase()])
    return { change, aliases }
  }
  return null
}

/** Rebuilds one model from its `add_model` skeleton and replays its changes. */
async function replayModel(
  rootDir: string,
  log: ReturnType<typeof buildChangeLog>,
  entry: ProvenanceModel,
  creation: { change: LoggedChange; aliases: Set<string> },
): Promise<ParsedKnowledge | null> {
  const change = creation.change as LoggedChange & Partial<ChangeItem>
  const blueprintName = String(change.blueprint_name ?? entry.model.frontmatter.parent_spec?.name ?? '')
  const blueprintUrl = String(change.blueprint_url ?? entry.model.frontmatter.parent_spec?.url ?? '')
  if (!blueprintName || !blueprintUrl) return null

  let resolved
  try {
    resolved = await resolveBlueprintWithCache(rootDir, blueprintUrl, blueprintName)
  } catch {
    return null
  }
  if (!resolved.template) return null

  const composed = resolveBlueprintSchema(resolved.template.rawContent, resolved.resolveInclude)
  if (composed.errors.length > 0) return null

  // An instance model is rebuilt through the SAME root element the apply used
  // (design A9): the distributed concept the change named, its slug and its name.
  const segments = entry.modelId.split('/')
  const root =
    typeof change.concept === 'string' && change.concept.trim() !== '' && segments.length > 1
      ? {
          concept: change.concept,
          slug: segments[segments.length - 1]!,
          ...(change.name ? { name: change.name } : {}),
        }
      : undefined

  const content = scaffoldKnowledgeDocument({
    id: entry.modelId,
    blueprintName,
    blueprintUrl,
    title: change.name,
    knowledgeVersion: change.knowledge_version,
    schema: composed.schema,
    blueprintFrontmatter: resolved.template.frontmatter as unknown as Record<string, unknown>,
    ...(root ? { root } : {}),
  })
  const skeleton = parseKnowledge(content)

  // An `add_element` change records the concept it created; the replay needs it
  // for a later remove/rename even after the element is gone from the file.
  const conceptByElement = new Map<string, string>()
  for (const item of log.all) {
    if (!item.applied || item.op !== 'add_element' || !item.concept) continue
    const name = item.name ?? item.slug ?? ''
    conceptByElement.set(slugifyHeading(name), item.concept)
    if (item.slug) conceptByElement.set(item.slug, item.concept)
  }

  const ops = log.all
    .filter(
      (item) => item.applied && !NON_REPLAY_OPS.has(item.op) && creation.aliases.has(modelOfChange(item).toLowerCase()),
    )
    .map((item) => {
      const args = mutationArgsForChange(loggedAsChange(item), entry.model, composed.schema)
      if (!args.conceptName) {
        const ident = String(args.elementName ?? '')
        const fallback = conceptByElement.get(slugifyHeading(ident)) ?? conceptByElement.get(ident.toLowerCase())
        if (fallback) args.conceptName = fallback
      }
      return { op: item.op, args }
    })

  return replayMutations(skeleton, ops, composed.schema).model
}

/** A logged change as the mutation-argument builder (a `ChangeItem`) reads it. */
function loggedAsChange(change: LoggedChange): ChangeItem {
  return { ...change, resolved_slug: change.resolvedSlug } as unknown as ChangeItem
}

/**
 * The provenance report for a workspace. Fold mode by default; with
 * `strict: true` the unit drift is replaced by the replay comparison (errors),
 * and the evidence diagnostics are kept.
 */
export async function checkDomainProvenance(
  rootDir: string,
  options: StrictProvenanceOptions = {},
): Promise<ProvenanceReport> {
  const files = readLineageSnapshot(rootDir)
  const log = buildChangeLog(files)
  const models = await collectProvenanceModels(rootDir)

  if (options.strict !== true) {
    return checkProvenance(log, models, options.sha256 ? { sha256: options.sha256 } : {})
  }

  const fold = checkProvenance(log, models, {
    strict: true,
    ...(options.sha256 ? { sha256: options.sha256 } : {}),
  })
  const diagnostics: ProvenanceDiagnostic[] = fold.diagnostics.filter((d) => EVIDENCE_CODES.has(d.code))
  const createdIds = creationModelsByChangeset(files)

  for (const entry of models) {
    const creation = creationOf(log, createdIds, entry.modelId)
    if (!creation) {
      // An instance model has no other construction: without its recorded
      // `add_model` its skeleton cannot be replayed, and strict mode says so
      // instead of skipping it silently (change-addressing-for-instance-models).
      if (entry.modelId.includes('/')) {
        diagnostics.push({
          code: 'MODEL_WITHOUT_RECORD',
          severity: 'error',
          message: `MODEL_WITHOUT_RECORD: instance model "${entry.modelId}" has no applied add_model change, so its skeleton cannot be rebuilt and strict replay cannot check it; recreate it through add_model`,
          unit: entry.modelId,
        })
      }
      continue
    }
    const replayed = await replayModel(rootDir, log, entry, creation)
    if (!replayed) continue

    // The expected body is the replay's serialization; the actual body is the
    // FILE's text, not its re-serialization — comparing two serializations would
    // normalize formatting away and let a whitespace-only hand edit pass.
    const expected = bodyOf(serializeKnowledge(replayed)).trimEnd()
    const actual = bodyOf(await readFile(entry.path!, 'utf-8')).trimEnd()
    if (expected === actual) continue
    const diff = firstDifference(expected, actual)
    diagnostics.push({
      code: 'EDITED_WITHOUT_RECORD',
      severity: 'error',
      message: `EDITED_WITHOUT_RECORD: the body of model "${entry.modelId}" differs from the replay of its applied changes (expected "${diff.expected}", found "${diff.actual}")`,
      unit: entry.modelId,
      expected: diff.expected,
      actual: diff.actual,
      changeId: creation.change.id,
    })
  }

  return { ok: !diagnostics.some((d) => d.severity === 'error'), mode: 'strict', diagnostics }
}
