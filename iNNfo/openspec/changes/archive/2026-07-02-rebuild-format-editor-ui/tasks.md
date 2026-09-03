# Tasks: rebuild-format-editor-ui

> Task breakdown for migrating the `file-format` Vue UI (~5,600 lines) into `format-editor`, unifying the widget system, and establishing the TailwindCSS design system.

---

## Legend

- **Source**: `D:\Users\lucas\Documents\GitHub\innV0\file-format`
- **Target**: `D:\Users\lucas\Documents\GitHub\innV0\iNNfo\apps\format-editor`
- **Estimate**: rough (added + modified) lines of code. `(+N)` = new, `(~M)` = modified, `(-D)` = deleted.
- **Risk**: L = low (well-understood, standard pattern), M = medium (store adaptation uncertainty), H = high (complex dependency or large file).
- **Build gate**: `vue-tsc --noEmit && vite build` must pass after every task.

---

## Phase 1 â€” Foundation (dependencies + utility migration)

| Task | File(s) | Action | Est. Lines | Risk | Depends On |
|------|---------|--------|-----------|------|-----------|
| [x] 1.1 | `apps/format-editor/package.json` | Add npm deps: tailwindcss, postcss, autoprefixer, clsx, tailwind-merge, lucide-vue-next, radix-vue, d3, d3-sankey, dagre, @types/d3, @types/d3-sankey | ~20 (+20) | L | â€” |
| [x] 1.2 | `tailwind.config.js`, `postcss.config.js`, `src/assets/main.css`, `src/main.ts` | Configure TailwindCSS: create configs, add directives, import in main.ts. Port HSL color tokens from file-format. darkMode: 'class' | ~60 (+60) | L | 1.1 |
| [x] 1.3 | `src/utils/version.ts`, `colors.ts`, `conceptVisuals.ts`, `constants.ts`, `renderMarkdown.ts`, `sanitize.ts`, `tree.ts`, `id.ts`, `documentationParser.ts` | Copy utility files from `file-format/src/utils/`. Adapt `chain.ts` import â€” skip (format-editor has `buildAncestorChain`). Adapt `tree.ts` `TreeNode` import to `ModelNode`-compatible shape | ~380 (+380) | L | â€” |
| [x] 1.4 | `src/composables/useResizablePanel.ts`, `src/composables/useBlockVisuals.ts` | Copy composables from `file-format/src/composables/`. `useResizablePanel`: port as-is (no store deps). `useBlockVisuals`: adapt `useMetamodelStore` import to thin adapter (Phase 6 placeholder) | ~150 (+150) | L | 1.3 |
| [x] 1.5 | `src/stores/types.ts` | Copy file-format types (`file-format/src/types/index.ts`). Merge select types (`TreeNode`, `MetamatrixRow`, `Perspective`, `FieldDefinition`, `MatrixValues`, `BlockData`, `ParsedItem`) into format-editor's `model/types.ts` or a new `stores/types.ts`. Keep only types not already in `ModelNode`. | ~80 (+80) | M | â€” |
| [x] 1.6 | `src/components/ui/Badge.vue`, `src/components/ui/StatusBadge.vue` | Copy badge components from `file-format/src/components/ui/`. Port as-is (pure presentational, no store deps). Adapt to TailwindCSS classes. | ~120 (+120) | L | 1.2 |

**Phase 1 total**: ~810 lines added, 0 modified, 0 deleted.

---

## Phase 2 â€” Layout Chrome (Header + Sidebars)

| Task | File(s) | Action | Est. Lines | Risk | Depends On |
|------|---------|--------|-----------|------|-----------|
| [x] 2.1 | `src/components/editor/IconRenderer.vue`, `src/components/editor/MarkerIcons.ts` | Copy icon utilities from `file-format/src/components/editor/`. Port as-is (no store deps). Add to component index if needed. | ~180 (+180) | L | 1.3, 1.5 |
| [x] 2.2 | `src/components/layout/ConceptTreeNode.vue` | Copy from `file-format/src/components/layout/`. **Major adaptation**: replace `documentStore` with `useModelStore()`. Convert props from `TreeNode` to `ModelNode` shape (`nodeId: string`, `selectedId`, `depth`, `expandedGeneration`). Remove drag support. Emit `select`, `move-up`, `move-down`. Use TailwindCSS classes. | ~250 (+250) | M | 2.1, 1.2 |
| [x] 2.3 | `src/components/editor/BlockPill.vue` | Copy from `file-format/src/components/editor/`. Adapt `documentStore` â†’ `modelStore` for marker value access. Replace `UpdateFieldKey` injection with props. Remove `metamodelStore.getConceptByName()` â€” use resolved metamodel util. | ~160 (+160) | M | 2.1, 1.5 |
| [x] 2.4 | `src/components/layout/LeftSidebar.vue` | Copy from `file-format/src/components/layout/`. **Major adaptation**: replace taxonomy-based tree with `modelStore.getRoots()/getChildren()`. Replace `documentStore.activeConceptName`/`selectConcept` with emit `select-node`. Wrap tree in `ConceptTreeNode` (recursive). Keep `useResizablePanel`. Use TailwindCSS. | ~200 (+200) | M | 2.2, 2.3 |
| [x] 2.5 | `src/components/layout/Header.vue` | Copy from `file-format/src/components/layout/`. **Major adaptation**: replace `useDocumentStore()` with `useModelStore()` + `useWorkspaceStore()`. Version/template info from root node `rawContent` frontmatter. Unsaved changes from `modelStore.dirtyIds`. Remove `AiGuidePanel` reference, "Edit with AI" button. Save flow via `workspaceStore` + `recursiveSerializer`. Use TailwindCSS. | ~220 (+220) | H | 1.5, 2.4 |
| [x] 2.6 | `src/components/layout/RightGuidanceSidebar.vue` | Copy from `file-format/src/components/layout/`. Adapt `documentStore.activeConceptName` â†’ `uiStore.activeConcept` (or prop). Replace `getActiveConceptGuidance()` with resolved metamodel docs. Use `useResizablePanel`. Collapse/expand behavior. | ~140 (+140) | M | 2.4, 1.4 |
| [x] 2.7 | â€” | **Decision**: `DirectoryPickerModal.vue` is likely replaced by existing `HomeView.vue` + File System Access API picker. No porting needed â€” close as "not applicable" for this iteration. Zero implementation. | 0 | L | â€” |

**Phase 2 total**: ~1,150 lines added, 0 modified, 200 deleted (SidebarTree + SidebarTreeNode). WorkspaceView.vue modified (layout rework).

---

## Phase 3 â€” Editor Views (BlockSheet, TextEditor, TreeEditor)

| Task | File(s) | Action | Est. Lines | Risk | Depends On |
|------|---------|--------|-----------|------|-----------|
| [x] 3.1 | `src/components/editor/BlockSheet.vue` | Copy from `file-format/src/components/editor/`. **Major adaptation**: replace `documentStore` with `modelStore`. Fields from `modelStore.getNode(id)?.fields`, markers from `?.markers`. Replace `documentStore.renameBlock()` â†’ `modelStore.upsertNode()`. Replace `metamodelStore.markers` â†’ hardcoded default list (Phase 6 wires adapter). Widget calls: use `WidgetField` with unified registry. Use TailwindCSS. | ~420 (+420) | H | 2.4, 1.5 |
| [x] 3.2 | `src/components/editor/BlockFeed.vue` | Copy from `file-format/src/components/editor/`. Adapt `documentStore.modelTextData` â†’ model-derived concept block. Replace `selectedItemName` â†’ prop. Use `modelStore` for field/marker reads. Keep add/delete/move item operations. | ~200 (+200) | M | 3.1 |
| [x] 3.3 | `src/components/editor/TextEditor.vue` | Copy from `file-format/src/components/editor/`. Adapt `documentStore.modelTextData[concept]` â†’ `modelStore.getNode(nodeId)?.rawContent`. Remove `parseNodeInstances`/`stringifyYaml` â€” work directly on `rawContent`. Provenance via `commitFieldValue()`. | ~260 (+260) | M | 1.5 |
| [x] 3.4 | `src/components/editor/TreeEditor.vue` | Copy from `file-format/src/components/editor/`. Adapt `documentStore.selectedNode` â†’ `modelStore.getNode(activeNodeId)`. Replace `documentStore.deleteTreeNode()` â†’ `modelStore.removeNodeTree()`. Replace `documentStore.modelTree` â†’ `modelStore.getChildren()`. Use TailwindCSS. | ~200 (+200) | M | 3.1 |
| [x] 3.5 | `src/components/editor/ModelInfoPanel.vue` | Copy from `file-format/src/components/editor/`. Adapt `documentStore.formatVersion`/`templateName` â†’ resolve from root node `rawContent` frontmatter. Replace `workspaceStore.fs`/`mdFiles` â†’ existing `workspaceStore` handle API. Use TailwindCSS. | ~150 (+150) | L | 1.5 |

**Phase 3 total**: ~1,230 lines added, 0 modified, 0 deleted.

---

## Phase 4 â€” Unified Widget System

| Task | File(s) | Action | Est. Lines | Risk | Depends On |
|------|---------|--------|-----------|------|-----------|
| [x] 4.1 | `src/shared/widgets/FieldBoolean.vue`, `FieldSelect.vue`, `FieldReference.vue` | Copy+adapt field widgets from `file-format/src/components/editor/widgets/`. Adapted to v-model contract on copy. | ~90 (+90) | L | 1.5 |
| [x] 4.2 | `FieldBoolean.vue`, `FieldSelect.vue`, `FieldReference.vue` | **Adapt each widget**: replace `inject(UpdateFieldKey)` with `defineProps<{ modelValue: T }>` + `emit('update:modelValue', value)`. Remove labels (rendered by parent). `FieldSelect`: add `options?: string[]` prop. `FieldReference`: replace `documentStore.modelTree` with `useModelStore().nodes` for target filtering. Remove `injection.ts` import. | ~210 (~210 modified) | H | 4.1 |
| [x] 4.3 | `src/shared/widgets/registry.ts` | Create `UNIFIED_WIDGET_REGISTRY: Record<string, Component>` merging concept-type widgets (`text`/`weight`/`category`) with field-type widgets (`string`/`boolean`/`number`/`select`/`reference`). Export `WidgetType` union type. | ~30 (+30) | L | 4.2 |
| [x] 4.4 | `src/shared/widgets/index.ts`, `src/shared/widgets/WidgetField.vue` | **Modify**: update `resolveWidgetComponent()` to read from `UNIFIED_WIDGET_REGISTRY`. Extend `WidgetField.vue` props to accept `fieldDefinition` (for options/target_concepts). FallbackWidget already handles unknown types. | ~40 (~40 modified) | M | 4.3 |
| [x] 4.5 | `src/components/editor/BlockSheet.vue` (already touched in 3.1) | Wire widgets into `BlockSheet`: already passes `fieldDefinition` through `WidgetField` for field-bound widgets. Concept-type widgets dispatch from concept's `type` property. Marker writes through `commitMarkerValue()`. No additional changes needed â€” BlockSheet was pre-wired in Phase 3. | ~0 (already wired) | M | 4.4, 3.1 |

**Phase 4 total**: ~300 lines added, ~370 modified, 0 deleted.

---

## Phase 5 â€” Graph + Matrix Views

| Task | File(s) | Action | Est. Lines | Risk | Depends On |
|------|---------|--------|-----------|------|-----------|
| [x] 5.1 | `src/components/editor/GraphViewer.vue` | Copy from `file-format/src/components/editor/`. **Major adaptation**: replace `documentStore.modelTree` â†’ build node/link arrays from `modelStore.nodes` + `ModelNode.relationships[]`. d3 SVG rendering code (~580 lines) ported as-is. Depth slider, layout toggle (Sankey/Force). Emit `select-node`. | ~650 (+650) | H | 1.2, 1.5, 2.1 |
| [x] 5.2 | `src/components/editor/MatricesGrid.vue` | Copy from `file-format/src/components/editor/`. Adapt `documentStore.metamatrix` â†’ matrix data on root node fields. Replace `documentStore.getMatrixValues()/setMatrixCell()` â†’ `commitFieldValue()`. Use TailwindCSS. | ~260 (+260) | M | 1.5 |
| [x] 5.3 | `src/components/editor/MetamatrixConfig.vue` | Copy from `file-format/src/components/editor/`. Adapt `documentStore.addMetamatrixRow()`/`removeMetamatrixRow()` â†’ `modelStore` mutations on root node. Adapt `documentStore.metamatrix` access. | ~200 (+200) | M | 5.2 |
| [x] 5.4 | `src/components/editor/MarkerTooltip.vue`, `MatrixPill.vue`, `BlockMatrixSummary.vue`, `BlockRelationships.vue`, `ConceptContainer.vue`, `ConceptPerspectivePanel.vue` | Copy supplementary components from `file-format/src/components/editor/`. Port store-agnostic components as-is. Adapt store-dependent ones: `BlockRelationships` â†’ `modelStore.relationships`; `MatrixPill` â†’ resolve concept colors from modelStore; `ConceptContainer`/`ConceptPerspectivePanel` â†’ modelStore-derived perspectives. | ~380 (+380) | M | 5.2, 3.1 |

**Phase 5 total**: ~1,490 lines added, 0 modified, 0 deleted.

---

## Phase 6 â€” Store Adapters + Polish

| Task | File(s) | Action | Est. Lines | Risk | Depends On |
|------|---------|--------|-----------|------|-----------|
| [x] 6.1 | `src/stores/metamodelStore.ts` | Create thin Pinia adapter over `resolveEffectiveMetamodel()`. Expose `concepts`, `markers`, `getConceptByName`, `getConceptFields`. Composition-API style `defineStore`. | ~45 (+45) | L | 1.5, 5.X |
| [x] 6.2 | `src/stores/modelStore.ts` | **Extend** with new actions: `createChild(parentId, name, type, kind?)`, `removeNodeTree(nodeId)`, `reorderChild(parentId, childId, direction)`. Add getter `activeNodeId`. | ~80 (~80 modified) | M | 1.5 |
| [x] 6.3 | `src/stores/uiStore.ts` | Create `uiStore` for UI-only state: `activeConcept`, `activePerspective`, `activeView`, `selectedNodeId`, `selectedInstanceId`, `activeMatrixIndex`. Setters for each. Composition-API style. | ~55 (+55) | L | â€” |
| [x] 6.4 | Delete: `SidebarTree.vue`, `SidebarTreeNode.vue`, `NodeForm.vue` (or adapt as thin wrapper), old widget files if any | Remove old format-editor components replaced by migrated ones. `NodeForm.vue`: evaluate â€” adapt as thin wrapper delegating to `BlockSheet` or remove entirely if `WorkspaceView.vue` no longer references it. | ~(-200 deleted) | M | 2.4, 3.1, 6.2, 6.3 |
| [x] 6.5 | `src/views/WorkspaceView.vue` | **Major rework**: replace layout with `Header`, `LeftSidebar`, `RightGuidanceSidebar`. Route main content by `uiStore.activeView` ('editor'â†’BlockFeed/TextEditor/TreeEditor, 'graph'â†’GraphViewer placeholder, 'matrices'â†’matrices placeholder, 'info'â†’ModelInfoPanel). Wire tree selection â†’ `uiStore.selectNode()`. Wire save/validate toolbar to migrated components. | ~150 (~150 modified) | H | 2.4, 2.5, 2.6, 3.X, 5.X, 6.2, 6.3 |
| [x] 6.6 | `src/composables/useHashSync.ts` | Port hash-sync logic from file-format's `App.vue`. Hash format: `#conceptName.elementName`. Sync hash â†’ uiStore on external change; sync uiStore â†’ hash on navigation. Guard against infinite update loops. | ~60 (+60) | M | 6.3 |

**Phase 6 total**: ~160 lines added, ~230 modified, ~200 deleted.

---

## Complete Summary

| Phase | Created | Modified | Deleted | Net | Risk Profile |
|-------|---------|----------|---------|-----|-------------|
| P1 Foundation | 810 | 0 | 0 | **+810** | Low (infrastructure + utilities) |
| P2 Layout Chrome | 1,150 | 0 | 0 | **+1,150** | Medium (store adaptation complexity) |
| P3 Editor Views | 1,230 | 0 | 0 | **+1,230** | Medium-High (BlockSheet complex) |
| P4 Widget System | 300 | 370 | 0 | **+670** | Medium-High (FieldReference adaptation) |
| P5 Graph + Matrix | 1,490 | 0 | 0 | **+1,490** | High (GraphViewer d3 adaptation) |
| P6 Store Adapters | 160 | 230 | 200 | **+190** | High (WorkspaceView rework) |
| **Total** | **~5,140** | **~600** | **~200** | **~5,540** | |

---

## Review Workload Forecast

| Phase | Est. Lines | Review Complexity | Key Review Focus |
|-------|-----------|-------------------|-----------------|
| P1 | ~810 | Low | Deps pinned correctly, Tailwind builds, types merge |
| P2 | ~1,150 | Medium | `ConceptTreeNode` recursion with `ModelNode`, Header store bindings |
| P3 | ~1,230 | High | BlockSheet data flow from `modelStore`, widget integration |
| P4 | ~670 | High | `FieldReference` node filtering, provenance stamp chain, fallback |
| P5 | ~1,490 | Very High | GraphViewer d3 data source adaptation, matrix mutation path |
| P6 | ~190 (net) | High | `WorkspaceView.vue` routing by `activeView`, old componect cleanup |

**Peak review phase**: P5 (1,490 lines, GraphViewer + matrix views).

---

## Dependency Graph

```
P1.1 (deps) â”€â”
P1.3 (utils) â”€â”¤
P1.5 (types) â”€â”¤
P1.2 (tailwind) â”€â”
P1.4 (composables) â”€â”
P1.6 (badges) â”€â”€â”€â”€â”€â”€â”¤
                    â”‚
                    â”œâ”€â”€â†’ P2.1 (icons) â”€â†’ P2.2 (ConceptTreeNode) â”€â†’ P2.4 (LeftSidebar) â”€â†’ P2.5 (Header)
                    â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ P2.6 (RightGuidanceSidebar)
                    â”‚
                    â”œâ”€â”€â†’ P3.1 (BlockSheet) â”€â†’ P3.2 (BlockFeed)
                    â”‚         â”‚                 P3.3 (TextEditor)
                    â”‚         â”‚                 P3.4 (TreeEditor)
                    â”‚         â”‚                 P3.5 (ModelInfoPanel)
                    â”‚         â”‚
                    â”‚         â””â”€â”€â†’ P4.5 (BlockSheet widget integration)
                    â”‚
P2.4 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
P3.1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
                    â”œâ”€â”€â†’ P4.1 (widget copies) â”€â†’ P4.2 (v-model adapt) â”€â†’ P4.3 (registry) â”€â†’ P4.4 (WidgetField update)
                    â”‚                                                                          â””â”€â”€â†’ P4.5
                    â”‚
                    â”œâ”€â”€â†’ P5.1 (GraphViewer)
                    â”‚    P5.2 (MatricesGrid) â”€â†’ P5.3 (MetamatrixConfig)
                    â”‚    P5.4 (supporting components)
                    â”‚
P5.X â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
P2.4, P3.1 â”€â”€â”€â”€â”€â”€â”€â”€â”¤
                    â”œâ”€â”€â†’ P6.1 (metamodelStore adapter)
                    â”œâ”€â”€â†’ P6.2 (modelStore extensions)
                    â”œâ”€â”€â†’ P6.3 (uiStore)
                    â”œâ”€â”€â†’ P6.4 (delete old components)
                    â”œâ”€â”€â†’ P6.5 (WorkspaceView rework) â”€â† P6.2, P6.3, P2.4, P2.5, P2.6, P3.X, P5.X
                    â””â”€â”€â†’ P6.6 (hash-sync)
```

**Blocking path**: P1 â†’ P2 â†’ P3 â†’ P4 â†’ P5 â†’ P6.
**Parallelizable within phase**: P2.2â†’P2.3 (ConceptTreeNode+BlockPill), P3.3â†’P3.4â†’P3.5, P4.1â†’P4.2.
**No cross-phase parallelism**: each phase depends on prior phase completing.

---

## Risk Assessment

### Per-Task Risk

| Task | Risk | Rationale | Mitigation |
|------|------|-----------|------------|
| 1.1 | L | Standard npm install | Pin versions matching file-format's `package.json` |
| 1.2 | L | Standard Tailwind setup | Port HSL tokens 1:1; verify `npm run dev` builds |
| 1.3 | L | Pure utility port | Copy then run `vue-tsc` to fix import paths |
| 1.4 | L | Store-agnostic composables | `useBlockVisuals` uses metamodel â€” use placeholder adapter |
| 1.5 | M | Type merge risk | file-format types differ from `ModelNode` â€” keep both namespaces |
| 1.6 | L | Presentational components | Straight copy + Tailwind conversion |
| 2.1 | L | Pure utility | No adaptation needed |
| 2.2 | M | Large recursive component; store mapping | Test with a 3-level model fixture first |
| 2.3 | M | Inline editing with marker values | Marker value path unchanged in `ModelNode` |
| 2.4 | M | Taxonomy tree â†’ modelStore roots | Fundamental structural change; may miss edge cases |
| 2.5 | H | Many `documentStore` references; root node frontmatter | Mock root node frontmatter; iterate per reference |
| 2.6 | M | Guidance content depends on metamodel adapter | Use placeholder text until P6.1 |
| 3.1 | H | Largest single component; field/marker/relationship binding | Port field binding first, then markers, then relationships |
| 3.2 | M | Provenance feed display | Read-only component; less adaptation surface |
| 3.3 | M | Raw content editing | No `markdownParser` dependency â€” works on string |
| 3.4 | M | Tree-structured editing | Depends on P6.2 `createChild`/`removeNodeTree` â€” may need stubs |
| 3.5 | L | Read-only metadata panel | Frontmatter resolution from root node |
| 4.1 | L | Straight copy | Identical file paths |
| 4.2 | H | `FieldReference` targets `modelStore.nodes` | Biggest adaptation: graph-wide filtering; test with large model |
| 4.3 | L | Simple registry file | One-time creation |
| 4.4 | M | Existing WidgetField contract changes | Backward compatible â€” add `fieldDefinition` as optional |
| 4.5 | M | Integration point | Test with both concept-type and field-type nodes |
| 5.1 | H | 639 lines d3 rendering; data source adaptation | Port rendering as-is; change only `buildGraphData()` function |
| 5.2 | M | Matrix data storage strategy | Matrix cells stored as root node fields â€” verify read/write |
| 5.3 | M | Matrix definition mutation | Definition CRUD on root node fields |
| 5.4 | M | Multiple smaller components | Each is independently testable |
| 6.1 | L | Thin adapter pattern | Already specified in design â€” straightforward |
| 6.2 | M | `removeNodeTree` recursive deletion | Must also clean `dirtyIds` and parent references |
| 6.3 | L | Small store | Already specified in design |
| 6.4 | M | Component deletion may break imports | Grep for all imports before deleting |
| 6.5 | H | `WorkspaceView.vue` is integration point | All stores must be ready; test each `activeView` route |
| 6.6 | M | Hash loop prevention | Compare hash before writing; use `replaceState` not `pushState` |

### Key Risk Clusters

1. **GraphViewer (5.1)**: Largest single file (639 lines). d3 SVG rendering is pure DOM â€” only data source adapts. Mitigation: extract `buildGraphData()` function for unit testing.

2. **FieldReference (4.2)**: Requires full `modelStore.nodes` graph for target filtering. Mitigation: widget calls `useModelStore()` directly (Pinia singleton).

3. **WorkspaceView rework (6.5)**: Integration point for all migrated components. Mitigation: build incrementally â€” start with Header+sidebar routing, add editor views one at a time.

4. **BlockSheet (3.1)**: Largest editor component (400+ lines). Complex data flow: fields + markers + relationships + widget dispatch. Mitigation: split into field section, marker section, relationship section.

---

## Source Path Reference

### file-format (source) â†’ format-editor (target)

```
file-format/src/utils/version.ts                        â†’ apps/format-editor/src/utils/version.ts
file-format/src/utils/colors.ts                         â†’ apps/format-editor/src/utils/colors.ts
file-format/src/utils/conceptVisuals.ts                 â†’ apps/format-editor/src/utils/conceptVisuals.ts
file-format/src/utils/constants.ts                      â†’ apps/format-editor/src/utils/constants.ts
file-format/src/utils/renderMarkdown.ts                 â†’ apps/format-editor/src/utils/renderMarkdown.ts
file-format/src/utils/sanitize.ts                       â†’ apps/format-editor/src/utils/sanitize.ts
file-format/src/utils/tree.ts                           â†’ apps/format-editor/src/utils/tree.ts
file-format/src/utils/id.ts                             â†’ apps/format-editor/src/utils/id.ts
file-format/src/utils/documentationParser.ts             â†’ apps/format-editor/src/utils/documentationParser.ts
file-format/src/composables/useResizablePanel.ts        â†’ apps/format-editor/src/composables/useResizablePanel.ts
file-format/src/composables/useBlockVisuals.ts          â†’ apps/format-editor/src/composables/useBlockVisuals.ts
file-format/src/types/index.ts                          â†’ apps/format-editor/src/stores/types.ts (merge with model/types.ts)
file-format/src/components/ui/Badge.vue                 â†’ apps/format-editor/src/components/ui/Badge.vue
file-format/src/components/ui/StatusBadge.vue           â†’ apps/format-editor/src/components/ui/StatusBadge.vue
file-format/src/components/editor/IconRenderer.vue      â†’ apps/format-editor/src/components/editor/IconRenderer.vue
file-format/src/components/editor/MarkerIcons.ts        â†’ apps/format-editor/src/components/editor/MarkerIcons.ts
file-format/src/components/layout/ConceptTreeNode.vue   â†’ apps/format-editor/src/components/layout/ConceptTreeNode.vue
file-format/src/components/layout/LeftSidebar.vue       â†’ apps/format-editor/src/components/layout/LeftSidebar.vue
file-format/src/components/layout/Header.vue            â†’ apps/format-editor/src/components/layout/Header.vue
file-format/src/components/layout/RightGuidanceSidebar.vue â†’ apps/format-editor/src/components/layout/RightGuidanceSidebar.vue
file-format/src/components/editor/BlockSheet.vue        â†’ apps/format-editor/src/components/editor/BlockSheet.vue
file-format/src/components/editor/BlockFeed.vue         â†’ apps/format-editor/src/components/editor/BlockFeed.vue
file-format/src/components/editor/BlockPill.vue         â†’ apps/format-editor/src/components/editor/BlockPill.vue
file-format/src/components/editor/TextEditor.vue        â†’ apps/format-editor/src/components/editor/TextEditor.vue
file-format/src/components/editor/TreeEditor.vue        â†’ apps/format-editor/src/components/editor/TreeEditor.vue
file-format/src/components/editor/ModelInfoPanel.vue    â†’ apps/format-editor/src/components/editor/ModelInfoPanel.vue
file-format/src/components/editor/widgets/FieldString.vue    â†’ apps/format-editor/src/shared/widgets/FieldString.vue
file-format/src/components/editor/widgets/FieldBoolean.vue   â†’ apps/format-editor/src/shared/widgets/FieldBoolean.vue
file-format/src/components/editor/widgets/FieldNumber.vue    â†’ apps/format-editor/src/shared/widgets/FieldNumber.vue
file-format/src/components/editor/widgets/FieldSelect.vue    â†’ apps/format-editor/src/shared/widgets/FieldSelect.vue
file-format/src/components/editor/widgets/FieldReference.vue â†’ apps/format-editor/src/shared/widgets/FieldReference.vue
file-format/src/components/editor/GraphViewer.vue       â†’ apps/format-editor/src/components/editor/GraphViewer.vue
file-format/src/components/editor/MatricesGrid.vue      â†’ apps/format-editor/src/components/editor/MatricesGrid.vue
file-format/src/components/editor/MetamatrixConfig.vue  â†’ apps/format-editor/src/components/editor/MetamatrixConfig.vue
file-format/src/components/editor/MarkerTooltip.vue     â†’ apps/format-editor/src/components/editor/MarkerTooltip.vue
file-format/src/components/editor/MatrixPill.vue        â†’ apps/format-editor/src/components/editor/MatrixPill.vue
file-format/src/components/editor/BlockMatrixSummary.vue â†’ apps/format-editor/src/components/editor/BlockMatrixSummary.vue
file-format/src/components/editor/BlockRelationships.vue â†’ apps/format-editor/src/components/editor/BlockRelationships.vue
file-format/src/components/editor/ConceptContainer.vue   â†’ apps/format-editor/src/components/editor/ConceptContainer.vue
file-format/src/components/editor/ConceptPerspectivePanel.vue â†’ apps/format-editor/src/components/editor/ConceptPerspectivePanel.vue
```

---

## Future Scope (Not Implemented)

The following are documented for reference but **not** included in this task breakdown:

| Feature | Reason |
|---------|--------|
| Table view with inline column editing | Requires porting React â†’ Vue; deferred |
| Drag & drop tree | Replaced by up/down arrow buttons |
| AI Assistant (`AiGuidePanel.vue`) | Excluded per scope decision |
| Dashboard / Charts | Deferred |
| Search / Query | Deferred |
| Remote model loading (`useUrlDocLoader.ts`) | Deferred |
| Cross-boundary wikilinks | Not present in either app |
