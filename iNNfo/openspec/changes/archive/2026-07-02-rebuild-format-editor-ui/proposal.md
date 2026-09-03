# Proposal: rebuild-format-editor-ui

> Migrate the complete Vue UI from the archived `file-format` app into `format-editor`, unifying the widget system and filling the unfinished UI layer â€” the final step to make `format-editor` the single replacement for both archived apps.

## Intent

`format-editor` has a working unified graph (parser, modelStore, workspaceStore) but an **incomplete UI layer**: the tree renders as unstyled text, NodeForm only shows the node name, and there is no layout chrome, toolbar navigation, or d3 graph view. The archived `file-format` app is **functionally complete** for FILE-mode editing with a polished Vue + TailwindCSS UI. This change copies file-format's layout, editor components, widget system, and supporting utilities into format-editor, adapts them to the unified stores (`modelStore` instead of `documentStore`), and merges file-format's field-widgets with format-editor's existing concept-widgets into a single widget registry.

The result: format-editor becomes **immediately usable** for editing both FILE and FOLDER models with the same look, feel, and component architecture as the best of the archived apps â€” without dragging & dropping or AI features in this iteration.

## Current State

### What format-editor already has (working)

| Area | Detail |
|------|--------|
| **Parser** | `recursiveParser.ts` builds a unified `ModelNode` graph from both FILE and FOLDER modes, with three node kinds (root/concept/element) and metamodel binding from `hierarchy-model` |
| **Model store** | `modelStore` (Pinia) â€” normalized `nodes: Record<string, ModelNode>`, `rootIds[]`, getters (`getNode`, `getChildren`, `getRoots`), `setGraph`/`upsertNode` |
| **Workspace store** | `workspaceStore` (Pinia) â€” File System Access API handle management, IndexedDB handle persistence, `open()` entry point |
| **History store** | `historyStore` â€” recent-folder persistence with IndexedDB |
| **Metamodel resolution** | `resolveEffectiveMetamodel()` â€” walks ancestor chain merging `localMetamodel` declarations (closest-override-wins) |
| **Widget system (partial)** | `shared/widgets/` â€” `WidgetField` dispatcher + `TextWidget`, `WeightWidget`, `CategoryWidget`, `FallbackWidget` (ported for `models/*` fixture set) |
| **Validator** | `shared/validator.ts` + `ValidationReport.vue` â€” FORMAT compliance via `@cognnitive/format-core` |
| **Router** | Home â†’ Workspace with handle guard |
| **Provenance** | `shared/provenance.ts` â€” `commitFieldValue` stamps every write with author + timestamp |

### What is missing (UI layer)

| Missing | Effect |
|---------|--------|
| **Styled tree** | `SidebarTreeNode` renders plain `<span>` text â€” no icons, no expand/collapse indicators, no concept-type badges, no visual hierarchy |
| **Layout chrome** | No header bar, no resizable panels, no right sidebar â€” workspace is a bare flexbox with sidebar + main |
| **Node form** | `NodeForm` shows node name + resolved fields via `WidgetField` â€” no markers, no relationships, no raw content, no block structure |
| **Graph view** | No d3 Sankey/Force graph for relationship visualization |
| **Model info panel** | No model metadata display (version, template, spec URL, description) |
| **Matrices/feeds** | No BlockSheet, BlockFeed, MatricesGrid, MetamatrixConfig â€” the full block editing surface |
| **Widgets** | Field widgets exist for `text`/`weight`/`category` concept types only â€” no `string`/`boolean`/`number`/`select`/`reference` field widgets for metamodel-defined fields |
| **Utility functions** | No helper utilities migrated â€” version formatting, color derivation, icon rendering, chain resolution, tree navigation, markdown rendering, sanitization |
| **Styling** | No TailwindCSS â€” all styles are hand-written scoped CSS with no design system |
| **Composables** | No `useResizablePanel`, `useBlockRelationships`, `useBlockVisuals` |

## Proposed Solution

### Architecture

The migrated UI layer sits **on top of the existing stores** â€” it never replaces or duplicates store logic. file-format's `documentStore` and `metamodelStore` are **refactored into thin adapters** over the unified `modelStore` where needed, or ported directly where they provide gap functionality (e.g., metamodel loading from URL, active-concept tracking, save coordination).

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    Migrated UI Layer                     â”‚
â”‚  (file-format components, adapted to unified stores)     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Layout: Header, LeftSidebar, RightGuidanceSidebar       â”‚
â”‚  Editors: TreeEditor, TextEditor, BlockSheet, GraphViewerâ”‚
â”‚  Widgets: Unified widget registry (merged)               â”‚
â”‚  Panels: ModelInfoPanel, MatricesGrid, MetamatrixConfig  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                    Existing Stores                       â”‚
â”‚  modelStore â”‚ workspaceStore â”‚ historyStore               â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                    Model Layer                           â”‚
â”‚  recursiveParser â”‚ metamodel.ts â”‚ format-core             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Principle: copy, not reference

All file-format source files are **copied verbatim** (the repo is archived and will not receive updates). After copy, each file is adapted:

1. **Component imports** â€” `useDocumentStore()` â†’ `useModelStore()`; concept/name getters adapted to `ModelNode` shape
2. **Template bindings** â€” tree node props adapted from file-format's `TreeNode` type to `ModelNode` (both have `id`/`name`/`childIds`/`type` â€” but field paths differ)
3. **Widget registry merge** â€” file-format `WIDGET_REGISTRY` (string/boolean/number/select/reference) + format-editor `registry` (text/weight/category) â†’ single map; `FieldWidget` handles both concept-type widgets and metamodel-field widgets via a dispatch key

### What stays untouched

- **`modelStore`** â€” no structural changes; only new getters/actions if needed to match `documentStore` API surface (e.g., `activeNodeId`, `selectNode`)
- **`workspaceStore`** â€” unchanged; the save/commit cycle from file-format's `documentStore.saveActiveFile` adapts to `modelStore.markDirty` + workspace handle
- **`recursiveParser.ts`** â€” unchanged
- **`metamodel.ts`** (`resolveEffectiveMetamodel`) â€” unchanged; migration adapts file-format's `metamodelStore` to call into this instead of its own concept list
- **`format-core`** â€” untouched

## Source Components to Migrate

### Layout Components (from `file-format/src/components/layout/`)

| Component | Role | Adaptation |
|-----------|------|------------|
| `Header.vue` | Top nav bar with open/save/settings | Replace `documentStore` refs with `workspaceStore` + `modelStore`; keep logo, action buttons, model name |
| `LeftSidebar.vue` | Concept tree navigation panel | Replace `documentStore.modelTree` with `modelStore.getRoots()`/`getChildren()`; use `ConceptTreeNode` instead of raw tree walk |
| `ConceptTreeNode.vue` | Recursive tree node with icons, expand/collapse, drag-up/down | Adapt `TreeNode` props to `ModelNode`; up/down arrow buttons (no drag) per scope decision |
| `RightGuidanceSidebar.vue` | Contextual help / documentation / marker info panel | Port with `metamodelStore` adapter; show concept docs, marker explanations |
| `DirectoryPickerModal.vue` | Modal for directory selection on first open | Likely replace â€” format-editor's `HomeView` already handles this via the File System Access API picker. Port only if the modal UX is superior |
| `AiGuidePanel.vue` | AI guidance panel | **Deferred** (out of scope per user decision â€” AI functionality excluded this iteration) |

### Editor Components (from `file-format/src/components/editor/`)

| Component | Role | Adaptation |
|-----------|------|------------|
| `BlockSheet.vue` | Structured block editor for a concept node | Adapt `documentStore` â†’ `modelStore` for fields/markers/relationships |
| `BlockFeed.vue` | Timeline/changelog of edits on a node | Port as-is; data source comes from provenance stamps on modelStore fields |
| `BlockPill.vue` | Inline editable pill for a single field | Adapt to unified widget system dispatch |
| `TextEditor.vue` | Raw markdown editor for text-type concepts | Port directly â€” works on `rawContent` from the node |
| `TreeEditor.vue` | Tree-structured editor for instantiable concepts | Adapt "create child" / "reorder" to modelStore mutations |
| `GraphViewer.vue` | d3 Sankey + Force layout relationship graph | Major adaptation: replace `documentStore.relationships` with `modelStore` relationship edges; port the d3 rendering code as-is (639 lines, mostly pure SVG rendering) |
| `MatricesGrid.vue` | NÃ—M matrix editor showing conceptÃ—marker values | Port; data model is field-like and maps to `ModelNode.fields` |
| `MetamatrixConfig.vue` | Matrix definition UI (which concepts Ã— which markers) | Port; reads from resolved metamodel |
| `ModelInfoPanel.vue` | Model metadata display (version, template, spec URL) | Port; resolve from node `rawContent` frontmatter or `localMetamodel` |
| `IconRenderer.vue` | Concept/marker icon rendering (lucide icons) | Port as-is (shared utility component) |
| `ConceptContainer.vue` | Wrapper with perspective tabs | Port |
| `ConceptPerspectivePanel.vue` | Tab content per perspective | Port |
| `MarkerTooltip.vue` | Tooltip for marker badges | Port |
| `MatrixPill.vue` | Individual cell in MatricesGrid | Port |
| `BlockMatrixSummary.vue` | Summary view of matrix data | Port |
| `BlockRelationships.vue` | Relationship editor within a block | Adapt from `documentStore` relationships to `modelStore` relationship edges |
| `TreeNodeItem.vue` | Individual tree row (icon + name + marker badges) | **Replace by** `ConceptTreeNode` (layout component already covers this) or merge |

### Widget System Merge

**Current format-editor widgets** (`src/shared/widgets/`):
- `TextWidget.vue` â€” renders concept-type `text` (rich text / markdown)
- `WeightWidget.vue` â€” renders concept-type `weight` (numeric slider)
- `CategoryWidget.vue` â€” renders concept-type `category` (badge selector)
- `FallbackWidget.vue` â€” renders "not yet ported" placeholder
- `WidgetField.vue` â€” dispatches to registered component by `widgetType`

**file-format widgets** (`src/components/editor/widgets/`):
- `FieldString.vue` â€” string input for metamodel `type: string` fields
- `FieldBoolean.vue` â€” toggle for `type: boolean` fields
- `FieldNumber.vue` â€” number input for `type: number` fields
- `FieldSelect.vue` â€” dropdown for `type: select` fields
- `FieldReference.vue` â€” cross-node reference picker for `type: reference` fields

**Merge strategy**: Both systems use a component registry by type string. The unified registry merges both maps:

```typescript
const UNIFIED_WIDGET_REGISTRY: Record<string, Component> = {
  // concept-type widgets (from format-editor)
  text: TextWidget,
  weight: WeightWidget,
  category: CategoryWidget,
  // field-type widgets (from file-format)
  string: FieldString,
  boolean: FieldBoolean,
  number: FieldNumber,
  select: FieldSelect,
  reference: FieldReference,
}
```

The dispatching component (`WidgetField.vue` already exists in format-editor) is extended to pass both `fieldKey` (for field-bound widgets) and `nodeId` (for concept-bound widgets) â€” `FieldReference` additionally needs the full node graph for target selection.

### Composables (from `file-format/src/composables/`)

| Composable | Adaptation |
|------------|------------|
| `useResizablePanel.ts` | Port as-is (DOM-based panel resize, no store dependency) |
| `useBlockRelationships.ts` | Adapt `documentStore` â†’ `modelStore` relationship access |
| `useBlockVisuals.ts` | Port as-is (color/marker visual derivation) |
| `useFileSystem.ts` | Likely **replace** â€” format-editor already has `workspaceStore` with FSAA handle management |
| `useUrlDocLoader.ts` | Port â€” useful for loading models from URL params (file-format used this for `?url=` loading) |

### Utils (from `file-format/src/utils/`)

| File | Role | Adaptation |
|------|------|------------|
| `version.ts` | Version parsing, formatting, bumping | Port as-is |
| `chain.ts` | Ancestor chain derivation (`deriveChain`) | **Replace** â€” format-editor's `buildAncestorChain` in `metamodel.ts` already does this via `parentId` walk |
| `colors.ts` | Color derivation for concept/marker badges | Port as-is |
| `conceptVisuals.ts` | Icon/color/resolve for concepts | Port; replaces inline icon logic in tree nodes |
| `constants.ts` | Default versions, spec URLs | Port; some overlap with format-editor constants |
| `renderMarkdown.ts` | Simple markdown-to-HTML | Port as-is |
| `sanitize.ts` | Slugify / sanitize identifiers | Port as-is |
| `tree.ts` | `findNodeByName`, `findNodeById` tree walks | Port â€” useful for hash-based navigation |
| `id.ts` | ID generation | Port if needed; format-editor uses qualified IDs from parser |
| `db.ts` | IndexedDB utilities | **Replace** â€” format-editor's `workspaceStore` + `historyStore` already handle IndexedDB |
| `documentationParser.ts` | Parse metamodel documentation from markdown | Port as-is |
| `markdownParser.ts` | FORMAT markdown parse â†’ document tree | **Replace** â€” format-editor uses `recursiveParser` via `format-core` |

### Stores (from `file-format/src/stores/`)

| Store | Adaptation |
|-------|------------|
| `metamodel.ts` (`useMetamodelStore`) | **Port as thin adapter** â€” wraps `resolveEffectiveMetamodel()` from `model/metamodel.ts` with file-format's concept/marker/documentation accessor shape. The file-format version loads metamodels from URL/frontmatter; after migration, it delegates to the resolved metamodel from the unified graph |
| `document.ts` (`useDocumentStore`) | **Refactor into modelStore extensions** â€” file-format's documentStore is 1079 lines and covers concept selection, node CRUD, save coordination, hash sync, and perspective management. Each concern becomes either a `modelStore` action/getter, a composable, or a new `uiStore` for UI-only state (active concept, selected node, perspective) |
| `workspace.ts` (`useWorkspaceStore`) | **Replace** â€” format-editor's `workspaceStore` already covers handle management, parse trigger, and IndexedDB persistence; file-format's FS utilities are not needed |

## Phasing Plan

### Phase 1: Foundation (dependencies + utility migration)

**Dependencies to add** (edit `apps/format-editor/package.json`):
- `tailwindcss` + `postcss` + `autoprefixer` â€” styling framework
- `lucide-vue-next` â€” icon system (already used in concept icons)
- `radix-vue` â€” accessible UI primitives (dropdowns, tooltips, dialogs)
- `d3` + `d3-sankey` + `@types/d3` â€” graph visualization
- `clsx` + `tailwind-merge` â€” class composition
- `@types/d3-sankey` â€” type defs

**TailwindCSS setup**:
- `tailwind.config.js` â€” port color tokens from file-format
- `postcss.config.js` â€” standard PostCSS setup
- `src/assets/main.css` â€” Tailwind directives, font imports, scrollbar styles

**Utils migration** (copy + adapt):
- `src/utils/` â€” `version.ts`, `colors.ts`, `conceptVisuals.ts`, `constants.ts`, `renderMarkdown.ts`, `sanitize.ts`, `tree.ts`, `id.ts`

**Composables migration**:
- `src/composables/` â€” `useResizablePanel.ts`, `useBlockVisuals.ts` (store-agnostic first)

**Deliverable**: format-editor builds with TailwindCSS, util functions available, resizable panels work. No visual change to the UI yet.

### Phase 2: Layout Chrome (Header + Sidebars)

**Components to migrate**:
- `Header.vue` â€” top nav (open/save/validate, model name, version badge)
- `LeftSidebar.vue` â€” left panel wrapping the tree
- `ConceptTreeNode.vue` â€” styled recursive tree node (icons, expand/collapse arrows, mode badge, up/down arrow buttons)
- `RightGuidanceSidebar.vue` â€” right panel with concept documentation

**Store adaptation**:
- Replace `documentStore.modelTree` â†’ `modelStore.getRoots()/getChildren()`
- `ConceptTreeNode` renders `ModelNode` fields: `name`, `type`, `kind`, `storageMode`, `conceptBinding`
- Up/down arrows trigger `modelStore.reorderChild(parentId, childId, direction)` (new action)

**Deliverable**: WorkspaceView has a full layout with header and two sidebars. Tree is styled, nodes show icons + expand/collapse. The old `SidebarTree`/`SidebarTreeNode` are replaced.

### Phase 3: Editor Views (TextEditor + TreeEditor + BlockSheet)

**Components to migrate**:
- `BlockSheet.vue` â€” main editor view for block-structured concepts
- `BlockFeed.vue` â€” timeline/provenance feed
- `BlockPill.vue` â€” individual field pill within BlockSheet
- `TextEditor.vue` â€” raw markdown editing
- `TreeEditor.vue` â€” tree-structured concept editing (instantiable types)
- `ModelInfoPanel.vue` â€” model metadata display

**Store adaptation**:
- `BlockSheet`: fields read from `modelStore.getNode(id)?.fields` and `?.markers`
- `BlockFeed`: provenance data from `FieldValue.provenance` timestamps
- `TextEditor`: bind to `modelStore.getNode(id)?.rawContent`
- `TreeEditor`: child CRUD via `modelStore.upsertNode` + `markDirty`

**Deliverable**: Selecting a node in the tree shows its editable content in the main panel â€” fields, markers, raw markdown, or tree-structured children depending on concept type.

### Phase 4: Unified Widget System

**Widget migration**:
- Copy `FieldString`, `FieldBoolean`, `FieldNumber`, `FieldSelect`, `FieldReference` from file-format
- Create unified registry merging both widget maps
- Extend `WidgetField.vue` to pass `fieldKey` + `nodeId` + graph context to all widgets
- Adapt `FieldReference` to use `modelStore.nodes` for target selection

**Widget adaptation requirements**:
- `FieldBoolean`: needs `Switch`/`Toggle` from radix-vue â€” minimal adaptation
- `FieldSelect`: needs `Select` from radix-vue â€” adapt option source from concept field definition
- `FieldReference`: needs `Combobox`/`Command` from radix-vue â€” filter through `modelStore.nodes` by concept type; **biggest adaptation** since file-format's version used `documentStore.modelTree` directly
- `FieldString`/`FieldNumber`: generic input components â€” port as-is, wire `modelValue`/`@update:model-value` to existing `WidgetField` pattern

**Deliverable**: NodeForm renders all field types â€” `string`/`boolean`/`number`/`select`/`reference` from metamodel-defined fields + `text`/`weight`/`category` from concept-type dispatch.

### Phase 5: Graph Viewer + Supplementary Views

**Component migration**:
- `GraphViewer.vue` â€” d3 Sankey + Force directed layout (639 lines, mostly SVG rendering code)
- `MatricesGrid.vue` â€” NÃ—M matrix editor
- `MetamatrixConfig.vue` â€” matrix definition UI
- `IconRenderer.vue` â€” icon utility component
- `ConceptContainer.vue` + `ConceptPerspectivePanel.vue` â€” perspective/view switching
- `MarkerTooltip.vue` â€” marker details on hover
- `MatrixPill.vue` + `BlockMatrixSummary.vue` â€” matrix sub-components

**Store adaptation**:
- `GraphViewer`: edges from `ModelNode.relationships[]`; nodes from `modelStore.nodes` (all, not just current subtree)
- `MatricesGrid`: cell values map to fields on matrix-defined concept nodes
- Perspective system: new lightweight `uiStore` or composable for tracking `activeConcept`, `activePerspective`, `selectedNode`

**Deliverable**: Full visual editing surface â€” graph view, matrix editing, concept perspectives. The WorkspaceView now matches or exceeds the archived file-format's feature set.

### Phase 6: Store Adapters + Polish

**Remaining adaptation work**:
- Port `metamodelStore` as thin adapter over `resolveEffectiveMetamodel()`
- Refactor `documentStore` concepts into `modelStore` extensions + new `uiStore`:
  - `modelStore.selectNode(id)` + `modelStore.activeNodeId`
  - `uiStore.activeConcept`, `uiStore.activePerspective`, `uiStore.activeView` (UI-only routing)
  - `modelStore.saveActiveNode(handle)` â€” serialize current node back through format-core + write via workspace handle
- Hash-sync from file-format's App.vue â€” port to WorkspaceView or a composable
- Keyboard shortcuts (Ctrl+S save, arrow keys for tree navigation)
- Remove unused format-editor components after migration:
  - `SidebarTree.vue` â†’ replaced by `LeftSidebar` + `ConceptTreeNode`
  - `SidebarTreeNode.vue` â†’ replaced by `ConceptTreeNode`
  - `NodeForm.vue` â†’ replaced by `BlockSheet` (or adapted as a thin wrapper for backward compat)

**Deliverable**: Feature-complete format-editor UI. All migrated components adapted to unified stores. Old components cleaned up.

## Future Scope (Deferred to Second Iteration)

| Feature | Source | Notes |
|---------|--------|-------|
| **Table view with inline column editing** | `folder-format` (React `HierarchyExplorer.tsx`) | FOLDER-mode flat table where each row is an element and columns are concept fields. Requires porting the concept from React to Vue. |
| **Drag & drop** | file-format's `ConceptTreeNode` had drag support | Replaced by up/down arrow buttons per user decision. Could add drag later via [`@vueuse/gesture`](https://vueuse.org/) or native HTML5 drag API. |
| **AI Assistant** | file-format's `AiGuidePanel.vue` + folder-format's AI pipeline | Explicitly excluded from this iteration. The MCP-based agent model (`opencode-format-agent`) is the preferred delivery mechanism. |
| **Dashboard / Charts** | folder-format's dashboard views | Charts and aggregate views deferred. |
| **Search / Query** | folder-format's `queryParser.ts` + `queryEngine.ts` | Full-text and structured querying deferred. |
| **Remote model loading** | file-format's `useUrlDocLoader.ts` | Loading models via URL params â€” useful but not MVP. |
| **Cross-boundary wikilinks** | Not present in either archived app | Rich cross-document linking deferred. |

## Risks and Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **TailwindCSS in existing components** conflicts with scoped CSS | Medium | Medium | Add Tailwind incrementally per component; old components keep their scoped CSS until replaced. No global style reset conflicts with scoped styles. |
| **GraphViewer (639 lines of d3)** is complex to adapt | Medium | High | d3 rendering code is mostly DOM-independent â€” only data-source adaptation needed. Port in its own phase (Phase 5) with dedicated testing. Test with a known model fixture first. |
| **FieldReference** widget depends on full node graph for target selection | Medium | Medium | modelStore already has all nodes in memory; `FieldReference` can filter by concept type. The adaptation is one getter: `getNodesByType(type)`. |
| **documentStore is 1079 lines** â€” refactoring scope under-estimated | High | Medium | Split into incremental PRs: (1) extract UI-only state into `uiStore`, (2) port CRUD actions to `modelStore`, (3) port save coordination. Each sub-change is independently testable. |
| **Pinia store structure mismatch** between file-format's stores and unified stores | Medium | Medium | file-format uses Composition API stores (`defineStore('x', () => {...})`); modelStore uses Options API. New adapter stores use Composition API for flexibility. Both patterns coexist in Pinia. |
| **d3 + d3-sankey peer dependency** may need a specific d3 version | Low | Low | file-format uses `d3@^7.9.0` and `d3-sankey@^0.12.3`; lock these versions in format-editor. |
| **radix-vue version** may differ from what file-format used | Medium | Low | file-format uses `radix-vue@^1.8.5`. Format-editor may need the same (or newer with breaking changes). Verify radix-vue API before committing the dependency version. |

## Dependencies

- `apps/format-editor/src/model/` â€” parser, types, metamodel resolution (existing)
- `apps/format-editor/src/stores/` â€” modelStore, workspaceStore, historyStore (existing)
- `packages/format-core` â€” format-core parse/validate API (existing, unchanged)
- `apps/format-editor/src/shared/` â€” validator, provenance, widget index (existing)
- `file-format/src/components/` â€” all layout, editor, widget components (source for migration)
- `file-format/src/composables/` â€” resizable panels, block visuals, relationships (source for migration)
- `file-format/src/utils/` â€” version, colors, markdown, sanitize, tree utils (source for migration)
- `file-format/src/stores/metamodel.ts` + `document.ts` â€” adapter patterns for store migration (source for adaptation)

## Success Criteria

- [ ] **TailwindCSS** is added to format-editor with working PostCSS build; `src/assets/main.css` loads Tailwind directives
- [ ] **Layout chrome** renders: `Header` (top nav), `LeftSidebar` (tree), `RightGuidanceSidebar` (documentation), replacing the current bare sidebar
- [ ] **ConceptTreeNode** renders styled tree nodes with expand/collapse arrows, type icons, mode badges, and up/down arrow buttons â€” replacing the current plain-text `SidebarTreeNode`
- [ ] **BlockSheet** + **BlockFeed** + **BlockPill** render a node's fields, markers, and relationships â€” replacing the current minimal `NodeForm`
- [ ] **Unified widget registry** resolves both concept-type widgets (`text`/`weight`/`category`) and field-type widgets (`string`/`boolean`/`number`/`select`/`reference`) from a single map
- [ ] **FieldReference** widget selects target nodes filtered by concept type from `modelStore.nodes`
- [ ] **GraphViewer** renders a d3 Sankey/Force graph from `ModelNode.relationships[]`
- [ ] **MatricesGrid** + **MetamatrixConfig** â€” matrix definition and editing work with modelStore field data
- [ ] **ModelInfoPanel** shows model metadata (version, template, spec URL, description) resolved from the node's `rawContent` / `localMetamodel`
- [ ] **TextEditor** â€” raw markdown editing works for text-type concepts; changes go through `commitFieldValue`
- [ ] **TreeEditor** â€” child CRUD (create, reorder up/down, delete) works via modelStore actions
- [ ] **Up/down arrows** reorder siblings â€” drag & drop is **not** implemented
- [ ] **AI features** (`AiGuidePanel`, AI Assistant) are **not** implemented in this iteration
- [ ] **documentStore** concerns are split: UI state in `uiStore`, node CRUD in `modelStore`, save coordination in `workspaceStore` or a save composable
- [ ] Old format-editor components (`SidebarTree`, `SidebarTreeNode`, bare `NodeForm`) are removed or replaced
- [ ] All migrated components build without TypeScript errors
- [ ] No changes to `recursiveParser.ts`, `format-core`, or `workspaceStore.open()` contract
