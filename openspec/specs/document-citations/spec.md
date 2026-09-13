# document-citations Specification

## Purpose
TBD - created by archiving change 2026-09-07-agent-modifications-source-provenance. Update Purpose after archive.
## Requirements
### Requirement: Model as a First-Class Citation Source

A Model file under `models/` MUST be a valid Citation target with the same syntax and semantics as a Source under `sources/nn/`. The canonical identifier for a Model element is `models/<path>.md#<heading-slug>` (e.g. `models/Client_V_0-1-0_business_NN.md#enterprise-clients`), where the slug is derived from the element's heading by the shared heading-slug algorithm. An unqualified `sources::` value that is a `models/...` path MUST be interpreted as a Model reference, not resolved under `sources/nn/`.

#### Scenario: Model element cited by slug
- GIVEN a Model `models/Client_V_0-1-0_business_NN.md` containing element heading `## NN Stakeholders: Enterprise Clients`
- WHEN a `sources::` field references `models/Client_V_0-1-0_business_NN.md#enterprise-clients`
- THEN the reference resolves to that Model file and its element heading
- AND the target element's own `sources::` may in turn point at a Source, forming the chain

### Requirement: Uniform Block Identifier Across the Workspace

The form `<workspace-relative-path>.md#<heading-slug>` MUST be the single, uniform identifier for any knowledge block in the workspace, where `<workspace-relative-path>` is either `sources/nn/<subpath>` or `models/<subpath>`. This form MUST be the only mechanism for pointing at a block; line-range anchors and `src-NNN` ids remain prohibited.

#### Scenario: Uniform addressing of a Source and a Model
- GIVEN a Source `sources/nn/1.md#section` and a Model `models/x.md#element-a`
- WHEN both are cited
- THEN both use the identical `<path>.md#<slug>` syntax with no special casing per file kind

### Requirement: Artifact Citations May Target Models

Artifact citations (deliverable footnotes and bibliographic styles produced by `nn-trannsform`) MUST be able to cite a Model element in addition to a Source. When a deliverable section derives from a Model element, the citation MUST reference `models/<path>.md#<heading-slug>`. The artifact→model→source chain MUST be representable: a footnote may cite a Model element, whose own `sources::` points at the underlying Source. `nn-trannsform/citations.md` MUST document that a deliverable may resolve claims from a Model's `sources::` as well as directly from a Source.

#### Scenario: Artifact footnote cites a Model element
- GIVEN a deliverable section whose content derives from element A of `models/x.md`
- WHEN `nn-trannsform` renders citations for that deliverable
- THEN the footnote references `models/x.md#element-a`
- AND the element's underlying Source remains traceable through the Model's `sources::`

#### Scenario: Cross-model chain is representable
- GIVEN a deliverable section cites `models/x.md#element-a`, whose element A cites `sources/nn/1.md#section`
- WHEN the chain is traced
- THEN the deliverable → model element → source chain resolves completely with one uniform mechanism

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

A `sources::` value that cannot be resolved as a valid citation (e.g. referencing a nonexistent file, or using a line-range anchor) MUST produce an explicit, non-silent diagnostic identifying the malformed value. Line-range anchors MUST be rejected, not silently accepted or silently dropped.

#### Scenario: Citation to a nonexistent file

- GIVEN a `sources::` value pointing at a file that does not exist in the workspace
- WHEN validation runs
- THEN an explicit diagnostic is reported naming the unresolved target

#### Scenario: Line-range anchor rejected

- GIVEN a `sources::` value using a line-range anchor form
- WHEN validation runs
- THEN the value is rejected with an explicit diagnostic, not silently accepted

