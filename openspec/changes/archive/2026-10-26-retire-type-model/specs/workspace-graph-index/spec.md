## MODIFIED Requirements

### Requirement: Element, Schema, and Multi-Parent Views

The `WorkspaceIndex` MUST expose `nodeElementConcepts` (node id → lowercased element name → owning concept name), `nodeSchema` (node id → composed `TemplateSchema`, sourced from `ModelNode.schema` when present), `extraParents` (child node id → array of non-primary parent node ids recorded from diamond re-encounters), and `missing` (reference targets that resolved to no workspace node).

#### Scenario: Diamond edges surfaced as extra parents
- GIVEN a parsed workspace where node `acme_business` has primary `parentId` pointing at `W` and was additionally linked as a child of `acme_portfolio` during traversal
- WHEN `buildWorkspaceIndex()` runs
- THEN `extraParents["acme_business"]` includes `acme_portfolio`'s node id

#### Scenario: Element-name keying matches validator conventions
- GIVEN a parsed node with an element `## 01 Founder: Jane Doe`
- WHEN `buildWorkspaceIndex()` builds `nodeElementConcepts`
- THEN the element is indexed under the lowercased, separator-normalized key consistent with `validator/references.ts` element-name matching

#### Scenario: Reference target missing from the workspace
- GIVEN a `type:: knowledge` field value pointing at `startups/ghost_business_NN.md`, a path with no corresponding parsed node
- WHEN `buildWorkspaceIndex()` runs
- THEN `startups/ghost_business_NN.md` appears in `WorkspaceIndex.missing`
