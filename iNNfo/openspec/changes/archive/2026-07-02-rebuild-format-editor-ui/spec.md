# Spec: rebuild-format-editor-ui

> Delta spec for migrating the archived `file-format` UI into `format-editor`, unifying the widget system, and establishing the TailwindCSS design system across all phases.

---

## Phase 1: Foundation (dependencies + utility migration)

### Functional Requirements

**FR-1.1**: Add TailwindCSS v3, PostCSS, and Autoprefixer with a config that ports file-format's HSL-based color tokens, custom font sizes, and border-radius variables.

**FR-1.2**: Add `lucide-vue-next` for icon components.

**FR-1.3**: Add `radix-vue` v1.8.x for accessible UI primitives (Select, Switch, Tooltip, Dialog, Command).

**FR-1.4**: Add `d3@^7.9.0`, `d3-sankey@^0.12.3`, `@types/d3`, `@types/d3-sankey` for the GraphViewer.

**FR-1.5**: Add `clsx` and `tailwind-merge` for class composition.

**FR-1.6**: Copy the following utilities from `file-format/src/utils/` to `format-editor/src/utils/`:

| Source path | Target path | Adaptation |
|---|---|---|
| `file-format/src/utils/version.ts` | `apps/format-editor/src/utils/version.ts` | Port as-is (no store deps) |
| `file-format/src/utils/colors.ts` | `apps/format-editor/src/utils/colors.ts` | Port as-is |
| `file-format/src/utils/conceptVisuals.ts` | `apps/format-editor/src/utils/conceptVisuals.ts` | Port as-is |
| `file-format/src/utils/constants.ts` | `apps/format-editor/src/utils/constants.ts` | Port as-is |
| `file-format/src/utils/renderMarkdown.ts` | `apps/format-editor/src/utils/renderMarkdown.ts` | Port as-is |
| `file-format/src/utils/sanitize.ts` | `apps/format-editor/src/utils/sanitize.ts` | Port as-is |
| `file-format/src/utils/tree.ts` | `apps/format-editor/src/utils/tree.ts` | Port as-is (uses `TreeNode` type — adapt import to `ModelNode`-compatible shape or keep local type) |
| `file-format/src/utils/id.ts` | `apps/format-editor/src/utils/id.ts` | Port as-is |

**FR-1.7**: Copy the following composables:

| Source path | Target path | Adaptation |
|---|---|---|
| `file-format/src/composables/useResizablePanel.ts` | `apps/format-editor/src/composables/useResizablePanel.ts` | Port as-is (no store deps) |
| `file-format/src/composables/useBlockVisuals.ts` | `apps/format-editor/src/composables/useBlockVisuals.ts` | Adapt `useMetamodelStore` import to new thin adapter; `getConceptByName` will come from the adapted metamodel composable |
| `file-format/src/composables/useUrlDocLoader.ts` | `apps/format-editor/src/composables/useUrlDocLoader.ts` | Port (deferred — Phase 7 if at all) |

**FR-1.8**: Copy the following store-agnostic utility files:

| Source path | Target path | Adaptation |
|---|---|---|
| `file-format/src/utils/documentationParser.ts` | `apps/format-editor/src/utils/documentationParser.ts` | Port as-is |

**FR-1.9**: Set up PostCSS config at `apps/format-editor/postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**FR-1.10**: Create TailwindCSS configuration at `apps/format-editor/tailwind.config.js` that ports the HSL color tokens from file-format, ensuring existing scoped CSS components are not affected (Tailwind classes only apply to elements that explicitly use them).

**FR-1.11**: Create `apps/format-editor/src/assets/main.css` with Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`), font imports (Inter), and utility scrollbar styles.

**FR-1.12**: Import `main.css` in `apps/format-editor/src/main.ts` so Tailwind is loaded globally.

### Non-Functional Requirements

- **NFR-1.1**: All utilities must be TypeScript-strict, no `any` types (except where parsing is inherently dynamic).
- **NFR-1.2**: `useResizablePanel` must persist panel width to `localStorage` with the specified `storageKey`.
- **NFR-1.3**: Tailwind purge must be configured to scan `./src/**/*.{vue,ts,js,tsx,jsx}`.
- **NFR-1.4**: Dark mode must use the `class` strategy (`darkMode: 'class'` in tailwind.config.js) so that a `.dark` class toggle on `<html>` switches all tokens.
- **NFR-1.5**: No existing component's scoped CSS may break. Tailwind classes must be additive — old scoped styles are replaced only when the component is reworked in a later phase.

### Integration Points

- **IP-1.1**: `main.ts` imports `./assets/main.css` after Pinia/routing setup but before `app.mount()`.
- **IP-1.2**: No store changes in this phase — pure infrastructure.

### Scenarios

- **S-1.1**: `npm run dev` starts without errors, Tailwind directives compile, and the existing unstyled workspace loads with the same behavior as before.

---

## Phase 2: Layout Chrome (Header + Sidebars)

### Functional Requirements

**FR-2.1**: Migrate `Header.vue` from `file-format/src/components/layout/Header.vue` to `apps/format-editor/src/components/layout/Header.vue` with these adaptations:

- Replace `useDocumentStore()` with `useModelStore()` and `useWorkspaceStore()`:
  - `documentStore.formatVersion` → `node.localMetamodel` resolution or a computed from `modelStore.getNode(rootId)`'s rawContent frontmatter
  - `documentStore.templateName` → resolved from root node rawContent
  - `documentStore.templateVersion` → resolved from root node rawContent
  - `documentStore.modelVersion` → resolved from root node rawContent
  - `documentStore.isTemplate` → `false` (no template mode in this iteration)
  - `documentStore.unsavedChanges` → `modelStore.dirtyIds.size > 0`
  - `documentStore.selectConcept('info')` → `router.push` or emit
- Replace `workspaceStore.needsPermission` / `workspaceStore.dirHandle` / `workspaceStore.savedDirectories` → use existing `workspaceStore` API directly
- Remove `AiGuidePanel` reference (deferred)
- Remove "Edit with AI" button (deferred)
- Keep: workspace dropdown, save/save-as split button, version bump, model info display, external links
- Replace `documentStore.saveActiveFile()` → `workspaceStore` commit flow using `modelStore.dirtyIds` and `recursiveSerializer`
- Replace `documentStore.saveActiveFileWithVersionBump()` → same adaptation

**FR-2.2**: Migrate `LeftSidebar.vue` from `file-format/src/components/layout/LeftSidebar.vue` to `apps/format-editor/src/components/layout/LeftSidebar.vue` with these adaptations:

- Replace `useDocumentStore()` with `useModelStore()`:
  - `documentStore.modelTree` → remove; replace with `modelStore.getRoots()` / `modelStore.getChildren()`
  - `documentStore.activeConceptName` → replace with `modelStore.activeNodeId` (new getter to add in Phase 6)
  - `documentStore.selectConcept(name)` → emit `select-concept` event upward
- Replace `useMetamodelStore()` with a thin adapter (Phase 6) — in this phase, use the resolved metamodel from `resolveEffectiveMetamodel()` directly
- The concept tree at the top (`conceptTree` computed) currently builds from `metamodelStore.taxonomyEdges` + `metamodelStore.concepts`. Adaptation:
  - Remove the taxonomy-based tree (file-format's concepts were metamodel-only; nodes in the unified graph are the actual model instances)
  - Instead, `ConceptTreeNode` receives `modelStore.getRoots()` data
- The "Graph View" button navigates to the GraphViewer
- The "Matrices" section with `MatrixPill` entries → port as-is but adapt `documentStore.metamatrix` reference to `modelStore` or `uiStore`
- Keep `useResizablePanel` for sidebar width

**FR-2.3**: Migrate `ConceptTreeNode.vue` from `file-format/src/components/layout/ConceptTreeNode.vue` to `apps/format-editor/src/components/layout/ConceptTreeNode.vue` with these adaptations:

- Props change: Remove `node: ConceptNode`, `elementsMap`, `activeName`. Replace with:
  ```ts
  defineProps<{
    nodeId: string
    selectedId: string | null
    depth?: number
    expandedGeneration?: number
  }>()
  ```
- Remove `documentStore` dependency — use `modelStore.getNode(nodeId)`, `modelStore.getChildren(nodeId)`
- Render `ModelNode` fields: `name`, `kind`, `storageMode`, `conceptBinding`, `type`
- Show expand/collapse chevron (`ChevronDown` rotated -90° when collapsed)
- Show concept-type badges and mode badges (FILE/FOLDER pill)
- Up/down arrow buttons for reordering → emit `move-up` / `move-down` events
- Remove drag support (not in scope)
- Element instances shown inline → read from `modelStore.getChildren(nodeId)` and render as `BlockPill`
- Event emits:
  ```ts
  defineEmits<{
    select: [nodeId: string]
    'move-up': [nodeId: string]
    'move-down': [nodeId: string]
  }>()
  ```

**FR-2.4**: Migrate `RightGuidanceSidebar.vue` from `file-format/src/components/layout/RightGuidanceSidebar.vue` to `apps/format-editor/src/components/layout/RightGuidanceSidebar.vue` with these adaptations:

- Replace `documentStore.activeConceptName` → `uiStore.activeConcept` (new in Phase 6)
- Replace `documentStore.getActiveConceptGuidance()` → read from metamodel documentation resolved via the adapted metamodel lookup
- Replace `documentStore.metamatrix` → `modelStore` matrix data or `uiStore`
- Keep `useResizablePanel` for sidebar width
- Keep collapse/expand behavior

**FR-2.5**: Replace existing `SidebarTree.vue` and `SidebarTreeNode.vue` with `LeftSidebar.vue` + `ConceptTreeNode.vue`. The old components are deleted.

**FR-2.6**: Update `WorkspaceView.vue` to use the new layout: `Header` at top, `LeftSidebar` on left, main content area in center, `RightGuidanceSidebar` on right.

### Component Contracts

**Header.vue**
- Props: none (reads stores directly)
- Emits: none (calls store actions directly)
- Store dependencies: `useWorkspaceStore`, `useModelStore`
- Children: none directly (the AiGuidePanel reference is removed)

**LeftSidebar.vue**
- Props: none
- Emits: `select-concept: [conceptName: string]`, `select-node: [nodeId: string]`
- Store deps: `useModelStore`, `useMetamodelStore` (thin adapter later)
- Composable deps: `useResizablePanel`

**ConceptTreeNode.vue**
- Props: `nodeId: string`, `selectedId: string | null`, `depth?: number` (default 0), `expandedGeneration?: number`
- Emits: `select: [nodeId: string]`, `move-up: [nodeId: string]`, `move-down: [nodeId: string]`
- Store deps: `useModelStore`
- Children: `BlockPill.vue` (for element instances)

**RightGuidanceSidebar.vue**
- Props: none
- Emits: none
- Store deps: `useModelStore`, `uiStore` (Phase 6)
- Composable deps: `useResizablePanel`

### Non-Functional Requirements

- **NFR-2.1**: All layout components use TailwindCSS exclusively (no scoped CSS). Exceptions: transition/animation keyframes.
- **NFR-2.2**: Dark mode class `dark` on `<html>` must toggle all HSL tokens via CSS variables.
- **NFR-2.3**: Sidebar widths persist across sessions via `useResizablePanel` localStorage keys: `format.leftSidebarWidth`, `format.rightSidebarWidth`.
- **NFR-2.4**: Minimum sidebar width: 240px. Maximum: 640px. Default left: 384px. Default right: 320px.

### Integration Points

- **IP-2.1**: `WorkspaceView.vue` replaces its current CSS flex layout with the Tailwind-based layout chrome. The old `.workspace__sidebar` / `.workspace__main` classes are removed.
- **IP-2.2**: `modelStore` gains a new getter `activeNodeId?: string` and action `selectNode(id: string)` if not already present (Phase 6, but the header needs it for save-flow). For Phase 2, the header derives "active" from the workspace root.

### Scenarios

- **S-2.1**: Open a FILE model → Header shows model name, format version, template info, version badge. Left sidebar shows styled tree with expand/collapse arrows, mode badges, concept-type icons. Right sidebar shows guidance content (or collapsed placeholder).
- **S-2.2**: Expand/collapse arrows in the tree toggle children visibility with rotation animation.
- **S-2.3**: Resize left/right sidebars by dragging the edge handles. Width persists across page reload.

---

## Phase 3: Editor Views (TextEditor + TreeEditor + BlockSheet)

### Functional Requirements

**FR-3.1**: Migrate `BlockSheet.vue` from `file-format/src/components/editor/BlockSheet.vue` to `apps/format-editor/src/components/editor/BlockSheet.vue`:

- Replace `documentStore` references:
  - `documentStore.getNodeMarkerValue()` → `modelStore.getNode(id)?.markers`
  - `documentStore.setNodeMarkerValue()` → `commitMarkerValue()` from provenance
  - `documentStore.triggerUnsavedChanges()` → `modelStore.markDirty(nodeId)`
  - `documentStore.renameBlock()` → `modelStore.upsertNode()` with updated name
  - `documentStore.navigateToElement()` → emit `navigate-to-node` event
  - `documentStore.selectConcept()` → emit to parent/workspace
- Replace `useMetamodelStore` references:
  - `metamodelStore.markers` → resolved from `resolveEffectiveMetamodel()`
  - `metamodelStore.getConceptByName()` → adapter/utility using resolved metamodel
- Replace `documentStore.activeGeneratedMatrixIndex` → local state or emit
- Widget system: Replace direct `resolveWidget()` import with `resolveWidgetComponent()` from the unified registry (Phase 4)
- Remove `UpdateFieldKey` injection pattern — widgets receive `modelValue`/`@update:model-value` directly

**FR-3.2**: Migrate `BlockFeed.vue` from `file-format/src/components/editor/BlockFeed.vue` to `apps/format-editor/src/components/editor/BlockFeed.vue`:

- Same store adaptations as BlockSheet
- Replace `documentStore.modelTextData` → use `modelStore.getNode(id)?.rawContent`
- Replace `selectedItemName` → use `modelStore.activeNodeId` or prop

**FR-3.3**: Migrate `BlockPill.vue` from `file-format/src/components/editor/BlockPill.vue` to `apps/format-editor/src/components/editor/BlockPill.vue`:

- Same store adaptations (documentStore → modelStore, metamodelStore → resolved metamodel)
- Replace `documentStore.getNodeMarkerValue()` / `setNodeMarkerValue()` → `commitMarkerValue()`
- Replace `documentStore.navigateToElement()` → emit `navigate: [nodeId: string]`
- Keep the popup system (teleported info card)
- Remove `UpdateFieldKey` dependency

**FR-3.4**: Migrate `TextEditor.vue` from `file-format/src/components/editor/TextEditor.vue` to `apps/format-editor/src/components/editor/TextEditor.vue`:

- Replace `documentStore.modelTextData[concept]` → `modelStore.getNode(nodeId)?.rawContent`
- Replace `documentStore.triggerUnsavedChanges()` → `modelStore.markDirty(nodeId)`
- Remove `metamodelStore.getConceptByName()` — use resolved metamodel
- Keep `BlockFeed` integration, list-item CRUD, add/delete/move operations
- The `rawContent` field is read from the actual node and written back via `modelStore.upsertNode()` + `commitFieldValue()` for provenance stamps
- Remove `parseNodeInstances` / `stringifyYaml` from `markdownParser.ts` — these will be handled differently in the unified model. For this iteration, TextEditor works directly on `rawContent` string.

**FR-3.5**: Migrate `TreeEditor.vue` from `file-format/src/components/editor/TreeEditor.vue` to `apps/format-editor/src/components/editor/TreeEditor.vue`:

- Replace `documentStore.selectedNode` → `modelStore.getNode(activeNodeId)`
- Replace `documentStore.activeConceptName` → prop or `uiStore.activeConcept`
- Replace `documentStore.deleteTreeNode()` → `modelStore` child removal action
- Replace `documentStore.modelTree` → `modelStore.getChildren()`
- Remove `metamodelStore.getConceptByName()` → use resolved metamodel

**FR-3.6**: Migrate `ModelInfoPanel.vue` from `file-format/src/components/editor/ModelInfoPanel.vue` to `apps/format-editor/src/components/editor/ModelInfoPanel.vue`:

- Replace `documentStore.formatVersion` / `documentStore.templateName` / `documentStore.templateVersion` → resolve from root node `rawContent` frontmatter
- Replace `documentStore.serializeActiveFile()` → use `recursiveSerializer` from `model/recursiveSerializer.ts`
- Replace `workspaceStore.fs` / `workspaceStore.mdFiles` → existing `workspaceStore` may not have these; adapt to list files from the workspace handle directly or show the handle tree

### Component Contracts

**BlockSheet.vue**
```ts
defineProps<{
  block: { id?: string; name: string; description: string; fields?: Record<string, any> }
  kind: 'concept' | 'instance'
  conceptType: string
  conceptName: string
  conceptFields?: MetamodelConcept['fields']
  conceptColor?: string
  conceptIcon?: string
  collapsed: boolean
  isEditing: boolean
  disableExpand?: boolean
  hasMarkers?: boolean
  showDelete?: boolean
  showReorder?: boolean
  showAddChild?: boolean
  isFirst?: boolean
  isLast?: boolean
}>()
defineEmits<{
  'update:collapsed': [val: boolean]
  'edit-toggle': []
  'move-up': []
  'move-down': []
  'delete': []
  'add-child': []
  'change': []
  'update:field': [fieldName: string, value: unknown]
  'navigate-to-node': [nodeId: string]
}>()
```

**BlockFeed.vue**
```ts
defineProps<{
  conceptName: string
  conceptType: string
  conceptColor?: string
  conceptIcon?: string
  conceptFields?: any[]
  conceptBlock: { id?: string; name: string; description: string; fields?: Record<string, any> }
  items: any[]
  isListConcept: boolean
  hasMarkers?: boolean
  selectedItemName?: string
}>()
defineEmits<{
  'change-concept': []
  'change-item': []
  'add-item': []
  'delete-item': [index: number]
  'move-item-up': [index: number]
  'move-item-down': [index: number]
}>()
```

**BlockPill.vue**
```ts
defineProps<{
  name?: string
  kind?: 'concept' | 'instance'
  conceptType?: string
  color?: string
  icon?: string
  iconMode?: 'type' | 'own'
  typeName?: string
  selected?: boolean
  interactive?: boolean
  fullWidth?: boolean
  as?: string
  blockId?: string
  description?: string
  fields?: Record<string, unknown>
  conceptFields?: any[]
  instanceCount?: number
  showMarkers?: boolean
}>()
// No emits — uses store actions directly for marker cycling and navigation
```

**TextEditor.vue**
```ts
defineProps<{
  nodeId: string
  conceptName: string
  conceptType: string
}>()
defineEmits<{
  'change': []
}>()
```

**TreeEditor.vue**
```ts
defineProps<{
  nodeId: string | null
  conceptName: string
}>()
```

**ModelInfoPanel.vue**
```ts
defineProps<{
  rootNodeId: string
}>()
```

### Non-Functional Requirements

- **NFR-3.1**: BlockSheet's expand/collapse animates with CSS transitions (duration 200-300ms).
- **NFR-3.2**: The marker cycling interaction must provide visual feedback (opacity changes, hover states).
- **NFR-3.3**: The "No elements yet" empty state must be visually distinct and helpful.
- **NFR-3.4**: All editor components use TailwindCSS exclusively. No scoped CSS except transition keyframes.

### Integration Points

- **IP-3.1**: The main editor area in `WorkspaceView.vue` renders `BlockSheet` (via `BlockFeed`) for concept-type nodes, `TextEditor` for text-type nodes, or `TreeEditor` for structural-type nodes, based on the resolved concept type from the selected node.
- **IP-3.2**: `BlockSheet` calls `commitFieldValue` and `commitMarkerValue` from `shared/provenance.ts` for every user edit.
- **IP-3.3**: `BlockFeed` does NOT store a reference to `modelTextData` — it reads fields from `modelStore.getNode(id)?.fields` and markers from `modelStore.getNode(id)?.markers`.

### Scenarios

- **S-3.1**: Select a node in the tree → BlockSheet shows fields, markers, relationships. Editable fields render via existing concept-type widgets. Marker icons are clickable to cycle through score values.
- **S-3.2**: Edit a text field → `TextEditor` shows raw markdown. Changes update `modelStore.getNode(nodeId).rawContent` and stamp provenance.
- **S-3.3**: Tree-structured concept → `TreeEditor` shows child nodes as collapsed BlockSheets. "Add Item" creates a new child. Up/down arrows reorder. Delete removes.
- **S-3.4**: ModelInfoPanel shows root node metadata (version, template, spec URL) from frontmatter.

---

## Phase 4: Unified Widget System

### Functional Requirements

**FR-4.1**: Create the unified widget registry at `apps/format-editor/src/shared/widgets/registry.ts` that merges both existing registries:

```ts
// apps/format-editor/src/shared/widgets/registry.ts
import type { Component } from 'vue'
import TextWidget from './TextWidget.vue'
import WeightWidget from './WeightWidget.vue'
import CategoryWidget from './CategoryWidget.vue'
import FieldString from './FieldString.vue'
import FieldBoolean from './FieldBoolean.vue'
import FieldNumber from './FieldNumber.vue'
import FieldSelect from './FieldSelect.vue'
import FieldReference from './FieldReference.vue'

export type WidgetType = 'text' | 'weight' | 'category' | 'string' | 'boolean' | 'number' | 'select' | 'reference'

/**
 * UNIFIED_WIDGET_REGISTRY merges concept-type widgets (text, weight, category)
 * from format-editor's original registry with field-type widgets (string, boolean,
 * number, select, reference) ported from file-format.
 */
export const UNIFIED_WIDGET_REGISTRY: Record<string, Component> = {
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

**FR-4.2**: Extend `WidgetField.vue` to accept both `fieldKey` (for field-bound widgets) and `nodeId` (for concept-bound widgets), plus `fieldDefinition` (for metadata like options, target_concepts):

```ts
// Enhanced WidgetField.vue — additional props
defineProps<{
  nodeId: string
  fieldKey: string
  widgetType: string
  authorId?: string
  /** Optional field definition for field-type widgets (provides options, target_concepts, etc.) */
  fieldDefinition?: {
    name: string
    type: string
    options?: string[]
    target_concepts?: string[]
    default?: unknown
  }
}>()
```

**FR-4.3**: Migrate field-type widgets from `file-format/src/components/editor/widgets/` to `apps/format-editor/src/shared/widgets/`:

| Source path | Adaptation |
|---|---|
| `file-format/src/components/editor/widgets/FieldString.vue` | Replace `inject(UpdateFieldKey)` → `defineProps<{ modelValue: string }>` + `emit('update:modelValue', value)`. Remove `readonly` prop (use `:disabled`). Remove `field.name` label — labels are rendered by the parent. |
| `file-format/src/components/editor/widgets/FieldBoolean.vue` | Same adaptation: `modelValue: boolean` / `update:modelValue`. Remove label. |
| `file-format/src/components/editor/widgets/FieldNumber.vue` | Same: `modelValue: number` / `update:modelValue`. |
| `file-format/src/components/editor/widgets/FieldSelect.vue` | Same: `modelValue: string` / `update:modelValue`. Add prop `options?: string[]` from `fieldDefinition`. Adapt from radix-vue Select or keep native `<select>`. |
| `file-format/src/components/editor/widgets/FieldReference.vue` | Major adaptation: Replace `documentStore.modelTree` with `modelStore.nodes` for target filtering. Replace `documentStore` with `useModelStore()`. The filtered suggestions filter by `field.target_concepts` across all `modelStore.nodes`. Keep the inline dropdown pattern. |

**FR-4.4**: Update the `resolveWidgetComponent()` function in `index.ts` to use `UNIFIED_WIDGET_REGISTRY` instead of the old limited registry.

**FR-4.5**: Delete `file-format/src/components/editor/widgets/injection.ts` — the `UpdateFieldKey` injection pattern is not ported. All widgets use `v-model` (`modelValue` / `update:modelValue`).

**FR-4.6**: Provenance flow: every widget's `update:modelValue` emit is handled by `WidgetField.vue` which calls `commitFieldValue()` with `.value`, `{ kind: 'user', id: authorId }`, and the current timestamp. The `FieldReference` widget additionally validates that the selected target exists in `modelStore.nodes`.

### Fallback mechanism

**FR-4.7**: If a widget type is not found in `UNIFIED_WIDGET_REGISTRY`, `WidgetField.vue` renders `FallbackWidget.vue` which shows:
- The raw value as text (JSON-stringified if object)
- A badge with the unported widget type name in a muted color scheme

This ensures that adding new concept types or field types in the future never breaks the UI — they degrade gracefully to a read-only display.

### Provenance stamp flow

**FR-4.8**: All widgets must flow through `commitFieldValue()` for writes. No widget should directly mutate `modelStore.nodes[id].fields`. The chain is:

```
Widget (emits @update:model-value)
  → WidgetField.vue (calls commitFieldValue with author + timestamp)
    → modelStore.getNode(nodeId).fields[fieldKey] = { value, provenance }
    → modelStore.markDirty(nodeId)
```

For marker writes, `commitMarkerValue()` is used instead (no per-value provenance — markers are `Record<string, number | string>`).

### Component Contracts

**FieldString.vue**
```ts
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
```

**FieldBoolean.vue**
```ts
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
```

**FieldNumber.vue**
```ts
defineProps<{ modelValue: number }>()
defineEmits<{ 'update:modelValue': [value: number] }>()
```

**FieldSelect.vue**
```ts
defineProps<{ modelValue: string; options?: string[] }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
```

**FieldReference.vue**
```ts
defineProps<{ modelValue: string; fieldDefinition?: { target_concepts?: string[] } }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
// Store deps: useModelStore — reads nodes for suggestion filtering
```

**WidgetField.vue** (enhanced)
```ts
defineProps<{
  nodeId: string
  fieldKey: string
  widgetType: string
  authorId?: string
  fieldDefinition?: {
    name: string
    type: string
    options?: string[]
    target_concepts?: string[]
    default?: unknown
  }
}>()
// No emits — handles provenance internally
```

### Non-Functional Requirements

- **NFR-4.1**: Every widget must handle `null`/`undefined` values gracefully (show empty state, not crash).
- **NFR-4.2**: `FieldReference` suggestion dropdown must have a minimum search query length of 0 (show all valid targets on focus).
- **NFR-4.3**: All widgets must show hover and focus states consistent with the TailwindCSS design system.
- **NFR-4.4**: Widgets must not depend on any injection or provide/inject pattern — only props + store.

### Integration Points

- **IP-4.1**: The old `registry` map in `shared/widgets/index.ts` is replaced by `UNIFIED_WIDGET_REGISTRY` from `registry.ts`. The `resolveWidgetComponent()` function reads from the unified map.
- **IP-4.2**: `FieldReference` needs `nodeId` context from `WidgetField.vue` to filter targets. The widget receives the full `modelStore.nodes` through `useModelStore()`.
- **IP-4.3**: `NodeForm.vue` will be replaced in Phase 6, but during Phase 4 it should already benefit from the enhanced `WidgetField` — pass `fieldDefinition` through if available.

### Scenarios

- **S-4.1**: A field with `type: string` in the metamodel renders a text input (`FieldString`). Editing it stamps provenance.
- **S-4.2**: A field with `type: select` and `options: ["option1", "option2"]` renders a dropdown (`FieldSelect`).
- **S-4.3**: A field with `type: reference` and `target_concepts: ["Process"]` renders a filtered autocomplete that only shows "Process" concept instances from `modelStore.nodes`.
- **S-4.4**: An unknown widget type renders `FallbackWidget` with the raw value and a badge.
- **S-4.5**: A concept-type `text` field still renders `TextWidget` (backward-compatible dispatch).

---

## Phase 5: Graph Viewer + Supplementary Views

### Functional Requirements

**FR-5.1**: Migrate `GraphViewer.vue` from `file-format/src/components/editor/GraphViewer.vue` to `apps/format-editor/src/components/editor/GraphViewer.vue`:

- Replace `documentStore` → `modelStore`:
  - `documentStore.modelTree` → build node/edge graph from `modelStore.nodes` and `ModelNode.relationships[]`
  - `documentStore.activeConceptName` → `props.conceptName` or `uiStore.activeConcept`
- Replace `metamodelStore.concepts` / `metamodelStore.getConceptByName()` → resolved metamodel from `resolveEffectiveMetamodel()`
- d3 rendering code (approximately 580 lines of pure SVG Sankey/Force layout) is ported as-is — only the data-source adapter changes
- Layout selector: Sankey and Force directed graph
- Depth slider to control expansion depth
- Per-node expand/collapse
- Node click → emit `select-node` event to navigate to that node in the tree

**FR-5.2**: Migrate `MatricesGrid.vue` from `file-format/src/components/editor/MatricesGrid.vue` to `apps/format-editor/src/components/editor/MatricesGrid.vue`:

- Replace `documentStore.metamatrix` → `modelStore` matrix data (stored on the root node's fields or in a new store section)
- Replace `documentStore.activeGeneratedMatrixIndex` → prop or `uiStore.activeMatrixIndex`
- Replace `documentStore.getMatrixValues()` → read from `modelStore` node fields keyed by `MatrixName||Row||Col`
- Replace `documentStore.setMatrixCell()` → `commitFieldValue()`

**FR-5.3**: Migrate `MetamatrixConfig.vue` from `file-format/src/components/editor/MetamatrixConfig.vue` to `apps/format-editor/src/components/editor/MetamatrixConfig.vue`:

- Same adaptations — matrix definitions live on the root node or in a dedicated store section
- Replace `documentStore.addMetamatrixRow()` / `documentStore.removeMetamatrixRow()` → modelStore mutations
- Replace `documentStore.metamatrix` access → modelStore matrix definitions

**FR-5.4**: Migrate `IconRenderer.vue` from `file-format/src/components/editor/IconRenderer.vue` to `apps/format-editor/src/components/editor/IconRenderer.vue`:

- Port as-is (no store deps — pure utility component with a large icon registry)
- The icon registry enumerates 100+ Lucide icons by name

**FR-5.5**: Migrate `MarkerIcons.ts` from `file-format/src/components/editor/MarkerIcons.ts` to `apps/format-editor/src/components/editor/MarkerIcons.ts`:

- Port as-is (pure utility — no store deps)

**FR-5.6**: Migrate `MarkerTooltip.vue` from `file-format/src/components/editor/MarkerTooltip.vue` to `apps/format-editor/src/components/editor/MarkerTooltip.vue`:

- Port as-is (no store deps — pure presentational)

**FR-5.7**: Migrate `MatrixPill.vue` from `file-format/src/components/editor/MatrixPill.vue` to `apps/format-editor/src/components/editor/MatrixPill.vue`:

- Port as-is (uses `useMetamodelStore` for concept colors — adapt to thin adapter or pass colors as props)

**FR-5.8**: Migrate `BlockMatrixSummary.vue` from `file-format/src/components/editor/BlockMatrixSummary.vue` to `apps/format-editor/src/components/editor/BlockMatrixSummary.vue`:

- Port with same store adaptations as MatricesGrid

**FR-5.9**: Migrate `BlockRelationships.vue` from `file-format/src/components/editor/BlockRelationships.vue` to `apps/format-editor/src/components/editor/BlockRelationships.vue`:

- Replace `documentStore` → `modelStore`:
  - Relationships come from `ModelNode.relationships[]`
  - Incoming relationships computed by scanning all nodes for relationships targeting this node
- Keep the incoming/outgoing relationship display with navigation buttons

**FR-5.10**: Migrate `ConceptContainer.vue` and `ConceptPerspectivePanel.vue` from `file-format/src/components/editor/` to `apps/format-editor/src/components/editor/`:

- Replace `documentStore.activeConceptName` → `uiStore.activeConcept`
- Replace `documentStore.selectConcept()` → `uiStore.setActiveConcept()`
- Keep perspective tabs for switching views

**FR-5.11**: Delete `TreeNodeItem.vue` if it exists — this is replaced by `BlockPill` usage in `ConceptTreeNode`.

### Component Contracts

**GraphViewer.vue**
```ts
defineProps<{
  nodeId?: string  // if set, shows egocentric graph around this node
  conceptName?: string  // if set, auto-selects this concept in the graph
}>()
defineEmits<{
  'select-node': [nodeId: string]
}>()
```

**MatricesGrid.vue**
```ts
defineProps<{
  matrixIndex: number
}>()
defineEmits<{
  'cell-change': [cellKey: string, value: unknown]
}>()
```

**IconRenderer.vue**
```ts
defineProps<{
  icon: string
  fallback?: string
  customClass?: string
}>()
```

### Non-Functional Requirements

- **NFR-5.1**: GraphViewer SVG rendering must be performant with up to ~200 nodes and ~500 edges (d3 virtualizes via SVG — acceptable for typical model sizes).
- **NFR-5.2**: MatricesGrid must support up to 50×50 cells without noticeable lag.
- **NFR-5.3**: Dark mode must apply to d3 SVG elements (node fills, text, link colors) through CSS variables that the SVG reads from the container.

### Integration Points

- **IP-5.1**: `GraphViewer` is rendered in the main content area when `activeView === 'graph'` (controlled by `uiStore.activeView`).
- **IP-5.2**: `MatricesGrid` + `MetamatrixConfig` are rendered when the "Matrices" section is navigated to.
- **IP-5.3**: Matrix data is stored as fields on a designated matrix node (or as a separate section in `modelStore`). The exact storage strategy is: matrix cells are stored in a node named `Matrices` under root, with fields keyed by `{matrixName}:{rowName}:{colName}`.

### Scenarios

- **S-5.1**: Switch to "Graph View" → GraphViewer renders a Sankey layout of all nodes and their relationships. Click a node → emits select → navigates to that node in the tree.
- **S-5.2**: Toggle between Sankey and Force layouts → graph re-renders with the new algorithm. Drag force layout nodes.
- **S-5.3**: Navigate to Matrices → dropdown selector shows available matrices. Select one → N×M grid renders. Edit a cell → value commits through provenance.
- **S-5.4**: Metamatrix Config → add a new matrix definition with source concept, target concept, and widget type.

---

## Phase 6: Store Adapters + Polish

### Functional Requirements

**FR-6.1**: Create `apps/format-editor/src/stores/metamodelStore.ts` as a thin adapter over `resolveEffectiveMetamodel()`:

```ts
// Composition-API-style Pinia store
export const useMetamodelStore = defineStore('metamodel', () => {
  const modelStore = useModelStore()

  // Mirrors file-format's metamodelStore.concepts accessor but reads from resolved metamodel
  const concepts = computed(() => {
    // Returns concepts from the currently "active" node's resolved metamodel
    // Defaults to root node if no active node
    const rootId = modelStore.rootIds[0]
    if (!rootId) return []
    const metamodel = resolveEffectiveMetamodel(rootId, modelStore.nodes)
    return metamodel.concepts
  })

  const markers = computed(() => {
    const rootId = modelStore.rootIds[0]
    if (!rootId) return []
    const metamodel = resolveEffectiveMetamodel(rootId, modelStore.nodes)
    return metamodel.markers
  })

  const getConceptByName = (name: string) => concepts.value.find(c => c.name === name)

  const getConceptFields = (name: string) => {
    const concept = getConceptByName(name)
    return concept?.fields ?? []
  }

  return { concepts, markers, getConceptByName, getConceptFields }
})
```

**FR-6.2**: Create `apps/format-editor/src/stores/uiStore.ts` for UI-only state that does not belong in `modelStore`:

```ts
export const useUiStore = defineStore('ui', () => {
  const activeConcept = ref<string | null>(null)
  const activePerspective = ref<string>('default')
  const activeView = ref<'editor' | 'graph' | 'matrices' | 'info'>('editor')
  const activeMatrixIndex = ref<number>(-1)
  const selectedNodeId = ref<string | null>(null)
  const selectedInstanceId = ref<string | null>(null)

  function setActiveConcept(name: string | null) { activeConcept.value = name }
  function setActiveView(view: typeof activeView.value) { activeView.value = view }
  function selectNode(id: string | null) { selectedNodeId.value = id }
  function selectInstance(id: string | null) { selectedInstanceId.value = id }

  return {
    activeConcept, activePerspective, activeView,
    activeMatrixIndex, selectedNodeId, selectedInstanceId,
    setActiveConcept, setActiveView, selectNode, selectInstance,
  }
})
```

**FR-6.3**: Add `selectNode()` action and `activeNodeId` getter to `modelStore`:

```ts
// In modelStore.ts — additions
getters: {
  // ... existing getters ...
  activeNodeId: (state): string | null => {
    // Returns the first root if nothing selected, or the uiStore's selectedNodeId
    // This is a derived empty — the actual "selected" state lives in uiStore
    return state.rootIds[0] ?? null
  },
},
actions: {
  /**
   * Reorders a child within its parent's childIds array.
   * direction: 1 = move down, -1 = move up
   */
  reorderChild(parentId: string, childId: string, direction: 1 | -1): void {
    const parent = this.nodes[parentId]
    if (!parent) return
    const idx = parent.childIds.indexOf(childId)
    if (idx === -1) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= parent.childIds.length) return
    parent.childIds.splice(idx, 1)
    parent.childIds.splice(newIdx, 0, childId)
    this.markDirty(parentId)
  },

  /**
   * Removes a node and all its descendants from the graph.
   */
  removeNodeTree(nodeId: string): void {
    const node = this.nodes[nodeId]
    if (!node) return
    // Recursively remove children
    for (const childId of [...node.childIds]) {
      this.removeNodeTree(childId)
    }
    // Remove from parent
    if (node.parentId) {
      const parent = this.nodes[node.parentId]
      if (parent) {
        parent.childIds = parent.childIds.filter(id => id !== nodeId)
      }
    }
    delete this.nodes[nodeId]
    this.dirtyIds.add(nodeId)
  },

  /**
   * Creates a new child node under the given parent.
   */
  createChild(parentId: string, name: string, type: string, kind?: 'concept' | 'element'): string {
    const id = `${parentId}/${name}`
    this.nodes[id] = {
      id,
      name,
      parentId,
      childIds: [],
      storageMode: this.nodes[parentId]?.storageMode ?? 'FOLDER',
      type,
      fields: {},
      markers: {},
      relationships: [],
      rawSections: {},
      kind: kind ?? 'element',
    }
    this.nodes[parentId].childIds.push(id)
    this.markDirty(parentId)
    return id
  },
}
```

**FR-6.4**: Wire `modelStore.selectNode()` through `uiStore.selectNodeId()` — modelStore calls uiStore when a node is selected via the tree.

**FR-6.5**: Hash-sync: port the URL hash-sync logic from file-format's `App.vue` to `WorkspaceView.vue` or a `useHashSync` composable. The hash stores `#conceptName.elementName` so direct links to specific nodes work.

**FR-6.6**: Keyboard shortcuts:
- `Ctrl+S` → save (calls the save flow through workspaceStore)
- Arrow keys in tree → navigate between sibling/child/parent nodes
- `Enter` on selected node → expand/collapse or open for editing

**FR-6.7**: Remove old format-editor components:
- Delete `SidebarTree.vue` → replaced by `LeftSidebar` + `ConceptTreeNode`
- Delete `SidebarTreeNode.vue` → replaced by `ConceptTreeNode`
- Adapt or delete `NodeForm.vue` → either wrap it as a backward-compat shim that delegates to `BlockSheet`, or replace usages in `WorkspaceView.vue` directly

**FR-6.8**: Adapt `WorkspaceView.vue` to use the new store architecture:
- Read `uiStore.selectedNodeId` for the active node
- Call `modelStore.selectNode()` on tree selection
- Route the main content area based on `uiStore.activeView`:
  - `'editor'` → BlockFeed / TextEditor / TreeEditor depending on concept type
  - `'graph'` → GraphViewer
  - `'matrices'` → MatricesGrid / MetamatrixConfig
  - `'info'` → ModelInfoPanel

**FR-6.9**: Port `file-format/src/components/ui/Badge.vue` and `StatusBadge.vue` to `apps/format-editor/src/components/ui/` — utility badge components used across the editor for tags and status indicators.

### Non-Functional Requirements

- **NFR-6.1**: `modelStore` must remain a clean data store with no UI state. All view-specific state (selected node, active concept, perspective) lives in `uiStore`.
- **NFR-6.2**: The hash-sync must not cause infinite update loops — only sync hash → store when the hash changes externally, and store → hash on user navigation.
- **NFR-6.3**: Keyboard shortcuts must not interfere with native browser shortcuts (e.g., `Ctrl+S` still triggers browser save prompt — standard `beforeunload` handling).

### Integration Points

- **IP-6.1**: The `metamodelStore` adapter is injected via Pinia's `defineStore` and used by all migrated components that previously depended on `file-format`'s `useMetamodelStore()`. Components import from `@/stores/metamodelStore.ts` instead of a remote dependency.
- **IP-6.2**: `uiStore` is created and used by `WorkspaceView.vue` and passed implicitly through Pinia instance (components call `useUiStore()` directly).
- **IP-6.3**: The `modelStore.reorderChild()` action is bound to the up/down arrow buttons in `ConceptTreeNode`.
- **IP-6.4**: The save flow: `Ctrl+S` → `workspaceStore` reads `modelStore.dirtyIds` → serializes each dirty node via `recursiveSerializer` → writes back to files via FSAA handle → calls `modelStore.clearDirty(id)`.

### Scenarios

- **S-6.1**: Open a FILE model → tree renders → click a node → BlockSheet shows fields with properly dispatched widgets → edit a field → save stamps provenance.
- **S-6.2**: Open a FOLDER model → tree shows hierarchy → expand/collapse nodes → select a node → fields render correctly from resolved metamodel.
- **S-6.3**: Click "Graph View" → Sankey graph renders → switch to Force layout → graph transitions.
- **S-6.4**: Click "Validate" in toolbar → validation report shows FORMAT compliance errors/warnings. Close report → return to editor.
- **S-6.5**: Ctrl+S → model saves. Close workspace → return to home.
- **S-6.6**: Navigate to a node → hash updates to `#conceptName.elementName`. Copy URL → open in new tab → hash drives navigation to same node.

---

## Unified Widget Registry Format

### Registry structure

The unified registry at `shared/widgets/registry.ts` is a `Record<string, Component>` mapping string type identifiers to Vue components:

```ts
const UNIFIED_WIDGET_REGISTRY: Record<string, Component> = {
  // Field-level types (from metamodel concept field definitions)
  string: FieldString,
  boolean: FieldBoolean,
  number: FieldNumber,
  select: FieldSelect,
  reference: FieldReference,
  // Concept-level types (from concept declarations)
  text: TextWidget,
  weight: WeightWidget,
  category: CategoryWidget,
}
```

### Dispatch key resolution

The dispatch key (the `widgetType` prop passed to `WidgetField.vue`) is determined as follows:

1. **Field-level dispatch**: When rendering a field from a concept's `fields[]` array, the `type` property of the field definition is the dispatch key (e.g., `"string"`, `"boolean"`, `"reference"`).
2. **Concept-level dispatch**: When rendering the main value for a concept-type node, the concept's own `type` property is the dispatch key (e.g., `"text"`, `"weight"`, `"category"`).

Both key spaces are merged in the same registry map. A union type is maintained for documentation:

```ts
export type WidgetType = 'text' | 'weight' | 'category' | 'string' | 'boolean' | 'number' | 'select' | 'reference'
```

### Provenance stamp flow through all widgets

Every write path follows the same chain to ensure traceability:

```
User input in widget
  → widget emits `update:modelValue` with new value
  → WidgetField.vue intercepts the event
  → calls commitFieldValue(modelStore, nodeId, fieldKey, value, author)
    → sets node.fields[fieldKey] = { value, provenance: { author, timestamp: nowISO() } }
    → calls modelStore.markDirty(nodeId)
```

The `author` is always `{ kind: 'user', id: authorId }` for UI edits (default `authorId: 'anonymous'`). AI/system provenance is reserved for future use.

### Fallback mechanism for unported types

When `UNIFIED_WIDGET_REGISTRY[widgetType]` returns `undefined`:

1. `WidgetField.vue` renders `FallbackWidget.vue` instead
2. `FallbackWidget.vue` displays:
   - The raw value (converted via `String(value)` or `JSON.stringify(value)`)
   - A muted pill/badge with the unported type name (e.g., `<span class="fallback-widget__badge">markdown</span>`)
3. The fallback is **read-only** — it does not emit `update:modelValue`
4. No console warnings or errors are produced — the fallback is a first-class UX choice

This means the UI never breaks or shows a blank field for unknown types. Adding a new widget in the future is a matter of (a) creating the `.vue` file, (b) adding it to `UNIFIED_WIDGET_REGISTRY`, and (c) the fallback auto-upgrades to the real widget on next load.

---

## Deferred Scope Reminder

The following features are explicitly **deferred** to a future iteration:

1. **Table view with inline column editing** — the FOLDER-mode flat table from `folder-format`'s `HierarchyExplorer.tsx`. This requires porting from React to Vue.
2. **Drag & drop** in the tree — replaced by up/down arrow buttons. Could be added later via native HTML5 Drag API or `@vueuse/gesture`.
3. **AI Assistant** (`AiGuidePanel.vue`, AI pipeline) — explicitly excluded. The `opencode-format-agent` MCP is the preferred delivery mechanism.
4. **Dashboard / Charts** — aggregate visualizations deferred.
5. **Search / Query** — full-text and structured querying (folder-format's `queryParser.ts` / `queryEngine.ts`).
6. **Remote model loading** — `useUrlDocLoader.ts` URL param loading.
7. **Cross-boundary wikilinks** — rich cross-document linking.
