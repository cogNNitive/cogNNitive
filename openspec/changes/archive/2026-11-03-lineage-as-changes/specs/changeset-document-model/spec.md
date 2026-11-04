# Changeset Document Model Specification (delta)

## MODIFIED Requirements

### Requirement: Changeset Mutation and Comment Operations

Each change in a changeset document MUST be represented as an element heading `## NN Change: <id>` conforming to the `changes` blueprint concept `Change`. Each change MUST specify an `op` property.

The target format (`target::`) for content operations MUST equal the canonical unit address defined by `knowledge-unit-address`:
1. `update_field`: Mutates a field on an existing element. `target` is `<model_slug>@<element_slug>&<field_name>`, matching the canonical own value address.
2. `update_concept_field`: Mutates a concept-level field. `target` is `<model_slug>@concept:<concept_slug>&<field_name>`, matching the canonical concept value address.
3. `add_element`: Adds a new element to a concept in a model. `target` is `<model_slug>`. It carries no inline field values (see "`add_element` carries no inline fields").
4. `remove_element`: Removes an element. `target` is `<model_slug>@<element_slug>`.
5. `rename_element`: Renames an element's display name. `target` is `<model_slug>@<element_slug>`.
6. `rename_concept`: Renames a concept's display name. `target` is `<model_slug>@concept:<concept_slug>`.
7. `update_matrix_cell`: Updates or inserts a cell in a matrix. `target` is `<model_slug>@<matrix_slug>&<row_slug>&<col_slug>`, matching the canonical matrix cell address.
8. `comment`: Represents review feedback or discussion annotations. `target` MAY be any valid canonical unit address (including structure definitions, sections, elements, values, cells, or Sources).
9. `add_model`: Creates a new Level-3 kNNowledge document. `target` is `<model_slug>`.
10. `add_matrix`: Adds a matrix to a model. `target` is `<model_slug>`. Its header elements are supplied by `seed` (see "`add_element` carries no inline fields").
11. `update_element_text`: Replaces the prose body of an element (`ElementNode.description`), named to mirror `update_concept_text`. `target` is `<model_slug>@<element_slug>`, `from` is the current prose and `to` the new prose. `notes` never writes the prose body. `update_field` on the field name `description` MUST be rejected with `USE_UPDATE_ELEMENT_TEXT`.
12. `produce_artifact`: Records that an artifact was produced (defined by `artifact-production-change`). `target` is a workspace-relative artifact path.

(Previously: nine operations, which did not include `add_matrix`, `update_element_text` or `produce_artifact`.)

#### Scenario: Element and value targets equal canonical addresses
- GIVEN a changeset with `op:: update_field`
- WHEN targeted at field `"vision"` of element `"statement"` in model `"strategy"`
- THEN `target` is `"strategy@statement&vision"`
- AND this string equals `unitAddress.value("strategy@statement", "vision")`

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

#### Scenario: Prose body op is valid and distinct from fields
- GIVEN a change `op:: update_element_text`, `target:: strategy@statement`, `from:: Old text`, `to:: New text`
- WHEN the changeset is validated and applied
- THEN the element prose body is `New text`
- AND no `description::` line is written

#### Scenario: update_field on description is rejected
- GIVEN a change `op:: update_field`, `target:: strategy@statement&description`
- WHEN it is validated
- THEN it is rejected with `USE_UPDATE_ELEMENT_TEXT` and nothing is written

#### Scenario: Prose precondition
- GIVEN an element whose prose is `Current`
- WHEN `update_element_text` carries `from:: Other`
- THEN the change is a `PRECONDITION_FAILED` conflict and nothing is written

#### Scenario: Path target for artifacts
- GIVEN a change `op:: produce_artifact` with `target:: artifacts/r_20261002T101500Z.md`
- WHEN the changeset is validated
- THEN the target is accepted as a path and not as a model address

### Requirement: Cryptographic Proposal Sealing (`proposal_sha`)

Changeset proposals MUST be cryptographically sealed via a SHA-256 hash stored in the frontmatter `proposal_sha` property. The `computeProposalSha` function MUST compute the hash deterministically across canonical representations of all proposed change elements (`id`, `op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `seed`, `author`, `notes`, `base_hash`, `evidence`, `blueprint_name`, `blueprint_url`, `knowledge_version`).
The computation MUST exclude execution and resolution annotations (`status`, `resolution`, `resolved_slug`, `resolved_target`, `evidence_sha256`, and frontmatter execution fields `applied_at`, `models`, `resolution`). The serialized `evidence` string (including the bracketed list form) is the sealed value.
Before applying a changeset, the apply engine MUST call `verifyProposalSha`. If the computed hash does not match `proposal_sha`, the transaction MUST abort immediately with a `PROPOSAL_TAMPERED` error. (Previously: the sealed keys carried `sources` and `fields`; `replaced_sources` was an excluded annotation.)

#### Scenario: Sealing a proposed changeset generates deterministic hash
- GIVEN a list of proposed change items
- WHEN `computeProposalSha` is executed
- THEN it returns a 64-character lowercase hex string
- AND repeated calls on identical proposed content return the exact same hash

#### Scenario: Resolution fields do not alter proposal hash
- GIVEN a sealed changeset document
- WHEN execution annotations (`status:: applied`, `resolution:: ...`, `resolved_slug:: ...`, `resolved_target:: ...`, `evidence_sha256:: ...`) are added to individual change elements
- THEN `verifyProposalSha` continues to return `true`

#### Scenario: Tampered proposal content fails verification
- GIVEN a sealed changeset document where a change's `to::` field or `target::` field is modified after sealing
- WHEN `verifyProposalSha` is invoked
- THEN it returns `false`
- AND execution aborts with a `PROPOSAL_TAMPERED` error

#### Scenario: add_model keys are sealed
- GIVEN a sealed `add_model` change
- WHEN its `blueprint_url` or `knowledge_version` is edited after sealing
- THEN `verifyProposalSha` returns `false`

#### Scenario: Evidence is sealed
- GIVEN two otherwise identical changes that differ only in `evidence`
- WHEN `computeProposalSha` runs on each
- THEN the two hashes differ

#### Scenario: A list evidence is sealed as written
- GIVEN a change with `evidence:: [A, B]` and another with `evidence:: [B, A]`
- WHEN `computeProposalSha` runs on each
- THEN the two hashes differ

### Requirement: Changeset Serialization and Resolution Annotation

The changeset serializer (`serializeChangeset`) MUST serialize `ChangesetDocument` instances to Markdown conforming to the `changes` blueprint. When the document carries the `rawContent` it was parsed from, the serializer MUST copy every byte of it verbatim except (a) the frontmatter execution keys `status`, `applied_at` and `models`, replaced in place, and (b) the execution annotation lines of each change block — exactly `status::`, `resolution::`, `resolved_slug::`, `resolved_target::` and `evidence_sha256::` — replaced in place or appended after the block's last normative line. Normative lines, blank lines, line endings, the document notice and unrecognized lines MUST NOT be re-rendered. A document built in memory (no `rawContent`) MUST be rendered structurally, including `evidence::`. (Previously: the annotation set included `replaced_sources::`, and the structural render included `sources::`.)

#### Scenario: Serializing applied change annotations
- GIVEN an applied change item with `status: "applied"`, `resolution: "Applied to strategy model"`, `resolved_slug: "customer-vision"` and `resolved_target: "strategy@customer-vision&vision"`
- WHEN the changeset is serialized to Markdown
- THEN the change block includes `status:: applied`, `resolution:: Applied to strategy model`, `resolved_slug:: customer-vision` and `resolved_target:: strategy@customer-vision&vision`
- AND the frontmatter includes `status: applied` and the populated `models` version transition map

#### Scenario: Normative bytes survive a write-back
- GIVEN a parsed changeset with CRLF line endings, a quoted `to::` value and an `evidence::` line
- WHEN execution annotations are set and the document is serialized
- THEN the output differs from the input only in the frontmatter execution keys and the annotation lines

### Requirement: Change evidence citation field

The `Change` concept of the `changes` bluepriNNt MUST declare an `evidence` field typed `citation`. `ChangeItem` MUST carry it as `evidence`, the parser MUST read `evidence::` and the serializer MUST write it. `evidence` MUST be one of: a single citation (`<path>@## <Heading>`, `<csv>@<row>`, `<json>@/<pointer>`, a bare path or a kNNowledge unit address), a bracketed list of citations (see "Evidence accepts a bracketed list"), the keyword `decision` (the author's own decision, no document), or the keyword `unknown`. A change with no evidence (a review comment) omits it. The evidence is written by the proposer when the changeset is proposed and is part of the sealed proposal; no tool MAY add, remove or rewrite it after sealing. The `propose_changeset` tool and the convergence planner MUST emit and accept the key `evidence` (not `sources`); an unknown key MUST NOT be silently dropped. (Previously: the field was named `sources` and was optional single-valued.)

#### Scenario: An evidence-bearing change cites its source
- GIVEN a change `c-01` with `evidence:: sources/import/interview.md@## Needs`
- WHEN the changeset is parsed and serialized again
- THEN `c-01.evidence` is `sources/import/interview.md@## Needs`
- AND the `evidence::` line is byte-identical in the output

#### Scenario: A bare comment change omits the field
- GIVEN a change with `op:: comment` and no `evidence::`
- WHEN it is parsed and validated
- THEN it validates with no citation and no error

#### Scenario: propose_changeset keeps the evidence key
- GIVEN a `propose_changeset` call whose change carries `evidence: "sources/import/a.md@## One"`
- WHEN the changeset is written
- THEN the change block has `evidence:: sources/import/a.md@## One`
- AND the change is not defaulted to `unknown`

#### Scenario: A retired key is rejected loudly
- GIVEN a `propose_changeset` call whose change carries `sources: "..."`
- WHEN it is validated
- THEN the call is rejected naming the unknown key `sources`

#### Scenario: Convergence plans emit evidence
- GIVEN `convergence-delta.js --plan`
- WHEN it emits operations
- THEN each operation carries `evidence` and none carries `sources`

### Requirement: Changesets are the only change record

Changeset documents under `changes/` MUST be the only record of a change to model or domain data and of the provenance of every value. No tool MAY write or read a parallel change record: no verdict ledger, no `## NN Agent Modification` block, no `.cogNNitive/change-log.jsonl` or other JSON change log, no reviewer JSON export, no persisted lineage record, and no run journal. Who changed what, why and from which evidence MUST be read from changeset changes (`author`, `notes`, `evidence`) and their execution annotations.

#### Scenario: No parallel record is written
- GIVEN a domain where a changeset was proposed and applied
- WHEN the domain is listed
- THEN the only new change record is the changeset under `changes/`
- AND no ledger, change-log, lineage record, journal or Agent Modification block was written

#### Scenario: No parallel record exists in the code
- GIVEN the repository after this change
- WHEN searched outside write-once files and archived changes
- THEN no writer or reader of a verdict ledger, change-log library, Agent Modification block or lineage record exists

## ADDED Requirements

### Requirement: Evidence accepts a bracketed list

`evidence` MUST accept a bracketed list `[A, B]`, parsed by `splitSourceFieldValue`. The serialized string MUST stay the sealed value. The keywords `decision` and `unknown` MUST be valid only alone: a list containing either MUST be rejected with `EVIDENCE_KEYWORD_IN_LIST` at proposal and by the validator. A later confirmation of a value MUST be a separate change, never an added list entry on a sealed change. Every consumer of evidence (apply resolution, history, console, resolve_sources) MUST treat the value as a list of one or more entries.

#### Scenario: Two citations in one change
- GIVEN a change with `evidence:: [sources/import/a.md@## One, kNNowledge/x_NN.md@## NN Goal: A]`
- WHEN it is parsed
- THEN the evidence is the two entries in that order

#### Scenario: Keyword with a citation is rejected
- GIVEN `evidence:: [decision, sources/import/a.md]`
- WHEN the proposal is validated
- THEN `EVIDENCE_KEYWORD_IN_LIST` is reported naming the change

#### Scenario: Keyword alone is accepted
- GIVEN `evidence:: decision` and another change with `evidence:: unknown`
- WHEN validated
- THEN no `EVIDENCE_KEYWORD_IN_LIST` is reported

#### Scenario: Confirmation is a separate change
- GIVEN an applied change with `evidence:: [A]`
- WHEN a later source confirms the same value
- THEN a new `update_field` change with `evidence:: [B]` is proposed
- AND the sealed change keeps `evidence:: [A]`

### Requirement: Execution facts are outside the seal

The execution facts `resolved_slug`, `resolved_target` and `evidence_sha256` MUST be written only by the apply engine, as per-change annotation lines. They MUST NOT be accepted from a proposal as normative input: a proposal that carries them MUST have them overwritten at apply. `resolved_target` and `evidence_sha256` are defined by `change-provenance`.

#### Scenario: Stamped facts appear after apply
- GIVEN a sealed changeset with an `update_field` and list evidence
- WHEN it is applied
- THEN the change block carries `resolved_target::` and `evidence_sha256::` annotation lines
- AND all normative lines are byte-identical

#### Scenario: Proposed facts are ignored
- GIVEN a proposal that already carries `resolved_target:: other@x&y`
- WHEN it is applied
- THEN the stamped `resolved_target` equals the engine's own resolution

### Requirement: `add_element` carries no inline fields

`add_element` MUST create an element with its concept and name (and optional explicit `slug`) only. A change MUST NOT carry inline field values: the `fields` key does not exist in the `Change` concept. Each field MUST be set afterwards by its own `update_field` change with its own `evidence`; because the field does not yet exist, such an `update_field` carries no `from`. A change carrying inline fields MUST be rejected loudly with `INVALID_OPERATION` (the message pointing to `update_field`) at proposal and, defensively, by the apply engine as a defect of the proposal. For `add_matrix`, the header elements MUST be supplied by a separate `seed` property, `seed: {columns, rows}`, that exists only on `add_matrix`; `seed` is sealed (a member of `PROPOSAL_KEYS`) and creates empty cells. Emitters (the convergence planner and the console review, ui-kit and export) MUST follow these shapes: `add_element` followed by N `update_field` ops with no `from`. The execution-fact keys (`resolved_slug`, `resolved_target`, `evidence_sha256`) are defined by one exported `EXECUTION_FACT_KEYS` list shared by the serializer and the normative-line comparison, and excluded from `PROPOSAL_KEYS`. `add_element` MUST NOT copy `notes` into the prose body.

#### Scenario: Field-less add_element then update_field
- GIVEN an `add_element` for concept `Goal` named `Grow` and an `update_field` on `m@grow&owner` with `to:: Ana`, no `from`, and `evidence:: [A]`
- WHEN the changeset is applied
- THEN the element exists with `owner:: Ana`
- AND the origin of `owner` is `[A]`

#### Scenario: Inline fields are rejected
- GIVEN an `add_element` change that carries `fields`
- WHEN `propose_changeset` validates it
- THEN it is rejected with `INVALID_OPERATION` pointing to `update_field` and no file is written

#### Scenario: Defensive apply rejection is persisted
- GIVEN a hand-written sealed changeset whose `add_element` carries inline fields
- WHEN `apply_change` runs
- THEN the changeset is recorded `rejected` with `INVALID_OPERATION`
- AND no model is written

#### Scenario: Matrix seed
- GIVEN an `add_matrix` with `seed` of two columns and three rows
- WHEN it is applied
- THEN the matrix exists with those headers and empty cells
- AND no cell units were recorded

#### Scenario: Notes stay rationale
- GIVEN an `add_element` with `notes:: reason`
- WHEN it is applied
- THEN the element prose body is empty

### Requirement: No record guards in the changeset model

The changeset model MUST NOT define any behaviour for the persisted lineage record. The tool-owned record guard and the `RECORD_UNVERSIONED` refusal MUST NOT exist.

#### Scenario: No record guard code
- GIVEN the repository after this change
- WHEN searched for `RECORD_UNVERSIONED` in live code and specs
- THEN there are no matches
