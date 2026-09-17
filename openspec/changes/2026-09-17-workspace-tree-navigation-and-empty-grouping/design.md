# Design: Workspace Tree Navigation and Empty Grouping

## Architecture & Data Flow

### 1. Model Reference Resolution (ConceptTreeNode.vue)
- Normalize field keys during concept field matching (e.g. normalizeFieldKey(k) stripping spaces, dashes, underscores).
- Extend isModelFieldEntry to check:
  1. fieldDef?.type === 'model' or fieldDef?.type === 'submodel'
  2. Normalized key in ['modelref', 'model', 'submodel', 'path', 'ref', 'targetmodel', 'modelpath']
  3. Value ending in .md
- When resolved, compute directModelTarget with matching model node or normalized path.

### 2. Concept Tree Partitioning (LeftSidebar.vue)
- In getConceptsForModel(rootId):
  1. Filter out redundant concept if concept name equals Workspace and model is a workspace model.
  2. Split groups into activeGroups and emptyGroups based on element count and children.
- In template:
  - Render activeGroups directly.
  - If emptyGroups.length > 0, render an accordion at the bottom:
    Collapsible header: Empty / Inactive with toggle.
    Expanded body: renders the empty/ghost concept nodes with subtle styling.

### 3. Visual Tokens & Semantic Colors
- Align workspace_spec_NN.md concept definitions:
  - Procedures: emerald/green (#10b981)
  - Sources: cyan/teal (#06b6d4)
  - Artifacts: amber (#f59e0b)
  - Models: blue (#3b82f6)
  - Specs: purple (#8b5cf6)
  - Templates: indigo (#6366f1)
  - Tools: slate (#64748b)
