# Lineage Single Edge (Delta against the base-change capability)

Note: `lineage-single-edge` is introduced by the in-flight change `2026-10-01-lineage-single-edge`. This delta reverses two of its decisions on purpose (see "Legacy edge mechanisms are removed" and the node-role requirement); treat the base delta as the current text until it is archived.

## Purpose

The edge primitive is unchanged: one `sources` citation written once inside the deriving file. Node roles now come from names and sidecar presence, and the artifact folder is `artifacts/`.

## RENAMED Requirements

- FROM: `### Requirement: Node role derives from contract and folder`
- TO: `### Requirement: Node role derives from the naming contract`

## MODIFIED Requirements

### Requirement: Every derived file writes `sources` exactly once, inside itself

A file that derives from another file MUST declare its origin through a single `sources` citation located according to its kind:

| File kind | Location |
|---|---|
| kNNowledge document | body field `sources::` on the deriving element |
| Markdown artifact | frontmatter key `sources:` |
| Console HTML | `innfo-model.meta.sources` |
| CSV artifact | a `sources` column, one value per row |
| JSON artifact | a `sources` field, one value per record |

No other location, key, or file MAY carry the same relationship.
(Previously: scenarios placed artifacts in `export/` and Sources in `sources/nn/`.)

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

### Requirement: Legacy edge mechanisms are removed

The system MUST NOT read, write, or infer lineage from the `export-meta` convention, the artifact `model` / `model_name` + `knowledge_version` fallback, or the domaiNN `kNNowledge.derived_from` field. The folder `export/` MUST NOT be read as an artifact location; `artifacts/` is the artifact folder.
(Previously: also forbade the `artifacts/` folder as a fallback; that folder is now canonical and `export/` is the retired one.)

#### Scenario: `export-meta` is ignored
- GIVEN an HTML artifact with an `export-meta` block and no `innfo-model.meta.sources`
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

A file's role MUST be derived by the `nn-naming-contract` role function from its name, its `parent_spec`, and whether a co-located sidecar exists. Folders are write destinations only. A file with a sidecar is a Source; a `knowledge` document is kNNowledge; any other non-`_NN.md` file has role `artifact`, and it is a lineage artifact node only if it is a timestamped family member or declares upstream `sources` (a hand-written markdown file with neither is not projected into the lineage record). Role MUST NOT be read from a stored `type` or `is_synthetic` value.
(Previously: role derived from folder (`sources/`, `kNNowledge/`, `export/`); an artifact reused as input was promoted by copying into `sources/export/`.)

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
