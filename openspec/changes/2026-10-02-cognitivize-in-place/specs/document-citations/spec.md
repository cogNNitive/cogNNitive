# document-citations (Delta)

Note: the base change `2026-10-01-lineage-single-edge` modifies four of these requirements first. The text below is the final state after this change.

## MODIFIED Requirements

### Requirement: Model as a First-Class Citation Source

A kNNowledge file under `kNNowledge/` MUST be a valid citation target with the same syntax and semantics as any Source. The canonical identifier for a kNNowledge element is `kNNowledge/<path>.md@## <Element heading>` (for example `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`). A `sources::` value that is a `kNNowledge/...` path MUST be interpreted as a kNNowledge reference.
(Previously: example used a `_V_` name; the base change moved the prefix from `models/` to `kNNowledge/`.)

#### Scenario: kNNowledge element cited with `@`
- GIVEN `kNNowledge/Client_business_NN.md` containing `## NN Stakeholders: Enterprise Clients`
- WHEN a `sources::` field references `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`
- THEN the reference resolves to that file and heading
- AND that element's own `sources::` may point at a Source, forming the chain

### Requirement: Uniform Block Identifier Across the Workspace

The form `<workspace-relative-path>@<anchor>` MUST be the single, uniform identifier for any knowledge block. `<workspace-relative-path>` is the path of any citable file in the domaiNN (a Source, an artifact, or a kNNowledge document); the role of the file is derived from its name per `nn-naming-contract`, not from a folder whitelist. Line-range anchors and `src-NNN` ids remain prohibited. The anchor kind follows the target: heading for markdown (`header` unit), `RowID&column` for CSV (`row` unit), JSON Pointer (RFC 6901) for JSON (`pointer` unit). Paths under `staging/` MUST NOT be citable. Paths under the retired roots (`sources/nn/`, `sources/original/`, `sources/export/`, `export/`, `models/`) have no special handling: they dangle because the files no longer exist. An existing file under `sources/archive/` is a plain path and still resolves.
(Previously: the path was `sources/nn/<subpath>`, `sources/export/<subpath>`, or `kNNowledge/<subpath>`.)

#### Scenario: Uniform addressing of a Source and a kNNowledge element
- GIVEN a Source `sources/import/1.md` and a kNNowledge file `kNNowledge/x_business_NN.md`
- WHEN both are cited
- THEN both use identical `<path>@<anchor>` syntax with no per-kind special casing

#### Scenario: Staging is not citable
- GIVEN `staging/draft.md@## Intro`
- WHEN validation runs
- THEN a `KU_EXCLUDED_PATH` diagnostic is reported stating that `staging/` is scratch and not citable

### Requirement: Artifact Citations May Target Models

Artifact citations MUST be able to cite a kNNowledge element in addition to a Source, using `kNNowledge/<path>.md@## <Element heading>`. The chain artifact to kNNowledge to Source MUST resolve with one mechanism. `nn-trannsform/citations.md` MUST document this.

#### Scenario: Artifact footnote cites a kNNowledge element
- GIVEN a deliverable section derived from element A of `kNNowledge/x_business_NN.md`
- WHEN `nn-trannsform` renders citations
- THEN the footnote references `kNNowledge/x_business_NN.md@## NN Concept: A`

#### Scenario: Cross-model chain is representable
- GIVEN a deliverable citing `kNNowledge/x_business_NN.md@## NN Concept: A`, whose element cites `sources/import/1.md@## Section`
- WHEN the chain is traced
- THEN deliverable, kNNowledge element, and Source resolve completely

### Requirement: Malformed Citations Produce an Explicit Diagnostic

A `sources::` value that cannot be resolved as a valid citation (nonexistent file, line-range anchor, a unit citation aimed at a binary raw file (`KU_BINARY_TARGET`), or an anchor kind that does not match the target file type) MUST produce an explicit diagnostic identifying the value. Line-range anchors MUST be rejected, not silently dropped. A retired-folder path is reported as a nonexistent file (`KU_DANGLING_FILE`) with no dedicated removed-prefix message.
(Previously: covered nonexistent file, line-range anchor, and the `models/` prefix.)

#### Scenario: Citation to a nonexistent file
- GIVEN a `sources::` value pointing at a file that does not exist
- WHEN validation runs
- THEN an explicit diagnostic names the unresolved target

#### Scenario: Line-range anchor rejected
- GIVEN a `sources::` value using a line-range anchor
- WHEN validation runs
- THEN it is rejected with an explicit diagnostic

#### Scenario: Retired prefix dangles
- GIVEN a `sources::` value `sources/nn/x.md@## Intro` and no such file
- WHEN validation runs
- THEN a `KU_DANGLING_FILE` diagnostic names the value

#### Scenario: Anchor kind mismatch
- GIVEN a `sources::` value `sources/import/data.csv@## Heading`
- WHEN validation runs
- THEN an explicit diagnostic states a CSV file needs a `RowID&column` anchor

## ADDED Requirements

### Requirement: Citation target by file type

A citation MUST target the raw file for markdown, CSV, and JSON sources. For any other (binary) format the citation MUST target the body of the co-located sidecar: `<file>.<ext>_sidecar_NN.md@## Heading`. A curated CSV MUST be cited as its own write-once artifact, not as its raw file. A citation to a specific family member cites that member's immutable bytes.

#### Scenario: Markdown cites the raw
- GIVEN `sources/import/interview.md`
- WHEN a kNNowledge element cites it
- THEN the value is `sources/import/interview.md@## Clients`

#### Scenario: PDF cites the sidecar body
- GIVEN `sources/import/report.pdf` with a sidecar body containing `## Findings`
- WHEN a kNNowledge element cites it
- THEN the value is `sources/import/report.pdf_sidecar_NN.md@## Findings` and it resolves

#### Scenario: Curated CSV is cited as its own artifact
- GIVEN `artifacts/sales_curated_20261002T101500Z.csv` derived from `sources/import/sales.csv`
- WHEN a downstream element cites a row
- THEN the value targets the curated file, and the curated file's upstream is the raw file
