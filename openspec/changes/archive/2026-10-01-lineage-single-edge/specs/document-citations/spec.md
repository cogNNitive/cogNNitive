# document-citations (Delta)

## MODIFIED Requirements

### Requirement: Model as a First-Class Citation Source

A kNNowledge file under `kNNowledge/` MUST be a valid Citation target with the same syntax and semantics as a Source under `sources/nn/`. The canonical identifier for a kNNowledge element is `kNNowledge/<path>.md@## <Element heading>` (e.g. `kNNowledge/Client_V_0-1-0_business_NN.md@## NN Stakeholders: Enterprise Clients`). An unqualified `sources::` value that is a `kNNowledge/...` path MUST be interpreted as a kNNowledge reference, not resolved under `sources/nn/`.
(Previously: `models/<path>.md#<heading-slug>`.)

#### Scenario: kNNowledge element cited with `@`
- GIVEN `kNNowledge/Client_V_0-1-0_business_NN.md` containing `## NN Stakeholders: Enterprise Clients`
- WHEN a `sources::` field references `kNNowledge/Client_V_0-1-0_business_NN.md@## NN Stakeholders: Enterprise Clients`
- THEN the reference resolves to that file and heading
- AND that element's own `sources::` may point at a Source, forming the chain

### Requirement: Uniform Block Identifier Across the Workspace

The form `<workspace-relative-path>@<anchor>` MUST be the single, uniform identifier for any knowledge block, where `<workspace-relative-path>` is `sources/nn/<subpath>`, `sources/export/<subpath>`, or `kNNowledge/<subpath>`. This form MUST be the only mechanism for pointing at a block; line-range anchors and `src-NNN` ids remain prohibited. `#slug` is a read-only legacy form handled only inside innfo-core (see `citation-parser-resolver`).
(Previously: `<path>.md#<heading-slug>` with `models/` or `sources/nn/`.)

#### Scenario: Uniform addressing of a Source and a kNNowledge element
- GIVEN a Source `sources/nn/1.md` and a kNNowledge file `kNNowledge/x_NN.md`
- WHEN both are cited
- THEN both use identical `<path>@<anchor>` syntax with no per-kind special casing

### Requirement: Artifact Citations May Target Models

Artifact citations MUST be able to cite a kNNowledge element in addition to a Source, using `kNNowledge/<path>.md@## <Element heading>`. A footnote may cite a kNNowledge element whose own `sources::` points at the underlying Source; the artifact to kNNowledge to Source chain MUST resolve with one mechanism. `nn-trannsform/citations.md` MUST document this.
(Previously: citations used `models/<path>.md#<heading-slug>`.)

#### Scenario: Artifact footnote cites a kNNowledge element
- GIVEN a deliverable section derived from element A of `kNNowledge/x_NN.md`
- WHEN `nn-trannsform` renders citations
- THEN the footnote references `kNNowledge/x_NN.md@## NN Concept: A`

#### Scenario: Cross-model chain is representable
- GIVEN a deliverable citing `kNNowledge/x_NN.md@## NN Concept: A`, whose element cites `sources/nn/1.md@## Section`
- WHEN the chain is traced
- THEN deliverable, kNNowledge element, and Source resolve completely

### Requirement: Malformed Citations Produce an Explicit Diagnostic

A `sources::` value that cannot be resolved as a valid citation (nonexistent file, line-range anchor, or the removed `models/` prefix) MUST produce an explicit, non-silent diagnostic identifying the malformed value. Line-range anchors MUST be rejected, not silently accepted or dropped.
(Previously: did not mention the `models/` prefix.)

#### Scenario: Citation to a nonexistent file
- GIVEN a `sources::` value pointing at a file that does not exist
- WHEN validation runs
- THEN an explicit diagnostic names the unresolved target

#### Scenario: Line-range anchor rejected
- GIVEN a `sources::` value using a line-range anchor form
- WHEN validation runs
- THEN the value is rejected with an explicit diagnostic

#### Scenario: `models/` prefix rejected
- GIVEN a `sources::` value `models/x_NN.md@## NN Concept: A`
- WHEN validation runs
- THEN an explicit diagnostic is reported for the unsupported prefix
