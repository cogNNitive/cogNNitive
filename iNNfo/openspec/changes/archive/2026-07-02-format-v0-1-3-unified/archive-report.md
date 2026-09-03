# Archive Report: format-v0-1-3-unified

**Archived**: 2026-07-02
**Change name**: `format-v0-1-3-unified`
**Intent**: Eliminate the FILE/FOLDER mode dichotomy from FORMAT V_0-1-3. One model = one file. A workspace `index.md` is the single entry point — no filesystem scanning.
**Format Spec**: `specs/FORMAT_V_0-1-3_FORMAT.md`

## Task Completion

| Metric | Value |
|--------|-------|
| Tasks total | 36 |
| Tasks complete | 36/36 |
| Tasks incomplete | 0 |
| Verified at archive | All `[x]` in tasks.md |

## Spec Compliance

| Spec | Status | Notes |
|------|--------|-------|
| FR-001: Workspace index.md | ✅ Implemented | Parser reads index.md, resolves wikilinks |
| FR-002: Element slug | ✅ Implemented | slugify() connected, slug field on ElementNode, collision detection |
| FR-003: Asset field types | ✅ Implemented | image/file/video/audio types, FieldAsset.vue widget |
| FR-004: Asset mode resolution | ✅ Implemented | asset_mode frontmatter, path resolution in normalizeElementsIntoGraph |
| FR-005: Unique element names | ✅ Implemented | Cross-model collision detection with suggestions |
| FR-006: No FS scanning | ✅ Implemented | Parser reads only index.md-listed files |
| FR-007: mode FOLDER rejection | ✅ Implemented | validateFormatContent + validateModel reject mode: "FOLDER" |
| FR-008: Body syntax rename | ✅ Implemented | §5 renamed, body parsing unchanged |
| FR-009: No folder_representation | ✅ Implemented | Only `representation` in relationship types |
| FR-010: §2 removed | ✅ Implemented | Representation modes section removed from spec |
| FR-011: §6 removed | ✅ Implemented | FOLDER body structure section removed |
| FR-012: No template mode | ✅ Implemented | Template frontmatter omits mode field |

## Test Results

| Package | Tests | Status |
|---------|-------|--------|
| format-core | 48 tests | ✅ All passing |
| format-editor | 106 tests | ✅ All passing |
| **Total** | **154 tests** | **✅ All passing** |

## Build Verification

| Package | Command | Result |
|---------|---------|--------|
| format-core | `tsc --noEmit` | ✅ 0 errors |
| format-editor | `vue-tsc --noEmit` | ✅ 0 errors |

## Files Created

- `specs/FORMAT_V_0-1-3_FORMAT.md` — V_0-1-3 spec (patched from V_0-1-2)
- `tests/fixtures/workspace-index.md` — workspace index with `_F index` wikilinks
- `tests/fixtures/sample-model_FORMAT.md` — minimal V_0-1-3 model fixture
- `apps/format-editor/src/widgets/FieldAsset.vue` — asset field type widget

## Files Modified

- **packages/format-core/**
  - `src/types.ts` — removed `Mode`, `StorageMode`, `FolderDriverOptions`, `FolderElement`, `GraphEdge`; `SpecFrontmatter.mode` optional; added `slug` on ElementNode; added `image\|file\|video\|audio` to ConceptField.type; added `asset_mode` to SpecFrontmatter
  - `src/parser.ts` — removed mode branching
  - `src/recursiveParser.ts` — rewritten from ~650→~100 lines: index.md-driven entry point, slug derivation, collision detection, asset path resolution
  - `src/recursiveSerializer.ts` — rewritten from ~175→~50 lines: direct node-to-file, no tree walk
  - `src/validator.ts` — removed `mode` param, removed FOLDER branches, added FOLDER rejection
  - `src/driver.ts` — removed `DriverType`, `FolderDriver`; `createDriver()` loses type param
  - `src/driver-browser.ts` — updated for unified driver
  - `src/index.ts` — removed `discoverFolder`, `buildElementMap`; updated driver exports
- **apps/format-editor/**
  - `src/stores/workspaceStore.ts` — removed `driverType`, mode detection from `open()`
  - `src/stores/modelStore.ts` — removed `storageMode` default from `createChild`
  - `src/views/WorkspaceView.vue` — removed `mode` derivation from `runValidation()`
  - `src/widgets/widget-registry.ts` — registered FieldAsset.vue
  - `src/model/recursiveSerializer.ts` — rewritten, no FOLDER walk
  - Test files (12 files adapted: parser, serializer, validator, store tests, golden tests, integration tests, snapshots)

## Files Deleted

- `packages/format-core/src/driver-folder.ts` — entire file
- `tests/fixtures/folder-model/` (6 files) — FOLDER fixtures
- `tests/fixtures/catalog-distributed/` (6 files) — FOLDER fixtures
- `apps/format-editor/tests/fixtures/catalog/` (2 files) — FOLDER fixtures
- `packages/format-core/tests/driver-folder.test.ts` — FOLDER driver test
- `packages/format-core/tests/folder-integration.test.ts` — FOLDER integration test
- `apps/format-editor/tests/golden/synthetic-folder.golden.test.ts` — FOLDER golden test
- `apps/format-editor/tests/golden/mixed-tree.golden.test.ts` — FOLDER golden test

## Files Renamed

- `packages/format-core/src/driver-file.ts` → `driver-unified.ts` (`FileDriver` → `UnifiedDriver`)
- `tests/fixtures/catalog-single-file_FORMAT.md` → `tests/fixtures/catalog_FORMAT.md`

## Stats

| Metric | Value |
|--------|-------|
| Lines changed (net) | ~2000 |
| Lines removed | ~1000 (FOLDER code) |
| Lines added | ~1000 (unified code) |

## Risks

- **None remaining** — all 4 spec gaps from initial verify-report (FR-002, FR-003, FR-004, FR-007) closed during Phase 7

## Archive Contents

- `proposal.md` ✅
- `spec.md` (delta spec) ✅
- `design.md` ✅
- `tasks.md` ✅ (36/36 tasks complete)
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)

## Source of Truth

The V_0-1-3 spec at `specs/FORMAT_V_0-1-3_FORMAT.md` reflects the final state. The delta spec is preserved in the archive for audit trail.
