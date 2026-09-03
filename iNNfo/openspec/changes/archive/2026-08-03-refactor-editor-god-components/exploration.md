# Exploration: Refactor Editor "God Components"

Investigation of 6 oversized files in `apps/innfo-editor` plus one monolithic file
in `packages/innfo-core`, to plan extraction into the existing composable/module
conventions. Investigation-only — no implementation in this phase.

Sources cross-checked:
- `apps/innfo-editor/src/components/editor/{BlockSheet,ModelInfoPanel,MatricesGrid}.vue`
- `apps/innfo-editor/src/components/layout/{LeftSidebar,SetupWizard,DirectoryPickerModal}.vue`
- `packages/innfo-core/src/recursiveParser.ts`, `packages/innfo-core/src/parser/*`
- `apps/innfo-editor/src/composables/*`, `apps/innfo-editor/src/components/editor/composables/*`
- `apps/innfo-editor/tests/`, `apps/innfo-editor/e2e/`
- `docs/code-quality-review-guide.md`

---

## 1. Per-file responsibility breakdown

| File | Verified size | Distinct responsibilities |
|---|---|---|
| `BlockSheet.vue` | 893 lines — template ~443 / script ~449 (**corrects initial assumption of a 30-line template**) | (a) display/formatting (`cleanConceptName`, `stripBlockDefinitions`, `renderedDescription`); (b) a hand-rolled markdown-source reconstructor (`rawMarkdown`, ~80 lines) that duplicates serialization already owned by `innfo-core`'s `serializeModel`; (c) tree/breadcrumb walking (`treePath`, `treeSiblings`, `rootNodeId`); (d) asset resolution incl. FS blob-URL resolution (`resolveAssetUrl`, `assetItems`); (e) a matrix-presence check duplicating the `__matrix_defs` pattern (see §3); (f) plain UI handlers bound to store mutations. |
| `LeftSidebar.vue` | 959 lines — template 298 / script 658 | `compareSemVer`; matrix helpers (`extractMatrixDefs`, `getMatrixValueCount`, `MATRIX_DEFS_KEY`); `getConceptMeta`; `mergedConcepts` (multi-model ghost-aware taxonomy tree builder, ~130 lines) and `getConceptsForModel` (a near-identical per-model variant, ~90 lines, duplicated **within the same file**); expand/collapse state; ghost-concept click handling. |
| `SetupWizard.vue` | 1295 lines — script ~586 / template ~267 / style ~437 | `initWorkspaceStructure`, `createIndexMd`, `prepopulateSpecs`, `getStarterByTemplate` — pure workspace-scaffolding/FS-writing logic, independent `TemplateChoice` union. |
| `ModelInfoPanel.vue` | 873 lines — template 299 / script 371 | Two clusters: (a) frontmatter regex-parsing (`extractFrontmatterField`, `extractNestedFieldValue`, `parseVersionString`) that hand-rolls what `parseFrontmatter` in `innfo-core` already does — flagged by the project's own `docs/code-quality-review-guide.md` §3.1 as a layer violation; (b) version-bump preview/filename logic (`versionPreview`, `filenamePreview`, `saveVersion`), a clean composable candidate. |
| `DirectoryPickerModal.vue` | 842 lines | Folder picker, URL loader, its own folder-init template selector (diverges from SetupWizard's), history reopen, `generatePreview`. **Appears to be dead code — see Risks.** |
| `MatricesGrid.vue` | 803 lines — template 360 / script 440 | Virtualizer setup (template-bound, stays); cell get/set (`matrixCellKey`, `getVal`/`setVal`); cycle/heatmap color logic; value-distribution stats; `getConceptMeta`/`getMatrixValueCount` — **byte-for-byte duplicated from `LeftSidebar.vue`**. |
| `recursiveParser.ts` (innfo-core) | 681 lines | Path resolution (`resolveGraphEdgeTarget`/`resolveQualifiedIdToPath`, pure, ~40 lines); ParsedModel→graph normalization (`normalizeElementsIntoGraph`, `resolveElementAssets`, `toFieldValues`, `toLocalMetamodel`, `buildTaxonomyParentMap`, ~200 lines); single-model registration (`normalizeSingleModel`, `parseAndRegisterModel`, ~140 lines); workspace/FS traversal orchestration (`recursiveParse`, ignore/wikilink handling, ~180 lines, only I/O-heavy part). |

## 2. Test coverage per file (risk driver)

| File | Direct coverage | Detail |
|---|---|---|
| `recursiveParser.ts` | Strong | 22 tests in `packages/innfo-core/tests/recursive-parser.test.ts` + 6 in the app-level unit test + golden round-trip/CRLF tests. Lowest risk. |
| `LeftSidebar.vue` | Yes | `LeftSidebar-ghost.test.ts`, `LeftSidebar-matrix-details.test.ts`, `LeftSidebar-ordering.test.ts` — mount the real component. |
| `MatricesGrid.vue` | Yes | `MatricesGrid.test.ts` mounts the real component (virtualizer mocked). |
| `SetupWizard.vue` | Yes | `setupWizard-workflows.integration.test.ts` mounts the component and exercises scaffolding end-to-end against a fake FS tree. |
| `ModelInfoPanel.vue` | Partial | `ModelInfoPanel-version.test.ts` covers only the version-bump/frontmatter-version path. |
| `BlockSheet.vue` | **None** | Only Playwright `e2e/03-block-sheet.spec.ts` (browser-level). No Vitest component test mounts it. |
| `DirectoryPickerModal.vue` | **None** | `tests/unit/file-system-ops.test.ts` tests only the already-extracted `isFileSystemAccessSupported()` composable, not the component. |

## 3. Cross-file duplication found

- `getConceptMeta` and `getMatrixValueCount` are **byte-for-byte identical** (including JSDoc) between `LeftSidebar.vue` and `MatricesGrid.vue`.
- The `__matrix_defs`/`extractMatrixDefs`/`MATRIX_DEFS_KEY` pattern is duplicated across at least 7 locations: `LeftSidebar.vue`, `MatricesGrid.vue`, `MetamatrixConfig.vue`, `BlockMatrixSummary.vue`, `BlockSheet.vue`, `WorkspaceView.vue`, `SpecResolverService.ts`.
- `LeftSidebar.vue` duplicates its own concept-tree-building algorithm internally between `mergedConcepts` (~lines 536-607) and `getConceptsForModel` (~lines 883-919).

Extracting per-file first (without deduplicating) would re-encode these duplicates into two separate composables instead of removing them.

## 4. Recommended extraction order (risk-ordered, not file-size-ordered)

1. **`recursiveParser.ts`** — independent of the Vue app, richest test net, unambiguous target shape. Split into a `recursiveParser/` folder (transparent to the existing `export * from './recursiveParser'` in `index.ts`): `paths.ts`, `normalize.ts`, `model.ts`, `workspace.ts`, `index.ts` barrel. This mirrors the *decomposition style* of `parser/` (concern-based), not a literal 1:1 file mapping — `parser/graph.ts` serves a different, display-tree concern over an already-parsed model.
2. **Shared cross-cutting composables** (blocks steps 3–4): unify the `__matrix_defs` pattern into one composable/util; extract the verified-identical `getConceptMeta`/`getMatrixValueCount` into a shared module. Both target files already have direct tests, so this dedup is low-risk to validate.
3. **`LeftSidebar.vue`** — good coverage. Extract `compareSemVer` → `utils/version.ts`; matrix helpers → step-2 composable; expand/collapse state → `useTreeExpansion.ts`; unify the two internal tree-building implementations into one parameterized `buildConceptTree()`.
4. **`MatricesGrid.vue`** — good coverage. Reuse step-2 composable; extract cell get/set into `useMatrixCells.ts`; color/heatmap mapping into `useMatrixColors.ts`. Virtualizer setup stays (template-bound).
5. **`ModelInfoPanel.vue`** — only the version path is pinned by tests; add component tests for template-name/extension-resolution before or during extraction. Two composables: `useModelFrontmatter.ts` (flag to design phase: keep hand-rolled regex vs switch to `innfo-core`'s `parseFrontmatter`) and `useVersionBump.ts` (safe to extract as-is).
6. **`SetupWizard.vue`** — largest file, but solid integration coverage. Extract `initWorkspaceStructure`, `createIndexMd`, `prepopulateSpecs`, `getStarterByTemplate` into `useWorkspaceScaffolding.ts`, keeping the composable's surface test-importable so existing coverage migrates cleanly. Likely needs its own PR slice — see Risks.
7. **`BlockSheet.vue`** — zero Vitest component coverage today (e2e-only) and a template that is *not* small. Add a minimal component test before extracting `rawMarkdown` reconstruction, asset resolution, and tree/relationship computed properties into composables (`useBlockRawMarkdown.ts`, `useBlockAssets.ts`).
8. **`DirectoryPickerModal.vue`** — **do not extract yet**, pending the scope decision in Risks.

## Risks

- **`DirectoryPickerModal.vue` appears to be dead code.** `rg "DirectoryPickerModal"` across `apps/innfo-editor/src` finds only the component's own file and a test that covers an already-extracted composable, not the component. No view or router imports it. It also duplicates (with divergent behavior) the template-selection concept already implemented in `SetupWizard.vue`. **Open question for `sdd-propose`: extract, remove, or defer?**
- Cross-file duplication (§3) must be resolved *before* per-file extraction, or composables will encode the same duplicate logic twice.
- `ModelInfoPanel.vue`'s regex-based frontmatter parsing duplicates existing `innfo-core` capability (`parseFrontmatter`) — the project's own `docs/code-quality-review-guide.md` §3.1 already flags this pattern. Keep-or-replace is a design decision, not purely mechanical.
- No linter/CI currently enforced in this monorepo (per `docs/code-quality-review-guide.md` §3.4) — extraction correctness relies entirely on the existing Vitest/Playwright suites. Reinforces doing untested files (`BlockSheet`, `DirectoryPickerModal`) last and most carefully.
- `SetupWizard.vue` (1295 lines) will likely need its own PR slice even in isolation from the other 6 files, within the session's 1500-line review budget.

## Ready for Proposal

Yes, with one open scope question to resolve first: whether `DirectoryPickerModal.vue` is live/planned/dead code.
