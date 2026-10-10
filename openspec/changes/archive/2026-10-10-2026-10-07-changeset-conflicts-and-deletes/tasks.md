# Tasks: Changeset Conflicts and Deletes (Slice S2b)

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 600–900 lines |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR (Slice S2b engine-only delivery) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

## Phase 1: Foundation & Types

- [x] 1.1 Extend `ChangeStatus` in `iNNfo/packages/innfo-core/src/changeset/types.ts` to include `'partially_applied'`.
- [x] 1.2 Update `ChangesetApplyResult` in `types.ts` with `conflictedCount?: number` and export guards.
- [x] 1.3 Add NodeNext export declarations in `iNNfo/packages/innfo-core/src/changeset/index.ts`.

## Phase 2: Core Pure Logic (Strict TDD)

### 2A. Batch Slug Collision & Intra-Batch Rewriting (`slugs.ts`)
- [x] 2.1 [RED] Write failing tests in `tests/changeset/slugs.test.ts` for document-order collision, auto-suffixing `-N`, intra-batch target/wikilink rewriting, and `EMPTY_SLUG` conflict.
- [x] 2.2 [GREEN] Implement `resolveBatchSlugs` in `src/changeset/slugs.ts` satisfying all slug collision and rewriting test cases.
- [x] 2.3 [REFACTOR] Clean up AST traversals and ensure type-safe regex replacements.

### 2B. Delete Impact, Matrix Cascade & Reference Scanning (`impact.ts`)
- [x] 2.4 [RED] Write failing tests in `tests/changeset/impact.test.ts` for matrix cell cascades, workspace reference detection (`REFERENCED_BY`), and in-batch companion satisfaction.
- [x] 2.5 [GREEN] Implement `computeMatrixCascade`, `scanIncomingReferences`, and `evaluateBatchDeleteImpact` in `src/changeset/impact.ts`.
- [x] 2.6 [REFACTOR] Optimize model scanning and eliminate duplicate reference checks.

### 2C. History Reverse-Scan & Staleness Check (`history.ts`)
- [x] 2.7 [RED] Write failing tests in `tests/changeset/history.test.ts` for reverse scan of `changes/` (cap 50), `STALE_TARGET_DELETED` conflict, and lifecycle reset on `add_element`.
- [x] 2.8 [GREEN] Implement `checkStaleTarget` in `src/changeset/history.ts` satisfying reverse-scan and lifecycle reset tests.
- [x] 2.9 [REFACTOR] Extract shared changeset filename parser and timestamp comparator.

### 2D. Conflict Partitioning Coordinator (`conflicts.ts`)
- [x] 2.10 [RED] Write failing tests in `tests/changeset/conflicts.test.ts` for `partitionChangeset` segregating clean vs conflicted operations.
- [x] 2.11 [GREEN] Implement `partitionChangeset` in `src/changeset/conflicts.ts` integrating slug, impact, history, and `from` precondition diagnostics.
- [x] 2.12 [REFACTOR] Harmonize diagnostic messages with spec codes (`PRECONDITION_FAILED`, `EMPTY_SLUG`, `REFERENCED_BY`, `STALE_TARGET_DELETED`).

## Phase 3: Engine Integration & Transaction Partition (`apply-change.ts`)

- [x] 3.1 [RED] Write failing tests in `innfo-mcp/test/apply-change.test.ts` for mixed-batch `partially_applied`, zero-write all-conflicted exit, touched-only version bumps, and idempotent replays.
- [x] 3.2 [GREEN] Integrate `resolveBatchSlugs`, `evaluateBatchDeleteImpact`, and `partitionChangeset` into `executeChangesetApply` in `innfo-mcp/src/tools/apply-change.ts`.
- [x] 3.3 [GREEN] Implement zero disk writes / zero snapshot abort when clean subset is empty (`status: conflict`).
- [x] 3.4 [GREEN] Restrict version bump and snapshot archival to models with applied changes; set frontmatter `status` (`applied` vs `partially_applied`).
- [x] 3.5 [GREEN] Update idempotent replay handler to accept `partially_applied` changesets with matching `result_version`.
- [x] 3.6 [REFACTOR] Modularize `executeChangesetApply` helper routines and ensure lock release in `finally`.

## Phase 4: Full Verification & Gate Sweep

- [x] 4.1 Run unit test suites: `npm --workspace=@cognnitive/innfo-core test`.
- [x] 4.2 Run integration test suites: `npm --workspace=@cognnitive/innfo-mcp test`.
- [x] 4.3 Run workspace typecheck: `npm run typecheck`.
- [x] 4.4 Run full repository integrity gate: `node scripts/check-integrity.js`.
