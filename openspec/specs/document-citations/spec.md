# document-citations Specification

## Purpose
TBD - created by archiving change 2026-09-07-agent-modifications-source-provenance. Update Purpose after archive.
## Requirements
### Requirement: Model as a First-Class Citation Source

A kNNowledge file under `kNNowledge/` MUST be a valid citation target with the same syntax and semantics as any Source. The canonical identifier for a kNNowledge element is `kNNowledge/<path>.md@## <Element heading>` (for example `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`). A `sources::` value that is a `kNNowledge/...` path MUST be interpreted as a kNNowledge reference.

#### Scenario: kNNowledge element cited with `@`
- GIVEN `kNNowledge/Client_business_NN.md` containing `## NN Stakeholders: Enterprise Clients`
- WHEN a `sources::` field references `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`
- THEN the reference resolves to that file and heading
- AND that element's own `sources::` may point at a Source, forming the chain

### Requirement: Uniform Block Identifier Across the Workspace

The form `<workspace-relative-path>@<anchor>` MUST be the single, uniform identifier for any knowledge block. `<workspace-relative-path>` is the path of any citable file in the domaiNN (a Source, an artifact, or a kNNowledge document); the role of the file is derived from its name per `nn-naming-contract`, not from a folder whitelist. Line-range anchors and `src-NNN` ids remain prohibited. The anchor kind follows the target: heading for markdown (`header` unit), `RowID&column` for CSV (`row` unit), JSON Pointer (RFC 6901) for JSON (`pointer` unit). Paths under `staging/` MUST NOT be citable. Paths under the retired roots (`sources/nn/`, `sources/original/`, `sources/export/`, `export/`, `models/`) have no special handling: they dangle because the files no longer exist. An existing file under `sources/archive/` is a plain path and still resolves.

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

### Requirement: Heading-Level Convention

The heading levels in a Model document MUST follow a fixed convention so that model-heading slugs are meaningful, stable, and unambiguous:
- `# NN <Concept>` — level-1 headings are Concepts.
- `## NN <Concept>: <Element>` — level-2 headings are Elements.
- `###` and deeper — level-3 and higher headings appear only within an Element's description/prose, never as standalone top-level structural blocks.

This convention MUST be documented in `nn-trannsform/citations.md` (and referenced by `nn-innfo`) as an authoring rule. The heading-slug algorithm itself remains level-agnostic — it treats headings generically — but authors MUST comply so that a `kNNowledge/<path>.md@## <element>` citation reliably resolves to a level-2 Element, not to prose.

#### Scenario: Convention-compliant Model addresses its elements
- GIVEN a Model whose Concept headings are level 1 and Element headings are level 2, with level-3+ headings only inside Element descriptions
- WHEN a consumer cites `kNNowledge/<path>.md@## NN Concept: <element>`
- THEN the anchor resolves to the level-2 Element heading

#### Scenario: Level-3 heading is not treated as a structural block
- GIVEN a Model with a `###` heading inside an Element's prose
- WHEN the heading-slug algorithm extracts headings
- THEN the `###` heading is addressable generically by its slug but is not a Concept or Element block in the model structure

### Requirement: Citation List Values Round-Trip Through Write and Read

A `sources::` value written by the mutation engine in the spec-correct citation-list syntax (unquoted bracket list, e.g. `sources:: [sources/import/foo.md@## Heading]`) MUST be read back by the citation reader as the same set of citations, with no diagnostic produced solely by the serialization form. Parse → serialize → parse MUST be byte-identical for `sources::` values, and this identity MUST NOT alter serialization of any other field type.

#### Scenario: Valid single citation round-trips

- GIVEN an element write with `sources: ["sources/import/foo.md@## Heading"]`
- WHEN the value is serialized and then parsed back
- THEN the citation reader resolves the same file and heading with no malformed-citation diagnostic

#### Scenario: Multiple citations round-trip

- GIVEN an element write with two citation values
- WHEN the value is serialized and then parsed back
- THEN both citations resolve independently in the spec-correct bracket-list form

#### Scenario: Non-citation fields serialize unchanged

- GIVEN a field that is not a citation list (e.g. a plain text or reference field)
- WHEN the serializer runs
- THEN its output is byte-identical to before this change

### Requirement: add_element cites its change; the change cites the evidence

An element created by an `add_element` change MUST carry a `sources::` field that cites the creating change (`changes/<changeset_file>@## NN Change: <id>`, decision D20). The evidence the element derives from is the change's own `sources::` line (a single citation string written by the proposer and sealed with the proposal), so the provenance chain is element, then change, then source. The change's `sources` MUST NOT be copied onto the element.

#### Scenario: add_element element cites the change, the change cites the source

- GIVEN an `add_element` change `c-02` with `sources:: sources/import/interview.md@## Clients`
- WHEN the changeset is applied
- THEN the new element's `sources::` is `[changes/<changeset_file>@## NN Change: c-02]`
- AND `c-02` keeps `sources:: sources/import/interview.md@## Clients` unchanged
- AND the element's `sources::` does not contain `sources/import/interview.md`

#### Scenario: add_element without evidence

- GIVEN an `add_element` change with no `sources::`
- WHEN the changeset is applied
- THEN the element still carries `sources::` citing the change

### Requirement: Malformed Citations Produce an Explicit Diagnostic

A `sources::` value that cannot be resolved as a valid citation (nonexistent file, line-range anchor, a unit citation aimed at a binary raw file (`KU_BINARY_TARGET`), or an anchor kind that does not match the target file type) MUST produce an explicit diagnostic identifying the value. Line-range anchors MUST be rejected, not silently dropped. A retired-folder path is reported as a nonexistent file (`KU_DANGLING_FILE`) with no dedicated removed-prefix message.

#### Scenario: Citation to a nonexistent file
- GIVEN a `sources::` value pointing at a file that does not exist
- WHEN validation runs
- THEN an explicit diagnostic names the unresolved target

#### Scenario: Line-range anchor rejected
- GIVEN a `sources::` value using a line-range anchor form
- WHEN validation runs
- THEN the value is rejected with an explicit diagnostic

#### Scenario: Retired prefix dangles
- GIVEN a `sources::` value `sources/nn/x.md@## Intro` and no such file
- WHEN validation runs
- THEN a `KU_DANGLING_FILE` diagnostic names the value

#### Scenario: Anchor kind mismatch
- GIVEN a `sources::` value `sources/import/data.csv@## Heading`
- WHEN validation runs
- THEN an explicit diagnostic states a CSV file needs a `RowID&column` anchor

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
