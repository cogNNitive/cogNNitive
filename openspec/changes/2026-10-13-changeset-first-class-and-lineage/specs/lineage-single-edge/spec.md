# Delta for lineage-single-edge

## MODIFIED Requirements

### Requirement: Lineage node roles are folder-derived

Lineage is ONE edge primitive: a `sources` citation (innfo-core `citation` field type),
written once inside the deriving file. The node **role** MUST be derived from the folder
plus the contract, never from a stored type field. The recognized roles MUST be:

- **Source** — a file under `sources/` (or any cognitivized file) with a sidecar.
- **kNNowledge** — a Level-3 document under `kNNowledge/`.
- **artifact** — a write-once producer output under `artifacts/`, or a non-`_NN.md` file
  that declares upstream sources.
- **change** — a changeset document under `changes/` (see the `changes` blueprint).

A `changes/` path MUST be a valid citation target with the same syntax and semantics as
any other role. `parent_spec` is conformance, not lineage.

#### Scenario: A change is a lineage node
- GIVEN a field citing `changes/ws_reviewer_20261010T120000Z_changes_NN.md@## NN Change: fb-001`
- WHEN the citation resolves
- THEN its node role is `change`
- AND the edge resolves without the file living under `sources/`

#### Scenario: Role comes from the folder, not a field
- GIVEN two files with identical content, one under `sources/` and one under `changes/`
- WHEN their roles are derived
- THEN they are `Source` and `change` respectively
