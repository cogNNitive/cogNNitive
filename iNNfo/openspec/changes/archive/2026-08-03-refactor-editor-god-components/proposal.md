# Proposal: Refactor Editor God Components

## Intent

Six oversized files in `apps/innfo-editor` (803–1295 lines) mix presentation with business logic, FS/scaffolding logic, and cross-file duplicated helpers; `packages/innfo-core/src/recursiveParser.ts` (681 lines) mixes four concerns in one module. Extract those concerns into the project's **existing** conventions — `composables/` folders (already used for `useFileSystem`, `useGraphData`) and concern-based folder splits (already used by `parser/`). No new pattern is invented. `DirectoryPickerModal.vue` (842 lines) is dead code and is deleted.

## Scope

### In Scope

1. Split `recursiveParser.ts` → `recursiveParser/` folder (`paths`, `normalize`, `model`, `workspace`, `index` barrel), transparent to `export * from './recursiveParser'`.
2. Dedup shared helpers: identical `getConceptMeta` / `getMatrixValueCount`; unify the `__matrix_defs` / `MATRIX_DEFS_KEY` pattern (7 call sites).
3. Extract composables from `LeftSidebar.vue`, `MatricesGrid.vue`, `ModelInfoPanel.vue`, `SetupWizard.vue`, `BlockSheet.vue`.
4. Delete `DirectoryPickerModal.vue` after a final re-verification search, plus its stale references.

### Out of Scope

- Any behavior change, new feature, or UX change.
- `GraphViewer.vue` and any file not listed in the exploration.
- Introducing linting/CI (already present — see Risks).
- Deciding `ModelInfoPanel`'s regex frontmatter parsing vs `innfo-core` `parseFrontmatter` — deferred to sdd-design.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `file-system-ops`: **R-FS-01 mandates `DirectoryPickerModal.vue` MUST exist.** Deleting it requires a REMOVED/MODIFIED delta; the live directory-open path is `HomeView.vue` / `SetupWizard.vue` / `SaveWorkspaceModal.vue` via `useFileSystem.ts`.

## Approach

Risk-ordered, not size-ordered: (1) `recursiveParser.ts` (strongest test net, no Vue), (2) shared dedup (blocks 3–4, else duplicates get re-encoded twice), (3) `LeftSidebar.vue` (also unify its two internal tree builders), (4) `MatricesGrid.vue`, (5) `ModelInfoPanel.vue`, (6) `SetupWizard.vue`, (7) `BlockSheet.vue` — which requires a new Vitest component test **before** extraction (zero component coverage today, e2e only). Composable surfaces stay test-importable so existing coverage migrates.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/innfo-core/src/recursiveParser.ts` | Modified | → `recursiveParser/` folder |
| `apps/innfo-editor/src/components/editor/{BlockSheet,ModelInfoPanel,MatricesGrid}.vue` | Modified | Logic → composables |
| `apps/innfo-editor/src/components/layout/{LeftSidebar,SetupWizard}.vue` | Modified | Logic → composables |
| `apps/innfo-editor/src/components/layout/DirectoryPickerModal.vue` | Removed | Dead code |
| `apps/innfo-editor/src/composables/`, `.../editor/composables/`, `utils/` | New | Extracted modules |
| `openspec/specs/file-system-ops/spec.md` | Modified | R-FS-01 delta |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `SetupWizard.vue` (1295 lines) alone likely exceeds the 1500-line review budget for a `single-pr` delivery | High | **Open question, not decided here**: sdd-tasks must forecast and propose a dedicated slice |
| `BlockSheet.vue` has no component test | High | Add test first; extraction blocked until it passes |
| Exploration claimed "no linter/CI enforced" — **incorrect**: `.github/workflows/ci.yml` runs lint, typecheck, all test suites, and build on every PR | Confirmed | Treat CI as the safety net; new files must be Prettier-clean (changed-file format gate) |
| Dedup before extraction is skipped → duplicates encoded into two composables | Med | Sequencing enforced in tasks |
| Silent behavior drift during extraction | Med | Existing tests must pass **unmodified** |

## Rollback Plan

Each numbered step is an independent commit with a green suite; revert the offending commit. `recursiveParser/` reverts to a single file behind the unchanged barrel export. `DirectoryPickerModal.vue` deletion reverts via `git revert`; its spec delta reverts with it.

## Dependencies

- None external. Step 2 blocks steps 3–4; `BlockSheet` test blocks step 7.

## Success Criteria

- [ ] `npm run lint`, `npm run typecheck`, `npm run test` pass.
- [ ] All pre-existing tests pass **unmodified** (only additions: new `BlockSheet` component test; only removals: dead `DirectoryPickerModal` references).
- [ ] No public API/behavior change; `innfo-core` barrel exports byte-identical surface.
- [ ] All 6 components and `recursiveParser` measurably reduced; no helper duplicated across files.
- [ ] `rg "DirectoryPickerModal"` returns no `src/` or `e2e/` matches.

## Open Questions (for sdd-design / sdd-tasks)

1. `ModelInfoPanel`: keep hand-rolled regex frontmatter parsing or adopt `innfo-core` `parseFrontmatter`? (`docs/code-quality-review-guide.md` §3.1 flags it as a layer violation.)
2. Delivery: is `single-pr` still viable, or does `SetupWizard` need its own slice?
3. `file-system-ops` R-FS-01: REMOVE outright, or MODIFY to describe the live `useFileSystem`-based path?

## Proposal question round

Execution mode is `auto`, so these were not asked interactively. Assumptions needing user review:

- **A1**: The refactor is developer-facing only; no end-user-visible change is acceptable, including timing/ordering side effects.
- **A2**: Deleting `DirectoryPickerModal.vue` is accepted even though `openspec/specs/file-system-ops/spec.md` R-FS-01 currently requires it — the spec is treated as stale, not the code as missing.
- **A3**: "Structural refactor only" means test files are not rewritten to fit new module shapes; if a test must change, that signals behavior drift and stops the step.
- **A4**: Reducing file size is the means, not the goal — the goal is one responsibility per module, reusable across call sites.
