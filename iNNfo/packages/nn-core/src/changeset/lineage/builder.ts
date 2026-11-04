import type { ParsedKnowledge } from '../../types/parser.js'
import type { ChangeItem, ChangesetDocument } from '../types.js'

/** The blueprint pin a reconciliation unit moves to. */
export interface LineageTargetPin {
  /** Target `parent_spec.name`, e.g. `coNNtent_V_0-15-0`. */
  name: string
  /** Target `parent_spec.url`. */
  url: string
  /** Target `blueprint_version`; derived from `name` when omitted. */
  version?: string | null
}

/** One field rename agreed at the consent gate, asked once per concept. */
export interface LineageFieldMapping {
  from: string
  to: string
  concept?: string
}

/** One field the newer blueprint introduced, with the value to seed. */
export interface LineageFieldDefault {
  field: string
  value: string
  concept?: string
}

export interface BuildLineageChangesetInput {
  /** The Level-3 model id the changes target. */
  modelId: string
  /** The parsed model, used to decide which changes are needed. */
  model: ParsedKnowledge
  target: LineageTargetPin
  mappings?: readonly LineageFieldMapping[]
  defaults?: readonly LineageFieldDefault[]
  /** Evidence carried by every generated change (mandatory at apply). */
  evidence: string
  /** The changes blueprint the document pins; supplied by the caller (nn-mcp owns the URL). */
  changesBlueprint: { specVersion: string; url: string; version: string }
  author?: string
  idPrefix?: string
}

export interface LineageChangesetResult {
  document: ChangesetDocument
  /** Human-readable notes for mappings/defaults that produced no change. */
  skipped: string[]
}

/**
 * Translate one model's reconciliation into typed changeset operations.
 *
 * Pure: it parses nothing and writes nothing. The caller supplies the parsed
 * model and the decisions taken at the consent gate; the result still has to be
 * sealed, validated and applied through the standard transaction pipeline.
 *
 * A change is emitted only when it would do something — a model already at the
 * target pin yields no `repin_blueprint`, a mapping whose field no element
 * carries is reported in `skipped` instead of producing a no-op change.
 */
export function buildLineageChangeset(
  input: BuildLineageChangesetInput,
): LineageChangesetResult {
  if (!input.evidence || !input.evidence.trim()) {
    throw new Error('buildLineageChangeset: every generated change needs evidence')
  }

  const changes: ChangeItem[] = []
  const skipped: string[] = []
  const prefix = input.idPrefix ?? `${input.modelId}-lineage`
  const nextId = () => `${prefix}-${String(changes.length + 1).padStart(2, '0')}`

  const fm = input.model.frontmatter as Record<string, any>
  const currentPin = fm.parent_spec ?? {}
  const targetVersion =
    input.target.version ??
    String(input.target.name).match(/V_\d+-\d+-\d+/)?.[0] ??
    null

  if (
    String(currentPin.name ?? '').toLowerCase() !== input.target.name.toLowerCase() ||
    String(currentPin.url ?? '') !== input.target.url
  ) {
    changes.push({
      id: nextId(),
      op: 'repin_blueprint',
      target: input.modelId,
      ...(currentPin.name ? { from: String(currentPin.name) } : {}),
      to: input.target.name,
      blueprint_url: input.target.url,
      ...(targetVersion ? { knowledge_version: targetVersion } : {}),
      evidence: input.evidence,
    })
  }

  for (const mapping of input.mappings ?? []) {
    if (!modelCarriesField(input.model, mapping.from, mapping.concept)) {
      skipped.push(
        `mapping ${mapping.from} -> ${mapping.to}: no element carries "${mapping.from}"`,
      )
      continue
    }
    changes.push({
      id: nextId(),
      op: 'rename_field',
      target: input.modelId,
      from: mapping.from,
      to: mapping.to,
      ...(mapping.concept ? { concept: mapping.concept } : {}),
      evidence: input.evidence,
    })
  }

  for (const dflt of input.defaults ?? []) {
    if (!modelLacksField(input.model, dflt.field, dflt.concept)) {
      skipped.push(`default ${dflt.field}: every element already carries it`)
      continue
    }
    changes.push({
      id: nextId(),
      op: 'set_field_default',
      target: input.modelId,
      name: dflt.field,
      to: dflt.value,
      ...(dflt.concept ? { concept: dflt.concept } : {}),
      evidence: input.evidence,
    })
  }

  const document: ChangesetDocument = {
    frontmatter: {
      spec_version: input.changesBlueprint.specVersion,
      level: 3,
      parent_spec: { name: 'changes', url: input.changesBlueprint.url },
      blueprint_version: input.changesBlueprint.version,
      status: 'proposed',
      ...(input.author ? { author: input.author } : {}),
      title: `Lineage reconciliation for ${input.modelId}`,
    },
    changes,
  }

  return { document, skipped }
}

function inScope(concept: string, scope?: string): boolean {
  return !scope || concept.toLowerCase() === scope.toLowerCase()
}

function modelCarriesField(model: ParsedKnowledge, field: string, scope?: string): boolean {
  const wanted = field.toLowerCase()
  for (const [concept, elements] of model.elements.entries()) {
    if (!inScope(concept, scope)) continue
    for (const el of elements) {
      if (Object.keys(el.fields).some((k) => k.toLowerCase() === wanted)) return true
    }
  }
  return false
}

function modelLacksField(model: ParsedKnowledge, field: string, scope?: string): boolean {
  const wanted = field.toLowerCase()
  for (const [concept, elements] of model.elements.entries()) {
    if (!inScope(concept, scope)) continue
    for (const el of elements) {
      if (!Object.keys(el.fields).some((k) => k.toLowerCase() === wanted)) return true
    }
  }
  return false
}
