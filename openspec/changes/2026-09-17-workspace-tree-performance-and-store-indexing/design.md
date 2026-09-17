# Design: Workspace Tree Performance and Store Indexing

## Architecture & Data Flow

### 1. Store Indexing (modelStore)
- Maintain reactive or computed indices inside `modelStore`:
  - `nodesByRootId`: Map<string, string[]> (mapping rootId to all descendant element IDs)
  - `nodesByParentName`: Map<string, string[]> (mapping parent name to child IDs for parent-based hierarchies)
  - `nodesByRootAndType`: Map<string, Map<string, string[]>> (mapping rootId -> conceptType -> element IDs)
- `getModelRootForNode(nodeId)` is optimized using parent cache instead of traversing up the DAG on every call.

### 2. Cached Concept Tree Resolution (useModelConcepts)
- Memoize `getConceptsForModel(rootId)` output using Vue `computed` / cache keyed by `rootId + storeVersion`.
- `LeftSidebar.vue` accesses pre-computed `activeConceptsByRoot` and `emptyConceptsByRoot` maps instead of invoking `getActiveConceptsForModel(rootId)` repeatedly in template expressions.

### 3. Progressive / Windowed Rendering in VirtualGroupNode
- When `elements.length > 60`, `VirtualGroupNode` renders the first 60 elements by default with an inline indicator: `Showing 60 of 250 elements — [Show all 250]`.
- Clicking expands all remaining elements without blocking the initial unfold animation.
- Preserves full compatibility with filter, search, selection, and generation-based expansion.

### 4. Pill & ConceptTreeNode Optimizations
- Defer modal teleport rendering and popups in `Pill.vue` until first user interaction (`mouseenter` or click).
- Avoid eager regex / path matching in `ConceptTreeNode.vue` when no submodel fields are present.
