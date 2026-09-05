# Workspace Graph Index

## Purpose

Provide a pure, standalone derivation (`buildWorkspaceIndex`) over a `RecursiveParseResult` that exposes title, template, element/concept, schema, and multi-parent views needed by cross-model reference validation, manifest reconciliation, and host UIs — without re-resolving anything already computed during traversal.

## Requirements

### Requirement: Pure Workspace Index Builder

`innfo-core` MUST expose `buildWorkspaceIndex(result: RecursiveParseResult, resolveTemplateSchema?) => WorkspaceIndex` as a pure function in `src/recursiveParser/workspaceIndex.ts`. It MUST derive all views from `result.nodes` and MUST NOT mutate `result` or perform any I/O.

#### Scenario: Index derived from parsed result without re-parsing
- GIVEN a `RecursiveParseResult` from `recursiveParse()` containing 3 nodes
- WHEN `buildWorkspaceIndex(result)` is called
- THEN a `WorkspaceIndex` object is returned without re-reading any file from disk

### Requirement: Path, Title, and Template Lookup Maps

The `WorkspaceIndex` MUST expose `pathToNodeId` (normalized path → node id), `titleToNodeIds` (lowercased frontmatter `title` AND lowercased filename-derived name → node id array; `title` preferred when both index the same node), and `nodeTemplate` (node id → resolved template identity).

#### Scenario: Node indexed by both title and filename-derived name
- GIVEN a parsed node with frontmatter `title: "Acme Business"` at path `startups/acme_business_NN.md`
- WHEN `buildWorkspaceIndex()` runs
- THEN `titleToNodeIds["acme business"]` and `titleToNodeIds["acme_business"]` both resolve to the node's id, with `title` preferred for qualified-reference lookups

#### Scenario: Duplicate model titles reported as an indexing issue
- GIVEN two parsed nodes that both declare frontmatter `title: "Acme Org"`
- WHEN `buildWorkspaceIndex()` runs
- THEN `titleToNodeIds["acme org"]` contains both node ids
- AND an `error`-severity issue is added to `WorkspaceIndex.issues` identifying the duplicate title and both source paths

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
- GIVEN a `type:: model` field value pointing at `startups/ghost_business_NN.md`, a path with no corresponding parsed node
- WHEN `buildWorkspaceIndex()` runs
- THEN `startups/ghost_business_NN.md` appears in `WorkspaceIndex.missing`
