# Tasks: Workspace Taxonomy and Submodels

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~750–1,000 lines across core parser, MCP tools, editor store/components, template specs, and tests |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation/MCP): core metamodel primitives, parser, taxonomy resolution, MCP tools, `workspace_spec_NN.md`; PR 2 (Editor UI): `uiStore` sidebar mode, `LeftSidebar` dual-mode rendering, `IconRenderer`, `FieldViewer` submodel pills |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Metamodel primitives, workspace parser, taxonomy inheritance & MCP support | PR 1 | `npm run test -- packages/innfo-core packages/innfo-mcp` | `validate_model` / MCP inspection | Revert PR 1 |
| 2 | Dual-mode sidebar, interactive model field pills & navigation store | PR 2 | `npm run test -- apps/innfo-editor` | `npm run dev` + browser sidebar navigation | Revert PR 2 only |

---

## Phase 1: Foundation/innfo-core

- [x] 1.1 Add `'model'` to `ConceptType` and `ConceptField.type` in `packages/innfo-core/src/types.ts`
- [x] 1.2 Permit `type:: model` concept and field declarations in `packages/innfo-core/src/schema.ts`
- [x] 1.3 Add `'model'` primitive type to `VALID_CONCEPT_TYPES` and `VALID_FIELD_TYPES` in `packages/innfo-core/src/validator/constants.ts`
- [x] 1.4 Update document and reference validators in `packages/innfo-core/src/validator/document.ts` and `src/validator/references.ts` to validate `model`-typed concepts and field target paths
- [x] 1.5 Update `recursiveParse()` in `packages/innfo-core/src/recursiveParser/workspace.ts` to search primary entrypoint `workspace_NN.md` / `workspace_*_NN.md`, fallback to legacy `index.md`, and fallback to root `.md` directory scan with fallback warnings
- [x] 1.6 Update `recursiveParse()` in `packages/innfo-core/src/recursiveParser/workspace.ts` to extract submodel references from structured `ModelRef` element `path::` fields alongside wikilinks and markdown links
- [x] 1.7 Update `normalizeElementsIntoGraph()` in `packages/innfo-core/src/recursiveParser/normalize.ts` to inherit taxonomy edges from parent Level 2 template (`parent_spec`) when `# NN index` is absent in Level 3 models
- [x] 1.8 Update `validateTaxonomyHierarchy()` in `packages/innfo-core/src/validator/hierarchy.ts` to validate index-free Level 3 models against resolved parent template taxonomy without emitting missing-index warnings

---

## Phase 2: innfo-mcp & Template Specs

- [x] 2.1 Create Level 2 workspace template specification `specs/templates/workspace_spec_NN.md` defining `Workspace` (`type:: text`), `ModelRef` (`type:: model`), `Folder` (`type:: category`), and `Asset` (`type:: list`) concepts and default properties (`path`, `template`, `status`)
- [x] 2.2 Update `packages/innfo-mcp/src/tools/list-read.ts` directory scanning and model listing routines to discover `workspace_NN.md` entrypoints and report `type:: model` submodels
- [x] 2.3 Update `packages/innfo-mcp/src/tools/mutate.ts` to support reading, creating, and updating `type:: model` concepts and fields

---

## Phase 3: innfo-editor UI Components & Store

- [x] 3.1 Add `sidebarMode` (`'workspace'` | `'focused_model'`), `focusedModelId`, and transition actions (`setSidebarMode`, `focusModel`, `returnToWorkspaceOverview`) to `apps/innfo-editor/src/stores/uiStore.ts`
- [x] 3.2 Update `apps/innfo-editor/src/stores/workspaceStore.ts` to handle `workspace_NN.md` entrypoints, submodel hierarchy graph building, and parent-spec taxonomy resolution for index-free models
- [x] 3.3 Update `apps/innfo-editor/src/components/layout/LeftSidebar.vue` to render Workspace Mode (root `workspace_NN.md`, submodel tree graph, total model count, submodel status indicators) vs Focused Model Mode (single active model concept tree and matrices)
- [x] 3.4 Add top breadcrumb back-navigation banner (`<- Back to Workspace Overview`) to `LeftSidebar.vue` in Focused Model Mode to trigger `returnToWorkspaceOverview()`
- [x] 3.5 Update `apps/innfo-editor/src/components/editor/IconRenderer.vue` to render dedicated submodel icons (`Boxes` / `FolderKanban`) for `model` concept and field types
- [x] 3.6 Update `apps/innfo-editor/src/components/editor/FieldViewer.vue` to render `type:: model` fields as interactive navigation pills that trigger `focusModel()` on click

---

## Phase 4: Testing & Verification

- [x] 4.1 Core parser unit tests: Verify `recursiveParse()` precedence (`workspace_NN.md` -> `index.md` -> directory scan) and `ModelRef` `path::` link extraction in `packages/innfo-core`
- [x] 4.2 Core validation unit tests: Verify schema parsing and validator rules for `type:: model` concepts and fields in `packages/innfo-core`
- [x] 4.3 Core taxonomy unit tests: Verify `normalizeElementsIntoGraph()` and `validateTaxonomyHierarchy()` for index-free Level 3 models inheriting parent spec taxonomy in `packages/innfo-core`
- [x] 4.4 MCP integration tests: Verify `list_models`, `read_model`, and `mutate` tool operations for `workspace_NN.md` entrypoints and `type:: model` fields in `packages/innfo-mcp`
- [x] 4.5 Editor component unit tests: Vitest tests for `LeftSidebar.vue` dual-mode rendering and breadcrumb action in `apps/innfo-editor`
- [x] 4.6 Editor field component unit tests: Vitest tests for `IconRenderer.vue` and interactive model pill navigation in `FieldViewer.vue`
- [x] 4.7 End-to-end verification: Playwright E2E test verifying workspace loading with `workspace_NN.md`, submodel pill clicking, breadcrumb navigation, and mode toggling
