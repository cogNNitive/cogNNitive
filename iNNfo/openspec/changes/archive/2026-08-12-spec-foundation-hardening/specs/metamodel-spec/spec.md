# Delta for metamodel-spec

The normative requirements the iNNfo/defiNNe reference specification documents MUST
satisfy after this change. Target published version: **V_0-2-0**.

## ADDED Requirements

### R-MM-01: Canonical Entity Glossary

The specification MUST define a single canonical glossary and use only these terms in
normative text:
- **Containment spine (generic → concrete):** Workspace, Model, Concept, Element, Field.
- **Cross-cutting:** Marker, Relationship (with Relationship Types), Matrix (the
  tabular representation of certain Relationship Types).
- **Definitional:** Specification (defiNNe L0, iNNfo L1), Template (L2), Model (L3).

The term "Node" MUST NOT appear in normative text (it is an implementation-only term).
The synonyms block, section, instance, item, property, attribute MUST NOT be used as
substitutes for the canonical terms.

#### Scenario: Glossary is present and unambiguous
- GIVEN the iNNfo specification body
- WHEN a reader looks for the definition of an entity
- THEN exactly one glossary section defines each of Workspace, Model, Concept, Element, Field, Marker, Relationship, Matrix, Specification, Template
- AND no normative sentence uses a banned synonym for those entities

### R-MM-02: Reserved Pseudo-Concepts

`Concepts`, `Elements`, and `Markers` MUST be reserved concept names denoting "all
concepts", "all elements", and "all markers" respectively. A Template MUST NOT declare
a Concept with any of these names.

#### Scenario: Template declares a reserved name
- GIVEN a Template whose `concepts` list contains a concept named `Elements`
- WHEN the model is validated
- THEN validation fails with an error identifying the reserved-name violation

### R-MM-03: Name as the Single Source of Truth

Entity identity MUST be the name; no slug or opaque id is persisted in the model file.
- An Element name MUST be unique within the whole Model (across all Concepts).
- A Concept name MUST be unique within the Model.
- The Model logical name MUST be the frontmatter `title`, unique within the Workspace,
  and decoupled from the filename.

#### Scenario: Duplicate element name across concepts
- GIVEN a Model with an Element `Review` under `Work` and another `Review` under `Artifact`
- WHEN the Model is validated
- THEN validation fails: element names must be unique within the whole Model

### R-MM-04: File Naming — `_NN` only, FOLDER mode removed

Model and spec files MUST use the `_NN.md` suffix. `_FORMAT.md` is removed from the
specification. FOLDER mode and the `_F` marker family are removed; every model is a
single file registered through an `index.md` workspace.

#### Scenario: FOLDER mode is rejected
- GIVEN a model with `mode: FOLDER` in frontmatter
- WHEN it is parsed or validated
- THEN an error is reported stating FOLDER mode is removed
- AND the specification text contains zero `_FORMAT.md` references

### R-MM-05: Level-3 Frontmatter Structure

In a level-3 model, `model_version` and `title` MUST be top-level frontmatter keys,
NOT nested inside `parent_spec`. All levels MUST agree on this structure.

#### Scenario: Consistent L3 frontmatter across documents
- GIVEN defiNNe §5.4, iNNfo, and the templates' level-3 examples
- THEN all place `model_version` and `title` at the top level

### R-MM-06: Unified "Relationship Types" Terminology

The specification MUST use a single term, **Relationship Types**, for the typed set
`hierarchy`, `evaluable_matrix`, `graph_edge`, `sequence`. The names
`relationship_declarations` and `relationship_types` MUST NOT both appear.

### R-MM-07: Hierarchy via Index Only

The `# _NN index` taxonomy MUST be the sole hierarchy mechanism. The Hierarchy Matrix
is removed from the specification.

### R-MM-08: Matrix Declaration Uses `values`

A Matrix declaration MUST express its allowed cell values as a YAML array `values: [ ... ]`
(replacing the `params: "a;b;c"` string DSL). A `widget` field is OPTIONAL and only
required when the interaction cannot be inferred from the values. The `item-markers
matrix` reserved name MUST be documented.

#### Scenario: RACI matrix declaration
- GIVEN a `work-roles matrix`
- THEN its declaration reads `values: [Responsible, Accountable, Consulted, Informed]`
- AND no semicolon-delimited `params` string is used

### R-MM-09: Model Index Syntax

A model index block (`# _NN index`) MUST use `[[wikilink]]` syntax as canonical. The
`_NN index:` alias and the "Markdown link preferred" claim MUST be removed for model
index blocks. The workspace root `index.md` MUST continue to use Markdown links for
OKF conformance.

### R-MM-10: Document Structure and References

Required body sections MUST appear in the defined order with no extra section before
the one-sentence summary (the `## Versioning` section MUST NOT precede it). Internal
cross-references MUST use stable heading names, not `§N` numbers. Each concept/field
`Summary` MUST be a short sentence, distinct from its `Description`.

#### Scenario: Summary is not a copy of Description
- GIVEN any concept guidance entry in a template
- THEN its `Summary` is a short sentence and differs from its `Description`

### R-MM-11: `type` Field Disambiguation

The Concept structural type MUST use a distinct key (e.g. `concept_type`), leaving the
element-frontmatter `type` field to carry the OKF concept-name value. OKF conformance
MUST be preserved.

### R-MM-12: `specification_url` Disambiguation

A level-3 model MUST NOT overload `specification_url` to point at a different document.
Its own document URL and the parent-chain resolution MUST be expressed by distinct fields.

### R-MM-14: Fields & Asset Storage

A Field is inline or file-backed. File-backed field types are `markdown_file`, `image`,
`file`, `video`, `audio`. Every file-backed field's file MUST be stored under the single
canonical convention `{modelDir}/assets/{element-slug}/{filename}`. The `asset_mode`
field and per-element-at-root storage are removed. A file under an Element's asset folder
that does not correspond to a declared Field is an untyped attachment, not a Field. One
path function MUST be shared by the resolver, the scanner, and the editor.

#### Scenario: File-backed field resolves to one path
- GIVEN an Element `Open PR` (slug `open-pr`) with an `image` field `diagram: arch.png`
- THEN the image resolves to `{modelDir}/assets/open-pr/arch.png`
- AND the resolver, the media scanner, and the field editor all use that same path

### R-MM-13: Fields Are Not Top-Level Guidance Entries

A Field MUST NOT be documented as a top-level guidance entry at the Concept heading
level. A Field is defined by its Concept's `fields` schema (name, type, options,
`target_concepts`). The `Work` fields (`step_type`, `next`, `condition`, `input`,
`output`, `output_status`, `tool`) belong to `Work` and MUST NOT appear as standalone
guidance entries.
