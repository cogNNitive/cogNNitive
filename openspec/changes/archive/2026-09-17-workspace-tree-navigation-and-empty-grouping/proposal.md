# Proposal: Workspace Tree Navigation and Empty Grouping UX Refinement

## Intent
Improve the workspace tree navigation UX in innfo-editor:
1. Model Reference Quick Jump: Enable direct submodel navigation arrows (ArrowUpRight) on concept instances that specify a model link in fields such as model ref, model_ref, path, or any field with type model.
2. Empty Section Segregation: Eliminate visual noise and redundant root concepts (e.g. Workspace concept when viewing a workspace model) by grouping all empty/ghost concepts into a collapsed Empty / Inactive section at the bottom of the tree.
3. Semantic Color Harmonization: Assign coherent, domain-aligned semantic colors to workspace concepts (Models: Blue, Procedures: Emerald, Sources: Cyan, Artifacts: Amber, Specs: Purple, Templates: Indigo, Tools: Slate) to eliminate arbitrary rainbow coloring.

## Scope
1. iNNfo/apps/innfo-editor/src/components/layout/ConceptTreeNode.vue
2. iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue
3. skills/nn-innfo/templates/workspace_spec_NN.md
4. iNNfo/apps/innfo-editor/tests/component/ConceptTreeNode.test.ts
