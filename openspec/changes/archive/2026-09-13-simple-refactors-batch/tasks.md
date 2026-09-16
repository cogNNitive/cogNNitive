# Tasks: Simple Refactors Batch

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~250 net, but the `schema.ts` split moves ~755 lines across files (large diff by line count, low actual behavior risk) |
| 400-line budget risk | High, driven entirely by file moves (items 2 and 4), not by logic changes |
| Chained PRs recommended | No — single-dev-branch workflow (commit to `dev`); split into 5 independent commits instead, one per item |
| Delivery strategy | Land each item as its own commit on `dev`; run full test+typecheck after each before moving to the next |

Decision needed before apply: No — all 5 items were already decided item-by-item with the user (see proposal.md).

## Status: all 5 phases applied and verified (2026-09-13)

Phases 1, 3, 5 applied directly. Phases 2 and 4 (multi-file) delegated to a
writer sub-agent each, then independently re-verified (typecheck + full test
suite re-run from a clean `innfo-core` build, diffs read in full) rather than
taking the agents' self-reports at face value.

**Unrelated finding during verification**: a concurrent, in-progress change to
`iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue` (a sidebar
focus/transition feature, not part of this batch, not written by this session)
was present in the shared working tree and broke 9 tests
(`LeftSidebar-ghost`, `LeftSidebar-ordering`, `LeftSidebar-template-taxonomy`,
`matrix-selection-index`, `ghost-groups.integration`). Isolated by
temporarily stashing only that one file and re-running those 5 test files
(14/14 passed with it removed, confirming this batch is not the cause). The
file was restored as-is — not this session's file to fix or revert.

## Phase 1 — db.ts session-state logging

- [x] 1.1 GREEN: added `console.warn` to `setSessionState`'s catch (`iNNfo/apps/innfo-editor/src/utils/db.ts:187`) and to `getSessionState`'s catch (line 167 — note: the real function name is `getSessionState`, not `getSessionStateAll` as originally written here). Left `dbGet`, `dbSet`, `dbGetAll`, `setTreeState`, `getTreeState`, `setSidebarWidth` catches untouched. No new test added — this is additive logging on an existing degrade-gracefully path, not a new observable contract.
- [x] 1.2 Verify: `npm test` in `iNNfo/apps/innfo-editor` green (662 passed, 2 skipped at time of this phase).

## Phase 2 — schema.ts split

- [x] 2.1–2.5 Done exactly as planned: `schema/{extract,compose,metaschema,index}.ts` created, old `schema.ts` deleted. One correction to the plan's assumption: grepped the full `src/` tree and found 13 internal consumers of `./schema` (not just `index.ts`/`browser.ts`/`mutate.ts`) — all resolve transparently to the new `schema/index.ts` barrel, no further changes needed.
- [x] 2.6 Verify: `npx tsc --noEmit` clean; `npm test` 707 passed / 1 skipped (708) — matches pre-change baseline exactly. Re-confirmed independently after the agent's own report.

## Phase 3 — mutate.ts registry

- [x] 3.1–3.2 Done: `runMutation`'s switch replaced with `MUTATION_HANDLERS: Record<string, MutationHandler>` plus explicit lookup, identical `Unknown operation: ${op}` fallback preserved.
- [x] 3.3 Verify: `npm test` in `iNNfo/packages/innfo-core` green (part of the same 707/708 run as phase 2).

## Phase 4 — workspaceStore → WorkspacePersistenceService

- [x] 4.1–4.3 Done, with 3 deviations from the original task wording (all necessary to preserve exact behavior, not scope creep):
  1. `saveActiveFileWithVersionBump`'s service function stops after marking the root dirty — it does NOT call the service's own `saveActiveFile`. The store's action calls the service function, then calls `this.saveActiveFile()` itself, so `this.saving`/`this.error` transitions happen exactly as before.
  2. `SaveWorkspaceModal.vue:207` called `workspaceStore._ensureGeneralSpec(handle)` directly (an undocumented external caller not mentioned in the original task) — updated to call the service's exported `_ensureGeneralSpec(handle, modelStore, uiStore)` instead.
  3. `tests/unit/file-system-ops.test.ts`'s two backup tests spied on `store._createBackup` (now removed from the store) — rewritten to assert the actual observable disk state (a `backups/` dir with one entry appears when enabled; `getDirectoryHandle('backups')` rejects when disabled).
- [x] 4.4 Verify: `npm run typecheck` (`vue-tsc --noEmit`) clean. `npm test` full suite: 653 passed / 2 skipped / 9 failed — the 9 failures isolated and confirmed unrelated (see "Unrelated finding" above); the 5 directly relevant spec files (`workspaceStore*.test.ts`, `file-system-ops.test.ts`) pass 43/43 in isolation. No live-browser manual smoke test was performed (File System Access API needs a real browser session) — confidence here rests on the automated specs, which do exercise save/backup/rename/version-bump against a mocked file-system-handle layer.

## Phase 5 — 'parser' category + as-any cleanup

- [x] 5.1–5.3 Done: added `'parser'` to the `category` union in `iNNfo/packages/innfo-core/src/types/validation.ts:26`; removed all 9 occurrences of `category: 'parser' as any` in `iNNfo/apps/innfo-editor/src/components/ValidationReport.vue` (traced the type end-to-end: `types/validation.ts` → `types.ts` barrel → `index.ts` → `shared/validation-types.ts` re-export → the component, confirming the fix actually reaches the call site rather than assuming it would).
- [x] 5.4 Verify: `npm run typecheck` in both packages clean (required a rebuild of `innfo-core`'s `dist/` first — the editor's typecheck reads the built output, not source, a known staleness gotcha in this repo). `npm test` green in both.
