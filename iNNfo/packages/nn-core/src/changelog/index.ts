/**
 * The change log: the one reader every provenance consumer queries.
 *
 * A knowledge unit carries no provenance of its own. Its history, origin and
 * drift are derived by folding the applied changes whose `resolved_target`
 * points at it (change-provenance). This module owns the ordering, the
 * applied-only filter and (from S2a on) the fold and the evidence index, so no
 * consumer re-implements them.
 *
 * Browser-safe: pure over parsed input. The filesystem reader lives in
 * `node.ts`.
 */
import type { ChangeItem, ChangeOp, ChangeStatus } from '../changeset/types.js'
import type { ModelId } from '../address/index.js'
import { splitEvidence } from '../changeset/evidence.js'
import { compareChanges } from './order.js'
import { elementKeyOf, foldChanges, rekeyKey, type FoldResult, type Rekey } from './fold.js'
import { unitsFromFold, type UnitState } from './units.js'

/** One change as the log exposes it: the change plus its changeset context. */
export interface LoggedChange {
  readonly id: string
  /** Workspace-relative changeset path, POSIX separators. */
  readonly changeset: string
  /** Zero-based document index of the change inside the changeset. */
  readonly index: number
  /** The change's own status, else its changeset's status. */
  readonly status: ChangeStatus
  readonly changesetStatus: ChangeStatus
  /** `applied_at` of the change, else of its changeset. */
  readonly appliedAt?: string
  /** Execution fact: the batch identity, the changeset stem. */
  readonly batch?: string
  readonly author?: string
  readonly op: ChangeOp
  readonly target: string
  /**
   * Execution fact stamped at apply: the canonical unit address. Absent on a
   * change that was never applied; the log then falls back to `target`.
   */
  readonly resolvedTarget?: string
  readonly evidence?: string
  /** Execution fact: one sha256 per evidence item, in evidence order. */
  readonly evidenceSha256?: readonly string[]
  /**
   * Execution fact (`extract_instance`): the element slugs the change moved into
   * its new model, root first. The fold re-keys exactly this set (design A11).
   */
  readonly extractedSlugs?: readonly string[]
  readonly from?: string
  readonly to?: string
  readonly concept?: string
  readonly name?: string
  readonly slug?: string
  /** `add_model` / `extract_instance`: the bluepriNNt the created model conforms to. */
  readonly blueprintName?: string
  readonly blueprintUrl?: string
  readonly knowledgeVersion?: string
  /** Apply annotation: the frozen slug `add_element` resolved to. */
  readonly resolvedSlug?: string
  readonly notes?: string
  readonly resolution?: string
  readonly fields?: Readonly<Record<string, string>>
  /** The evidence list the change carries, split by the shared grammar. */
  readonly evidenceItems?: readonly string[]
  /** True when this change contributes to derived provenance. */
  readonly applied: boolean
}

/** The two views of the evidence index (change-provenance: Evidence index). */
export type EvidenceScope = 'live' | 'all-time'

/** One applied change that cites a source, with the unit it set. */
export interface EvidenceSite {
  readonly changeId: string
  /** The unit address the change contributed to (an element key for `add_element`). */
  readonly unit: string
  /** Every evidence item the change carries, in evidence order. */
  readonly evidence: readonly string[]
  /** The stamped sha256 per evidence item, positional (`[]` when not stamped). */
  readonly sha256: readonly string[]
}

/** The provenance view of one workspace, built once and queried by every consumer. */
export interface ChangeLog {
  /** Every change, every status, in canonical order (the review UI lists this). */
  readonly all: readonly LoggedChange[]
  /** Applied changes whose unit is `unit`, canonical order, after the epoch cut. */
  history(unit: string): readonly LoggedChange[]
  /** The last applied change of `unit`, or `undefined` when it has no history. */
  origin(unit: string): LoggedChange | undefined
  /**
   * The evidence index keyed by citation (path and anchor, as the change carries
   * it). `live` lists the last applied change of every live unit (plus the
   * creation evidence of a live element); `all-time` lists every applied change.
   * Garbage collection and the uncited-source audit read all-time; graph edges
   * read live.
   */
  evidence(scope: EvidenceScope): ReadonlyMap<string, EvidenceSite[]>
  /** Live units after the epoch cut (optionally scoped to one model id). */
  units(model?: string): Iterable<UnitState>
  /** Unit keys whose last applied change cleared them (`to:: ''`). */
  readonly cleared: ReadonlySet<string>
  /** Element key -> the change that created or removed it. */
  readonly elements: ReadonlyMap<string, LoggedChange>
  /** The change that created or removed the element at `elementKey`, if any. */
  elementOrigin(elementKey: string): LoggedChange | undefined
  /**
   * The model ids this id carried before the one it names now, oldest first
   * (design A10). Empty for an id that was never moved.
   */
  identities(id: ModelId): readonly ModelId[]
  /**
   * The id a recorded `move_model` gave this one, following the chain forward
   * (`undefined` for an id that was never moved). Used to name the successor of
   * a stale address (design A11).
   */
  successorOf(id: ModelId): ModelId | undefined
  /** Removal changes kept as tombstones. */
  readonly tombstones: readonly LoggedChange[]
  /**
   * Every rekey the log carries (`move_model`, `extract_instance`): the ids and
   * slug sets that moved, in canonical order.
   */
  readonly rekeys: readonly Rekey[]
}

/**
 * The unit address a change contributes to. Apply stamps `resolved_target`;
 * before stamping exists, the change's own `target` is the address. Never a
 * normalizing comparison: the address is matched by exact string equality.
 */
export function unitOf(change: LoggedChange): string {
  return change.resolvedTarget ?? change.target
}

class ChangeLogImpl implements ChangeLog {
  readonly all: readonly LoggedChange[]
  private readonly byUnit = new Map<string, LoggedChange[]>()
  private readonly fold: FoldResult

  constructor(changes: readonly LoggedChange[]) {
    this.all = [...changes].sort(compareChanges)
    this.fold = foldChanges(this.all)
    this.all.forEach((change, order) => {
      if (!change.applied) return
      // History is keyed by the id the unit carries TODAY: a change recorded
      // before a move is mapped forward through every later rekey, so the
      // pre-move history stays attached (design A10).
      const unit = this.forwardKey(unitOf(change), order)
      const bucket = this.byUnit.get(unit)
      if (bucket) bucket.push(change)
      else this.byUnit.set(unit, [change])
    })
  }

  /** Applied changes of a unit, cut at the latest add_element of its element. */
  history(unit: string): readonly LoggedChange[] {
    const key = this.forwardKey(unit)
    const bucket = this.byUnit.get(key) ?? []
    const epoch = this.fold.epochs.get(elementKeyOf(key))
    if (epoch === undefined) return bucket
    return bucket.filter((change) => this.orderOf(change) > epoch)
  }

  identities(id: ModelId): readonly ModelId[] {
    const former: ModelId[] = []
    let current: string = id
    // Walk the chain backwards: each move whose destination is the current id
    // contributes its source, so a chained move yields the ids oldest first.
    for (let i = this.fold.rekeys.length - 1; i >= 0; i--) {
      const rekey = this.fold.rekeys[i]!
      // An extraction is not an id change: the source model keeps its own id.
      if (rekey.kind === 'extract') continue
      if (rekey.to !== current) continue
      former.push(rekey.from as ModelId)
      current = rekey.from
    }
    return former.reverse()
  }

  successorOf(id: ModelId): ModelId | undefined {
    let current: string = id
    let moved = false
    for (const rekey of this.fold.rekeys) {
      if (rekey.kind === 'extract') continue
      if (current === rekey.from) current = rekey.to
      else if (current.startsWith(`${rekey.from}/`)) current = `${rekey.to}${current.slice(rekey.from.length)}`
      else continue
      moved = true
    }
    return moved ? (current as ModelId) : undefined
  }

  /**
   * Maps a unit key forward through the rekeys recorded AFTER `order` (all of
   * them when `order` is omitted). The first move a unit predates re-keys it.
   */
  private forwardKey(unit: string, order = -1): string {
    let key = unit
    for (const rekey of this.fold.rekeys) {
      if (rekey.order < order) continue
      const next = rekeyKey(key, rekey.from, rekey.to, rekey.slugs)
      if (next !== key) key = next
    }
    return key
  }

  origin(unit: string): LoggedChange | undefined {
    // A cleared field/body/cell has no live value, so it has no origin.
    if (!this.fold.units.has(unit)) return undefined
    const bucket = this.history(unit)
    return bucket.length > 0 ? bucket[bucket.length - 1] : undefined
  }

  units(model?: string): Iterable<UnitState> {
    return unitsFromFold(this.fold, model)
  }

  evidence(scope: EvidenceScope): ReadonlyMap<string, EvidenceSite[]> {
    const index = new Map<string, EvidenceSite[]>()
    const indexed = new Set<LoggedChange>()

    const addSite = (change: LoggedChange, unit: string): void => {
      if (indexed.has(change)) return
      indexed.add(change)
      const evidence = change.evidenceItems ?? splitEvidence(change.evidence)
      if (evidence.length === 0) return
      const site: EvidenceSite = {
        changeId: change.id,
        unit,
        evidence: [...evidence],
        sha256: [...(change.evidenceSha256 ?? [])],
      }
      for (const citation of evidence) {
        const bucket = index.get(citation)
        if (bucket) bucket.push(site)
        else index.set(citation, [site])
      }
    }

    if (scope === 'all-time') {
      for (const change of this.all) {
        if (change.applied) addSite(change, unitOf(change))
      }
      return index
    }

    for (const unit of this.fold.units.keys()) {
      const origin = this.origin(unit)
      // A live element keeps the evidence of the change that created it; a
      // removed unit has no origin, so its last edge never stays live.
      if (origin) addSite(origin, unit)
    }
    for (const [key, change] of this.fold.elements) {
      if (change.op === 'remove_element') continue
      addSite(change, key)
    }
    return index
  }

  get cleared(): ReadonlySet<string> {
    return this.fold.cleared
  }

  get elements(): ReadonlyMap<string, LoggedChange> {
    return this.fold.elements
  }

  elementOrigin(elementKey: string): LoggedChange | undefined {
    return this.fold.elements.get(elementKey)
  }

  get tombstones(): readonly LoggedChange[] {
    return this.fold.tombstones
  }

  get rekeys(): readonly Rekey[] {
    return this.fold.rekeys
  }

  /** Canonical position of a change: its index in the sorted `all` list. */
  private orderOf(change: LoggedChange): number {
    return this.orderIndex.get(change) ?? -1
  }

  private get orderIndex(): Map<LoggedChange, number> {
    if (!this.orderCache) {
      this.orderCache = new Map(this.all.map((change, index) => [change, index]))
    }
    return this.orderCache
  }

  private orderCache?: Map<LoggedChange, number>
}

/** Builds the log from changes already parsed into their changeset context. */
export function createChangeLog(changes: readonly LoggedChange[]): ChangeLog {
  return new ChangeLogImpl(changes)
}

export type { ChangeItem }

export {
  applyRelinks,
  canonicalValue,
  elementKeyOf,
  foldChanges,
  rekeyKey,
  splitUnitKey,
  unitKindOf,
  type FoldedUnit,
  type FoldResult,
  type FoldUnitKind,
  type Rekey,
  type Relink,
} from './fold.js'
export { unitsFromFold, type UnitState } from './units.js'
export {
  checkProvenance,
  type ProvenanceDiagnostic,
  type ProvenanceModel,
  type ProvenanceOptions,
  type ProvenanceReport,
} from './drift.js'
