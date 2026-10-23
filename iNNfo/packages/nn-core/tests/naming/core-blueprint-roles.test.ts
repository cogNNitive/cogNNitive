import { describe, it, expect } from 'vitest'
import { roleOf } from '../../src/naming/contract.js'

/**
 * Characterization pin for the core-blueprint role decisions.
 *
 * Change A (declarative-blueprint-nature) removes the name regex
 * (`NON_KNOWLEDGE_BLUEPRINT_RE`) from `roleOf` in favour of a compiled
 * `blueprint -> { role, nature }` map. This test freezes today's decision for
 * every core blueprint so the refactor cannot silently change a role.
 *
 * The roles `changeset` (blueprint `changes`) and `lineage-record` (blueprint
 * `cognnitive`) have live consumers in `lineage/` (`project.ts`, `fs-snapshot.ts`,
 * `record.ts`); keeping them stable is what lets lineage stay untouched.
 *
 * It MUST stay GREEN before AND after the refactor.
 */
describe('core blueprint role decisions (characterization pin)', () => {
  const cases: Array<{ label: string; path: string; parentSpecName: string; role: string }> = [
    {
      label: 'cognnitive -> lineage-record',
      path: 'cognnitive_V_0-1-0_NN.md',
      parentSpecName: 'cognnitive_V_0-1-0',
      role: 'lineage-record',
    },
    {
      label: 'sidecar -> sidecar',
      path: 'topic_sidecar_NN.md',
      parentSpecName: 'sidecar',
      role: 'sidecar',
    },
    {
      label: 'changes -> changeset',
      path: 'changes/c1_changes_NN.md',
      parentSpecName: 'changes',
      role: 'changeset',
    },
    {
      label: 'changes (versioned) -> changeset',
      path: 'changes/c1_changes_NN.md',
      parentSpecName: 'changes_V_0-5-2',
      role: 'changeset',
    },
    {
      label: 'workspace -> catalog',
      path: 'workspace_snapshot_NN.md',
      parentSpecName: 'workspace',
      role: 'catalog',
    },
    {
      label: 'sources -> catalog',
      path: 'sources/catalog_NN.md',
      parentSpecName: 'sources',
      role: 'catalog',
    },
    {
      label: 'artifacts -> catalog',
      path: 'artifacts/catalog_NN.md',
      parentSpecName: 'artifacts',
      role: 'catalog',
    },
    {
      label: 'procedures catalog -> catalog',
      path: 'procedures/procedures_NN.md',
      parentSpecName: 'procedures',
      role: 'catalog',
    },
    {
      label: 'procedures submodel -> procedure',
      path: 'procedures/onboarding_procedures_NN.md',
      parentSpecName: 'procedures',
      role: 'procedure',
    },
    {
      label: 'domain blueprint -> knowledge',
      path: 'pricing_NN.md',
      parentSpecName: 'business',
      role: 'knowledge',
    },
    {
      label: 'L1 parent (iNNfo) -> knowledge',
      path: 'pricing_NN.md',
      parentSpecName: 'iNNfo_V_0-5-0',
      role: 'knowledge',
    },
  ]

  for (const c of cases) {
    it(`classifies ${c.label}`, () => {
      expect(roleOf({ path: c.path, parentSpecName: c.parentSpecName })).toBe(c.role)
    })
  }
})
