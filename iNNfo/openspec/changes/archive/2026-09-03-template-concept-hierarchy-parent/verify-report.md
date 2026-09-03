# Verification Report: Template Concept Hierarchy via `parent::` Field

**Change ID:** `template-concept-hierarchy-parent`
**Date:** 2026-09-02
**Status:** PASS

## Summary

The proposal to move concept hierarchy definitions to `parent::` within `# NN Concept Definition` and prohibit/deprecate taxonomy overrides in Level 3 models has been fully specified and implemented in `@cognnitive/innfo-core`.

## Automated Verifications

1. **TypeScript Build (`npm run build`):**
   - Command: `tsc` via `npm run build` in `packages/innfo-core`
   - Exit code: 0
   - Clean compilation of all interfaces and modules.

2. **Dedicated Test Suite (`tests/template-concept-hierarchy.test.ts`):**
   - Command: `npx vitest run tests/template-concept-hierarchy.test.ts`
   - Result: 7/7 passing (100%)
   - Covered scenarios:
     - Extraction of `parent::` (with and without WikiLinks) into `Concept.parent`.
     - Dynamic construction of `TaxonomyEdge[]` from concept declarations in document order.
     - Fallback to `# NN index` when no `parent::` fields are declared (legacy compatibility).
     - Validation error (`template-parent-not-found`) for non-existent parent concept references.
     - Validation error (`template-parent-cycle`) for circular parent hierarchies.
     - Validation pass without warning for Level 2 templates using `parent::` without `# NN index`.
     - Validation warning (`l3-index-ignored`) when Level 3 models include `# NN index`.
     - Hierarchy consistency validation (`validateTaxonomyHierarchy`) strictly enforcing `templateTaxonomy` over any Level 3 model taxonomy.

3. **Regression Tests:**
   - Command: `npx vitest run tests/index.test.ts tests/template-concept-hierarchy.test.ts`
   - Result: 90/90 passing (100%).
