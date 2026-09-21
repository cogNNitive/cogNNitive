# Design: Shared Model Concepts Composable and Recursive Expansion

## Architecture
1. **`useModelConcepts.ts`**:
   Exports `getConceptsForModel(rootId: string): TreeGroup[]`. Resolves template concepts, index taxonomy, text sections, and elements for any root model ID.
2. **`ConceptTreeNode.vue`**:
   Computes `submodelResolvedRootId` from `directModelTarget`. When expanded and `submodelResolvedRootId` is present, renders `VirtualGroupNode` for each concept group of the submodel.
