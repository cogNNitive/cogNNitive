# Proposal: Workspace Tree Submodel Recursion and Scaffolding Theme

## Intent
1. **Submodel Tree Recursion**: Replace intermediate/redundant submodel filename rows with direct recursive rendering of the submodel's concept groups and elements (e.g. Models -> Discografia -> Disco -> [Discos]).
2. **Scaffolding Theme & Look & Feel**: Ensure workspace-level scaffolding concepts use refined, neutral styling matching the editor's look and feel, while domain content concepts retain their semantic colors.

## Scope
1. `iNNfo/apps/innfo-editor/src/composables/useModelConcepts.ts`: Extracted reusable concept tree builder.
2. `iNNfo/apps/innfo-editor/src/components/layout/ConceptTreeNode.vue`: Recursive submodel concept rendering upon expansion.
3. `iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue`: Use shared `useModelConcepts`.
4. `iNNfo/apps/innfo-editor/tests/component/ConceptTreeNode.test.ts`: Test recursive submodel expansion.
