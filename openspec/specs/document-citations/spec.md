# document-citations Specification

## Purpose
TBD - created by archiving change 2026-09-07-agent-modifications-source-provenance. Update Purpose after archive.
## Requirements
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

### Requirement: Heading-Level Convention

The heading levels in a Model document MUST follow a fixed convention so that model-heading slugs are meaningful, stable, and unambiguous:
- `# NN <Concept>` — level-1 headings are Concepts.
- `## NN <Concept>: <Element>` — level-2 headings are Elements.
- `###` and deeper — level-3 and higher headings appear only within an Element's description/prose, never as standalone top-level structural blocks.

This convention MUST be documented in `nn-trannsform/citations.md` (and referenced by `nn-innfo`) as an authoring rule. The heading-slug algorithm itself remains level-agnostic — it treats headings generically — but authors MUST comply so that a `models/<path>.md#<element-slug>` citation reliably resolves to a level-2 Element, not to prose.

#### Scenario: Convention-compliant Model addresses its elements
- GIVEN a Model whose Concept headings are level 1 and Element headings are level 2, with level-3+ headings only inside Element descriptions
- WHEN a consumer cites `models/<path>.md#<element-slug>`
- THEN the slug resolves to the level-2 Element heading

#### Scenario: Level-3 heading is not treated as a structural block
- GIVEN a Model with a `###` heading inside an Element's prose
- WHEN the heading-slug algorithm extracts headings
- THEN the `###` heading is addressable generically by its slug but is not a Concept or Element block in the model structure

### Requirement: Citation List Values Round-Trip Through Write and Read

A `sources::` value written by the mutation engine in the spec-correct citation-list syntax (unquoted bracket list, e.g. `sources:: [sources/nn/foo.md#heading]`) MUST be read back by the citation reader as the same set of citations, with no diagnostic produced solely by the serialization form. Parse → serialize → parse MUST be byte-identical for `sources::` values, and this identity MUST NOT alter serialization of any other field type.

#### Scenario: Valid single citation round-trips

- GIVEN an element write with `sources: ["sources/nn/foo.md#heading"]`
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

### Requirement: add_element Accepts and Persists sources

`apply_change add_element` MUST accept an optional `sources` argument and MUST persist it as the element's `sources::` field, in addition to `fields`. Omitting `sources` MUST NOT change existing `add_element` behavior for `fields`.

#### Scenario: add_element with sources persists the citation

- GIVEN an `apply_change add_element` call including `sources`
- WHEN the mutation is applied
- THEN the written element has a `sources::` field containing the given value(s)

#### Scenario: add_element without sources behaves as before

- GIVEN an `apply_change add_element` call with `fields` only, no `sources`
- WHEN the mutation is applied
- THEN the element is written exactly as it was before this change, with no `sources::` field

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
