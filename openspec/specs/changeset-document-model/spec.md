# Changeset Document Model Specification

## Purpose

Establish a normative Level-2 blueprint and document model for changesets (`changes`) in cogNNitive. Changesets are structured mutation manifests stored under `changes/` at the domain root, cryptographically sealed with a proposal hash (`proposal_sha`), categorized under the `'changeset'` role (excluded from semantic model discovery), and supporting structured operations for model evolution and review feedback.

## Requirements

### Requirement: Normative Level-2 `changes` BluepriNNt and Naming Contract

The workspace MUST provide a normative Level-2 bluepriNNt definition for `changes` at `iNNfo/specs/bluepriNNts/changes/spec_NN.md`, registered in `CANONICAL_BLUEPRINTS` with embedded schema content. Changeset documents MUST reside in the `changes/` directory at the domain root and follow the file naming convention `<workspace_id>_<author>_<stamp>_changes_NN.md`, conforming to `NN_NAME_INVARIANT` and UTC timestamp formatting (`YYYYMMDDTHHMMSSZ`).

The document frontmatter MUST conform to:
- `spec_version`: semantic version string (e.g., `"V_0-1-0"`)
- `parent_spec`: `"changes"`
- `blueprint_version`: parent blueprint version (e.g., `"0.4.0"`)
- `status`: one of `"proposed"`, `"applied"`, `"rejected"`, `"conflict"`
- `proposal_sha`: 64-character lowercase hex SHA-256 hash sealing proposed content
- `applied_at`: optional ISO 8601 timestamp string populated upon application
- `models`: map of affected model slugs to `{ base_version: string, result_version: string }` records

#### Scenario: Valid changeset document header conforms to schema
- GIVEN a changeset file at `changes/ws1_agent_20261007T120000Z_changes_NN.md`
- WHEN the file is parsed by the changeset parser
- THEN `parent_spec` is `"changes"`
- AND `status` is recognized as `"proposed"`
- AND `proposal_sha` is extracted as a 64-character hex string

#### Scenario: Canonical blueprint resolution offline
- GIVEN a changeset document with `parent_spec: "changes"`
- WHEN blueprint resolution executes without filesystem access
- THEN the canonical blueprint registry provides the embedded `changes` blueprint schema

---

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
1. `update_field`: Mutates a field on an existing element, concept, or matrix. Requires `target` (canonical D5 address: `<model_slug>@<element_slug>&<field_name>`), optional `from` (precondition value), and `to` (new value).
2. `add_element`: Adds a new element to a concept in a model. Requires `target` (`<model_slug>`), `concept`, `name`, optional `slug`, optional `fields`, and optional `sources`.
3. `rename_element`: Renames an element's display name while preserving its slug. Requires `target` (`<model_slug>@<element_slug>`), `name` (new display name).
4. `rename_concept`: Renames a concept's display name. Requires `target` (`<model_slug>@<concept_slug>`), `name` (new concept name).
5. `update_matrix_cell`: Updates or inserts a cell in a matrix. Requires `target` (`<model_slug>@<matrix_slug>&<row_slug>&<col_slug>` or explicit matrix parameters), and `to` (cell value).
6. `comment`: Represents review feedback or discussion annotations (per D15). Requires `target`, `author`, `notes`. MUST NOT require `to` or `from` value.

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

---

### Requirement: Cryptographic Proposal Sealing (`proposal_sha`)

Changeset proposals MUST be cryptographically sealed via a SHA-256 hash stored in the frontmatter `proposal_sha` property. The `computeProposalSha` function MUST compute the hash deterministically across canonical representations of all proposed change elements (`id`, `op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `fields`, `author`, `notes`).
The computation MUST exclude execution and resolution annotations (`status`, `resolution`, `resolved_slug`, and frontmatter execution fields `applied_at`, `models`).
Before applying a changeset, the apply engine MUST call `verifyProposalSha`. If the computed hash does not match `proposal_sha`, the transaction MUST abort immediately with a `PROPOSAL_TAMPERED` error.

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

---

### Requirement: Changeset Serialization and Resolution Annotation

The changeset serializer (`serializeChangeset`) MUST serialize `ChangesetDocument` instances back to Markdown format conforming to the `changes` blueprint. The serializer MUST append or update execution annotations on each change element (`status::`, `resolution::`, and `resolved_slug::`) while maintaining document formatting, headings, and unannotated fields.

#### Scenario: Serializing applied change annotations
- GIVEN an applied change item with `status: "applied"`, `resolution: "Applied to strategy model"`, and `resolved_slug: "customer-vision"`
- WHEN the changeset is serialized to Markdown
- THEN the change block includes `status:: applied`, `resolution:: Applied to strategy model`, and `resolved_slug:: customer-vision`
- AND the frontmatter includes `status: applied` and the populated `models` version transition map
