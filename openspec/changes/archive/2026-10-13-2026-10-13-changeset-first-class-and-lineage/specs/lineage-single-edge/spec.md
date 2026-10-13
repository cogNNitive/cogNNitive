# Delta for lineage-single-edge

## MODIFIED Requirements

### Requirement: Node role derives from the naming contract

A file's role MUST be derived by the `nn-naming-contract` role function from its name, its `parent_spec`, and whether a co-located sidecar exists. Folders are write destinations only. A file with a sidecar is a Source; a `knowledge` document is kNNowledge; a document whose `parent_spec.name` is `changes` has role `changeset`; any other non-`_NN.md` file has role `artifact`, and it is a lineage artifact node only if it is a timestamped family member or declares upstream `sources` (a hand-written markdown file with neither is not projected into the lineage record). A `changeset` document MUST be projected as a lineage node, and `changes/<file>@## NN Change: <id>` MUST be a valid citation target with the same grammar and resolution as any other target. Role MUST NOT be read from a stored `type` or `is_synthetic` value. (Previously: the role function knew `changeset`, but changesets were not lineage nodes, and their scalar `parent_spec` hid the role from callers that read `parent_spec.name`.)

#### Scenario: Artifact reused as input is cognitivized in place
- GIVEN `artifacts/Market_Analysis_20261002T101500Z.md` reused as input
- WHEN it is cognitivized
- THEN it becomes a Source without moving
- AND its own `sources:` frontmatter remains the single upstream edge for the derivation

#### Scenario: Loose markdown without upstream is not projected
- GIVEN `artifacts/notes.md`, unsuffixed, without a sidecar and without `sources`
- WHEN the projection runs
- THEN it is not a lineage node

#### Scenario: No stored role
- GIVEN any artifact or sidecar
- WHEN its frontmatter is inspected
- THEN no `type` or `is_synthetic` value is needed to determine its role

#### Scenario: A changeset is a lineage node
- GIVEN a field citing `changes/ws_reviewer_20261010T120000Z_changes_NN.md@## NN Change: fb-001`
- WHEN the citation resolves and the lineage record is projected
- THEN the target's role is `changeset`
- AND the changeset appears as a lineage node
