# Design: Workspace Taxonomy and Submodels

## Technical Approach

This design establishes a formal workspace taxonomy model, expands the core metamodel to natively support submodels via `type:: model`, eliminates mandatory `# NN index` blocks from Level 3 model files, and introduces a dual-state navigation sidebar in `innfo-editor`.

The implementation spans `innfo-core`, `innfo-mcp`, `innfo-editor`, and standard workspace template specifications across four main capabilities:

1. **Workspace Entrypoint Modernization & Fallback Pipeline**:
   - Update `recursiveParse()` in `packages/innfo-core/src/recursiveParser/workspace.ts` to locate workspace entrypoint models (`workspace_NN.md` or `workspace_*_NN.md`) as the primary entrypoint.
   - Maintain a fallback sequence: if no `workspace_NN.md` exists, attempt to load legacy `index.md`; if `index.md` is also absent, perform a root directory `.md` scan.
   - Update reference extraction: parse model references not only from raw wikilinks (`[[model.md]]`) and markdown links (`[model](model.md)`), but also from structured `ModelRef` element `path::` fields defined in `workspace_NN.md`.
   - Provide `specs/templates/workspace_spec_NN.md` as the Level 2 specification template for workspace models.

2. **Metamodel Primitive Expansion (`type:: model`)**:
   - Add `'model'` to `ConceptType` union and `ConceptField.type` union in `packages/innfo-core/src/types.ts`.
   - Update schema extraction in `src/schema.ts` and registered primitives in `src/validator/constants.ts`, `src/validator/document.ts`, and `src/validator/references.ts` to validate `type:: model` concept declarations and field definitions.
   - Update `innfo-mcp` in `src/tools/list-read.ts` and `src/tools/mutate.ts` to recognize `workspace_NN.md` entrypoints and `type:: model` concept mutations.
   - Update `innfo-editor` field rendering: `IconRenderer.vue` maps `model` to a dedicated submodel icon (`Boxes` / `FolderKanban`), and `FieldViewer.vue` renders interactive submodel pills allowing quick navigation to child models.

3. **Level 3 Index Elimination & Taxonomy Resolution**:
   - Level 3 instance models no longer require an explicit `# NN index` section.
   - In `normalizeElementsIntoGraph()` (`src/recursiveParser/normalize.ts`), when `parsed.taxonomy` is empty, hierarchy and concept order are derived directly from the parent Level 2 template's taxonomy (`parent_spec` resolved via `resolveEffectiveMetamodel()`).
   - Update `validateTaxonomyHierarchy()` in `src/validator/hierarchy.ts` so that index-free Level 3 models evaluate cleanly against parent template taxonomy without surfacing spurious warnings.

4. **Editor UI Dual-State Sidebar Navigation**:
   - Add `sidebarMode` (`'workspace'` | `'focused_model'`) and active model context state to `uiStore.ts` in `apps/innfo-editor/src/stores/uiStore.ts`.
   - **Workspace Mode**: Displays the workspace root (`workspace_NN.md`), submodel hierarchy graph, and cross-model relationships.
   - **Focused Model Mode**: Displays the focused model's single concept tree (derived from Level 2 parent taxonomy), element list, and local matrices. Includes a top breadcrumb navigation banner (`<- Back to Workspace Overview`) for one-click switching back to Workspace Mode.

---

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| D1 | Entrypoint Search Priority | `workspace_NN.md` / `workspace_*_NN.md` primary $\rightarrow$ `index.md` fallback $\rightarrow$ Root `.md` directory scan fallback | Strict breaking change (require `workspace_NN.md` only) | Preserves 100% backward compatibility for legacy iNNfo workspaces while establishing a clean standard for modern workspaces. |
| D2 | Submodel Extraction Source | Dual extraction: parse both `ModelRef` element `path::` fields and body wikilinks / markdown links | Extract only from `ModelRef` elements | Ensures un-migrated models or casual body links in workspace files are still registered into the workspace model graph without loss. |
| D3 | `type:: model` Primitive Scope | First-class addition to both `ConceptType` and `ConceptField.type` | Field-only annotation (`type:: reference` with submodel flag) | Treating `model` as a primitive concept and field type aligns with iNNfo metaplantilla Level 1 specifications (`text`, `list`, `category`, `weight`, `steps`, `sequence`, `model`). |
| D4 | Level 3 Hierarchy Derivation | Fallback to Level 2 template `parent_spec` taxonomy when model `# NN index` is absent | Auto-generate flat root list | Preserves hierarchical layout and element display ordering derived from template specifications without cluttering Level 3 models with boilerplate index blocks. |
| D5 | Validator Suppression for Missing Index | Treat absent `# NN index` in Level 3 as valid; validate hierarchy against resolved template parent taxonomy | Emit validator info warning | Level 3 index removal is an intentional design goal; warnings should only occur for structural inconsistencies, not missing optional blocks. |
| D6 | Sidebar State Scope | Centralized `sidebarMode: 'workspace' \| 'focused_model'` state in `uiStore.ts` with breadcrumb back-action | Local state inside `LeftSidebar.vue` | Enables other editor components (e.g., interactive field pills, graph viewer nodes) to trigger model focusing and sidebar mode changes cleanly. |
| D7 | MCP Tool Resolution | Update `innfo-mcp` tools (`list-read.ts`, `mutate.ts`) to recognize `workspace_NN.md` and submodels | Require dedicated workspace MCP tools | Retains existing tool signatures while extending functionality seamlessly to workspace models and submodel trees. |

---

## Data Flow

```
[Workspace Directory Handle / Model Driver]
         │
         ▼
[recursiveParse() in workspace.ts]
         │
         ├───► Check workspace_NN.md (or workspace_*_NN.md)
         │       ├── Found: Extract ModelRef paths & body wikilinks
         │       └── Missing: Fallback to index.md -> Root .md scan
         │
         ▼
[parseAndRegisterModel() for each submodel]
         │
         ├───► Parse Frontmatter & Elements (type:: model recognized)
         │
         ├───► Taxonomy Resolution (normalize.ts)
         │       ├── Has # NN index? Use document taxonomy
         │       └── No # NN index? Inherit Level 2 parent_spec taxonomy
         │
         ▼
[innfo-editor State Hydration]
         │
         ├───► workspaceStore: Stores workspace nodes & submodel tree
         │
         └───► uiStore: sidebarMode ('workspace' | 'focused_model')
                 │
                 ├── Mode = 'workspace': LeftSidebar renders workspace_NN.md root & submodel hierarchy
                 └── Mode = 'focused_model': LeftSidebar renders single model concept tree + "Back to Workspace" breadcrumb
```

---

## File Changes

| File Path | Action | Description |
|-----------|--------|-------------|
| `packages/innfo-core/src/types.ts` | Modify | Add `'model'` to `ConceptType` and `ConceptField.type` unions. |
| `packages/innfo-core/src/schema.ts` | Modify | Permit `type:: model` in concept and field schema definitions. |
| `packages/innfo-core/src/validator/constants.ts` | Modify | Include `'model'` in `VALID_CONCEPT_TYPES` and `VALID_FIELD_TYPES`. |
| `packages/innfo-core/src/validator/document.ts` | Modify | Validate `model`-typed fields and concepts. |
| `packages/innfo-core/src/validator/references.ts` | Modify | Resolve `model`-typed field targets as valid model or asset references. |
| `packages/innfo-core/src/validator/hierarchy.ts` | Modify | Validate hierarchy against parent template taxonomy when `# NN index` is absent. |
| `packages/innfo-core/src/recursiveParser/workspace.ts` | Modify | Primary search for `workspace_NN.md`, fallback to `index.md`, extract `ModelRef` path fields. |
| `packages/innfo-core/src/recursiveParser/normalize.ts` | Modify | Fallback taxonomy resolution from Level 2 parent spec when model taxonomy is empty. |
| `packages/innfo-mcp/src/tools/list-read.ts` | Modify | Update directory scan and model listing to recognize `workspace_NN.md`. |
| `packages/innfo-mcp/src/tools/mutate.ts` | Modify | Support adding/updating `type:: model` concepts and fields. |
| `apps/innfo-editor/src/stores/uiStore.ts` | Modify | Add `sidebarMode` (`'workspace'` \| `'focused_model'`) and `focusedModelId` state and actions. |
| `apps/innfo-editor/src/stores/workspaceStore.ts` | Modify | Update workspace loading, submodel resolution, and entrypoint handling. |
| `apps/innfo-editor/src/components/layout/LeftSidebar.vue` | Modify | Render dual-mode sidebar (Workspace Mode graph vs Focused Model Mode tree with breadcrumb). |
| `apps/innfo-editor/src/components/editor/IconRenderer.vue` | Modify | Render submodel icon for `model` primitive type. |
| `apps/innfo-editor/src/components/editor/FieldViewer.vue` | Modify | Render interactive submodel pills for `model`-typed fields. |
| `specs/templates/workspace_spec_NN.md` | Create | Level 2 template defining workspace concepts (`Workspace`, `ModelRef`, `Folder`, `Asset`). |

---

## Interfaces / Contracts

### 1. Metamodel Primitives (`innfo-core/src/types.ts`)

```ts
export type ConceptType = 'text' | 'list' | 'category' | 'weight' | 'steps' | 'sequence' | 'model'

export interface ConceptField {
  name: string
  type: 'string' | 'select' | 'reference' | 'image' | 'file' | 'video' | 'audio' | 'markdown_inline' | 'markdown_file' | 'model'
  options?: string[]
  target_concepts?: string[]
}
```

### 2. Editor UI State (`innfo-editor/src/stores/uiStore.ts`)

```ts
export type SidebarMode = 'workspace' | 'focused_model'

export interface UIState {
  sidebarMode: SidebarMode
  focusedModelId: string | null
  // ... existing UI state properties
}

// Actions
export function setSidebarMode(mode: SidebarMode, modelId?: string | null): void
export function focusModel(modelId: string): void
export function returnToWorkspaceOverview(): void
```

### 3. Level 2 Workspace Template Schema (`specs/templates/workspace_spec_NN.md`)

```markdown
---
spec_version: V_1-0-0
spec_level: 2
type: specification
id: workspace_spec_NN
name: Workspace Specification Template
---

# NN concept: Workspace
* type:: text
* description:: Root workspace metadata and configuration.

# NN concept: ModelRef
* type:: model
* description:: Submodel referenced within the workspace hierarchy.
* field: path | type:: string
* field: template | type:: reference
* field: status | type:: select | options:: draft, active, archived

# NN concept: Folder
* type:: category
* description:: Virtual or filesystem directory grouping for models.

# NN concept: Asset
* type:: list
* description:: External resources or attachments associated with the workspace.
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit (`innfo-core`)** | Entrypoint resolution & fallback chain | Test `recursiveParse()` with `workspace_NN.md`, legacy `index.md`, and missing index directory scan scenarios. |
| **Unit (`innfo-core`)** | `type:: model` schema & validation | Test schema parsing and validation of models containing `type:: model` concepts and fields. |
| **Unit (`innfo-core`)** | Index elimination & taxonomy inheritance | Test `normalizeElementsIntoGraph()` and `validateTaxonomyHierarchy()` with Level 3 models lacking `# NN index`, asserting hierarchy is derived from parent template. |
| **Integration (`innfo-mcp`)** | MCP model scanning & mutation | Verify `list_models` and `read_model` correctly discover `workspace_NN.md` and mutate `model`-typed fields. |
| **Component (`innfo-editor`)** | Sidebar dual-mode rendering & breadcrumbs | Vitest tests for `LeftSidebar.vue` verifying Workspace Mode submodel tree vs Focused Model Mode concept tree + breadcrumb back button. |
| **Component (`innfo-editor`)** | FieldViewer interactive model pills | Test clicking a `model`-typed field pill in `FieldViewer.vue` triggers `focusModel()` and switches sidebar mode. |
| **E2E (`innfo-editor`)** | Complete workspace navigation workflow | Playwright test loading a workspace with `workspace_NN.md`, opening submodels, navigating via breadcrumbs, and switching modes. |

---

## Migration Plan

1. **Phase 1: Metamodel & Core Parser Updates**:
   - Deploy `type:: model` additions and `workspace_NN.md` entrypoint parser logic in `innfo-core`.
   - All existing workspaces using `index.md` continue functioning seamlessly via the fallback pipeline.

2. **Phase 2: Template & MCP Integration**:
   - Add `specs/templates/workspace_spec_NN.md` to standard template repository.
   - Update `innfo-mcp` tools to support `workspace_NN.md` and `type:: model`.

3. **Phase 3: Editor Dual-State Sidebar Release**:
   - Release `innfo-editor` updates with `sidebarMode` navigation, interactive submodel pills, and breadcrumbs.

4. **Phase 4: Optional Workspace Migration**:
   - Workspace owners can upgrade legacy `index.md` files to `workspace_NN.md` conforming to `workspace_spec_NN.md`.
   - Level 3 models may cleanly remove redundant `# NN index` sections while preserving exact hierarchy.
