# Design: rebuild-format-editor-ui

## Technical Approach

Layered migration of ~5,600 lines of Vue/TS from the archived `file-format` app into `format-editor`, preserving the unified model layer and adding a TailwindCSS design system. Each phase copies source files verbatim, then adapts store bindings from `documentStore`/`metamodelStore` to the unified `modelStore`/new `uiStore`/new `metamodelStore` adapter. Widget systems merge into a single `UNIFIED_WIDGET_REGISTRY` with provenance-stamped writes.

## Architecture Decisions

### Decision: Widget data flow — v-model + provenance, not injection

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep file-format's `inject(UpdateFieldKey)` pattern | Tight parent coupling, no provenance boundary | ❌ Reject |
| `v-model` + `commitFieldValue` | Clean component contract, built-in provenance stamp, testable in isolation | ✅ Adopt |

All field widgets (ported and existing) expose `defineProps<{ modelValue }>` + `emit('update:modelValue')`. `WidgetField.vue` intercepts the emit, calls `commitFieldValue()` which stamps `{ author, timestamp: nowISO() }` on the field and marks the node dirty. Marker writes use `commitMarkerValue()`.

### Decision: Store decomposition — no single monolithic documentStore

| Concern | Former home (file-format) | New home |
|---------|--------------------------|----------|
| Node CRUD | `documentStore.createChild`, `removeNodeTree`, `reorderChild` | `modelStore` (extend with these actions) |
| UI-only routing | `documentStore.activeConceptName`, `selectedNode` | New `uiStore` |
| Matrix/analysis data | `documentStore.metamatrix`, `matrixValues` | New `matrixStore` |
| Metamodel accessors | `metamodelStore.concepts`, `getConceptByName` | New thin Pinia adapter over `resolveEffectiveMetamodel()` |
| Autobackup, demo mode | `workspaceStore` (file-format) | Port relevant parts into format-editor's existing `workspaceStore` |

**Principle**: `modelStore` stays a clean data graph with zero UI state. View-only state (selected node, active perspective, active view) lives in `uiStore`.

### Decision: TailwindCSS — `class` dark mode strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `media` strategy | Follows OS preference, no manual toggle | ❌ Reject — can't support user toggle |
| `class` strategy | Manual toggle via `.dark` on `<html>`, supports both user and OS modes | ✅ Adopt |

`darkMode: 'class'` in tailwind.config.js. HSL token variables ported from file-format. Existing scoped CSS components are unaffected — Tailwind is additive, old components keep their styles until replaced in later phases.

### Decision: GraphViewer — port d3 rendering as-is, adapt only data source

The 639-line d3 SVG rendering code (Sankey + Force layout) is pure DOM manipulation with zero store dependency. It reads a `nodes`/`links` array once at render time. **Do not refactor the rendering** — only change the data-preparation step that builds the node/link arrays from `modelStore.nodes` instead of `documentStore.modelTree`.

### Decision: Migration pattern — copy verbatim, then adapt

Each file from file-format is:
1. **Copied** byte-for-byte to the target path (archived app is read-only)
2. **Adapted** in-place: `useDocumentStore()` → `useModelStore()`, concept getters → `ModelNode` field paths, injection pattern → v-model
3. **Committed** per phase so each phase lands independently

## Store Contracts

### modelStore additions (Phase 6)

```ts
getters:
  activeNodeId: string | null   // derived from uiStore.selectedNodeId
actions:
  selectNode(id: string): void  // delegates to uiStore.selectNode
  createChild(parentId, name, type, kind?): string  // returns new node ID
  removeNodeTree(nodeId): void  // recursive delete
  reorderChild(parentId, childId, direction): void  // 1 = down, -1 = up
```

### uiStore (new — Phase 6)

```ts
export const useUiStore = defineStore('ui', () => {
  const activeConcept = ref<string | null>(null)
  const activePerspective = ref<string>('default')
  const activeView = ref<'editor' | 'graph' | 'matrices' | 'info'>('editor')
  const selectedNodeId = ref<string | null>(null)
  // ...setters for each
})
```

### metamodelStore (new — Phase 6)

Thin Pinia adapter: reads `modelStore.rootIds[0]` → calls `resolveEffectiveMetamodel(id, nodes)` → exposes `concepts`, `markers`, `getConceptByName`, `getConceptFields`. Replaces file-format's `metamodelStore` imports.

## Data Flow

```
User input in a widget
  → Widget emits @update:modelValue
  → WidgetField intercepts
  → commitFieldValue(modelStore, nodeId, fieldKey, value, author)
    → node.fields[fieldKey] = { value, provenance: { author, timestamp } }
    → modelStore.markDirty(nodeId)

Tree node selected
  → ConceptTreeNode emits @select(nodeId)
  → WorkspaceView calls uiStore.selectNode(nodeId)
  → Main content area re-renders based on activeView:
      'editor' → BlockFeed/TextEditor/TreeEditor (read from modelStore.nodes[id])
      'graph'  → GraphViewer (builds node/link arrays from modelStore.nodes)
      'matrices' → MatricesGrid (read matrix fields from modelStore)
      'info'   → ModelInfoPanel (read root node rawContent frontmatter)
```

## Component Tree

```
App.vue
└── <router-view>
    └── WorkspaceView.vue
        ├── Header.vue                 [Phase 2]
        ├── LeftSidebar.vue            [Phase 2]
        │   └── ConceptTreeNode.vue (recursive) [Phase 2]
        │       └── BlockPill.vue                 [Phase 3]
        ├── Main Content Area
        │   ├── BlockFeed.vue          [Phase 3]
        │   │   └── BlockSheet.vue     [Phase 3]
        │   │       └── WidgetField.vue → unified widgets [Phase 4]
        │   ├── TextEditor.vue         [Phase 3]
        │   ├── TreeEditor.vue         [Phase 3]
        │   ├── GraphViewer.vue (d3)   [Phase 5]
        │   ├── MatricesGrid.vue       [Phase 5]
        │   ├── ModelInfoPanel.vue     [Phase 3]
        │   └── MetamatrixConfig.vue   [Phase 5]
        ├── RightGuidanceSidebar.vue   [Phase 2]
        ├── ToastMessage.vue           (existing)
        └── ValidationReport.vue       (existing)
```

## File Changes

| Phase | File | Action |
|-------|------|--------|
| P1 | `apps/format-editor/package.json` | Add deps: tailwindcss, postcss, autoprefixer, clsx, tailwind-merge, lucide-vue-next, d3, d3-sankey, radix-vue, @types/d3, @types/d3-sankey |
| P1 | `apps/format-editor/tailwind.config.js` | Create — port HSL tokens, darkMode: 'class', content paths |
| P1 | `apps/format-editor/postcss.config.js` | Create — standard PostCSS setup |
| P1 | `apps/format-editor/src/assets/main.css` | Create — Tailwind directives + font imports |
| P1 | `apps/format-editor/src/main.ts` | Modify — import `./assets/main.css` |
| P1 | `apps/format-editor/src/utils/*.ts` | Create — 8 utility files from file-format |
| P1 | `apps/format-editor/src/composables/useResizablePanel.ts` | Create — port as-is |
| P1 | `apps/format-editor/src/composables/useBlockVisuals.ts` | Create — adapt metamodel refs |
| P2 | `apps/format-editor/src/components/layout/Header.vue` | Create — adapt store bindings |
| P2 | `apps/format-editor/src/components/layout/LeftSidebar.vue` | Create — tree navigation panel |
| P2 | `apps/format-editor/src/components/layout/ConceptTreeNode.vue` | Create — recursive styled tree node |
| P2 | `apps/format-editor/src/components/layout/RightGuidanceSidebar.vue` | Create — guidance panel |
| P2 | `apps/format-editor/src/components/SidebarTree.vue` | **Delete** — replaced by LeftSidebar |
| P2 | `apps/format-editor/src/components/SidebarTreeNode.vue` | **Delete** — replaced by ConceptTreeNode |
| P2 | `apps/format-editor/src/views/WorkspaceView.vue` | Modify — new layout chrome |
| P3 | `apps/format-editor/src/components/editor/BlockSheet.vue` | Create — block-structured editor |
| P3 | `apps/format-editor/src/components/editor/BlockFeed.vue` | Create — provenance feed |
| P3 | `apps/format-editor/src/components/editor/BlockPill.vue` | Create — inline editable pill |
| P3 | `apps/format-editor/src/components/editor/TextEditor.vue` | Create — raw markdown editor |
| P3 | `apps/format-editor/src/components/editor/TreeEditor.vue` | Create — tree-structured editor |
| P3 | `apps/format-editor/src/components/editor/ModelInfoPanel.vue` | Create — metadata display |
| P4 | `apps/format-editor/src/shared/widgets/FieldString.vue` | Create — adapt from injection to v-model |
| P4 | `apps/format-editor/src/shared/widgets/FieldBoolean.vue` | Create — same adaptation |
| P4 | `apps/format-editor/src/shared/widgets/FieldNumber.vue` | Create — same |
| P4 | `apps/format-editor/src/shared/widgets/FieldSelect.vue` | Create — same, add `options` prop |
| P4 | `apps/format-editor/src/shared/widgets/FieldReference.vue` | Create — major adaptation (modelStore.nodes) |
| P4 | `apps/format-editor/src/shared/widgets/registry.ts` | Create — UNIFIED_WIDGET_REGISTRY |
| P4 | `apps/format-editor/src/shared/widgets/index.ts` | Modify — use UNIFIED_WIDGET_REGISTRY |
| P4 | `apps/format-editor/src/shared/widgets/WidgetField.vue` | Modify — add `fieldDefinition` prop |
| P5 | `apps/format-editor/src/components/editor/GraphViewer.vue` | Create — adapt data source |
| P5 | `apps/format-editor/src/components/editor/MatricesGrid.vue` | Create — matrix editor |
| P5 | `apps/format-editor/src/components/editor/MetamatrixConfig.vue` | Create — matrix config |
| P5 | `apps/format-editor/src/components/editor/IconRenderer.vue` | Create — port as-is |
| P5 | `apps/format-editor/src/components/editor/MarkerTooltip.vue` | Create — port as-is |
| P5 | `apps/format-editor/src/components/editor/MarkerIcons.ts` | Create — port as-is |
| P5 | `apps/format-editor/src/components/editor/MatrixPill.vue` | Create — port as-is |
| P5 | `apps/format-editor/src/components/editor/BlockRelationships.vue` | Create — adapt relationships |
| P5 | `apps/format-editor/src/components/editor/ConceptContainer.vue` | Create — perspective container |
| P5 | `apps/format-editor/src/components/editor/ConceptPerspectivePanel.vue` | Create — perspective tab content |
| P5 | `apps/format-editor/src/components/editor/BlockMatrixSummary.vue` | Create — port as-is |
| P6 | `apps/format-editor/src/stores/metamodelStore.ts` | Create — thin Pinia adapter |
| P6 | `apps/format-editor/src/stores/uiStore.ts` | Create — UI-only state |
| P6 | `apps/format-editor/src/stores/modelStore.ts` | Modify — add createChild, removeNodeTree, reorderChild, selectNode |
| P6 | `apps/format-editor/src/components/NodeForm.vue` | Delete (or adapt as thin wrapper) |
| P6 | `apps/format-editor/src/components/ui/Badge.vue` | Create — port from file-format |
| P6 | `apps/format-editor/src/components/ui/StatusBadge.vue` | Create — port from file-format |

Total: ~40 files created, ~6 files modified, 3 files deleted.

## Unified Widget Registry (Phase 4)

```ts
const UNIFIED_WIDGET_REGISTRY: Record<string, Component> = {
  // Concept-type (from format-editor)
  text: TextWidget,
  weight: WeightWidget,
  category: CategoryWidget,
  // Field-type (from file-format)
  string: FieldString,
  boolean: FieldBoolean,
  number: FieldNumber,
  select: FieldSelect,
  reference: FieldReference,
}
```

Dispatch by `widgetType` string. Unknown types render `FallbackWidget` (read-only, shows raw value + type badge). `WidgetField` wraps all widgets and handles provenance.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `modelStore` new actions (createChild, reorder, removeNodeTree) | Vitest with mock graph |
| Unit | `uiStore` state/mutations | Vitest — Pinia test utils |
| Unit | `commitFieldValue` / `commitMarkerValue` provenance stamps | Vitest with modelStore instance |
| Unit | `resolveWidgetComponent` fallback behavior | Vitest — registry lookup |
| Component | Widget v-model binding + emit | Vitest + `@vue/test-utils` mount (per widget) |
| Component | Layout components with Tailwind classes | Vitest + happy-dom (smoke test render) |
| E2E | Full flow: open model → tree renders → select node → edit field → save | Manual (no E2E framework in project yet) |

## Migration / Rollout

No migration required — format-editor has no persistent state beyond the IndexedDB handle store (unchanged). Each phase is independently buildable and testable:

- **P1** — infra only, no visual change. Verify `npm run dev` still works.
- **P2** — layout replaces old sidebar. Old `SidebarTree`/`SidebarTreeNode` deleted.
- **P3** — editor components active. Old `NodeForm` still present but no longer the default display (deleted in P6).
- **P4** — widgets merged. Existing concept-type widgets continue to work unchanged.
- **P5** — graph + supplementary views. Full feature parity with file-format.
- **P6** — polish. Old components removed, store adapters finalised.

Build verification gate: `vue-tsc --noEmit && vite build` must pass after each phase.

## Open Questions

- [ ] `modelStore.selectNode()` — should it call `uiStore.selectNode()` directly (circular dep risk?), or should `WorkspaceView` wire both?
  - **Resolution**: Wire in `WorkspaceView`. `modelStore` emits no event — `WorkspaceView` calls `uiStore.selectNode()`. `modelStore` stays dependency-free.
- [ ] `FieldReference` needs `modelStore.nodes` for target filtering — does `WidgetField` pass the full graph or does the widget call `useModelStore()` directly?
  - **Resolution**: Widget calls `useModelStore()` directly (Pinia is a singleton — no prop drilling needed).
- [ ] Exact `radix-vue` version to lock — verify API compatibility before install.
