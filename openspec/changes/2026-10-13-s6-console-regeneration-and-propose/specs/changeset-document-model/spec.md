# Delta for changeset-document-model

## MODIFIED Requirements

### Requirement: Changeset Mutation and Comment Operations

Each change in a changeset document MUST be represented as an element heading `## NN Change: <id>` conforming to the `changes` blueprint concept `Change`. Each change MUST specify an `op` property conforming to one of the following operations:
1. `update_field`: Mutates a field on an existing element, concept, or matrix. Requires `target` (canonical D5 address: `<model_slug>@<element_slug>&<field_name>`), optional `from` (precondition value), and `to` (new value).
2. `add_element`: Adds a new element to a concept in a model. Requires `target` (`<model_slug>`), `concept`, `name`, optional `slug`, optional `fields`, and optional `sources`.
3. `rename_element`: Renames an element's display name while preserving its slug. Requires `target` (`<model_slug>@<element_slug>`), `name` (new display name).
4. `rename_concept`: Renames a concept's display name. Requires `target` (`<model_slug>@<concept_slug>`), `name` (new concept name).
5. `update_matrix_cell`: Updates or inserts a cell in a matrix. Requires `target` (`<model_slug>@<matrix_slug>&<row_slug>&<col_slug>` or explicit matrix parameters), and `to` (cell value).
6. `comment`: Represents review feedback or discussion annotations (per D15). Requires `target`, `author`, `notes`. MUST NOT require `to` or `from` value.
7. `add_model`: Creates a new Level-3 kNNowledge document. Requires `target` (the new model id, a safe relative id without `@`), `blueprint_name` and `blueprint_url`; optional `name` (title, defaults to the id), optional `knowledge_version`, optional `sources` (e.g. citing an imported old domain), `author` and `notes`. It MUST NOT carry `from`, `to`, `base_hash` or element payload; initial elements are expressed as subsequent `add_element` changes targeting the new id in the same changeset.

The `changes` bluepriNNt MUST list `add_model` in the `op` options and declare the `blueprint_name`, `blueprint_url` and `knowledge_version` Change fields, with its `blueprint_version` bumped and the embedded canonical copy kept identical. (Previously: six operations; no way to create a model.)

#### Scenario: Parsing an update_field operation
- GIVEN a change item with `op:: update_field`, `target:: strategy@vision&statement`, `from:: Old statement`, `to:: New statement`
- WHEN parsed into a `ChangeItem`
- THEN `op` is `'update_field'`
- AND `target` is parsed into model `'strategy'`, element `'vision'`, and field `'statement'`
- AND `from` and `to` values are preserved

#### Scenario: Parsing a comment operation per D15
- GIVEN a change item with `op:: comment`, `target:: strategy@vision`, `author:: reviewer-1`, `notes:: Vision statement needs customer focus`
- WHEN parsed into a `ChangeItem`
- THEN `op` is `'comment'`
- AND `author` and `notes` are captured without requiring `to` or `from`

#### Scenario: Parsing an update_matrix_cell operation
- GIVEN a change item with `op:: update_matrix_cell`, `target:: strategy@swot-matrix&strength-1&opportunity-1`, `to:: High synergy`
- WHEN parsed into a `ChangeItem`
- THEN `op` is `'update_matrix_cell'`
- AND target matrix slug, row slug, column slug, and `to` value are captured

#### Scenario: Parsing an add_model operation
- GIVEN a change item with `op:: add_model`, `target:: acme_strategy`, `blueprint_name:: business`, `blueprint_url:: <url>`, `name:: ACME Strategy`
- WHEN parsed into a `ChangeItem` and serialized again
- THEN `op` is `add_model` and `blueprint_name`, `blueprint_url` and `name` are preserved byte-for-byte

#### Scenario: add_model with a from value is invalid
- GIVEN an `add_model` change carrying `from:: x`
- WHEN the changeset is validated
- THEN it is rejected naming the change id

### Requirement: Cryptographic Proposal Sealing (`proposal_sha`)

Changeset proposals MUST be cryptographically sealed via a SHA-256 hash stored in the frontmatter `proposal_sha` property. The `computeProposalSha` function MUST compute the hash deterministically across canonical representations of all proposed change elements (`id`, `op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `fields`, `author`, `notes`, `base_hash`, `sources`, `blueprint_name`, `blueprint_url`, `knowledge_version`).
The computation MUST exclude execution and resolution annotations (`status`, `resolution`, `resolved_slug`, and frontmatter execution fields `applied_at`, `models`).
Before applying a changeset, the apply engine MUST call `verifyProposalSha`. If the computed hash does not match `proposal_sha`, the transaction MUST abort immediately with a `PROPOSAL_TAMPERED` error. (Previously: the listed keys omitted `base_hash`, which the code already sealed, and `sources`, which nothing sealed.)

#### Scenario: Sealing a proposed changeset generates deterministic hash
- GIVEN a list of proposed change items
- WHEN `computeProposalSha` is executed
- THEN it returns a 64-character lowercase hex string
- AND repeated calls on identical proposed content return the exact same hash

#### Scenario: Resolution fields do not alter proposal hash
- GIVEN a sealed changeset document
- WHEN execution annotations (`status:: applied`, `resolution:: ...`, `resolved_slug:: ...`) are added to individual change elements
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

#### Scenario: Citation is sealed
- GIVEN two otherwise identical changes that differ only in `sources`
- WHEN `computeProposalSha` runs on each
- THEN the two hashes differ
