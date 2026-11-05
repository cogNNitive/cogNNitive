import { createHash } from 'node:crypto'
import {
  classifyAgainstCatalog,
  compareVersions,
  parsePinnedUrl,
  parseUnversionedBlueprintName,
  type TemplateCatalog,
} from '../../workspace/integrity/versionStatus.js'
import type {
  BlueprintSkew,
  LineageAuditEntry,
  LineageAuditResult,
  LineageModelInput,
  LineageStatus,
  ReconciliationPlan,
  ReconciliationUnit,
} from './types.js'

/** Map the legacy `VersionStatus` value onto the canonical lineage vocabulary. */
function toLineageStatus(status: string): LineageStatus {
  return status === 'upgrade-available' ? 'update-available' : (status as LineageStatus)
}

/**
 * The `{ blueprint, version }` a model pins, from its URL alone. An unversioned
 * canonical URL pins a blueprint without a version (`version: null`); anything
 * else is `null`.
 */
function pinOf(parentUrl: string | null): { blueprint: string; version: string | null } | null {
  if (!parentUrl) return null
  const versioned = parsePinnedUrl(parentUrl)
  if (versioned) return { blueprint: versioned.name, version: versioned.version }
  const name = parseUnversionedBlueprintName(parentUrl)
  return name ? { blueprint: name, version: null } : null
}

/**
 * Read-only lineage audit: classify every Level-3 model against the catalog and
 * report per-blueprint skew. Pure — the caller supplies the models and catalog.
 */
export function lineageAudit(
  models: readonly LineageModelInput[],
  catalog: TemplateCatalog | null,
): LineageAuditResult {
  const entries: LineageAuditEntry[] = models.map((m) => {
    const c = classifyAgainstCatalog(m.parentUrl, catalog)
    return {
      path: m.path,
      parentUrl: m.parentUrl,
      blueprint: c.template,
      pinned: c.pinned,
      adopted: c.adopted,
      status: toLineageStatus(c.status),
      gap: c.gap,
    }
  })

  return {
    entries,
    offline: catalog === null,
    skews: collectSkews(entries),
  }
}

/** Blueprints whose members pin more than one version, sorted by blueprint. */
function collectSkews(entries: readonly LineageAuditEntry[]): BlueprintSkew[] {
  const byBlueprint = new Map<string, { versions: Set<string>; members: Set<string> }>()
  for (const e of entries) {
    const pin = pinOf(e.parentUrl)
    if (!pin || !pin.version) continue
    if (e.status === 'unknown' || e.status === 'unpinned') continue
    if (!e.blueprint) continue
    let bucket = byBlueprint.get(pin.blueprint)
    if (!bucket) {
      bucket = { versions: new Set(), members: new Set() }
      byBlueprint.set(pin.blueprint, bucket)
    }
    bucket.versions.add(pin.version)
    bucket.members.add(e.path)
  }

  const skews: BlueprintSkew[] = []
  for (const [blueprint, bucket] of byBlueprint) {
    if (bucket.versions.size < 2) continue
    skews.push({
      blueprint,
      pinnedVersions: [...bucket.versions].sort(compareVersions),
      members: [...bucket.members].sort(),
    })
  }
  return skews.sort((a, b) => a.blueprint.localeCompare(b.blueprint))
}

/** True when the member's pin is behind the adopted version. */
function isActionable(e: LineageAuditEntry): boolean {
  if (e.status === 'update-available') return true
  if (!e.pinned || !e.adopted) return false
  return compareVersions(e.pinned, e.adopted) < 0
}

/**
 * Group the audit into reconciliation units, one per blueprint that actually has
 * work to do. A blueprint whose members are all `current` produces no unit;
 * `unlisted`, `unpinned` and `unknown` models are never reconciliation targets.
 */
export function buildReconciliationPlan(audit: LineageAuditResult): ReconciliationPlan {
  const byBlueprint = new Map<string, LineageAuditEntry[]>()
  for (const e of audit.entries) {
    const pin = pinOf(e.parentUrl)
    if (!pin) continue
    if (e.status === 'unpinned' || e.status === 'unknown') continue
    // A local specialization has no catalog entry, so it is never a target.
    if (!e.blueprint || !e.adopted) continue
    const list = byBlueprint.get(pin.blueprint) ?? []
    list.push(e)
    byBlueprint.set(pin.blueprint, list)
  }

  const units: ReconciliationUnit[] = []
  for (const [blueprint, entries] of byBlueprint) {
    const actionable = entries.filter((e) => isActionable(e))
    // Every member already matches the adopted version: nothing to reconcile.
    if (actionable.length === 0) continue

    const pinnedVersions = [
      ...new Set(
        entries
          .map((e) => pinOf(e.parentUrl)?.version)
          .filter((v): v is string => typeof v === 'string'),
      ),
    ].sort(compareVersions)
    const targetVersion = entries.find((e) => typeof e.adopted === 'string')?.adopted ?? null

    units.push({
      blueprint,
      targetVersion,
      pinnedVersions,
      members: entries.map((e) => e.path).sort(),
      hasSkew: pinnedVersions.length > 1,
    })
  }

  units.sort((a, b) => a.blueprint.localeCompare(b.blueprint))
  return { units, planHash: fingerprint(units), offline: audit.offline }
}

/**
 * Deterministic fingerprint of a plan: stable under member order, sensitive to
 * the blueprint, the target version and every `member@version` pair.
 */
function fingerprint(units: readonly ReconciliationUnit[]): string {
  const canonical = [...units]
    .sort((a, b) => a.blueprint.localeCompare(b.blueprint))
    .map((u) => {
      const members = [...u.members].sort().join(',')
      return `${u.blueprint}|${u.targetVersion ?? ''}|${u.pinnedVersions.join(',')}|${members}`
    })
    .join('\n')
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

/**
 * True when the workspace still matches the plan. Recomputes the fingerprint from
 * the current models restricted to the blueprints the plan covers, so an added,
 * removed or repinned member of a planned unit makes it stale while unrelated
 * activity elsewhere in the workspace does not.
 */
export function isPlanFresh(
  plan: ReconciliationPlan,
  models: readonly LineageModelInput[],
): boolean {
  const planned = new Set(plan.units.map((u) => u.blueprint))
  const current = new Map<string, { members: string[]; pins: Set<string> }>()

  for (const m of models) {
    const pin = pinOf(m.parentUrl)
    if (!pin || !planned.has(pin.blueprint)) continue
    let bucket = current.get(pin.blueprint)
    if (!bucket) {
      bucket = { members: [], pins: new Set() }
      current.set(pin.blueprint, bucket)
    }
    bucket.members.push(m.path)
    if (pin.version) bucket.pins.add(pin.version)
  }

  const units: ReconciliationUnit[] = []
  for (const unit of plan.units) {
    const bucket = current.get(unit.blueprint)
    if (!bucket) return false
    units.push({
      blueprint: unit.blueprint,
      targetVersion: unit.targetVersion,
      pinnedVersions: [...bucket.pins].sort(compareVersions),
      members: [...bucket.members].sort(),
      hasSkew: bucket.pins.size > 1,
    })
  }

  return fingerprint(units) === plan.planHash
}
