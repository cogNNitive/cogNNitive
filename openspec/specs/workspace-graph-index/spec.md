# Workspace Graph Index

## Purpose

Provide a pure, standalone derivation (`buildWorkspaceIndex`) over a `RecursiveParseResult` that exposes path, blueprint, schema and multi-parent views needed by cross-model reference validation, manifest reconciliation, and host UIs, without re-resolving anything already computed during traversal. Titles, file names and element names are display data: no view here keys identity by them.

## Requirements

### Requirement: Pure Workspace Index Builder

`nn-core` MUST expose `buildWorkspaceIndex(result: RecursiveParseResult, resolveBlueprintSchema?: BlueprintSchemaResolver) => WorkspaceIndex` as a pure function in `src/recursiveParser/workspaceIndex.ts`. It MUST derive all views from `result.nodes` and MUST NOT mutate `result` or perform any I/O.

#### Scenario: Index derived from parsed result without re-parsing

- GIVEN a `RecursiveParseResult` from `recursiveParse()` containing 3 nodes
- WHEN `buildWorkspaceIndex(result)` is called
- THEN a `WorkspaceIndex` object is returned without re-reading any file from disk

### Requirement: Path And Blueprint Lookup Maps

The `WorkspaceIndex` MUST expose `pathToNodeId` (normalized path -> root node id) and `nodeBlueprint` (root node id -> the `{name, url?}` identity declared by frontmatter `parent_spec`), and MUST carry `topology` (the DAG topology across workspace root models) and `workspaceId` (the entrypoint frontmatter `workspace_id`) when the parse supplies them. No lookup map MUST be keyed by title, filename or element name.

#### Scenario: Node indexed by its normalized path

- GIVEN a parsed node whose source path is `startups/acme_business_NN.md`
- WHEN `buildWorkspaceIndex()` runs
- THEN `pathToNodeId[normalizePathKey("startups/acme_business_NN.md")]` is that node's id

#### Scenario: Blueprint identity comes from parent_spec

- GIVEN a parsed root node whose frontmatter declares `parent_spec: { name: "business", url: ".../business/spec_NN.md" }`
- WHEN `buildWorkspaceIndex()` runs
- THEN `nodeBlueprint[nodeId]` is `{ name: "business", url: ".../business/spec_NN.md" }`

#### Scenario: Titles and filenames do not key an address

- GIVEN two parsed nodes that both declare frontmatter `title: "Acme Org"`
- WHEN `buildWorkspaceIndex()` runs
- THEN no index entry is keyed by `"acme org"` and no index entry is keyed by either file name
- AND the duplicate title is not reported as an indexing issue, because a title carries no identity

### Requirement: Element, Schema, and Multi-Parent Views

The `WorkspaceIndex` MUST expose `nodeSchema` (root node id -> composed `BlueprintSchema`, taken from `KnowledgeNode.templateSchema` when present and from the resolver otherwise), `extraParents` (child node id -> array of non-primary parent node ids recorded from diamond re-encounters), and `missing` (reference targets that resolved to no workspace node). No view MUST be keyed by element name: element names are display data, like titles.

#### Scenario: Diamond edges surfaced as extra parents

- GIVEN a parsed workspace where node `acme_business` has primary `parentId` pointing at `W` and was additionally linked as a child of `acme_portfolio` during traversal
- WHEN `buildWorkspaceIndex()` runs
- THEN `extraParents["acme_business"]` includes `acme_portfolio`'s node id

#### Scenario: Reference target missing from the workspace

- GIVEN a `type:: model` field value pointing at `startups/ghost_business_NN.md`, a path with no corresponding parsed node
- WHEN `buildWorkspaceIndex()` runs
- THEN `startups/ghost_business_NN.md` appears in `WorkspaceIndex.missing`
