# Tasks: Domain Lineage Update Implementation

> The mutation engine (Batches 1–2) ships first and is useful on its own. The vocabulary
> rename (Batches 3–4) is the high-churn half and lands separately.

## Batch 1: Core Lineage Types & Planning
- [x] 1.1 Define `LineageAuditResult`, `ReconciliationPlan`, `ReconciliationUnit` and `LineageMutationOp` in `iNNfo/packages/nn-core/src/changeset/lineage/`.
- [x] 1.2 Implement the pure planner: group models by blueprint name, collect `pinnedVersions`, compute `targetVersion` from `catalog.json`, flag `hasSkew`, and compute a deterministic `planHash` over canonicalized member paths and pins.
- [x] 1.3 Implement `isPlanFresh(plan, models)` (pure — the caller supplies the current model pins) returning false on any added, removed or repinned member of a planned unit.
- [x] 1.4 Add unit tests in `iNNfo/packages/nn-core/tests/` for grouping, skew detection and `planHash` stability under key ordering.

> Note: the catalog already emits `name`, `adopted` and `versions[].blueprint_version` (`scripts/blueprint-catalog.mjs`; asserted in `scripts/blueprint-catalog.test.mjs`). No catalog change is required here — do not add a parallel metadata field.

## Batch 2: Changeset Lineage Mutation Engine
- [ ] 2.1 Add the lineage operations to the shared contract: `repin_blueprint`, `rename_field`, `set_field_default` in `CHANGE_OPS` (`iNNfo/packages/nn-core/src/changeset/types.ts`), with their structural validators in `extractInstanceProblems`-style form.
- [ ] 2.2 Implement `buildLineageChangeset()` in `iNNfo/packages/nn-core/src/changeset/lineage/builder.ts` as a **pure** AST transform: `parseKnowledge()` on the model, schema diff against the target blueprint, emit a `ChangesetDocument`.
- [ ] 2.3 Implement the mutations themselves in the core mutation layer (`iNNfo/packages/nn-core/src/mutate.ts`) so the ops behave like every other op. Do **not** write directly from the skill.
- [ ] 2.4 Verify the ops execute through the existing transaction pipeline in `iNNfo/packages/nn-mcp/src/tools/apply-change.ts` (`executeChangesetApply`) — the apply engine lives in `nn-mcp`, not in `nn-core`; a change that needs both sides must cross that boundary explicitly, never by importing `nn-mcp` from `nn-core`.
- [ ] 2.5 Unit test `buildLineageChangeset` and atomic application across both compact models and distributed collection models.

## Batch 3: `nn-update` Skill & Reconciliation Engine
- [ ] 3.1 Create `skills/nn-update/` from `skills/nn-upgrade/`; rename internal routines from `upgrade` to `lineageReconcile` / `update`.
- [ ] 3.2 Delete `repinContent` and its call site in `scripts/apply-upgrade-plan.js`; the reconcile step must call `buildLineageChangeset()` and apply through the transaction pipeline. Keep the all-or-none rollback and the pre-write workspace backup (`scripts/backup-workspace.js`).
- [ ] 3.3 Reduce `skills/nn-upgrade/` to a thin deprecation pointer that forwards to `nn-update` and logs a notice.
- [ ] 3.4 Update `manifest/source.yaml` (`skills` entry), `scripts/lib/skills-commands.js` and `skills/nn-skills-lifecycle/scripts/skills-manager.js` for the new skill name.
- [ ] 3.5 Add automated tests: multi-model distributed reconciliation, all-or-none on validation failure, and the deprecation pointer.

## Batch 4: Preflight, Vocabulary Migration & Docs
- [ ] 4.1 Rename `skills/nn-preflight/scripts/upgrade-check.js` to `lineage-audit.js` (keep `upgrade-check.js` as a deprecated shim for one release) and support `--audit-lineage`.
- [ ] 4.2 Emit canonical keys (`update-available`, `updateStatus`) alongside the deprecated (`upgrade-available`) aliases; update `skills/nn-preflight/SKILL.md` (Tier 3 section) and `preflight-check.js`.
- [ ] 4.3 Update every reference to the retired vocabulary in primary documentation and living specs: `docs/documentation/content/skills/*`, `_sidebar.md`, `ai-index.yaml`, and the `nn-innfo` / `nn-sources` skill text that links to `nn-upgrade`.
- [ ] 4.4 Update preflight tests and add a regression test asserting the deprecated keys still parse.

## Batch 5: OpenSpec Delta Sync & Verification
- [ ] 5.1 Run `node scripts/check-openspec-deltas.mjs` and confirm every delta block is well formed.
- [ ] 5.2 Run `node scripts/verify.js` and confirm zero regressions across packages, mirrors and skills.
