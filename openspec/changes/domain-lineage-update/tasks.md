# Tasks: Domain Lineage Update Implementation

## Batch 1: Core Lineage Types & Vocabulary Alignment
- [ ] 1.1 Define `LineageAuditResult`, `ReconciliationPlan`, `ReconciliationUnit`, and `LineageChangeOp` in `iNNfo/packages/nn-core/src/scope/` or `changeset/`.
- [ ] 1.2 Update `scripts/template-catalog.mjs` to emit canonical lineage metadata (`adopted`, `versions`) alongside legacy aliases.
- [ ] 1.3 Add unit tests in `nn-core/tests/` for lineage planning and group unit resolution.

## Batch 2: Changeset Lineage Mutation Engine
- [ ] 2.1 Implement `buildLineageChangeset()` in `iNNfo/packages/nn-core/src/changeset/lineage-builder.ts`:
  - Typed AST-based `repin_blueprint` mutation (updating `parent_spec.name`, `parent_spec.url`, `blueprint_version`).
  - AST-based `rename_concept` mutation for section heading updates.
  - AST-based `rename_field` mutation for attribute updates.
  - AST-based `set_field_default` mutation for newly required schema fields.
- [ ] 2.2 Wire lineage mutations into `applyMutation()` and `executeChangesetApply()` so lineage changesets execute through the standard Changeset transaction pipeline.
- [ ] 2.3 Unit test `buildLineageChangeset` and atomic application across both compact models and distributed collection models.

## Batch 3: `nn-update` Skill & Reconciliation Engine
- [ ] 3.1 Create `skills/nn-update/` (or refactor `skills/nn-upgrade/` as canonical `nn-update`):
  - Rename internal routines from `upgrade` to `lineageReconcile` / `update`.
  - Replace `repinContent` regex string patching with `buildLineageChangeset()` and `executeChangesetApply()`.
  - Maintain the all-or-none rollback and pre-write workspace backup safety gates.
- [ ] 3.2 Provide `skills/nn-upgrade/` as a thin deprecation pointer to `nn-update` for backwards compatibility.
- [ ] 3.3 Add automated tests for multi-model distributed concept reconciliation and all-or-none validation failures.

## Batch 4: Preflight Integration & Vocabulary Migration
- [ ] 4.1 Update `skills/nn-preflight/scripts/upgrade-check.js` (aliased as `lineage-audit.js`):
  - Support `--audit-lineage` flag.
  - Emit canonical classification keys (`update-available`, `updateStatus`).
  - Expose `--plan` with typed `ReconciliationPlan`.
- [ ] 4.2 Update preflight test suites to verify new terminology and compatibility with legacy consumers.

## Batch 5: OpenSpec Delta Sync & Verification
- [ ] 5.1 Run `node scripts/check-openspec-deltas.test.mjs` and ensure all OpenSpec deltas and schemas agree.
- [ ] 5.2 Run workspace `node scripts/verify.js` to ensure zero regressions across all packages, mirrors, and skills.
