# Proposal: Workspace Tree Rendering Performance and Store Indexing Optimization

## Intent
Improve the rendering and interaction performance of the workspace tree navigation and concept exploration in innfo-editor when loading models with hundreds of elements (such as arenzano with 250+ sources):
1. **Store Indexing**: Provide O(1) fast indexed lookups in modelStore for nodes by root ID (nodesByRoot), nodes by parent ID (nodesByParent), and nodes by type/concept (nodesByTypeAndRoot), removing expensive O(N^2) full scans in getModelRootForNode and getChildren.
2. **Memoized Tree Concept Computation**: Transform useModelConcepts to compute and cache concept trees per rootId reactively instead of executing full-store iteration, YAML frontmatter parsing, and metamodel resolution multiple times per frame in LeftSidebar.vue template functions.
3. **Lazy / Windowed Tree Node Rendering**: Render concept tree instances progressively (first batch of 60 items with a clean 'Show all N elements' button / pagination) when expanding large virtual groups with 60+ elements, preventing DOM explosion and main thread freezes.
4. **Lightweight Pill Rendering in Trees**: Optimize Pill.vue and ConceptTreeNode.vue to avoid unnecessary telemetry/teleport overhead and eager image scanning when rendered inside compact tree navigation rows.

## Scope
1. iNNfo/apps/innfo-editor/src/stores/modelStore.ts
2. iNNfo/apps/innfo-editor/src/composables/useModelConcepts.ts
3. iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue
4. iNNfo/apps/innfo-editor/src/components/layout/VirtualGroupNode.vue
5. iNNfo/apps/innfo-editor/src/components/layout/ConceptTreeNode.vue
6. iNNfo/apps/innfo-editor/src/components/editor/Pill.vue
7. iNNfo/apps/innfo-editor/tests/component/VirtualGroupNode.test.ts
8. iNNfo/apps/innfo-editor/tests/unit/useModelConcepts.test.ts
