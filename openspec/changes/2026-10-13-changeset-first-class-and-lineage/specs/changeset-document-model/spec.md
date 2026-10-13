# Delta for changeset-document-model

## MODIFIED Requirements

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

### Requirement: Cryptographic Proposal Sealing (`proposal_sha`)

Changeset proposals MUST be cryptographically sealed via a SHA-256 hash stored in the frontmatter `proposal_sha` property. The `computeProposalSha` function MUST compute the hash deterministically across canonical representations of all proposed change elements (`id`, `op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `fields`, `author`, `notes`, `base_hash`, `sources`).
The computation MUST exclude execution and resolution annotations (`status`, `resolution`, `resolved_slug`, `replaced_sources`, and frontmatter execution fields `applied_at`, `models`).
Before applying a changeset, the apply engine MUST call `verifyProposalSha`. If the computed hash does not match `proposal_sha`, the transaction MUST abort immediately with a `PROPOSAL_TAMPERED` error. (Previously: the listed keys omitted `base_hash`, which the code already sealed, and `sources`, which nothing parsed or sealed.)

#### Scenario: Sealing a proposed changeset generates deterministic hash
- GIVEN a list of proposed change items
- WHEN `computeProposalSha` is executed
- THEN it returns a 64-character lowercase hex string
- AND repeated calls on identical proposed content return the exact same hash

#### Scenario: Resolution fields do not alter proposal hash
- GIVEN a sealed changeset document
- WHEN execution annotations (`status:: applied`, `resolution:: ...`, `resolved_slug:: ...`, `replaced_sources:: ...`) are added to individual change elements
- THEN `verifyProposalSha` continues to return `true`

#### Scenario: Tampered proposal content fails verification
- GIVEN a sealed changeset document where a change's `to::` field or `target::` field is modified after sealing
- WHEN `verifyProposalSha` is invoked
- THEN it returns `false`
- AND execution aborts with a `PROPOSAL_TAMPERED` error

#### Scenario: The evidence citation is sealed
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

## ADDED Requirements

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
