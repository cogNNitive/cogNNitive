# Archive Report: defiNNe-v0-1-1-patch

**Archived**: 2026-07-03
**Archive Path**: `openspec/changes/archive/2026-07-03-defiNNe-v0-1-1-patch/`

## Change Summary

Rename `parent` → `parent_spec` in spec frontmatter across specs + code. Bump defiNNe to V_0-1-1 with `_F.md` suffix. Add deprecation notices on superseded FORMAT specs and compliance docs for the format editor.

## Intent

Eliminate ambiguity between generic `parent` refs and the spec parent chain by using the explicit field name `parent_spec`.

## Task Completion

| # | Task | Status |
|---|------|--------|
| 1 | `types.ts`: Rename `SpecFrontmatter.parent` → `parent_spec` | ✅ |
| 2 | `parser.ts`: Update `parseFrontmatter` + `serializeModel` | ✅ |
| 3 | `resolver.ts`: Update `fm.parent` → `fm.parent_spec` | ✅ |
| 4 | `validator.ts`: Update `fm.parent` → `fm.parent_spec` | ✅ |
| 5 | `useConceptVisuals.ts`: Update accessor | ✅ |
| 6 | `tests/index.test.ts`: Update assertions + fixtures | ✅ |
| 7 | Create `specs/defiNNe_V_0-1-1_F.md` (V_0-1-1 bump, `_F.md` suffix) | ✅ |
| 8 | `FORMAT_V_0-1-5_F.md`: Update `parent:` → `parent_spec:` | ✅ |
| 9 | `business_V_0-1-1_FORMAT.md`: Update `parent:` → `parent_spec:` | ✅ |
| 10 | `procedures_V_0-1-1_FORMAT.md`: Update `parent:` → `parent_spec:` | ✅ |
| 11 | `catalog_V_0-1-2_FORMAT.md`: Update `parent:` → `parent_spec:` | ✅ |
| 12 | Sample models (3 files): Update frontmatter | ✅ |
| 13 | `FORMAT_V_0-1-4_FORMAT.md`: Add deprecation notice | ✅ |
| 14 | `FORMAT_V_0-1-2_FORMAT.md`: Add deprecation notice | ✅ |
| 15 | Create `apps/format-editor/docs/compliance/README.md` | ✅ |
| 16 | Grep sweep + compile + test | ✅ |

**16/16 tasks complete.**

## Artifacts Archived

| Artifact | Present |
|----------|---------|
| proposal.md | ✅ |
| specs/ (delta) | ❌ — Not produced; change applied directly to spec files |
| design.md | ❌ — Not produced; mechanical rename with no design decisions |
| tasks.md | ✅ |
| verify-report.md | ❌ — Not produced; verified via Tasks 16 |

**Note**: This was a mechanical rename change. No design phase was needed (pure field rename, no architectural decision). No delta specs were produced — changes were applied directly to the target spec and code files. The orchestrator confirmed verification was completed.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| N/A | No delta specs to merge | Change applied directly to spec files |

The change files affected live in `specs/` (root) and `packages/format-core/`, not in `openspec/specs/`. No main specs to update.

## Affected Files (from tasks.md appendix)

| # | File | Action |
|---|------|--------|
| 1 | `packages/format-core/src/types.ts` | Edit |
| 2 | `packages/format-core/src/parser.ts` | Edit |
| 3 | `packages/format-core/src/resolver.ts` | Edit |
| 4 | `packages/format-core/src/validator.ts` | Edit |
| 5 | `apps/format-editor/src/composables/useConceptVisuals.ts` | Edit |
| 6 | `packages/format-core/tests/index.test.ts` | Edit |
| 7 | `specs/defiNNe_V_0-1-1_F.md` | Create |
| 8 | `specs/FORMAT_V_0-1-5_F.md` | Edit |
| 9 | `specs/business_V_0-1-1_FORMAT.md` | Edit |
| 10 | `specs/procedures_V_0-1-1_FORMAT.md` | Edit |
| 11 | `specs/catalog_V_0-1-2_FORMAT.md` | Edit |
| 12 | 3 sample models (`Ghostbusters`, `CodeReviewProcess`, `Music_History`) | Edit |
| 13 | `specs/FORMAT_V_0-1-4_FORMAT.md` | Edit |
| 14 | `specs/FORMAT_V_0-1-2_FORMAT.md` | Edit |
| 15 | `apps/format-editor/docs/compliance/README.md` | Create |

## Archival Notes

- **Intentional partial archive**: No `specs/` delta folder, `design.md`, or `verify-report.md` artifacts were produced for this change — it was a mechanical rename patch that did not require those phases. The orchestrator confirmed full implementation and verification.
- **No state.yaml**: This minimal change did not use DAG state tracking.
- **No openspec/config.yaml**: Project config not present.
- **Archive type**: Clean — all completed work, no stale checkboxes.
