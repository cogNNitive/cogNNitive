import { describe, it, expect } from 'vitest'
import {
  buildReconciliationPlan,
  isPlanFresh,
  lineageAudit,
} from '../src/changeset/lineage/plan.js'
import type { LineageModelInput } from '../src/changeset/lineage/types.js'
import type { TemplateCatalog } from '../src/workspace/integrity/versionStatus.js'

const URL = (name: string, version: string) =>
  `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/${name}/${name}_${version}_NN.md`

const catalog: TemplateCatalog = {
  generator: 'scripts/blueprint-catalog.mjs',
  blueprints: {
    coNNtent: {
      name: 'coNNtent',
      adopted: 'V_0-15-0',
      versions: [
        { blueprint_version: 'V_0-15-0', url: URL('coNNtent', 'V_0-15-0') },
        { blueprint_version: 'V_0-14-1', url: URL('coNNtent', 'V_0-14-1') },
      ],
    },
  },
}

const instances = (count: number, version: string, prefix = 'episodes'): LineageModelInput[] =>
  Array.from({ length: count }, (_, i) => ({
    path: `${prefix}/scene-${String(i).padStart(2, '0')}_NN.md`,
    parentUrl: URL('coNNtent', version),
  }))

describe('lineageAudit', () => {
  it('classifies a pinned model as update-available against the adopted version', () => {
    const audit = lineageAudit([{ path: 'domaiNN_NN.md', parentUrl: URL('coNNtent', 'V_0-14-1') }], catalog)
    expect(audit.offline).toBe(false)
    expect(audit.entries[0]).toMatchObject({
      blueprint: 'coNNtent',
      pinned: 'V_0-14-1',
      adopted: 'V_0-15-0',
      status: 'update-available',
      gap: 'minor',
    })
  })

  it('degrades to unknown when no catalog is available', () => {
    const audit = lineageAudit([{ path: 'a_NN.md', parentUrl: URL('coNNtent', 'V_0-14-1') }], null)
    expect(audit.offline).toBe(true)
    expect(audit.entries[0]!.status).toBe('unknown')
  })

  it('reports a skew when members pin different versions', () => {
    const audit = lineageAudit(
      [
        { path: 'a_NN.md', parentUrl: URL('coNNtent', 'V_0-14-1') },
        { path: 'b_NN.md', parentUrl: URL('coNNtent', 'V_0-13-6') },
      ],
      catalog,
    )
    expect(audit.skews).toHaveLength(1)
    expect(audit.skews[0]).toMatchObject({
      blueprint: 'coNNtent',
      pinnedVersions: ['V_0-13-6', 'V_0-14-1'],
    })
  })

  it('does not report a skew for a local specialization', () => {
    const audit = lineageAudit(
      [{ path: 'domaiNN_NN.md', parentUrl: 'specs/bluepriNNts/local/spec_NN.md' }],
      catalog,
    )
    expect(audit.skews).toHaveLength(0)
    expect(audit.entries[0]!.status).toBe('unlisted')
  })
})

describe('buildReconciliationPlan', () => {
  it('groups every distributed instance into one unit', () => {
    const models = instances(24, 'V_0-14-1')
    const plan = buildReconciliationPlan(lineageAudit(models, catalog))

    expect(plan.units).toHaveLength(1)
    const unit = plan.units[0]!
    expect(unit.members).toHaveLength(24)
    expect(unit.targetVersion).toBe('V_0-15-0')
    expect(unit.hasSkew).toBe(false)
    expect(unit.members).toEqual([...unit.members].sort())
  })

  it('reports hasSkew for a pre-existing skew and still plans one unit', () => {
    const audit = lineageAudit(
      [
        { path: 'a_NN.md', parentUrl: URL('coNNtent', 'V_0-14-1') },
        { path: 'b_NN.md', parentUrl: URL('coNNtent', 'V_0-13-6') },
      ],
      catalog,
    )
    const plan = buildReconciliationPlan(audit)
    expect(plan.units).toHaveLength(1)
    expect(plan.units[0]!.hasSkew).toBe(true)
    expect(plan.units[0]!.members).toEqual(['a_NN.md', 'b_NN.md'])
  })

  it('produces no unit when every member is current', () => {
    const plan = buildReconciliationPlan(lineageAudit(instances(3, 'V_0-15-0'), catalog))
    expect(plan.units).toHaveLength(0)
  })

  it('never plans a local specialization as a target', () => {
    const models: LineageModelInput[] = [
      { path: 'domaiNN_NN.md', parentUrl: 'specs/bluepriNNts/local/spec_NN.md' },
      ...instances(2, 'V_0-14-1'),
    ]
    const plan = buildReconciliationPlan(lineageAudit(models, catalog))
    expect(plan.units).toHaveLength(1)
    expect(plan.units[0]!.members).not.toContain('domaiNN_NN.md')
  })

  it('keeps the planHash stable under member order', () => {
    const models = instances(4, 'V_0-14-1')
    const a = buildReconciliationPlan(lineageAudit(models, catalog))
    const b = buildReconciliationPlan(lineageAudit([...models].reverse(), catalog))
    expect(a.planHash).toBe(b.planHash)
    expect(a.planHash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('isPlanFresh', () => {
  const models = instances(3, 'V_0-14-1')
  const plan = buildReconciliationPlan(lineageAudit(models, catalog))

  it('is fresh when nothing changed', () => {
    expect(isPlanFresh(plan, models)).toBe(true)
  })

  it('is stale when a member was repinned', () => {
    const changed = models.map((m, i) =>
      i === 0 ? { ...m, parentUrl: URL('coNNtent', 'V_0-15-0') } : m,
    )
    expect(isPlanFresh(plan, changed)).toBe(false)
  })

  it('is stale when a member of the unit appears', () => {
    const added = [
      ...models,
      { path: 'episodes/scene-99_NN.md', parentUrl: URL('coNNtent', 'V_0-14-1') },
    ]
    expect(isPlanFresh(plan, added)).toBe(false)
  })

  it('is stale when a member disappears', () => {
    expect(isPlanFresh(plan, models.slice(1))).toBe(false)
  })

  it('stays fresh when an unrelated blueprint changes', () => {
    const unrelated = [
      ...models,
      { path: 'other_NN.md', parentUrl: URL('business', 'V_0-1-0') },
    ]
    expect(isPlanFresh(plan, unrelated)).toBe(true)
  })
})
