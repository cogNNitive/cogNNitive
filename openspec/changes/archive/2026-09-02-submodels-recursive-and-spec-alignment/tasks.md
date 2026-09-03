# Implementation Tasks: Submodels Recursive Traversal & Formal Spec Alignment

This document outlines the discrete implementation tasks, phases, work units, and review workload forecast for the `submodels-recursive-and-spec-alignment` change.

---

## Review Workload Forecast

* **Estimated changed lines**: ~940 lines (~660 additions, ~280 modifications/deletions) across 15 files.
* **400-line budget risk**: **HIGH** (total delta exceeds 400 lines if executed as a single unit).
* **Chained PRs recommended**: **YES** (4 stacked work units recommended).
* **Suggested Split / Work Units**:
  * **WU 1 (Spec & Core Types)**: `iNNfo_V_0-1-0_NN.md`, `types.ts`, `schema.ts`, `constants.ts` (~180 lines).
  * **WU 2 (Recursive Engine & Validator)**: `paths.ts`, `workspace.ts`, `references.ts`, `model.ts`, `document.ts` (~360 lines).
  * **WU 3 (MCP Discovery & Tooling)**: `spec.ts`, `list-read.ts`, `mutate.ts`, MCP tests (~170 lines).
  * **WU 4 (Editor UI & Breadcrumbs)**: `registry.ts`, `IconRenderer.vue`, `FieldViewer.vue`, `uiStore.ts`, `LeftSidebar.vue` (~230 lines).
* **Delivery strategy**: `stacked-to-main`
* **Chain strategy**: `stacked-to-main`
* **Decision needed before apply**: **No** (autonomous stacked-to-main is authorized).

---

## Phase 1: Normative Spec & Core Types (WU 1)

**Goal**: Formalize `model` as the 10th primitive field type and concept type in the Level 1 normative specification, self-describing Metaschema, and `innfo-core` type system with `target_template` schema extraction.

### Files
* `iNNfo/specs/iNNfo_V_0-1-0_NN.md`
* `iNNfo/packages/innfo-core/src/types.ts`
* `iNNfo/packages/innfo-core/src/schema.ts`
* `iNNfo/packages/innfo-core/src/validator/constants.ts`
* `iNNfo/packages/innfo-core/src/index.ts`

### Tasks
- [x] 1.1 **Update Level 1 Normative Specification (`iNNfo_V_0-1-0_NN.md`)**:
  - [x] Add `model` to the Field Definition primitive types table (§Root Primitives) as the 10th primitive type: `string | select | reference | markdown_inline | markdown_file | image | file | video | audio | model`.
  - [x] Add `model` as a recognized concept type in Concept Definition: `text | category | weight | list | steps | sequence | model`.
  - [x] Document `target_template` (optional string) in Field Definition properties: specifies the expected template name or stable URL for referenced submodels.
  - [x] Document submodel reference path semantics: workspace-relative canonical paths or file-relative `./...` paths, clean WikiLinks, and `target_template` conformance.
- [x] 1.2 **Update Level 1 Metaschema (`iNNfo_V_0-1-0_NN.md`)**:
  - [x] Update `## NN Field Definition: type` options to include `model`.
  - [x] Update `## NN Concept Definition: type` options to include `model`.
  - [x] Declare `## NN Field Definition: target_template` with `type:: string` and descriptive prose.
- [x] 1.3 **Update Core Metamodel Types (`innfo-core/src/types.ts`)**:
  - [x] Add `'model'` to `ConceptType` union.
  - [x] Add `'model'` to `ConceptField.type` union.
  - [x] Add `target_template?: string` optional property to `ConceptField`.
- [x] 1.4 **Update Template Schema Extraction & Aliasing (`innfo-core/src/schema.ts`)**:
  - [x] In `extractTemplateSchema`, extract `target_template: asString(el.fields['target_template'])`.
  - [x] In `applyAliasToSchema`, preserve `target_template` across template aliasing and composition.
  - [x] In `canonicalValue`, preserve `target_template` during canonical normalization and hashing.
- [x] 1.5 **Update Validator Constants & Public API Exports (`innfo-core`)**:
  - [x] Ensure `VALID_FIELD_TYPES` and `VALID_CONCEPT_TYPES` in `src/validator/constants.ts` include `'model'`.
  - [x] Re-export new types and schema helpers in `innfo-core/src/index.ts`.

---

## Phase 2: Recursive Parser Engine & Validation (WU 2)

**Goal**: Transform `recursiveParse` into an iterative worklist traversal engine with cycle detection, depth limit (`MAX_DEPTH = 10`), canonical path resolution, and non-breaking `WARNING` validation for submodel references and target template conformance.

### Files
* `iNNfo/packages/innfo-core/src/recursiveParser/paths.ts`
* `iNNfo/packages/innfo-core/src/recursiveParser/workspace.ts`
* `iNNfo/packages/innfo-core/src/validator/references.ts`
* `iNNfo/packages/innfo-core/src/validator/model.ts`
* `iNNfo/packages/innfo-core/src/validator/document.ts`

### Tasks
- [x] 2.1 **Implement Path Resolution & Normalization Utilities (`recursiveParser/paths.ts`)**:
  - [x] Implement `normalizePathKey(filePath: string): string`: replace backslashes with forward slashes, strip redundant slashes, trim, and lowercase for cross-platform set/map keys.
  - [x] Implement `resolveSubmodelPath(refPath: string, referringPath?: string): string`: strip surrounding WikiLinks `[[...]]`; if path starts with `./` or `../`, resolve relative to `dirname(referringPath)`; otherwise treat as workspace-relative; normalize slashes.
  - [x] Update `resolveFileHandle` to support multi-segment relative and workspace paths.
- [x] 2.2 **Refactor `recursiveParse` to Iterative Queue Worklist (`recursiveParser/workspace.ts`)**:
  - [x] Define `WorklistItem` interface: `{ path: string; name: string; referringPath: string; depth: number; author?: string }`.
  - [x] Initialize `queue: WorklistItem[]` and `visitedPaths = new Set<string>()`.
  - [x] Register workspace entrypoint (`depth = 0`), normalize its path key, and add to `visitedPaths`.
  - [x] Loop worklist while `queue.length > 0`:
    - [x] Dequeue next item.
    - [x] Check `visitedPaths.has(normalizePathKey(item.path))`. If already visited, record warning in `ctx.issues` (`Cycle detected: "${item.path}" referenced from "${item.referringPath}" is already loaded`) and skip re-parsing.
    - [x] Add normalized path to `visitedPaths`.
    - [x] Enforce depth cap: if `item.depth > 10` (`MAX_DEPTH`), emit warning in `ctx.issues` (`Traversal depth limit exceeded (MAX_DEPTH = 10) while resolving submodel "${item.path}"`) and skip.
    - [x] Resolve path via `resolveSubmodelPath` and read file content via driver.
    - [x] Parse and register model node into `ctx.nodes` and establish parent-child graph link to `item.referringPath`.
    - [x] Extract outgoing submodel references using `extractSubmodelRefs` and enqueue children with `depth: item.depth + 1`.
- [x] 2.3 **Generalize Submodel Reference Extraction (`recursiveParser/workspace.ts`)**:
  - [x] Implement `extractSubmodelRefs(content: string, referringPath: string, templateSchema?: TemplateSchema): ExtractedSubmodelRef[]`.
  - [x] Extract references from `ModelRef` concepts (`path::`, `file_ref::`).
  - [x] Extract references from domain concept element fields typed as `'model'` in `templateSchema`.
  - [x] Extract WikiLinks `[[...]]` and markdown links `[...]` targeting `*.md` files.
  - [x] Filter out ignored directory patterns (`specs/`, `backups/`, `archive/`).
- [x] 2.4 **Implement Submodel Conformance Validation (`validator/references.ts`)**:
  - [x] Export `SubmodelResolver` type definition:
    ```typescript
    export type SubmodelResolver = (
      refPath: string,
      referringPath?: string,
    ) => { exists: boolean; templateName?: string; templateUrl?: string } | null
    ```
  - [x] In `validateElementFieldReferences`: when `fieldDef.type === 'model'`, strip WikiLink syntax and normalize path.
  - [x] If `resolveSubmodel` is provided:
    - [x] Invoke `resolveSubmodel(cleanPath, modelPath)`.
    - [x] If `result.exists === false`, emit diagnostic with severity `'warning'` (not `'error'`): `Dangling submodel reference: field "${fieldName}" references file "${cleanPath}" which does not exist`.
    - [x] If `fieldDef.target_template` is declared and file exists, verify that `result.templateName` or `result.templateUrl` matches `fieldDef.target_template`. If mismatched, emit diagnostic with severity `'warning'`: `Submodel template mismatch: field "${fieldName}" expects template "${fieldDef.target_template}", but referenced file "${cleanPath}" uses template "${result.templateName || result.templateUrl}"`.
  - [x] If `resolveSubmodel` is undefined (headless / unit test mode), skip filesystem checks cleanly.
- [x] 2.5 **Wire SubmodelResolver into Validation Pipeline (`validator/model.ts`, `validator/document.ts`)**:
  - [x] Add `resolveSubmodel?: SubmodelResolver` to `ValidateModelOptions` in `validator/model.ts` and forward to `validateElementFieldReferences`.
  - [x] Add `resolveSubmodel?: SubmodelResolver` to `ValidateDocumentOptions` in `validator/document.ts` and forward to `validateModel`.

---

## Phase 3: MCP & Editor Integration (WU 3 & WU 4)

**Goal**: Wire recursive file discovery and synchronous submodel validation into `innfo-mcp`, and update `innfo-editor` with widget registration, editable string inputs, target-template badges, and dual-mode sidebar breadcrumb navigation.

### Files
* `iNNfo/packages/innfo-mcp/src/tools/spec.ts`
* `iNNfo/packages/innfo-mcp/src/tools/list-read.ts`
* `iNNfo/packages/innfo-mcp/src/tools/mutate.ts`
* `iNNfo/apps/innfo-editor/src/shared/widgets/registry.ts`
* `iNNfo/apps/innfo-editor/src/components/common/IconRenderer.vue`
* `iNNfo/apps/innfo-editor/src/components/editor/FieldViewer.vue`
* `iNNfo/apps/innfo-editor/src/stores/uiStore.ts`
* `iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue`

### Tasks
- [x] 3.1 **Upgrade Submodel Path Discovery in MCP (`innfo-mcp/src/tools/spec.ts`, `list-read.ts`)**:
  - [x] Update `findModelFile` to perform recursive search across subdirectories (via `listModels(rootDir)` or recursive scan) when direct root and `models/` lookups fail.
  - [x] Ensure `readModel` locates nested submodel files in arbitrary folders (e.g. `models/subsystems/auth_NN.md`).
- [x] 3.2 **Implement Synchronous Submodel Resolver in MCP `validate_model` (`innfo-mcp/src/tools/mutate.ts`)**:
  - [x] Construct a `SubmodelResolver` callback in `validateModel` handler:
    - [x] Resolve relative/canonical submodel path against workspace root or model directory using `findModelFile` and `fs.existsSync`.
    - [x] When file exists, read file header and parse frontmatter (`parent_spec.name`, `parent_spec.url`, `title`).
    - [x] Return `{ exists, templateName, templateUrl }`.
  - [x] Pass `resolveSubmodel` into `validateDocument` invocation.
  - [x] Ensure non-breaking `WARNING` diagnostics surface in tool output without setting `valid: false`.
- [x] 3.3 **Register Model Primitive in Editor Widget Registry (`innfo-editor/src/shared/widgets/registry.ts`)**:
  - [x] Add `'model'` to `WidgetType` union.
  - [x] Register `model: FieldString` in `UNIFIED_WIDGET_REGISTRY`.
- [x] 3.4 **Update IconRenderer & FieldViewer (`innfo-editor`)**:
  - [x] In `IconRenderer.vue`, map concept/field type `'model'` to dedicated submodel icon (`Boxes` / `FolderKanban`).
  - [x] In `FieldViewer.vue` (read mode): render interactive submodel pill with navigation click handler; when `field.target_template` is present, display badge/tooltip (`Template: <target_template>`).
  - [x] In `FieldViewer.vue` (edit mode): mount editable text/path input via `FieldString`.
- [x] 3.5 **Update Sidebar & Multi-Level Breadcrumbs (`innfo-editor`)**:
  - [x] In `uiStore.ts`, define `BreadcrumbSegment` interface (`{ id: string | null; label: string; isRoot: boolean; isCurrent: boolean }`).
  - [x] In `uiStore.ts`, implement computed lineage helper or state method `resolveModelAncestry(modelId: string)` returning `[Workspace, Parent Model, ..., Active Submodel]`.
  - [x] In `LeftSidebar.vue`, when `sidebarMode === 'focused_model'`, render interactive breadcrumb trail:
    - [x] Clicking `Workspace` segment calls `uiStore.returnToWorkspaceOverview()`, setting `sidebarMode = 'workspace'`.
    - [x] Clicking intermediate parent segment calls `uiStore.focusModel(parentId)`.
    - [x] Active submodel is highlighted as terminal non-clickable segment.

---

## Phase 4: Testing & Verification

**Goal**: Provide automated unit and integration test coverage across `innfo-core`, `innfo-mcp`, and `innfo-editor`, verifying recursive traversal, cycle detection, depth limits, reference warnings, and UI navigation.

### Files
* `iNNfo/packages/innfo-core/tests/recursive-submodels.test.ts`
* `iNNfo/packages/innfo-mcp/tests/submodel-discovery.test.ts`
* `iNNfo/apps/innfo-editor/tests/submodel-editor.test.ts` (or relevant spec file)

### Tasks
- [x] 4.1 **`innfo-core` Recursive Traversal & Cycle Tests (`tests/recursive-submodels.test.ts`)**:
  - [x] Test multi-level nested traversal: 3-level model hierarchy (`workspace_NN.md` $\rightarrow$ `system_NN.md` $\rightarrow$ `auth_NN.md`) parsed and registered in `ctx.nodes` with correct parent links.
  - [x] Test cycle detection: direct mutual circular reference (`service_a_NN.md` $\leftrightarrow$ `service_b_NN.md`) terminates cleanly, parses each model once, and records cycle warning in `ctx.issues`.
  - [x] Test diamond dependency (DAG): two intermediate models sharing a common submodel; verify common submodel parsed once without duplicate errors.
  - [x] Test depth bounding (`MAX_DEPTH = 10`): chain of 12 nested models; verify models at depth $\le 10$ are parsed and model at depth 11 is rejected with depth warning.
  - [x] Test path normalization: Windows backslashes and mixed case paths normalize to forward slashes.
- [x] 4.2 **`innfo-core` Submodel Validation Tests (`tests/recursive-submodels.test.ts`)**:
  - [x] Test missing submodel reference: `SubmodelResolver` reports `exists: false`; assert validation returns `valid: true` and `warnings` contains dangling submodel diagnostic.
  - [x] Test target template match: referenced submodel matches `target_template`; assert 0 warnings.
  - [x] Test target template mismatch: referenced submodel has different template; assert `valid: true` and `warnings` contains template mismatch diagnostic.
  - [x] Test headless mode: when `SubmodelResolver` is omitted, validation passes without filesystem errors.
  - [x] Test Level 1 Metaschema self-conformance: validate `iNNfo_V_0-1-0_NN.md` against Metaschema without syntax errors.
- [x] 4.3 **`innfo-mcp` Discovery & Validation Tests (`tests/submodel-discovery.test.ts`)**:
  - [x] Test `findModelFile` discovers deeply nested submodels under `models/subsystems/auth/tokens_NN.md`.
  - [x] Test `validate_model` MCP tool executes `SubmodelResolver` and returns non-breaking warnings for missing submodels.
- [x] 4.4 **`innfo-editor` Component Tests & End-to-End Verification**:
  - [x] Verify `UNIFIED_WIDGET_REGISTRY['model'] === FieldString`.
  - [x] Test `FieldViewer.vue` rendering with and without `target_template`.
  - [x] Test `LeftSidebar.vue` breadcrumb ancestry rendering and click-to-navigate interactions.
