# document-citations Specification (delta)

## ADDED Requirements

### Requirement: Citations exist only as change evidence

A citation MUST exist only as an entry of the `evidence` of a change. A kNNowledge document (role `knowledge`) MUST NOT contain a `sources::` field nor a field whose schema type is `citation`; the validator MUST report `CITATION_FIELD_BANNED` as an error naming the field and the element. The rule applies to every kNNowledge document, including shipped samples. Changeset documents (role `changeset`) are exempt: their `evidence` field is typed `citation`. Pointers from a unit to another unit or file (for example `conflicts::`) MUST use `type:: address`. The sidecar `sources` key and the `visual-catalog` `source` fields (typed `citation` today) MUST NOT be typed `citation`.

#### Scenario: `sources::` in a model is an error
- GIVEN a kNNowledge element with `sources:: [sources/import/a.md]`
- WHEN `validate_knowledge` runs
- THEN it reports the error `CITATION_FIELD_BANNED` naming `sources` and the element

#### Scenario: A citation-typed field is an error
- GIVEN a bluepriNNt whose Field `ref` is `type:: citation` and a kNNowledge element carrying `ref::`
- WHEN `validate_knowledge` runs
- THEN it reports `CITATION_FIELD_BANNED` naming `ref`

#### Scenario: A domain built only through changes is clean
- GIVEN a domain built only by applied changes
- WHEN `rg "sources::|type:: citation"` runs over its `kNNowledge/`
- THEN there are no matches

#### Scenario: Changesets are exempt
- GIVEN a changeset whose `evidence` field is typed `citation`
- WHEN it is validated
- THEN no `CITATION_FIELD_BANNED` is reported

#### Scenario: Domain pointers use address
- GIVEN a field that points at another unit
- WHEN it is declared
- THEN it is `type:: address`

## MODIFIED Requirements

### Requirement: Model as a First-Class Citation Source

A kNNowledge file under `kNNowledge/` MUST be a valid citation target with the same syntax and semantics as any Source, as an entry of a change `evidence`. The canonical identifier for a kNNowledge element is `kNNowledge/<path>.md@## <Element heading>` (for example `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`). An evidence entry that is a `kNNowledge/...` path MUST be interpreted as a kNNowledge reference. (Previously: the value was a `sources::` field of a model element.)

#### Scenario: kNNowledge element cited with `@`
- GIVEN `kNNowledge/Client_business_NN.md` containing `## NN Stakeholders: Enterprise Clients`
- WHEN a change has `evidence:: kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`
- THEN the entry resolves to that file and heading
- AND the origin of that element's own values is read from its own applied changes, forming the chain change, then change

### Requirement: Artifact Citations May Target Models

An artifact's upstream MUST be able to cite a kNNowledge element in addition to a Source, using `kNNowledge/<path>.md@## <Element heading>` as an entry of the `evidence` of its `produce_artifact` change. The chain artifact to kNNowledge to Source MUST resolve with one mechanism: the evidence of `produce_artifact`, then the origin (evidence of the last applied change) of the cited unit. `nn-trannsform/citations.md` MUST document this. Footnotes in rendered artifact bodies are content and are unchanged.

#### Scenario: Artifact upstream cites a kNNowledge element
- GIVEN a deliverable section derived from element A of `kNNowledge/x_business_NN.md`
- WHEN its `produce_artifact` is recorded
- THEN `evidence` contains `kNNowledge/x_business_NN.md@## NN Concept: A`

#### Scenario: Cross-model chain is representable
- GIVEN a deliverable whose `produce_artifact` evidence cites `kNNowledge/x_business_NN.md@## NN Concept: A`, and an applied change on that element with evidence `sources/import/1.md@## Section`
- WHEN the chain is traced
- THEN deliverable, kNNowledge element, and Source resolve completely

### Requirement: Citation List Values Round-Trip Through Write and Read

An `evidence` value written by `propose_changeset` in the citation-list syntax (unquoted bracket list, e.g. `evidence:: [sources/import/foo.md@## Heading]`) MUST be read back by the citation reader as the same set of citations, with no diagnostic produced solely by the serialization form. Parse → serialize → parse MUST be byte-identical for `evidence` values, and this identity MUST NOT alter serialization of any other field type. (Previously: the value was a `sources::` field written by the mutation engine.)

#### Scenario: Valid single citation round-trips

- GIVEN a change with `evidence: ["sources/import/foo.md@## Heading"]`
- WHEN the value is serialized and then parsed back
- THEN the citation reader resolves the same file and heading with no malformed-citation diagnostic

#### Scenario: Multiple citations round-trip

- GIVEN a change with two evidence entries
- WHEN the value is serialized and then parsed back
- THEN both citations resolve independently in the bracket-list form

#### Scenario: Non-citation fields serialize unchanged

- GIVEN a field that is not a citation list (e.g. a plain text or reference field)
- WHEN the serializer runs
- THEN its output is byte-identical to before this change

### Requirement: Malformed Citations Produce an Explicit Diagnostic

An `evidence` entry that cannot be resolved as a valid citation (nonexistent file, line-range anchor, a unit citation aimed at a binary raw file (`KU_BINARY_TARGET`), or an anchor kind that does not match the target file type) MUST produce an explicit diagnostic identifying the value. Line-range anchors MUST be rejected, not silently dropped. A retired-folder path is reported as a nonexistent file (`KU_DANGLING_FILE`) with no dedicated removed-prefix message. The anchor diagnostics MUST be enforced only when the stamped `evidence_sha256` equals the current sha of the cited file; otherwise `EVIDENCE_SOURCE_CHANGED` is reported as a warning (see `change-provenance`).

#### Scenario: Citation to a nonexistent file
- GIVEN an `evidence` entry pointing at a file that does not exist
- WHEN validation runs
- THEN an explicit diagnostic names the unresolved target

#### Scenario: Line-range anchor rejected
- GIVEN an `evidence` entry using a line-range anchor form
- WHEN validation runs
- THEN the value is rejected with an explicit diagnostic

#### Scenario: Retired prefix dangles
- GIVEN an `evidence` entry `sources/nn/x.md@## Intro` and no such file
- WHEN validation runs
- THEN a `KU_DANGLING_FILE` diagnostic names the value

#### Scenario: Anchor kind mismatch
- GIVEN an `evidence` entry `sources/import/data.csv@## Heading`
- WHEN validation runs
- THEN an explicit diagnostic states a CSV file needs a `RowID&column` anchor

#### Scenario: Changed source downgrades the anchor failure
- GIVEN an entry whose cited file changed after the stamp and no longer has the anchor
- WHEN validation runs
- THEN `EVIDENCE_SOURCE_CHANGED` is a warning and no anchor error is reported

### Requirement: Citation target by file type

A citation MUST target the raw file for markdown, CSV, and JSON sources. For any other (binary) format the citation MUST target the body of the co-located sidecar: `<file>.<ext>_sidecar_NN.md@## Heading`. A curated CSV MUST be cited as its own write-once artifact, not as its raw file. A citation to a specific family member cites that member's immutable bytes.

#### Scenario: Markdown cites the raw
- GIVEN `sources/import/interview.md`
- WHEN a change cites it as evidence
- THEN the value is `sources/import/interview.md@## Clients`

#### Scenario: PDF cites the sidecar body
- GIVEN `sources/import/report.pdf` with a sidecar body containing `## Findings`
- WHEN a change cites it as evidence
- THEN the value is `sources/import/report.pdf_sidecar_NN.md@## Findings` and it resolves

#### Scenario: Curated CSV is cited as its own artifact
- GIVEN `artifacts/sales_curated_20261002T101500Z.csv` derived from `sources/import/sales.csv`
- WHEN a downstream change cites a row
- THEN the value targets the curated file, and the curated file's upstream is the raw file through its `produce_artifact` evidence

## REMOVED Requirements

### Requirement: add_element cites its change; the change cites the evidence
(Reason: model fields no longer carry citations. The origin of a created element and of each of its values is the evidence of the applied change that set it, derived by `change-provenance`; the D20 rewrite that wrote `sources::` into elements is retired.)
(Migration: none — legacy out of scope.)
