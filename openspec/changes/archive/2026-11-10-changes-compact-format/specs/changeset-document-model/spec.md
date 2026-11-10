# changeset-document-model Delta Spec

Compact change log. A bulk import writes one change per element instead of one per field, and the seal states what it actually guarantees. Measured on a real domaiNN with an 814-row import: 11,259 changes (6.7 MB) become about 1,860 changes (about 1.05 MB) together with the execution-fact inheritance of `change-provenance`.

## ADDED Requirements

### Requirement: `set_fields` sets several fields of one element from one evidence

`set_fields` MUST be a member of the closed `op` set, and it MUST set several fields of one element in one change whose single `evidence` is the provenance of every field it sets.
`target` is the element address `model@element` and carries no `&field` part. `to` is a JSON object whose keys are field names and whose values are the serialized field values, in the same serialized form `update_field` writes. `from` is optional and, when present, is a JSON object holding the expected current value of a subset of the keys of `to`; a key absent from `from` carries no precondition, exactly like an `update_field` without `from`.
The change is all or nothing: when any precondition of `from` fails, or `base_hash` fails, the whole change is a conflict and no field of it is written.
`to` and `from` are sealed as written (they are the existing `to` and `from` keys of `PROPOSAL_KEYS`).
An empty `to` object, a `to` that is not a JSON object, a repeated key, or a `from` key that is not a key of `to` MUST be rejected with `INVALID_OPERATION` at proposal and, defensively, by the apply engine.
The key `description` MUST be rejected with `USE_UPDATE_ELEMENT_TEXT`, as `update_field` on `description` already is.
`update_field` stays for a single field or for fields whose evidence differs.

#### Scenario: One change sets every field of an imported row
- GIVEN an element `m@alerta` and a `set_fields` change with `to:: {"topics":"ai, news, travel","language":"es"}` and `evidence:: sources/import/r.csv@12`
- WHEN the changeset is applied
- THEN the element carries `topics:: ai, news, travel` and `language:: es`
- AND the origin of `m@alerta&topics` and of `m@alerta&language` is `sources/import/r.csv@12`

#### Scenario: A failed precondition writes nothing
- GIVEN an element whose `language` is `en` and a `set_fields` change with `from:: {"language":"es"}` and `to:: {"language":"fr","topics":"ai"}`
- WHEN the changeset is applied
- THEN the change is a conflict
- AND neither `language` nor `topics` changed

#### Scenario: Malformed payloads are rejected
- GIVEN `set_fields` changes with `to:: {}`, with `to:: ["a"]`, with a `from` key absent from `to`, and with the key `description`
- WHEN `propose_changeset` validates each
- THEN the first three are rejected with `INVALID_OPERATION` and the last with `USE_UPDATE_ELEMENT_TEXT`
- AND no file is written

#### Scenario: The payload is sealed
- GIVEN a sealed `set_fields` change
- WHEN one value inside its `to` object is edited after sealing
- THEN `verifyProposalSha` returns `false`

## MODIFIED Requirements

### Requirement: `add_element` carries no inline fields

`add_element` MUST create an element with its concept and name (and optional explicit `slug`) only. A change MUST NOT carry inline field values: the `fields` key does not exist in the `Change` concept. Each field MUST be set afterwards by an `update_field` change or by a `set_fields` change, each with its own `evidence`; because the field does not yet exist, such a change carries no `from`. A change carrying inline fields MUST be rejected loudly with `INVALID_OPERATION` (the message pointing to `set_fields` and `update_field`) at proposal and, defensively, by the apply engine as a defect of the proposal. For `add_matrix`, the header elements MUST be supplied by a separate `seed` property, `seed: {columns, rows}`, that exists only on `add_matrix`; `seed` is sealed (a member of `PROPOSAL_KEYS`) and creates empty cells. Emitters (the convergence planner, importers, and the console review, ui-kit and export) MUST follow these shapes: `add_element` followed by one `set_fields` for the fields that share one evidence, and one `update_field` for each field whose evidence differs, all with no `from`. The execution-fact keys (`resolved_slug`, `resolved_target`, `evidence_sha256`) are defined by one exported `EXECUTION_FACT_KEYS` list shared by the serializer and the normative-line comparison, and excluded from `PROPOSAL_KEYS`. `add_element` MUST NOT copy `notes` into the prose body.
(Previously: each field was set by its own `update_field`, so an imported row of N fields cost N+1 changes.)

#### Scenario: Field-less add_element then set_fields
- GIVEN an `add_element` for concept `Goal` named `Grow` and a `set_fields` on `m@grow` with `to:: {"owner":"Ana","horizon":"2027"}`, no `from`, and `evidence:: [A]`
- WHEN the changeset is applied
- THEN the element exists with `owner:: Ana` and `horizon:: 2027`
- AND the origin of `owner` and of `horizon` is `[A]`

#### Scenario: An importer emits one change per row
- GIVEN a CSV of 3 rows and 5 columns imported into an empty model
- WHEN the importer writes its changeset
- THEN the changeset holds 3 `add_element` and 3 `set_fields` changes and no `update_field`

#### Scenario: Inline fields are rejected
- GIVEN an `add_element` change that carries `fields`
- WHEN `propose_changeset` validates it
- THEN it is rejected with `INVALID_OPERATION` pointing to `set_fields` and `update_field` and no file is written

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

### Requirement: Cryptographic Proposal Sealing (`proposal_sha`)

Changeset proposals MUST be sealed via a SHA-256 hash stored in the frontmatter `proposal_sha` property. The `computeProposalSha` function MUST compute the hash deterministically across canonical representations of all proposed change elements (`id`, `op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `seed`, `author`, `notes`, `base_hash`, `evidence`, `blueprint_name`, `blueprint_url`, `knowledge_version`).
The computation MUST exclude execution and resolution annotations (`status`, `resolution`, `resolved_slug`, `resolved_target`, `evidence_sha256`, and frontmatter execution fields `applied_at`, `batch`, `models`, `resolution`, `evidence_sha256`). The serialized `evidence` string (including the bracketed list form) is the sealed value.
Before applying a changeset, the apply engine MUST call `verifyProposalSha`. If the computed hash does not match `proposal_sha`, the transaction MUST abort immediately with a `PROPOSAL_TAMPERED` error.
The seal is an integrity check against accidental modification of the proposal between proposal and apply. It is not an authentication: it carries no key, anyone able to edit the file can recompute it, and it does not cover the execution facts that order the change log. The `changes` bluepriNNt and every document that describes the seal MUST describe it as an integrity check and MUST NOT describe it as tamper-proof or as protection against a deliberate edit.
(Previously: the requirement and the bluepriNNt objectives called the seal cryptographic protection that detects tampering.)

#### Scenario: Sealing a proposed changeset generates deterministic hash
- GIVEN a list of proposed change items
- WHEN `computeProposalSha` is executed
- THEN it returns a 64-character lowercase hex string
- AND repeated calls on identical proposed content return the exact same hash

#### Scenario: Resolution fields do not alter proposal hash
- GIVEN a sealed changeset document
- WHEN execution annotations (`status:: applied`, `resolution:: ...`, `resolved_slug:: ...`, `resolved_target:: ...`, `evidence_sha256:: ...`) are added to individual change elements, or `applied_at`, `batch` and `evidence_sha256` are added to the frontmatter
- THEN `verifyProposalSha` continues to return `true`

#### Scenario: Modified proposal content fails verification
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

#### Scenario: The bluepriNNt states the guarantee it gives
- GIVEN the published `changes` bluepriNNt
- WHEN its Philosophy and Objectives are read
- THEN the seal is described as an integrity check against accidental modification
- AND the words "tamper-proof" and "detect tampering" do not describe it
