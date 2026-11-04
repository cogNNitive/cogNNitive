# Delta for changeset-document-model

Living spec read: `openspec/specs/changeset-document-model/spec.md`. Replaced: the target grammar of the mutation operations (a model slug becomes a hierarchical id) and the `add_model` target. Unchanged: the normative `changes` bluepriNNt and frontmatter, role classification and discovery exclusion, proposal sealing, serialization, the evidence `sources` field, and "changesets are the only change record". The `models` frontmatter map, described in the living text as keyed by "affected model slugs", is keyed by hierarchical id after this change (ADDED requirement below; the living wording is superseded). Overlap: `lineage-as-changes` also edits this living spec; rebase this delta onto its merged text before archive.

## MODIFIED Requirements

### Requirement: Changeset Mutation and Comment Operations

Each change in a changeset document MUST be represented as an element heading `## NN Change: <id>` conforming to the `changes` blueprint concept `Change`. Each change MUST specify an `op` property.

The target format (`target::`) for content operations MUST equal the unified address defined by `unified-reference-grammar` and `knowledge-unit-address`, with the model part a hierarchical id (`<model_id>`):
1. `update_field`: Mutates a field on an existing element. `target` is `<model_id>@<element_slug>&<field_name>`, matching the canonical own value address.
2. `update_concept_field`: Mutates a concept-level field. `target` is `<model_id>@concept:<concept_slug>&<field_name>`, matching the canonical concept value address.
3. `add_element`: Adds a new element to a concept in a model. `target` is `<model_id>`.
4. `remove_element`: Removes an element. `target` is `<model_id>@<element_slug>`.
5. `rename_element`: Renames an element's display name. `target` is `<model_id>@<element_slug>`.
6. `rename_concept`: Renames a concept's display name. `target` is `<model_id>@concept:<concept_slug>`.
7. `update_matrix_cell`: Updates or inserts a cell in a matrix. `target` is `<model_id>@<matrix_slug>&<row_slug>&<col_slug>`, matching the canonical matrix cell address.
8. `comment`: Represents review feedback or discussion annotations. `target` MAY be any valid canonical unit address (including structure definitions, sections, elements, values, cells, or Sources).
9. `add_model`: Creates a new Level-3 kNNowledge document. `target` is `<model_id>`; for an instance of a distributed concept it is the hierarchical id (container chain plus slug), and the change identifies the distributed concept (see `instance-model-lifecycle`).

A target whose model part is a filename stem, a title, or a domain-relative path flipped on collision MUST be rejected as a removed form.
(Previously: `<model_slug>` in every target, informally either a stem or a path; `add_model` took a flat `<model_slug>`.)

#### Scenario: Element and value targets equal canonical addresses
- GIVEN a changeset with `op:: update_field`
- WHEN targeted at field `"voice"` of element `"00-gancho"` in model `"villabotijos-today/pepper-mapache"`
- THEN `target` is `"villabotijos-today/pepper-mapache@00-gancho&voice"`
- AND this string equals `unitAddress.value("villabotijos-today/pepper-mapache@00-gancho", "voice")`

#### Scenario: Matrix cell target equals canonical cell address
- GIVEN a changeset with `op:: update_matrix_cell`
- WHEN targeted at matrix `"swot"`, row `"r1"`, column `"c1"` in model `"strategy"`
- THEN `target` is `"strategy@swot&r1&c1"`
- AND this string equals `unitAddress.cell("strategy", "swot", "r1", "c1")`

#### Scenario: Comment target accepts structure definition
- GIVEN a review comment on field definition `"owner"` of concept `"Goal"` in blueprint `"business"`
- WHEN the comment draft is serialized
- THEN `target` is `"specs/business@concept:goal&owner"`
- AND `op` is `"comment"`

#### Scenario: add_model for an instance model
- GIVEN an `add_model` change creating a Video in series `innteresante`
- WHEN its target is written
- THEN it is `innteresante/new-episode`

#### Scenario: Stem target is rejected
- GIVEN an `update_field` change with target `pepper-mapache_video-script@00-gancho&voice`
- WHEN the changeset is parsed and validated
- THEN the target is reported as a removed form
- AND the change is not applied

## ADDED Requirements

### Requirement: The `models` map is keyed by hierarchical id

The frontmatter `models` map of a changeset MUST be keyed by the hierarchical id of each affected model, with one entry per model file. This supersedes the living wording "map of affected model slugs". An `add_model` entry carries only `result_version`.

#### Scenario: Keys are ids
- GIVEN an applied changeset touching `villabotijos-today/pepper-mapache` and `innteresante/intro`
- WHEN its frontmatter is read
- THEN `models` has the keys `villabotijos-today/pepper-mapache` and `innteresante/intro`, each with `base_version` and `result_version`

### Requirement: Instance operations belong to the closed `op` set

The operations that rename an instance model, move it to another container, and migrate a concept from compact to distributed (see `instance-model-lifecycle` and `instance-model-migration`) MUST be `ChangeOp`s listed in the closed `op` options of the `changes` bluepriNNt, so a changeset using them validates and is sealed like any other. Their names and fields are design decisions.

#### Scenario: Changeset with an instance operation validates
- GIVEN a changeset holding a rename of `innteresante/intro`
- WHEN it is validated against the `changes` bluepriNNt
- THEN no invalid-`op` diagnostic is reported
