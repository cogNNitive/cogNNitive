# lineage-single-edge Specification

## Purpose

Lineage is ONE edge primitive: a `sources` citation (innfo-core `citation` field type). It is written once, inside the deriving file. Node roles (Source, kNNowledge, artifact) come from contract plus folder, never from stored type fields. `parent_spec` is conformance, not lineage, and is out of scope.

Canonical grammar: `path@## Heading&subunit` (markdown), `data.csv@RowID&col` (CSV), and `path` (file-level citation). Example: `sources/nn/interview.md@## Clients`, `kNNowledge/Client_NN.md@## NN Stakeholders: Enterprise Clients`, and `kNNowledge/Client_NN.md`.
## Requirements
### Requirement: Every derived file writes `sources` exactly once, inside itself

A file that derives from another file MUST declare its origin through a single `sources` citation located according to its kind:

| File kind | Location |
|---|---|
| kNNowledge document | body field `sources::` on the deriving element |
| Markdown artifact | frontmatter key `sources:` |
| Console HTML | `nn-model.meta.sources` (inside the embedded `nn-model.meta` JSON) |
| CSV artifact | a `sources` column, one value per row |
| JSON artifact | a `sources` field, one value per record |

No other location, key, or file MAY carry the same relationship (no `export-meta`, no `derived_from`, no `model` / `model_name` + `knowledge_version` inference).

#### Scenario: Markdown artifact declares its origin in frontmatter
- GIVEN `artifacts/report_20261002T101500Z.md` with `sources: [kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients]`
- WHEN the lineage projection runs
- THEN the artifact has one upstream edge to that heading

#### Scenario: CSV artifact declares per-row origin
- GIVEN a CSV artifact with a `sources` column whose row value is `sources/import/prices.csv@R12&price`
- WHEN the projection runs
- THEN that row contributes an upstream edge to `sources/import/prices.csv` at row `R12`, column `price`

#### Scenario: A relationship is not duplicated
- GIVEN a kNNowledge element with `sources::` pointing at `sources/import/a.md@## Intro`
- WHEN the projection runs
- THEN exactly one edge exists for that relationship

### Requirement: A bare path is a valid file-level citation

A citation MAY be a bare workspace-relative path with no anchor (e.g. `kNNowledge/Client_NN.md`). It denotes a file-level edge, is not deprecated, and MUST NOT emit `KU_DEPRECATED_HASH`. Only the `#slug` form is legacy.

#### Scenario: Bare path parses as file-level
- GIVEN the value `kNNowledge/Client_NN.md`
- WHEN `parseCitation` runs
- THEN it returns the file path with no unit anchor
- AND no `KU_DEPRECATED_HASH` warning is reported

#### Scenario: Dangling file-level citation
- GIVEN the value `kNNowledge/Missing_NN.md` and no such file
- WHEN validation runs
- THEN `KU_DANGLING_FILE` is reported

### Requirement: CSV/JSON `sources` is optional

For CSV artifacts the `sources` column (header matched with normalized name) and for JSON artifacts the `sources` field (top-level array of objects whose `sources` is a string or string array) are optional. Absence means a terminal artifact and MUST NOT be an error. No shipped procedure is required to change.

#### Scenario: JSON records with sources
- GIVEN a JSON artifact `[{"id":1,"sources":["sources/import/a.md@## Intro"]}]`
- WHEN the projection runs
- THEN the artifact has an upstream edge to `sources/import/a.md` at `## Intro`

### Requirement: Legacy edge mechanisms are removed

The system MUST NOT read, write, or infer lineage from the `export-meta` convention, the artifact `model` / `model_name` + `knowledge_version` fallback, or the domaiNN `kNNowledge.derived_from` field. The folder `export/` MUST NOT be read as an artifact location; `artifacts/` is the artifact folder.

#### Scenario: `export-meta` is ignored
- GIVEN an HTML artifact with an `export-meta` block and no `nn-model.meta.sources`
- WHEN the projection runs
- THEN the artifact has no upstream edges

#### Scenario: Model-name fallback does not create an edge
- GIVEN an artifact with `model: Client` and `knowledge_version: 0.1.0` and no `sources:`
- WHEN the projection runs
- THEN it has no upstream edges

#### Scenario: `export/` is not classified
- GIVEN a file at `export/report.md` and no `artifacts/` folder
- WHEN the workspace is scanned
- THEN `export/report.md` is not projected as an artifact by the runtime

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

### Requirement: Terminal artifacts carry traceability as content or none

An artifact that is not reused as input MAY carry no `sources` at all. When it does carry lineage, that lineage MUST be expressed through the `sources` locations above. Which shipped CSV/JSON procedures emit a `sources` column/field versus none is determined by design (proposal open question 4); a procedure that emits none MUST be documented as terminal.

#### Scenario: Terminal artifact without sources is valid
- GIVEN a terminal CSV artifact declared terminal by its procedure and lacking a `sources` column
- WHEN lineage checks run
- THEN no lineage error is reported for it

### Requirement: Staleness uses existing mechanisms only

File-level hops MUST be checked by hash (raw to sidecar `sha256`; kNNowledge to the per-model `sha256` recorded in `meta.models` of the console that lists it, plus `export-console --status` / `--stale` as redefined in `console-export-cli`). Unit-level hops MUST be checked by anchor resolution (heading or row). This change MUST NOT add new staleness machinery.
(Previously: the kNNowledge-to-console hop compared the console's own `sha256` and relied on a per-model console family.)

#### Scenario: Unit-level hop with a missing anchor
- GIVEN a citation `sources/import/report.md@## Old Section` and a file lacking that heading
- WHEN citation validation runs
- THEN an anchor-resolution diagnostic is reported, not a hash comparison

#### Scenario: kNNowledge hop stale via meta.models
- GIVEN a scoped console whose `meta.models` entry for `kNNowledge/Client_NN.md` records `sha256` `H1` and the document now hashes to `H2`
- WHEN `export-console --status` runs
- THEN the document is reported `[stale]`

#### Scenario: kNNowledge hop fresh
- GIVEN the recorded `sha256` equals the document's current hash
- WHEN `export-console --status` runs
- THEN the document is reported `[fresh]`

