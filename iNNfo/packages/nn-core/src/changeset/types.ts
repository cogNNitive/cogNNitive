/**
 * Changeset data models, types, and interfaces.
 * Normative document model for changesets conforming to blueprint 'changes'.
 */

/** Every operation a changeset change may carry. */
export const CHANGE_OPS = [
  'update_field',
  'add_element',
  'remove_element',
  'rename_element',
  'rename_concept',
  'update_matrix_cell',
  'update_concept_text',
  'update_concept_field',
  'remove_matrix',
  'add_matrix',
  'comment',
  'add_model',
  'move_model',
  'extract_instance',
  'freeze_slugs',
  'bump_version',
  'update_element_text',
  'produce_artifact',
  'repin_blueprint',
  'rename_field',
  'set_field_default',
] as const

/** Version levels a `bump_version` change may request (carried in `to`). */
export const BUMP_LEVELS = ['patch', 'minor', 'major'] as const
export type BumpLevel = (typeof BUMP_LEVELS)[number]

export function isBumpLevel(val: unknown): val is BumpLevel {
  return typeof val === 'string' && (BUMP_LEVELS as readonly string[]).includes(val)
}

export type ChangeOp = (typeof CHANGE_OPS)[number]

export type ChangeStatus =
  | 'proposed'
  | 'applied'
  | 'partially_applied'
  | 'rejected'
  | 'conflict'

export interface ChangeItem {
  id: string
  op: ChangeOp
  /**
   * Canonical D5 target address: model@element&field or model@matrix&row&col or model@concept.
   * `freeze_slugs` and `bump_version` target a bare model id; `bump_version` carries its level in `to`.
   */
  target: string
  from?: string
  to?: string
  /**
   * Content hash of the target element when the change was written (the console's
   * element `hash`). A different current hash is a precondition failure. Optional:
   * absent means the change is not guarded by element content.
   */
  base_hash?: string
  concept?: string
  name?: string
  slug?: string
  fields?: Record<string, string>
  author?: string
  notes?: string
  /**
   * Evidence the change derives from — the ONLY provenance of the mutation — in the
   * shared citation grammar (`<path>@## <Heading>`, `<csv>@<row>`, `<json>@/<pointer>`,
   * a bare path, or the literal tokens `decision` / `unknown`), or a bracketed list of
   * those (the keywords only ever alone). Mandatory at apply intake; the serialized
   * string is sealed into `proposal_sha`.
   */
  evidence?: string
  /**
   * `add_matrix` only: the header elements the matrix is created with, `{columns, rows}`.
   * Sealed into `proposal_sha`; creates empty cells and records no cell units.
   */
  seed?: { columns?: string[]; rows?: string[] }
  /**
   * `add_model` only: the parent bluepriNNt of the model to create (name and immutable
   * URL) and its optional initial `knowledge_version`. Sealed into `proposal_sha`.
   */
  blueprint_name?: string
  blueprint_url?: string
  knowledge_version?: string
  /** Execution / Resolution annotations (excluded from proposal_sha) */
  status?: ChangeStatus
  resolution?: string
  resolved_slug?: string
  /**
   * Execution fact stamped at apply: the canonical unit address of the change.
   * Outside the seal; also an annotation line, rewritten on write-back.
   */
  resolved_target?: string
  /** Execution fact: one sha256 per evidence entry, in evidence order. Outside the seal. */
  evidence_sha256?: string[]
  /**
   * Execution fact (`extract_instance` only): the element slugs that moved into
   * the new instance model — the instance root first, then every descendant the
   * cut carried. The fold re-keys exactly this slug set (design A11), so it is
   * written by apply and excluded from `proposal_sha`.
   */
  extracted_slugs?: string[]
  /** Per-change execution fact: when the change was applied, UTC (excluded from proposal_sha). */
  applied_at?: string
  /** Per-change execution fact: the batch identity, the changeset stem (excluded from proposal_sha). */
  batch?: string
}

export interface ModelVersionTransition {
  /** Absent for a model created by `add_model` in the same apply. */
  base_version?: string
  result_version: string
}

export interface ChangesetParentSpec {
  name: 'changes'
  url: string
}

export interface ChangesetFrontmatter {
  spec_version: string
  /** A changeset is a valid iNNfo Level-3 document. */
  level: 3
  parent_spec: ChangesetParentSpec
  blueprint_version: string
  status: ChangeStatus
  /**
   * Deterministic SHA-256 seal computed over canonical proposed changes.
   * Absent only on an unsealed proposal; the apply engine seals it at intake.
   */
  proposal_sha?: string
  applied_at?: string
  /**
   * Why the changeset was `rejected` (a property of the proposal: failed validation or an
   * unresolved citation). Execution annotation, excluded from `proposal_sha`.
   */
  resolution?: string
  /** Map of affected model slugs to base and result versions */
  models?: Record<string, ModelVersionTransition>
  title?: string
  author?: string
  workspace_id?: string
  [key: string]: unknown
}

export interface ChangesetDocument {
  frontmatter: ChangesetFrontmatter
  changes: ChangeItem[]
  rawContent?: string
}

export function isChangeStatus(val: unknown): val is ChangeStatus {
  return (
    typeof val === 'string' &&
    ['proposed', 'applied', 'partially_applied', 'rejected', 'conflict'].includes(val)
  )
}

export function isChangeOp(val: unknown): val is ChangeOp {
  return typeof val === 'string' && (CHANGE_OPS as readonly string[]).includes(val)
}

/**
 * Structural problems of one `add_model` change, as human-readable messages naming the
 * change id. An empty list means the change is well formed. `add_model` creates a model:
 * it requires `target`, `blueprint_name` and `blueprint_url`, and it carries no
 * precondition (`from`, `to`, `base_hash`) and no element payload.
 *
 * `target` is a plain model id, UNLESS the change names the distributed concept it
 * instantiates (`concept`, design A9): then it is the instance's hierarchical id
 * (`<container-id>/<slug>`) and its folder and file are derived from the concept's
 * declared placement by the apply engine, never from the id's spelling.
 */
export function addModelProblems(change: ChangeItem): string[] {
  if (change.op !== 'add_model') return []
  const problems: string[] = []
  const id = change.id
  for (const key of ['from', 'to', 'base_hash'] as const) {
    if (change[key] !== undefined) {
      problems.push(`change "${id}": add_model must not carry "${key}"`)
    }
  }
  if (change.fields !== undefined || change.slug !== undefined) {
    problems.push(`change "${id}": add_model must not carry element payload (slug, fields)`)
  }
  if (!change.blueprint_name) problems.push(`change "${id}": add_model requires "blueprint_name"`)
  if (!change.blueprint_url) problems.push(`change "${id}": add_model requires "blueprint_url"`)
  const target = change.target
  const hierarchical = typeof change.concept === 'string' && change.concept.trim() !== ''
  if (
    !target ||
    target.includes('@') ||
    target.includes('&') ||
    target.includes('..') ||
    /^[a-zA-Z]:/.test(target) ||
    (hierarchical ? target.includes('\\') : /[\\/]/.test(target))
  ) {
    problems.push(
      hierarchical
        ? `change "${id}": add_model target must be a hierarchical model id (no "@", "&", "..", backslashes, or absolute path)`
        : `change "${id}": add_model target must be a plain model id (no "@", "&", "..", path separators, or absolute path)`,
    )
  }
  return problems
}

/**
 * Structural problems of one `move_model` change, as human-readable messages naming
 * the change id. `move_model` renames or relocates an instance model: it carries the
 * old model id in `target` and the new one in `to`, and nothing else.
 */
export function moveModelProblems(change: ChangeItem): string[] {
  if (change.op !== 'move_model') return []
  const problems: string[] = []
  const id = change.id
  const bareModelId = (value: string): boolean =>
    value.length > 0 &&
    !value.includes('@') &&
    !value.includes('&') &&
    !value.includes('\\') &&
    !value.includes('..') &&
    !/^[a-zA-Z]:/.test(value) &&
    value !== '.'
  // `/` is legal: an instance id is hierarchical.
  const target = String(change.target ?? '').trim()
  if (!target || !bareModelId(target) || target.startsWith('/')) {
    problems.push(`change "${id}": move_model target must be the old instance model id`)
  }
  const to = String(change.to ?? '').trim()
  if (!to) problems.push(`change "${id}": move_model requires "to" (the new instance model id)`)
  else if (!bareModelId(to) || to.startsWith('/')) {
    problems.push(`change "${id}": move_model "to" must be the new instance model id`)
  }
  return problems
}

/**
 * Structural problems of one `extract_instance` change (design A11), as
 * human-readable messages naming the change id. `extract_instance` migrates a
 * compact element into its own distributed model: `target` is the source address
 * (`<compact-id>@<slug>`), `to` is the instance id it becomes, and the change
 * carries the destination bluepriNNt (`blueprint_name` / `blueprint_url`) and
 * nothing else — the element payload already lives in the source.
 */
export function extractInstanceProblems(change: ChangeItem): string[] {
  if (change.op !== 'extract_instance') return []
  const problems: string[] = []
  const id = change.id
  for (const key of ['from', 'base_hash'] as const) {
    if (change[key] !== undefined) {
      problems.push(`change "${id}": extract_instance must not carry "${key}"`)
    }
  }
  if (change.fields !== undefined || change.slug !== undefined) {
    problems.push(`change "${id}": extract_instance must not carry element payload (slug, fields)`)
  }
  if (!change.blueprint_name) problems.push(`change "${id}": extract_instance requires "blueprint_name"`)
  if (!change.blueprint_url) problems.push(`change "${id}": extract_instance requires "blueprint_url"`)
  const target = String(change.target ?? '').trim()
  const at = target.indexOf('@')
  const modelPart = at === -1 ? target : target.slice(0, at)
  const elementPart = at === -1 ? '' : target.slice(at + 1)
  const unsafe = (value: string): boolean =>
    value.includes('&') ||
    value.includes('\\') ||
    value.includes('..') ||
    /^[a-zA-Z]:/.test(value) ||
    value.startsWith('/')
  if (!modelPart || !elementPart || unsafe(modelPart) || unsafe(elementPart)) {
    problems.push(
      `change "${id}": extract_instance target must be the source element address (<compact-id>@<slug>)`,
    )
  }
  const to = String(change.to ?? '').trim()
  if (!to) problems.push(`change "${id}": extract_instance requires "to" (the new instance model id)`)
  // A distributed concept with no `container::` has a one-segment id, so the
  // shape is decided by the concept, not here: only reject a malformed id.
  else if (unsafe(to) || to.startsWith('/') || to.endsWith('/') || to.includes('//')) {
    problems.push(`change "${id}": extract_instance "to" must be a valid instance model id`)
  }
  return problems
}

/**
 * Structural problems of a lineage operation (`repin_blueprint`, `rename_field`,
 * `set_field_default`), as human-readable messages naming the change id. An empty
 * list means the change is well formed. All three target a bare model id and
 * carry no element payload.
 */
export function lineageChangeProblems(change: ChangeItem): string[] {
  const op = change.op
  if (op !== 'repin_blueprint' && op !== 'rename_field' && op !== 'set_field_default') return []
  const problems: string[] = []
  const id = change.id

  if (change.target.includes('@')) {
    problems.push(`change "${id}": ${op} targets a bare model id, not an element address`)
  }
  if (change.fields !== undefined || change.slug !== undefined) {
    problems.push(`change "${id}": ${op} must not carry element payload (slug, fields)`)
  }

  if (op === 'repin_blueprint') {
    if (!change.to) problems.push(`change "${id}": repin_blueprint requires "to" (the target parent_spec.name)`)
    if (!change.blueprint_url) {
      problems.push(`change "${id}": repin_blueprint requires "blueprint_url"`)
    }
  }

  if (op === 'rename_field') {
    if (!change.from) problems.push(`change "${id}": rename_field requires "from" (the current field name)`)
    if (!change.to) problems.push(`change "${id}": rename_field requires "to" (the new field name)`)
    if (change.from && change.to && change.from.toLowerCase() === change.to.toLowerCase()) {
      problems.push(`change "${id}": rename_field "from" and "to" are the same field`)
    }
  }

  if (op === 'set_field_default') {
    if (!change.name) problems.push(`change "${id}": set_field_default requires "name" (the field name)`)
    if (change.to === undefined) {
      problems.push(`change "${id}": set_field_default requires "to" (the default value)`)
    }
  }

  return problems
}

export interface LockPayload {
  pid: number
  timestamp: number
  changeset: string
}

export interface LockHandle {
  lockPath: string
  payload: LockPayload
  release: () => Promise<void>
}
