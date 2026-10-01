# Lineage Single Edge (Delta, new capability)

## Purpose

Lineage is ONE edge primitive: a `sources` citation (innfo-core `citation` field type). It is written once, inside the deriving file. Node roles (Source, kNNowledge, artifact) come from contract plus folder, never from stored type fields. `parent_spec` is conformance, not lineage, and is out of scope.

Canonical grammar: `path@## Heading&subunit` (markdown), `data.csv@RowID&col` (CSV). Example: `sources/nn/interview.md@## Clients` and `kNNowledge/Client_NN.md@## NN Stakeholders: Enterprise Clients`.

## ADDED Requirements

### Requirement: Every derived file writes `sources` exactly once, inside itself

A file that derives from another file MUST declare its origin through a single `sources` citation located according to its kind:

| File kind | Location |
|---|---|
| kNNowledge document | body field `sources::` on the deriving element |
| Markdown artifact | frontmatter key `sources:` |
| Console HTML | `innfo-model.meta.sources` (inside the embedded `innfo-model.meta` JSON) |
| CSV artifact | a `sources` column, one value per row |
| JSON artifact | a `sources` field, one value per record |

No other location, key, or file MAY carry the same relationship (no `export-meta`, no `derived_from`, no `model` / `model_name` + `knowledge_version` inference).

#### Scenario: Markdown artifact declares its origin in frontmatter
- GIVEN a markdown artifact in `export/` whose frontmatter contains `sources: [kNNowledge/Client_NN.md@## NN Stakeholders: Enterprise Clients]`
- WHEN the workspace lineage projection runs
- THEN the artifact has one upstream edge to `kNNowledge/Client_NN.md` anchored at that heading

#### Scenario: CSV artifact declares per-row origin
- GIVEN a CSV artifact with a `sources` column and a row whose value is `sources/nn/prices.csv@R12&price`
- WHEN the lineage projection runs
- THEN that row contributes an upstream edge to `sources/nn/prices.csv` at row `R12`, column `price`

#### Scenario: A relationship is not duplicated across locations
- GIVEN a kNNowledge element with `sources::` pointing at `sources/nn/a.md@## Intro`
- WHEN the lineage projection runs
- THEN exactly one edge exists for that relationship and no second edge is read from any other key

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
- GIVEN a JSON artifact `[{"id":1,"sources":["sources/nn/a.md@## Intro"]}]`
- WHEN the projection runs
- THEN the artifact has an upstream edge to `sources/nn/a.md` at `## Intro`

### Requirement: Legacy edge mechanisms are removed

The system MUST NOT read, write, or infer lineage from any of: the `export-meta` convention, the artifact `model` / `model_name` + `knowledge_version` fallback, the deprecated `artifacts/` folder fallback, or the domaiNN `kNNowledge.derived_from` field.

#### Scenario: `export-meta` is ignored
- GIVEN an HTML artifact containing an `export-meta` block naming an upstream model
- AND no `innfo-model.meta.sources`
- WHEN the lineage projection runs
- THEN the artifact has no upstream edges
- AND no code path reads `export-meta`

#### Scenario: Model-name fallback does not create an edge
- GIVEN an artifact whose frontmatter has `model: Client` and `knowledge_version: 0.1.0` but no `sources:`
- WHEN the lineage projection runs
- THEN the artifact has no upstream edges

#### Scenario: `artifacts/` folder is not a fallback
- GIVEN a file at `artifacts/report.md` and no `export/` folder
- WHEN the workspace is scanned
- THEN `artifacts/report.md` is not classified or projected as an artifact

### Requirement: Node role derives from contract and folder

A file's role MUST be derived from its location and contract: under `sources/` it is a Source, a `*_NN.md` kNNowledge document under `kNNowledge/` is kNNowledge, and a file under `export/` is an artifact. Role MUST NOT be read from a stored `type` or `is_synthetic` value.

#### Scenario: Artifact reused as input is promoted to a Source
- GIVEN `export/Market_Analysis_V_1-0-0.md` reused as input
- WHEN it is promoted to `sources/export/Market_Analysis_V_1-0-0.md` and normalized
- THEN the promoted file is a Source with a sidecar under `sources/nn/export/`
- AND its own `sources:` frontmatter remains the single upstream edge for the derivation

### Requirement: Terminal artifacts carry traceability as content or none

An artifact that is not reused as input MAY carry no `sources` at all. When it does carry lineage, that lineage MUST be expressed through the `sources` locations above. Which shipped CSV/JSON procedures emit a `sources` column/field versus none is determined by design (proposal open question 4); a procedure that emits none MUST be documented as terminal.

#### Scenario: Terminal artifact without sources is valid
- GIVEN a terminal CSV artifact declared terminal by its procedure and lacking a `sources` column
- WHEN lineage checks run
- THEN no lineage error is reported for it

### Requirement: Staleness uses existing mechanisms only

File-level hops MUST be checked by hash (raw to sidecar `sha256`; kNNowledge to console `sha256` plus `export-console --stale`). Unit-level hops MUST be checked by anchor resolution (heading or row). This change MUST NOT add new staleness machinery.

#### Scenario: Unit-level hop with a missing anchor
- GIVEN a citation `sources/nn/report.md@## Old Section` and a file lacking that heading
- WHEN citation validation runs
- THEN an anchor-resolution diagnostic is reported, not a hash comparison
