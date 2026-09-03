# Design: port-legacy-gaps

## Architecture Overview

The format-editor is a Vue 3 + Pinia SPA that reads, displays, and edits FORMAT V_0-1-5 model documents. The current architecture is a single normalized graph (`modelStore`) backed by a Pinia store, with all UI state separated into `uiStore`. The workspace layer (`workspaceStore`) owns the File System Access API handle and serialization lifecycle. Metamodel resolution delegates to `@cognnitive/format-core`'s `resolveEffectiveMetamodel`.

This change adds 7 additive phases that port features from the predecessor SPAs (file-format, folder-format) without modifying the core data model, serializer, or parser. Each phase produces independent components or modifies existing ones in a scoped way.

### Data Flow Summary

```
workspaceStore (handle, URL, backup, session)
  â””â”€ modelStore (normalized node graph)
       â”œâ”€ metamodelStore (concepts, markers, taxonomy, perspectives)
       â”œâ”€ uiStore (selection, view, active perspective)
       â””â”€ utils/db.ts (IndexedDB v2 â€” session, treeState, sidebarWidths)

Components:
  LeftSidebar â”€â”€ ConceptTreeNode â”€â”€ VirtualGroupNode
       â”‚              â”‚ BlockPill (colored pills, popups, ghost)
       â”‚              â”‚ blockId â†’ modelStore.getNode
       â”‚
  BlockFeed â”€â”€ BlockSheet â”€â”€ (tab: View|Visual|History|Compliance)
       â”‚              â”‚  â”œâ”€ FieldViewer â†’ WidgetField â†’ registry
       â”‚              â”‚  â”œâ”€ BlockRelationships
       â”‚              â”‚  â”œâ”€ BlockMatrixSummary
       â”‚              â”‚  â”œâ”€ NodeMedia (lightbox)
       â”‚              â”‚  â””â”€ attachments
       â”‚              â”œâ”€ GraphViewer (inline mode)
       â”‚              â”œâ”€ (HistoryTab â†’ rawContent)
       â”‚              â””â”€ ComplianceTab â†’ ValidationReport
       â”‚
  MatricesGrid (virtual scroll) â† modelStore.root.fields[__matrix_defs]
  ModelInfoPanel â”€â”€ VersionPanel (bump, preview, save)
  ConceptPerspectivePanel â† metamodelStore.taxonomyEdges
```

### Dependency Additions

| Library | Purpose | Added By |
|---------|---------|----------|
| `marked` | Full Markdown rendering | Phase B |
| `vue-virtual-scroller` (or `@vueuse/core`) | Virtual scrolling for MatricesGrid | Phase D |

Each library is < 15KB gzipped.

---

## Phase A: Tree Navigation

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `BlockPill.vue` | Existing (improved) | Color resolution via parent chain (V_0-1-5 concept resolution), YIQ contrast, ghost state, Teleported info popup, marker cycling |
| `ConceptTreeNode.vue` | Modified | Integrate BlockPill for pill rendering + instance counter; add info icon button; detect ghost state; wire popup |
| `LeftSidebar.vue` | Modified | Pass instance counters; expand/collapse-all unchanged |
| `VirtualGroupNode.vue` | Modified | Enhanced styling (colored left border, tinted background, uppercase tracking-wider name, expand/collapse chevron) |

### Data Flow

```
modelStore.getNode(nodeId)
    â†“
useConceptVisuals.resolveColor(node) â†’ hex color
useConceptVisuals.resolveIcon(node) â†’ icon string
modelStore.getChildren(nodeId).length â†’ instance count
    â†“
ConceptTreeNode (row)
  â”œâ”€ BlockPill (colored pill with YIQ text)
  â”œâ”€ name + kind badge
  â”œâ”€ info icon (â†’ Teleport popup with fields/description/markers)
  â”œâ”€ move-up / move-down
  â””â”€ (recursive children with VirtualGroupNode grouping)
```

### Key Decisions

1. **BlockPill color resolved via parent chain** (not local frontmatter): Follows V_0-1-5 spec where level-3 models inherit color from the template-level concept definition. `useConceptVisuals.resolveColor(node)` already walks the ancestor chain and falls back to peer template resolution.

2. **YIQ formula in `useConceptVisuals`**: Add a `yiqLuminance(hex)` utility that returns perceived brightness. Threshold at 0.55: above â†’ dark text (#1e293b), below â†’ white (#ffffff). Already exists in GraphViewer.vue as `textColor(bg)` â€” extract to shared utility.

3. **Info popup via Teleport + getBoundingClientRect**: Already implemented in BlockPill.vue (`togglePopup` reads `triggerEl.getBoundingClientRect()`, positions via fixed coordinates). ConceptTreeNode will reuse this pattern: the info icon button triggers the popup with the node's blockId, fields, description, and markers.

4. **Ghost state detection**: `isEmpty` computed in BlockPill: `!description && no non-empty fields && instanceCount === 0`. ConceptTreeNode passes these props down. When ghost, row renders with `opacity: 0.45`, italic name, muted "Empty" label.

5. **Instance counter**: VirtualGroupNode already renders `children.length` as a counter badge. ConceptTreeNode will add the same for concept-type nodes via `modelStore.getChildren(nodeId).length`.

6. **VirtualGroupNode styling**: Already partially done (colored left border, tinted background, uppercase name). Enhance with: concept icon from `IconRenderer`, expand/collapse chevron with rotation animation, instance counter badge in concept color.

### Files Changed

| File | Change |
|------|--------|
| `src/components/layout/ConceptTreeNode.vue` | Add BlockPill integration, info icon/popup, ghost state, instance counter |
| `src/components/layout/LeftSidebar.vue` | Instance counter wiring (pass through, no breaking changes) |
| `src/components/layout/VirtualGroupNode.vue` | Enhanced header styling (icon, chevron, counter) |
| `src/components/editor/BlockPill.vue` | Improve color resolution (parent chain), YIQ contrast, ghost state |
| `src/composables/useConceptVisuals.ts` | Export `yiqLuminance` utility, ensure parent-chain resolution |

---

## Phase B: Sheet Content

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `BlockSheet.vue` | Modified | Full Markdown via `marked`; 4-tab layout; inline GraphViewer; BlockRelationships; BlockMatrixSummary; NodeMedia; FieldViewer; attachments |
| `BlockFeed.vue` | Modified | Pass through new events/props to BlockSheet |
| `BlockRelationships.vue` | New | Read from modelStore.relationships, render labeled chips with clickable targets |
| `BlockMatrixSummary.vue` | New | Read root node's matrix definitions, show chips for node's participation |
| `NodeMedia.vue` | New | File System Access API + objectURL for images; lightbox dialog; file download links |
| `FieldViewer.vue` | New | Dispatch to widget registry; read/edit modes |
| `ComplianceTab.vue` | New | Scoped validation results from ValidationReport |
| `GraphViewer.vue` | Modified | `inline` prop for compact mode (320px, no layout selector) |

### Data Flow

```
BlockSheet.readMode
  â”œâ”€ Tab Bar: [View | Visual | History | Compliance]
  â”‚
  â”œâ”€ View Tab:
  â”‚   â”œâ”€ renderedDescription (marked â†’ sanitized â†’ v-html)
  â”‚   â”œâ”€ FieldViewer (fields Ã— registry widgets, read mode)
  â”‚   â”œâ”€ BlockRelationships (node.relationships)
  â”‚   â”œâ”€ BlockMatrixSummary (rootNode.fields.__matrix_defs âˆ© current node)
  â”‚   â”œâ”€ NodeMedia (node.assets + assetMode)
  â”‚   â””â”€ File Attachments (node.assets list)
  â”‚
  â”œâ”€ Visual Tab:
  â”‚   â””â”€ GraphViewer (inline, localNodeId=current node, height=320px)
  â”‚
  â”œâ”€ History Tab:
  â”‚   â””â”€ last_saved timestamp, node name, file path (from rawContent frontmatter)
  â”‚
  â””â”€ Compliance Tab:
      â””â”€ ComplianceTab (ValidationReport scoped to concept type)

BlockFeed.wiring:
  props â†’ BlockSheet
  events â† navigate-to-node, add-child, change, edit-toggle
```

### Key Decisions

1. **Markdown via `marked` + DOMPurify**: Replace `renderInlineMarkdown` with full `marked` library. The rendered HTML must be sanitized (strip scripts, event handlers) before `v-html`. Code blocks get monospace + subtle bg. Images get `max-width: 100%`, `max-height: 480px`. Tables get horizontal scroll.

2. **GraphViewer inline mode**: Add `inline` prop. When `true`: no layout selector header, height defaults to `320px` (configurable via `height` prop), `localNodeId` scopes the graph. Zoom controls remain. The inline GraphViewer uses the last-selected layout from the full view.

3. **Tabs with lazy rendering**: Underline-style active indicator. Only the active tab's content renders (using `v-if`, not `v-show`, to avoid mounting hidden GraphViewer instances). The header (name, markers, controls) stays above the tabs and does NOT re-mount on tab switch.

4. **BlockRelationships as chips**: Each relationship renders as a labeled pill with the target node name as a clickable link. Accepts `relationships` array + `onNavigate` callback. Empty state shows "No relationships defined." in italic.

5. **BlockMatrixSummary chips**: For each matrix on the root node, check if the current node appears as a row (source) or column (target) instance. Shows: matrix name, position ("row" or "col"), count of non-dash cells. Chip accent color = concept color of the side the node participates on.

6. **NodeMedia + lightbox**: Images rendered as gallery grid (2-3 columns). Click opens full-screen overlay with dark backdrop. Use File System Access API to read files from workspace, generate objectURL for display. Non-image files render as download links with file-type icons.

7. **FieldViewer as registry dispatcher**: Accepts field definitions + node fields. Each field renders via `WidgetField` â†’ `resolveWidgetComponent`. Supports `readonly` prop. In edit mode, renders interactive widgets with `v-model` + `commitFieldValue`.

8. **V_0-1-5 frontmatter parsing**: All tab content that reads frontmatter must handle `spec_version` (not `specification_version`) and the `_F.md` suffix. Document notice parsing updated accordingly.

### Files Changed

| File | Change |
|------|--------|
| `src/components/editor/BlockSheet.vue` | Tab system, marked rendering, FieldViewer, rels, matrix summary, media, attachments, ComplianceTab |
| `src/components/editor/BlockFeed.vue` | Pass-through wiring for new events |
| `src/components/editor/BlockRelationships.vue` | **New** â€” labeled relationship chips |
| `src/components/editor/BlockMatrixSummary.vue` | **New** â€” matrix participation chips |
| `src/components/editor/NodeMedia.vue` | **New** â€” image gallery + lightbox + file download |
| `src/components/editor/FieldViewer.vue` | **New** â€” widget-based field rendering |
| `src/components/editor/ComplianceTab.vue` | **New** â€” scoped validation results |
| `src/components/editor/GraphViewer.vue` | `inline` prop, `height` prop, hide layout selector when inline |
| `src/utils/renderMarkdown.ts` | Replace implementation with `marked` + sanitize; or add new file `utils/markdown.ts` |

---

## Phase C: Widget Registry

### Components

| File | Type | Responsibility |
|------|------|----------------|
| `src/shared/widgets/DateWidget.vue` | New | `<input type="date">` in edit, formatted text in read |
| `src/shared/widgets/UrlWidget.vue` | New | Clickable link in read, URL input in edit |
| `src/shared/widgets/ColorWidget.vue` | New | Color swatch in read, `<input type="color">` in edit |
| `src/shared/widgets/MultiSelectWidget.vue` | New | Removable chips in edit, static chips in read |
| `src/shared/widgets/TagsWidget.vue` | New | Free-form text tags, Enter/comma to add, Ã— to remove |
| `src/shared/widgets/RatingWidget.vue` | New | Filled/empty stars (1-5) in both modes |
| `src/shared/widgets/ScaleWidget.vue` | New | Clickable step indicators with badge |
| `src/shared/widgets/ToggleGroupWidget.vue` | New | Segmented button group for enum selection |
| `src/shared/widgets/CycleWidget.vue` | New | Pill that cycles through values on click |
| `src/shared/widgets/CodeWidget.vue` | New | Monospace code block in read, textarea with line numbers in edit |
| `src/shared/widgets/MermaidWidget.vue` | New | Rendered diagram in read, textarea in edit |
| `src/shared/widgets/DiagramWidget.vue` | New | Inline SVG from box-arrow DSL |
| `src/shared/widgets/TimestampWidget.vue` | New | Locale-formatted datetime in read, `<input type="datetime-local">` in edit |
| `src/shared/widgets/MarkdownWidget.vue` | New | Rendered markdown in read, textarea with toolbar in edit |
| `src/shared/widgets/registry.ts` | Modified | Add 14 new entries to `UNIFIED_WIDGET_REGISTRY` + `WidgetType` union |
| `src/shared/widgets/index.ts` | Modified | Re-export new widgets |

### Data Flow

```
WidgetField (shared/widgets/WidgetField.vue)
  â”œâ”€ widgetType â†’ resolveWidgetComponent â†’ UNIFIED_WIDGET_REGISTRY[type]
  â”œâ”€ modelValue â†’ current field value from modelStore
  â”œâ”€ fieldDefinition â†’ { name, type, options, target_concepts }
  â”œâ”€ readonly â†’ true = display mode, false = interactive
  â””â”€ update:modelValue â†’ commitFieldValue(modelStore, nodeId, fieldKey, value, provenance)
```

### Key Decisions

1. **Contract consistency**: Every widget follows the same contract as `FieldString.vue`:
   - `modelValue` prop
   - `update:modelValue` emit
   - Optional `fieldDefinition` prop
   - `readonly` prop (default `false`)
   - No dependency on modelStore directly â€” the parent (`WidgetField`) handles commits

2. **CodeWidget**: Use a simple monospace `<textarea>` with line numbers rendered as a side gutter via CSS counters. No heavy code editor dependency (CodeMirror/Monaco). The `fieldDefinition.type` determines the language badge shown in read mode.

3. **MermaidWidget**: Render diagrams via the `mermaid` npm package. Use `mermaid.run()` or `mermaid.render()` for server-safe rendering. In edit mode, show textarea with raw source. On `Ctrl+Enter` or blur, re-render the diagram. `<iframe>` sandboxing for security if needed.

4. **MarkdownWidget**: Reuse the `marked` library (same instance as Phase B) for read-mode preview. Edit mode: textarea with a simple toolbar (bold, italic, list, heading) using `document.execCommand` or markdown syntax insertion.

5. **Registration pattern**: Named exports from each widget file, imported in `registry.ts`:

   ```typescript
   export const UNIFIED_WIDGET_REGISTRY: Record<string, Component> = {
     // ... existing ...
     date: DateWidget,
     url: UrlWidget,
     color: ColorWidget,
     multiselect: MultiSelectWidget,
     tags: TagsWidget,
     rating: RatingWidget,
     scale: ScaleWidget,
     togglegroup: ToggleGroupWidget,
     cycle: CycleWidget,
     code: CodeWidget,
     mermaid: MermaidWidget,
     diagram: DiagramWidget,
     timestamp: TimestampWidget,
     markdown: MarkdownWidget,
   }
   ```

6. **Existing widgets unchanged**: `FieldString`, `FieldBoolean`, `FieldNumber`, `FieldSelect`, `FieldReference`, `FieldAsset`, `TextWidget`, `WeightWidget`, `CategoryWidget` â€” not touched.

### Files Created/Modified

| File | Change |
|------|--------|
| `src/shared/widgets/DateWidget.vue` | New |
| `src/shared/widgets/UrlWidget.vue` | New |
| `src/shared/widgets/ColorWidget.vue` | New |
| `src/shared/widgets/MultiSelectWidget.vue` | New |
| `src/shared/widgets/TagsWidget.vue` | New |
| `src/shared/widgets/RatingWidget.vue` | New |
| `src/shared/widgets/ScaleWidget.vue` | New |
| `src/shared/widgets/ToggleGroupWidget.vue` | New |
| `src/shared/widgets/CycleWidget.vue` | New |
| `src/shared/widgets/CodeWidget.vue` | New |
| `src/shared/widgets/MermaidWidget.vue` | New |
| `src/shared/widgets/DiagramWidget.vue` | New |
| `src/shared/widgets/TimestampWidget.vue` | New |
| `src/shared/widgets/MarkdownWidget.vue` | New |
| `src/shared/widgets/registry.ts` | Add 14 entries + update `WidgetType` union |
| `src/shared/widgets/index.ts` | Re-export new components |

---

## Phase D: Matrix Virtual Scrolling

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `MatricesGrid.vue` | Modified | Replace flat `<table>` with virtual scroller for rows and columns |

### Data Flow

```
modelStore.root.fields[__matrix_defs] â†’ matrix definitions
modelStore.nodes filtered by concept type â†’ rows (source type), columns (target type)
  â†“
VirtualScroller (rows visible viewport + 3 overscan)
  â”œâ”€ Sticky first column (source concept name)
  â””â”€ VirtualScroller (columns visible viewport + overscan)
       â””â”€ Cells with interactive widgets (same as current)

Value distribution: computed over ALL cells (not just visible)
Copy Table MD: exports ALL cells (not just visible)
```

### Key Decisions

1. **Library: Custom implementation via `@vueuse/core`'s `useVirtualList`**: The lightest option with no new dependency if `@vueuse/core` is already available. If not, add `vue-virtual-scroller` (popular, Vue 3 compatible, ~10KB gzipped). Fallback: manual virtual scroll using a spacer div + absolute positioning.

2. **Virtualize both rows AND columns**: The intersection of visible rows and visible columns determines the rendered cell window. Implement as a nested approach:
   - Outer virtual scroller for rows (vertical scroll)
   - Inner horizontal scrolling with `overflow-x: auto` for columns
   - Column headers are virtualized within the horizontal scroll container
   - The first column (source concept) uses `position: sticky; left: 0` outside the virtual column range

3. **Fixed row height**: Default 48px per row. Column width: configurable via matrix `params` (e.g., `colWidth:120`), default 120px.

4. **Scroll position per matrix**: Maintain a `Map<matrixName, { scrollTop, scrollLeft }>`. On matrix switch, save current and restore target. On matrix select, reset to `(0, 0)`.

5. **Cell editing works in virtualized cells**: The existing `getVal`/`setVal` functions use root node field keys (e.g., `M1||Row||Col`). These are unchanged â€” only the rendering approach changes. All 5 widget types (boolean, cycle, scale, set, text) continue to work.

6. **Distribution bar and export**: These read from `valueDistribution` computed property which iterates ALL rows/columns. No change needed â€” they already operate on the full dataset.

### Files Changed

| File | Change |
|------|--------|
| `src/components/editor/MatricesGrid.vue` | Replace table with virtual scroller, add scroll position tracking |
| `package.json` | Add virtual scroller dependency |

---

## Phase F: File System Operations

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `DirectoryPickerModal.vue` | New | Welcome screen: "Open Local Folder" (File System Access API) + "Load from URL"; recent dirs from IndexedDB |
| `composables/useFileSystem.ts` | New | `scanDirectory`, `readFileContent`, `connectDirectory` |
| `composables/useUrlDocLoader.ts` | New | `fetch(url)`, parse with `@cognnitive/format-core`, populate modelStore |
| `stores/workspaceStore.ts` | Modified | `loadFromUrl(url)`, `backupEnabled` flag, enhanced `saveActiveFile()` |

### Data Flow

```
DirectoryPickerModal
  â”œâ”€ "Open Local Folder" â†’ window.showDirectoryPicker() â†’ emit open-handle â†’ workspaceStore.open(handle)
  â”œâ”€ "Load from URL" â†’ useUrlDocLoader.fetch(url) â†’ modelStore.setGraph() â†’ workspaceStore.hasParsed = true
  â””â”€ Recent dirs â†’ IndexedDB (session store) â†’ displayed as clickable list

workspaceStore.saveActiveFile()
  â”œâ”€ (if backupEnabled) write backups/{timestamp}_{basename}.md
  â”œâ”€ recursiveSerialize(modelStore.nodes, dirtyIds)
  â””â”€ clearDirty flags

Folder init modal:
  â”œâ”€ Select template â†’ generate _F.md with V_0-1-5 frontmatter
  â”œâ”€ Enter model name
  â””â”€ Emit create event with frontmatter data
```

### Key Decisions

1. **File System Access API guarded**: Check `'showDirectoryPicker' in window` before showing the button. If unavailable (non-Chrome, insecure context), show the "Load from URL" option prominently and a fallback text input for development.

2. **Auto-backup non-blocking**: Backup failure logs `console.warn` but does NOT prevent the save. The backup file format: `backups/YYYY-MM-DD_HHmmss_{original-basename}.md`. The `backups/` directory is created relative to the workspace root.

3. **URL loading creates virtual workspace**: No File System handle. `workspaceStore.handle` remains `null`, but `hasParsed` is `true`. The source URL is stored in root node's `source.path`. Save is disabled for URL-loaded workspaces.

4. **Folder init modal does NOT write to disk**: It emits a `create` event with the generated frontmatter data. The caller (workspaceStore or a parent component) handles actual file creation. This separates concern and makes the modal testable.

5. **V_0-1-5 frontmatter for new models**: Generated files use:
   - Suffix: `_F.md`
   - `spec_version: "V_0-1-5"`
   - `spec_url: buildSpecificationUrl("V_0-1-5")`
   - Level-appropriate frontmatter

### Files Created/Modified

| File | Change |
|------|--------|
| `src/components/layout/DirectoryPickerModal.vue` | **New** â€” welcome screen, folder picker, URL input, recent dirs |
| `src/composables/useFileSystem.ts` | **New** â€” scan, read, connect directory |
| `src/composables/useUrlDocLoader.ts` | **New** â€” fetch + parse + populate |
| `src/stores/workspaceStore.ts` | Add `loadFromUrl`, `backupEnabled`, enhanced `saveActiveFile` |

---

## Phase H: Taxonomy Perspectives

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `stores/metamodelStore.ts` | Modified | Add `taxonomyEdges`, `conceptTree`, `getNeighborhood` |
| `components/editor/ConceptPerspectivePanel.vue` | Modified | Read taxonomy from metamodelStore, render PerspectiveNeighborhood |

### Data Flow

```
rootNode rawContent frontmatter:
  taxonomy:
    - parent: Industry
      child: AILab
    ...

  â†“ (metamodelStore)

taxonomyEdges: PerspectiveEdge[] â† parsed from frontmatter
conceptTree: TreeNode[] â† hierarchical tree from edges
getNeighborhood(name): PerspectiveNeighborhood â† { perspective, parents[], children[] }

  â†“ (ConceptPerspectivePanel)

Selected concept â†’ shows Parents â–² / Active â— / Children â–¼
  â†“ click parent/child pill
uiStore.activePerspective = "taxonomy-{conceptName}"
  â†“
Tree / graph viewer react to active perspective (highlight concept subtree)
```

### Key Decisions

1. **Taxonomy from frontmatter `taxonomy` field**: Parse the array of `{ parent, child }` objects into `PerspectiveEdge[]`. If no taxonomy field, return empty array (no crash). This replaces the current stub that builds a flat "Hierarchy" perspective from `localMetamodel.concepts` order.

2. **Concept tree building**: Computed property that groups edges into a tree:
   - Roots = concepts that are a `parent` but never a `child`
   - Depth-first nesting
   - Complexity: O(n) where n = number of edges (typically < 100)

3. **PerspectiveNeighborhood via `getNeighborhood`**: For a given concept name, find all edges where it appears as `child` (parents) or `parent` (children). The `Perspective` object uses ID `taxonomy-{conceptName}` and resolves icon/color from existing metamodel concepts.

4. **V_0-1-5 conformant**: Taxonomy data comes from the template (level 2) via parent chain, not from level 3 model frontmatter. The existing `resolveEffectiveMetamodel` already handles this â€” taxonomy edges are extracted from the resolved root node's frontmatter.

5. **Active perspective updates uiStore**: `ConceptPerspectivePanel` calls `uiStore.setActiveConcept(name)` which sets `activePerspective` to `taxonomy-{name}`. Other components react but do NOT re-render unnecessarily.

### Files Changed

| File | Change |
|------|--------|
| `src/stores/metamodelStore.ts` | Add `taxonomyEdges`, `conceptTree`, `getNeighborhood` |
| `src/components/editor/ConceptPerspectivePanel.vue` | Read from metamodelStore instead of building stub; uiStore integration |

---

## Phase L: Misc

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `utils/db.ts` | New | IndexedDB wrapper with versioned schema (v2) |
| `stores/workspaceStore.ts` | Modified | Session persistence integration (lastFile, treeState, sidebarWidths) |
| `stores/modelStore.ts` | Modified | Optional â€” expose node signals for persistence |
| `components/editor/ModelInfoPanel.vue` | Modified | Add Version Management section |
| `utils/version.ts` | Enhanced | Semver bump logic (already done, verify correctness) |

### Data Flow

```
IndexedDB 'format-editor' v2
  â”œâ”€ handles: same as v1 (directory handles)
  â”œâ”€ session: { key: lastFile | lastOpenedAt | activeView | selectedNodeId }
  â”œâ”€ treeState: { nodeId, collapsed }
  â””â”€ sidebarWidths: { panelId, width }

utils/db.ts exports:
  dbGet<T>(storeName, key) â†’ T | undefined
  dbSet(storeName, key, value) â†’ void
  getSessionState() â†’ Record
  setSessionState(key, value) â†’ void
  getTreeState() â†’ Map<nodeId, collapsed>
  setTreeState(nodeId, collapsed) â†’ void
  getSidebarWidth(panelId) â†’ number | undefined
  setSidebarWidth(panelId, width) â†’ void

workspaceStore:
  open() â†’ setSessionState('lastFile', path)
  recoverHandle() â†’ restore uiStore state from session
  persistTreeState(nodeId, collapsed) â†’ debounced setTreeState
  restoreTreeState() â†’ getTreeState()

ModelInfoPanel.VersionManagement:
  read model_version from frontmatter
  display current version
  3 bump buttons (major/minor/patch) with preview tooltips
  save â†’ saveActiveFileWithVersionBump(level)
  disabled when no handle / saving / no root
```

### Key Decisions

1. **IndexedDB schema v2, backward-compatible**: The existing `handles` store (version 1) must NOT be modified or dropped. The upgrade handler uses:
   ```typescript
   req.onupgradeneeded = () => {
     const db = req.target.result
     if (!db.objectStoreNames.contains('handles'))
       db.createObjectStore('handles')
     if (!db.objectStoreNames.contains('session'))
       db.createObjectStore('session', { keyPath: 'key' })
     if (!db.objectStoreNames.contains('treeState'))
       db.createObjectStore('treeState', { keyPath: 'nodeId' })
     if (!db.objectStoreNames.contains('sidebarWidths'))
       db.createObjectStore('sidebarWidths', { keyPath: 'panelId' })
   }
   ```

2. **Debounced persistence**: Session state persists within 500ms debounce (field changes). Tree state persists within 300ms debounce (expand/collapse toggles). Sidebar width persists immediately on `onPointerUp`.

3. **Graceful degradation**: All `db.*` functions catch errors silently. If IndexedDB is unavailable (private browsing, quota exceeded), return `undefined`/`false` without throwing. The app continues without persistence.

4. **Version panel shows ModelInfoPanel**: New collapsible "Version Management" section below existing model metadata. Reads `model_version` from frontmatter. Three bump buttons with hover preview (e.g., "V_1-0-0 â†’ V_2-0-0"). Save calls `workspaceStore.saveActiveFileWithVersionBump(level)`.

5. **Disabled states**: Buttons disabled with tooltip when no handle, currently saving, or no root node parsed.

6. **Version panel UI**: Collapsible chevron. Current version displayed as `V_Major-Minor-Patch`. Bump buttons styled as primary/secondary actions.

### Files Created/Modified

| File | Change |
|------|--------|
| `src/utils/db.ts` | **New** â€” IndexedDB wrapper with generic operations + convenience functions |
| `src/stores/workspaceStore.ts` | Add session persistence calls in `open()` and `recoverHandle()`; add `persistTreeState`/`restoreTreeState` |
| `src/composables/useResizablePanel.ts` | Add IndexedDB read in init, write on `onPointerUp` (alongside localStorage) |
| `src/components/editor/ModelInfoPanel.vue` | Add Version Management section with bump buttons |
| `src/utils/version.ts` | Verify `bumpVersion`, `formatVersionString`, `buildFormatFilename` correctness; no changes needed |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Widget count (14 new) balloons review size | Med | Phase C can be sliced per-widget; each widget is ~30-80 LOC, independently testable |
| Tree changes affect UX flow | Low | Scoped to cosmetic + counter; revertible by phase commit |
| IndexedDB schema v2 conflicts with existing v1 data | Low | Upgrade handler preserves `handles` store; tests with `fake-indexeddb` |
| `marked` + `mermaid` bundle size increase | Low | Both are tree-shakeable; `marked` is ~12KB, `mermaid` is optional (Phase C only) |
| Virtual scrolling library compatibility with Vue 3.5 | Low | `vue-virtual-scroller` 2.x supports Vue 3; fallback to custom implementation |
| File System Access API not available | Med | Graceful fallback to URL loading + manual entry; DirectoryPickerModal shows error state |

## Rollback Strategy

Each phase is a separate commit slice. Revert the specific phase's commits. No cross-phase coupling exists â€” rolling back Phase B does not affect Phase C widgets or Phase A tree. The following commit slice boundaries are recommended:

1. `feat(port-legacy-gaps): phase A tree navigation` â€” BlockPill, ConceptTreeNode, VirtualGroupNode, LeftSidebar
2. `feat(port-legacy-gaps): phase B sheet content` â€” BlockSheet, BlockFeed, BlockRelationships, BlockMatrixSummary, NodeMedia, FieldViewer, ComplianceTab, GraphViewer inline
3. `feat(port-legacy-gaps): phase C widget registry` â€” 14 new widgets + registry/index updates
4. `feat(port-legacy-gaps): phase D matrix virtual scrolling` â€” MatricesGrid virtual scroll
5. `feat(port-legacy-gaps): phase F file system ops` â€” DirectoryPickerModal, useFileSystem, useUrlDocLoader, workspaceStore
6. `feat(port-legacy-gaps): phase H taxonomy perspectives` â€” metamodelStore taxonomy + ConceptPerspectivePanel
7. `feat(port-legacy-gaps): phase L misc` â€” utils/db.ts, session persistence, version panel
