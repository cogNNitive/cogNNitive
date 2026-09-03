# Tasks: FORMAT V_0-1-3 Unified

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2000 |
| 800-line budget risk | Medium (split across 4 PRs) |
| Chained PRs recommended | No (independent PRs) |
| Delivery strategy | single-pr-default |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Medium

### Suggested Work Units

4 independent PRs merging to `main`. Each under 800 lines and independently revertible.

| Unit | Goal | Likely PR | Lines (est.) | Risk |
|------|------|-----------|-------------|------|
| 1 | Spec V_0-1-3 + templates cleanup | PR 1 | ~300 | Low |
| 2 | Types + drivers + validator (removal only) | PR 2 | ~500 | Medium |
| 3 | Parser + serializer rewrite + tests | PR 3 | ~800 | High |
| 4 | App cleanup (stores, views, fixture deletion) | PR 4 | ~200 | Low |

## Phase 1: Foundation — Types & Drivers

- [x] 1.1 Remove `Mode`, `StorageMode`, `FolderDriverOptions`, `FolderElement`, `GraphEdge` from `packages/format-core/src/types.ts`; make `SpecFrontmatter.mode` optional
- [x] 1.2 Remove `DriverType`, `FolderDriver` import from `packages/format-core/src/driver.ts`; strip type param from `createDriver()`
- [x] 1.3 Delete `packages/format-core/src/driver-folder.ts`
- [x] 1.4 Update `packages/format-core/src/driver-browser.ts` — remove `DriverType = 'FILE' | 'FOLDER'`, update `createDriver` to match new unified driver
- [x] 1.5 Rename `driver-file.ts` → `driver-unified.ts`; rename `FileDriver` → `UnifiedDriver`
- [x] 1.6 Update `packages/format-core/src/index.ts` exports — remove `discoverFolder`, `buildElementMap`; update driver exports

## Phase 2: Core — Parser, Serializer, Validator

- [x] 2.1 Rewrite `packages/format-core/src/recursiveParser.ts` (~650→~100 lines): read `index.md` → resolve wikilinks → parse each model; keep `normalizeElementsIntoGraph`, `resolveGraphEdgeTarget`, `isNotFound`; drop FOLDER-walk functions
- [x] 2.2 Rewrite `apps/format-editor/src/model/recursiveSerializer.ts` (~175→~50 lines): direct node-to-file write; remove `walkAndWrite`, `graph_edges` injection, driver branching
- [x] 2.3 Remove FOLDER branches from `packages/format-core/src/validator.ts`; remove `mode` param from both `validateModel` and `validateFormatContent`

## Phase 3: App Integration — Stores & Views

- [x] 3.1 Remove `driverType`, mode detection from `apps/format-editor/src/stores/workspaceStore.ts` `open()` method
- [x] 3.2 Remove `storageMode: parent.storageMode ?? 'FOLDER'` from `apps/format-editor/src/stores/modelStore.ts` `createChild`
- [x] 3.3 Remove `mode` derivation from `apps/format-editor/src/views/WorkspaceView.vue` `runValidation()`

## Phase 4: Spec & Fixtures

- [x] 4.1 Create `specs/FORMAT_V_0-1-3_FORMAT.md` — patch over V_0-1-2: remove §2, §2.2, §6; rename §5; add Workspace Structure, `asset_mode` frontmatter; renumber sections
- [x] 4.2 Delete FOLDER fixtures: `tests/fixtures/folder-model/` (6 files), `tests/fixtures/catalog-distributed/` (6 files), `apps/format-editor/tests/fixtures/catalog/` (2 files) — all FOLDER fixture directories deleted via `git rm`
- [x] 4.3 Create `tests/fixtures/workspace-index.md` with `_F index` wikilinks to workspace models
- [x] 4.4 Rename `tests/fixtures/catalog-single-file_FORMAT.md` → `tests/fixtures/catalog_FORMAT.md` via `git mv`; update frontmatter: `specification_version: V_0-1-3`, remove `mode: "FILE"`, add `asset_mode: "centralized"`, drop "single file" from title
- [x] 4.5 Create `tests/fixtures/sample-model_FORMAT.md` — minimal V_0-1-3 model with `asset_mode: "centralized"`, one concept, one element
- [x] 4.6 Keep `tests/fixtures/file-model_FORMAT.md` as-is — removed `mode: "FILE"` from frontmatter

## Phase 5: Tests

- [x] 5.1 Delete FOLDER tests: `packages/format-core/tests/driver-folder.test.ts`, `folder-integration.test.ts`; `apps/format-editor/tests/golden/synthetic-folder.golden.test.ts`, `mixed-tree.golden.test.ts`
- [x] 5.2 Rewrite `packages/format-core/tests/recursive-parser.test.ts` for index.md-driven parser (FR-001 scenarios: valid index.md, missing index.md, non-existent wikilink)
- [x] 5.3 Adapt `apps/format-editor/tests/unit/recursiveParser.test.ts` for new parser API
- [x] 5.4 Adapt `apps/format-editor/tests/unit/recursiveSerializer.test.ts` for simplified no-branch serializer
- [x] 5.5 Adapt golden tests: `recursiveParser.models.golden.test.ts`, `roundtrip.*.golden.test.ts`, `catalog-hierarchy.golden.test.ts`, `crlf-fidelity.golden.test.ts` — remove FOLDER cases
- [x] 5.6 Adapt integration tests: `workspace.integration.test.ts`, `catalog.integration.test.ts` — use index.md fixture
- [x] 5.7 Adapt `apps/format-editor/tests/unit/validator.test.ts` — remove FOLDER check cases
- [x] 5.8 Adapt `apps/format-editor/tests/unit/workspaceStore.test.ts`, `modelStore.test.ts` — remove FOLDER mode paths
- [x] 5.9 Update golden snapshots (`__snapshots__`)

## Phase 6: Audit & Cleanup

- [x] 6.1 Grep audit: `folder-model` and `catalog-distributed` hits in deleted fixtures (removed), surviving hits in doc/spec files (expected). HomeView.vue has `mode: 'FOLDER'` sample descriptions (cosmetic UI data). ConceptTreeNode.vue had dead `storageMode === 'FOLDER'` code path — removed.
- [x] 6.2 `packages/format-core`: `tsc --noEmit` — clean, zero errors
- [x] 6.3 `apps/format-editor`: `vue-tsc --noEmit` — clean, zero errors (fixed `ModelDriver | null` → `| undefined` cast in workspaceStore.ts)
- [x] 6.4 All tests pass: format-core 2 files / 27 tests, format-editor 23 files / 106 tests = 133 total, zero failures
- [x] 6.5 Roundtrip verification: golden roundtrip tests pass (roundtrip.models, roundtrip.synthetic, crlf-fidelity) — parse→serialize→re-parse structurally equivalent

## Phase 7: Gaps — Slugs, Assets, FOLDER rejection

- [x] 7.1 FR-002: Element slug — add `slugify()`, `slug` field on ElementNode/ModelNode, slug derivation in parser, collision detection, tests
- [x] 7.2 FR-003: Asset field types — add `image|file|video|audio` to ConceptField.type, create FieldAsset.vue widget, register in UNIFIED_WIDGET_REGISTRY, export
- [x] 7.3 FR-004: Asset mode resolution — add `asset_mode` to SpecFrontmatter, store on root ModelNode, resolve asset paths in normalizeElementsIntoGraph, tests
- [x] 7.4 FR-007: Reject FOLDER mode — add validation check in validateModel/validateFormatContent, parse warning in parseModel, tests
