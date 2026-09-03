# Exploration Report: `workspace-taxonomy-and-submodels`

## Executive Summary

This exploration analyzes the architecture, data contracts, parser logic, and UI components across `iNNfo` (`innfo-core`, `innfo-mcp`, `innfo-editor`) and template specifications for the proposed change: **`workspace-taxonomy-and-submodels`**.

The change addresses four core architectural enhancements:
1. **Workspace Entrypoint Modernization**: Replacing legacy, non-model `index.md` files with a formal Level 3 workspace model (`workspace_NN.md`) adhering to a Level 2 workspace template (`workspace_spec_NN.md`).
2. **Metamodel Primitive Expansion**: Introducing `type:: model` as a first-class primitive in `innfo-core` metamodel concept types and field types to represent nested models/submodels.
3. **Level 3 Index Elimination**: Removing the requirement for `# NN index` blocks in Level 3 models, resolving concept hierarchy and display ordering directly from the Level 2 template's taxonomy.
4. **Editor UI Dual-State Sidebar**: Implementing Workspace Mode (workspace model & submodel graph) vs. Focused Model Mode (single model concept tree) in `innfo-editor`.

---

## 1. Entrypoint Migration: `index.md` -> `workspace_NN.md` & `workspace_spec_NN.md`

### Current State
* **Core Parser**: `packages/innfo-core/src/recursiveParser/workspace.ts` defines `const INDEX_MD = 'index.md'`. `recursiveParse()` loads `index.md`, extracts wikilinks `[[target.md]]` or markdown links `[text](target.md)` from its body, and parses referenced model files.
* **Fallback Behavior**: If `index.md` is missing, `recursiveParse()` logs a `Missing index.md` issue and falls back to scanning root `.md` files.
* **Workspace Store**: `apps/innfo-editor/src/stores/workspaceStore.ts` invokes `modelStore.parseFromHandle(handle)` which executes `recursiveParse()`.
* **MCP Server**: `packages/innfo-mcp/src/tools/list-read.ts` scans directories for `.md` files containing iNNfo frontmatter (`spec_version`).

### Architectural Changes Required
* **Template Definition (`workspace_spec_NN.md`)**:
  Create a Level 2 template defining workspace concepts:
  * `Workspace`: `type:: text` (Root workspace metadata: title, description, version).
  * `ModelRef`: `type:: model` (Submodels / referenced models in the workspace).
  * `Folder`: `type:: category` (Workspace organizational directories).
  * `Asset`: `type:: list` (Associated workspace assets/media).
  * Fields: `path` (`type:: string`), `template` (`type:: reference`), `status` (`type:: select`).
* **Workspace Model (`workspace_NN.md`)**:
  A Level 3 model conforming to `workspace_spec_NN.md`, replacing `index.md` with structured iNNfo headings (`## NN ModelRef: ...` with `type:: model` properties).
* **Parser Updates (`innfo-core`)**:
  * Update `recursiveParse()` in `recursiveParser/workspace.ts`:
    1. Search for `workspace_NN.md` or `workspace_*_NN.md` at workspace root.
    2. Fall back to `index.md` for backwards compatibility with legacy workspaces.
    3. Fall back to root directory `.md` scan if neither entrypoint file is found.
  * Extract model references from both wikilinks/markdown links AND `ModelRef` element `path::` fields.

---

## 2. Metamodel Primitive & Field Types: Adding `type:: model`

### Current State
* **Types Definition (`packages/innfo-core/src/types.ts`)**:
  * `ConceptType = 'text' | 'list' | 'category' | 'weight' | 'steps' | 'sequence'`
  * `ConceptField.type = 'string' | 'select' | 'reference' | 'image' | 'file' | 'video' | 'audio' | 'markdown_inline' | 'markdown_file'`
* **Schema & Parsing**: `src/schema.ts` extracts `Concept.type` and `ConceptField.type`. `src/parser/sections.ts` parses property lines.
* **Validators**: `src/validator/constants.ts`, `content.ts`, and `document.ts` enforce valid concept and field types.

### Architectural Changes Required
* **Type Definitions**:
  * Update `ConceptType`: Add `'model'`.
  * Update `ConceptField.type`: Add `'model'`.
* **Core Metamodel & Validation**:
  * `schema.ts`: Permit `type:: model` in concept definitions.
  * `validator/constants.ts` & `document.ts`: Include `'model'` in `VALID_CONCEPT_TYPES` and `VALID_FIELD_TYPES`.
  * `validator/references.ts`: Treat `model`-typed fields as valid submodel/file paths or qualified node references.
* **Editor Integration**:
  * `apps/innfo-editor/src/components/editor/IconRenderer.vue`: Map `model` concept/field type to a dedicated icon (e.g. `Boxes`, `FolderKanban`, or `Network`).
  * `apps/innfo-editor/src/components/editor/FieldViewer.vue`: Add renderer for `model` field type with interactive navigation pills to open the referenced submodel.

---

## 3. Level 3 Index Elimination: Template Taxonomy Resolution

### Current State
* **Index Section Parsing**: Currently, `parseIndexBlock()` in `src/parser/taxonomy.ts` extracts taxonomy edges from `# NN index` blocks.
* **Hierarchy Normalization**: `normalizeElementsIntoGraph()` in `src/recursiveParser/normalize.ts` relies on `parsed.taxonomy` to build node hierarchy and order.
* **Metamodel Inheritance**: `src/metamodel.ts` (`resolveEffectiveMetamodel()`) and `apps/innfo-editor/src/components/layout/LeftSidebar.vue` (`getConceptsForModel()`) fetch taxonomy from the parent template when present, but fall back to local document taxonomy.

### Architectural Changes Required
* **Eliminate `# NN index` in Level 3**:
  * Level 3 models omit `# NN index` entirely.
  * Parser: `normalizeSingleModel()` and `normalizeElementsIntoGraph()` check if `parsed.taxonomy` is empty. If empty, it resolves taxonomy directly from the Level 2 template parent specified in `parent_spec` (`resolveEffectiveMetamodel()`).
  * Validator: Update `validateTaxonomyHierarchy()` in `src/validator/hierarchy.ts` to execute cleanly without warnings when `# NN index` is absent in Level 3 models.
  * UI Sidebar: `LeftSidebar.vue`'s `getConceptsForModel()` uses the template's taxonomy edges to structure concept groups and element display order.

---

## 4. UI Sidebar Behavior: Workspace Mode vs. Focused Model Mode

### Current State
* **Sidebar Structure**: `apps/innfo-editor/src/components/layout/LeftSidebar.vue` features a view switcher (`explorer`, `editor`, `graph`).
* **Model Grouping**: In Editor view, `visibleRootIds` lists all top-level models. `getConceptsForModel(rootId)` renders concept tree nodes for each model.
* **Explorer View**: `WorkspaceExplorer.vue` renders file trees classified into Models, Sources, and Artifacts.

### Architectural Changes Required
* **Dual-Mode Navigation State**:
  * Introduce `sidebarMode: 'workspace' | 'focused_model'` state in `uiStore.ts`.
* **Workspace Mode (`sidebarMode === 'workspace'`)**:
  * Root node is `workspace_NN.md`.
  * Displays submodel graph tree: Workspace Root -> Submodels (`type:: model` nodes) -> Child Models.
  * Highlights top-level workspace metrics, submodel status, and cross-model relationships.
* **Focused Model Mode (`sidebarMode === 'focused_model'`)**:
  * Triggered when selecting/editing a specific model file or submodel node.
  * Sidebar renders the focused model's concept tree (resolved from Level 2 parent taxonomy), element list, and model-specific matrices.
  * Includes a top breadcrumb banner: `<- Back to Workspace Overview` to allow seamless switching back to Workspace Mode.

---

## Affected Codebase Components

| Package / Module | File Path | Scope of Modifications |
|---|---|---|
| `innfo-core` | `src/types.ts` | Add `'model'` to `ConceptType` and `ConceptField.type`. |
| `innfo-core` | `src/schema.ts` | Update schema extraction for `model` primitives. |
| `innfo-core` | `src/validator/constants.ts` | Register `'model'` in `VALID_CONCEPT_TYPES` and `VALID_FIELD_TYPES`. |
| `innfo-core` | `src/validator/hierarchy.ts` | Support index-free Level 3 models with template-derived taxonomy. |
| `innfo-core` | `src/recursiveParser/workspace.ts` | Change default entrypoint to `workspace_NN.md` with legacy fallbacks. |
| `innfo-core` | `src/recursiveParser/normalize.ts` | Fallback taxonomy resolution from Level 2 template when model has no `# NN index`. |
| `innfo-mcp` | `src/tools/list-read.ts` | Update workspace scanning and model listing for `workspace_NN.md`. |
| `innfo-mcp` | `src/tools/mutate.ts` | Support `type:: model` concept and field additions. |
| `innfo-editor` | `src/stores/uiStore.ts` | Add `sidebarMode` state (`workspace` vs `focused_model`). |
| `innfo-editor` | `src/stores/workspaceStore.ts` | Update handle opening & entrypoint resolution logic. |
| `innfo-editor` | `src/components/layout/LeftSidebar.vue` | Implement Workspace Mode vs Focused Model Mode rendering & breadcrumbs. |
| `innfo-editor` | `src/components/editor/IconRenderer.vue` | Add visual icon support for `model` primitive. |
| `innfo-editor` | `src/components/editor/FieldViewer.vue` | Render interactive pills for `model`-typed fields. |
| `specs` / `templates` | `specs/templates/workspace_spec_NN.md` | Define Level 2 template for workspace models. |

---

## Verification & Test Plan

1. **Unit & Core Tests (`innfo-core`)**:
   * Test parsing `workspace_NN.md` entrypoint.
   * Test `type:: model` in concept and field definitions.
   * Test Level 3 model parsing without `# NN index` resolving concept tree from Level 2 template parent.
2. **MCP Integration Tests (`innfo-mcp`)**:
   * Verify `list_models` and `read_model` with `workspace_NN.md`.
3. **Editor Component & E2E Tests (`innfo-editor`)**:
   * Vitest component tests for `LeftSidebar.vue` mode switching.
   * Playwright E2E test verifying workspace loading, submodel navigation, and breadcrumb interaction.
