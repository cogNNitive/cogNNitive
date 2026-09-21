# Tasks: Node Test Harness Migration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60-90 lines across 3 files |
| Largest single file change | `scripts/verify.js` (~50 lines) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | Single commit on `dev` / atomic verification |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Test Suite Renaming & Alignment

- [x] 1.1 Rename orphaned test suite `scripts/lib/test-shared-libs.js` to `scripts/lib/shared-libs.test.js`.
- [x] 1.2 Verify `node scripts/lib/shared-libs.test.js` executes standalone and passes.

## Phase 2: Verification Harness Implementation

- [x] 2.1 Implement recursive test suite collector `collectTestSuites(dir, results)` in `scripts/verify.js` matching `*.test.js` and `*.test.mjs` while pruning `node_modules`.
- [x] 2.2 Replace static test suite invocations in `scripts/verify.js` with dynamic discovery while preserving explicit runners for `skills/nn-trannsform/test/run.js` and `iNNfo/specs/scripts/test-vocabulary.js`.
- [x] 2.3 Preserve all 11 `--check` drift guards in their exact sequence with fail-fast exit semantics.

## Phase 3: Specification Integration

- [x] 3.1 Update `openspec/specs/quality-gates/spec.md` to reflect dynamic discovery and execution of `*.test.js`/`*.test.mjs` suites.
- [x] 3.2 Ensure requirement scenarios match delta spec in `openspec/changes/2026-09-21-node-test-harness-migration/specs/quality-gates/spec.md`.

## Phase 4: Local Verification & Gate

- [x] 4.1 Run `node scripts/verify.js` and confirm discovery and execution of all 20 conforming test suites.
- [x] 4.2 Confirm explicit runners and all 11 `--check` drift guards pass cleanly with exit code 0.
