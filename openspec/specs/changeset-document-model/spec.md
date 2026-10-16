# Changeset Document Model Specification

## Purpose

Establish a normative Level-2 blueprint and document model for changesets (`changes`) in cogNNitive. Changesets are structured mutation manifests stored under `changes/` at the domain root, cryptographically sealed with a proposal hash (`proposal_sha`), categorized under the `'changeset'` role (excluded from semantic model discovery), and supporting structured operations for model evolution and review feedback.
## Requirements
### Requirement: Normative Level-2 `changes` BluepriNNt and Naming Contract

The workspace MUST provide a normative Level-2 bluepriNNt definition for `changes` at `iNNfo/specs/bluepriNNts/changes/spec_NN.md`, registered in `CANONICAL_BLUEPRINTS` with embedded schema content. Changeset documents MUST reside in the `changes/` directory at the domain root and follow the file naming convention `<workspace_id>_<author>_<stamp>_changes_NN.md`, conforming to `NN_NAME_INVARIANT` and UTC timestamp formatting (`YYYYMMDDTHHMMSSZ`).

A changeset document MUST be a valid iNNfo Level-3 document. Its frontmatter MUST conform to:
- `spec_version`: semantic version string (e.g., `"V_0-4-0"`)
- `level`: the integer `3`
- `parent_spec`: an object `{ name: "changes", url: <changes bluepriNNt URL> }`
- `blueprint_version`: the `changes` bluepriNNt version the document was written against
- `status`: one of `"proposed"`, `"applied"`, `"partially_applied"`, `"rejected"`, `"conflict"`
- `proposal_sha`: 64-character lowercase hex SHA-256 hash sealing proposed content; absent only on an unsealed proposal, which the apply engine seals at intake
- `applied_at`: optional ISO 8601 timestamp string populated upon application
- `models`: map of affected model slugs to `{ base_version: string, result_version: string }` records

The `changes` bluepriNNt's Level-3 template MUST emit this frontmatter, so a document created from it validates. `parseChangeset` MUST NOT substitute any default frontmatter: a file without a frontmatter block, or whose `level`, `parent_spec.name`, `parent_spec.url`, `spec_version`, `blueprint_version` or `status` is missing or wrong, MUST be rejected with `CHANGESET_FRONTMATTER_INVALID` naming the offending key. Every writer of a changeset file (the apply engine, `synthesizeAndExecuteChangeset`, the console export) MUST emit this frontmatter. (Previously: `parent_spec` was the scalar `"changes"`, `level` was absent, the validator rejected every changeset, and the parser silently defaulted a missing frontmatter.)

#### Scenario: A changeset is a valid L3 document
- GIVEN a changeset file at `changes/ws1_agent_20261007T120000Z_changes_NN.md` with the L3 frontmatter
- WHEN `validate_knowledge` runs on it
- THEN it returns `valid: true`
- AND `level` is `3` and `parent_spec.name` is `"changes"`

#### Scenario: Template produces a valid document
- GIVEN the Level-3 changeset template of the `changes` bluepriNNt
- WHEN a document is created from it and validated
- THEN the validator reports no `fm-level` or `fm-parent` error

#### Scenario: Missing frontmatter is rejected, not defaulted
- GIVEN a changeset file whose frontmatter has `parent_spec: "changes"` and no `level`
- WHEN `parseChangeset` runs
- THEN it throws `CHANGESET_FRONTMATTER_INVALID` naming `level`
- AND no default frontmatter is produced

#### Scenario: Canonical blueprint resolution offline
- GIVEN a changeset document with `parent_spec.name: "changes"`
- WHEN blueprint resolution executes without filesystem access
- THEN the canonical blueprint registry provides the embedded `changes` blueprint schema

### Requirement: Role Classification and Model Discovery Exclusion

Changeset documents MUST be classified with role `'changeset'` by `roleOf` in `innfo-core/src/naming/contract.ts`. The `Role` type union MUST include `'changeset'`, and `NON_KNOWLEDGE_BLUEPRINT_RE` MUST match `changes`. Changeset documents MUST NOT be classified as semantic knowledge models: `isModelCandidate` MUST return `false` for any document whose role is `'changeset'` or whose `parent_spec` is `'changes'`. Workspace discovery and model cataloging tools MUST exclude files in `changes/` from semantic graph nodes.

#### Scenario: Changeset classified as changeset role
- GIVEN a file `changes/ws_agent_20261007T140000Z_changes_NN.md` with `parent_spec: "changes"`
- WHEN `roleOf` evaluates the file
- THEN the returned role is `'changeset'`

#### Scenario: Changeset excluded from model discovery
- GIVEN a workspace containing knowledge models in `kNNowledge/` and changesets in `changes/`
- WHEN `isModelCandidate` evaluates a changeset file
- THEN it returns `false`
- AND model discovery functions (`findKnowledgeFiles`, workspace indexing) omit the changeset from candidate model lists

---

### Requirement: Changeset Mutation and Comment Operations

Each change in a changeset document MUST be represented as an element heading `## NN Change: <id>` conforming to the `changes` blueprint concept `Change`. Each change MUST specify an `op` property conforming to one of the following operations:
1. `update_field`: Mutates a field on an existing element, concept, or matrix. Requires `target` (canonical D5 address: `<knowledge_slug>@<element_slug>&<field_name>`), optional `from` (precondition value), and `to` (new value).
2. `add_element`: Adds a new element to a concept in a model. Requires `target` (`<knowledge_slug>`), `concept`, `name`, optional `slug`, optional `fields`, and optional `sources`.
3. `rename_element`: Renames an element's display name while preserving its slug. Requires `target` (`<knowledge_slug>@<element_slug>`), `name` (new display name).
4. `rename_concept`: Renames a concept's display name. Requires `target` (`<knowledge_slug>@<concept_slug>`), `name` (new concept name).
5. `update_matrix_cell`: Updates or inserts a cell in a matrix. Requires `target` (`<knowledge_slug>@<matrix_slug>&<row_slug>&<col_slug>` or explicit matrix parameters), and `to` (cell value).
6. `comment`: Represents review feedback or discussion annotations (per D15). Requires `target`, `author`, `notes`. MUST NOT require `to` or `from` value.
7. `remove_element`: Removes an element and applies the delete impact and cascades of `delete-impact-and-lifecycle`. Requires `target` (`<knowledge_slug>@<element_slug>`) and optional `base_hash`.
8. `add_model`: Creates a new Level-3 kNNowledge document. Requires `target` (the new model id, a safe relative id without `@`), `blueprint_name` and `blueprint_url`; optional `name` (title, defaults to the id), optional `knowledge_version`, optional `sources` (e.g. citing an imported old domain), `author` and `notes`. It MUST NOT carry `from`, `to`, `base_hash` or element payload; initial elements are expressed as subsequent `add_element` changes targeting the new id in the same changeset.

The `changes` bluepriNNt MUST list `add_model` in the `op` options and declare the `blueprint_name`, `blueprint_url` and `knowledge_version` Change fields, with its `blueprint_version` bumped and the embedded canonical copy kept identical. Every op MAY carry the `sources` evidence citation (#1A). (Previously: six operations were listed, `remove_element` — already implemented and exported by the console — was missing, and there was no way to create a model.)

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
Before applying a changeset, the apply engine MUST call `verifyProposalSha`. If the computed hash does not match `proposal_sha`, the transaction MUST abort immediately with a `PROPOSAL_TAMPERED` error. The computation MUST also exclude `replaced_sources`. (Previously, after #1A: the sealed keys ended at `sources`; the `add_model` keys did not exist.)

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

### Requirement: Changeset Serialization and Resolution Annotation

The changeset serializer (`serializeChangeset`) MUST serialize `ChangesetDocument` instances to Markdown conforming to the `changes` blueprint. When the document carries the `rawContent` it was parsed from, the serializer MUST copy every byte of it verbatim except (a) the frontmatter execution keys `status`, `applied_at` and `models`, replaced in place, and (b) the execution annotation lines of each change block — exactly `status::`, `resolution::`, `resolved_slug::` and `replaced_sources::` — replaced in place or appended after the block's last normative line. Normative lines, blank lines, line endings, the document notice and unrecognized lines MUST NOT be re-rendered. A document built in memory (no `rawContent`) MUST be rendered structurally, including `sources::`. (Previously: the serializer always re-rendered the whole file from the parsed object, dropping any line the parser ignored.)

#### Scenario: Serializing applied change annotations
- GIVEN an applied change item with `status: "applied"`, `resolution: "Applied to strategy model"`, and `resolved_slug: "customer-vision"`
- WHEN the changeset is serialized to Markdown
- THEN the change block includes `status:: applied`, `resolution:: Applied to strategy model`, and `resolved_slug:: customer-vision`
- AND the frontmatter includes `status: applied` and the populated `models` version transition map

#### Scenario: Normative bytes survive a write-back
- GIVEN a parsed changeset with CRLF line endings, a quoted `to::` value and a `sources::` line
- WHEN execution annotations are set and the document is serialized
- THEN the output differs from the input only in the frontmatter execution keys and the annotation lines

### Requirement: Change evidence citation field

The `Change` concept of the `changes` bluepriNNt MUST declare an optional `sources` field typed `citation`. `ChangeItem` MUST carry it as `sources`, the parser MUST read `sources::` and the serializer MUST write it. A change MAY cite the evidence it derives from using the single citation grammar (`<path>@## <Heading>`, `<csv>@<row>`, `<json>@/<pointer>`, or a bare path); a change with no evidence (a review comment) omits it. The citation is written by the proposer when the changeset is proposed and is part of the sealed proposal; no tool MAY add, remove or rewrite it after sealing.

#### Scenario: An evidence-bearing change cites its source
- GIVEN a change `c-01` with `sources:: sources/import/interview.md@## Needs`
- WHEN the changeset is parsed and serialized again
- THEN `c-01.sources` is `sources/import/interview.md@## Needs`
- AND the `sources::` line is byte-identical in the output

#### Scenario: A bare comment change omits the field
- GIVEN a change with `op:: comment` and no `sources::`
- WHEN it is parsed and validated
- THEN it validates with no citation and no error

### Requirement: Changesets are the only change record

Changeset documents under `changes/` MUST be the only record of a change to model or domain data. No tool MAY write or read a parallel change record: no verdict ledger, no `## NN Agent Modification` block, no `.cogNNitive/change-log.jsonl` or other JSON change log, and no reviewer JSON export. Who changed what, why and from which evidence MUST be read from changeset changes (`author`, `notes`, `sources`) and their execution annotations.

#### Scenario: No parallel record is written
- GIVEN a domain where a changeset was proposed and applied
- WHEN the domain is listed
- THEN the only new change record is the changeset under `changes/`
- AND no ledger, change-log or Agent Modification block was written

#### Scenario: No parallel record exists in the code
- GIVEN the repository after this change
- WHEN searched outside write-once files and archived changes
- THEN no writer or reader of a verdict ledger, change-log library or Agent Modification block exists

