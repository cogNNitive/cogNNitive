# citation-parser-resolver Specification (delta)

## MODIFIED Requirements

### Requirement: `#slug` is a legacy read path inside innfo-core only

innfo-core MAY parse `path#slug` citations solely to keep write-once specs and frozen samples readable. Each such parse MUST emit the `KU_DEPRECATED_HASH` warning. `#slug` citations MUST NOT be written by any producer, and no consumer outside innfo-core MAY parse them. A `#slug` value is only reachable as the evidence of a change; `sources::` fields do not exist in kNNowledge.

#### Scenario: Legacy slug is readable with a warning
- GIVEN an applied change with `evidence:: sources/import/a.md#intro`
- WHEN `validateWorkspaceSources` runs
- THEN the reference resolves and a `KU_DEPRECATED_HASH` warning is reported

#### Scenario: Producers never emit `#slug`
- GIVEN any producer (console procedure, nn-trannsform, editor mutation)
- WHEN it writes a citation
- THEN the written value uses `@` grammar

### Requirement: Lineage projection is an innfo-core export

innfo-core MUST export the computed lineage projection function `projectLineage` (parsed workspace, sidecars and applied changes to the computed view defined by `computed-lineage-view`) as public API with unit tests. It MUST NOT produce record sections. Relative imports MUST carry `.js` (NodeNext). (Previously: the function returned record view sections.)

#### Scenario: Projection export is importable from Node ESM
- GIVEN the built innfo-core package
- WHEN a Node ESM script imports the projection from the package entry
- THEN the import succeeds

#### Scenario: Projection returns a view, not record text
- GIVEN a workspace
- WHEN the projection runs
- THEN it returns structured sources, models, artifacts and edges, and no markdown sections

## REMOVED Requirements

### Requirement: Artifact frontmatter and console meta citations are validated
(Reason: artifacts no longer declare upstream in frontmatter `sources:` and consoles no longer emit `nn-model.meta.sources`; the upstream of an artifact is the evidence of its `produce_artifact` change, validated like any evidence.)
(Migration: none — legacy out of scope. Validation of artifact upstream moves to the evidence sites of `produce_artifact` changes; see `artifact-production-change`.)
