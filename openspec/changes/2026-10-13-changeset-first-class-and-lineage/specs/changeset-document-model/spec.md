# Delta for changeset-document-model

## MODIFIED Requirements

### Requirement: Normative Level-2 `changes` BluepriNNt and Naming Contract

The workspace MUST provide a normative Level-2 bluepriNNt definition for `changes` at
`iNNfo/specs/bluepriNNts/changes/spec_NN.md`, registered in `CANONICAL_BLUEPRINTS` with
embedded schema content. Changeset documents MUST reside in the `changes/` directory at
the domain root and follow the file naming convention
`<workspace_id>_<author>_<stamp>_changes_NN.md`, conforming to `NN_NAME_INVARIANT` and
UTC timestamp formatting (`YYYYMMDDTHHMMSSZ`).

A changeset document MUST be a valid iNNfo **Level-3** document. Its frontmatter MUST
conform to:

- `spec_version`: semantic version string (e.g., `"V_0-4-0"`)
- `level`: the integer `3`
- `type`: `"changeset"`
- `parent_spec`: an object `{ name: "changes", url: <changes blueprint URL> }`
- `blueprint_version`: parent blueprint version (e.g., `"V_0-2-0"`)
- `changeset_id`: OPTIONAL stable identifier; defaults to the file stem when absent
- `status`: one of `"proposed"`, `"applied"`, `"rejected"`, `"conflict"`
- `proposal_sha`: 64-character lowercase hex SHA-256 hash sealing proposed content
- `applied_at`: optional ISO 8601 timestamp string populated upon application
- `models`: map of affected model slugs to `{ base_version, result_version }` records

The `changes` blueprint's Level-3 template MUST emit this same frontmatter so that a
document created from it validates.

#### Scenario: Valid changeset document is a valid L3 document
- GIVEN a changeset file at `changes/ws1_agent_20261007T120000Z_changes_NN.md` with the L3 frontmatter
- WHEN `validate_knowledge` runs on it
- THEN it returns `valid: true`
- AND `level` is `3` and `parent_spec.name` is `"changes"`

#### Scenario: Template produces a valid document
- GIVEN the Level-3 Changeset Template in the `changes` blueprint
- WHEN a document is created from it and validated
- THEN the validator reports no `fm-level` or `fm-parent` error

## ADDED Requirements

### Requirement: Change lineage citation field

The `Change` concept MUST declare a `sources` field typed `citation`. A change MAY cite
the evidence it derives from, using the single citation grammar
(`<path>@## <Heading>`, `<csv>@<row>`, `<json>@/<pointer>`). A change with no evidence
(a review comment) MAY omit it. A `changes/` path MUST be a valid citation target,
resolved relative to the domain root without requiring the target to live under
`sources/`.

#### Scenario: An evidence-bearing change cites its source
- GIVEN a change `fb-001` with `sources:: sources/import/interview.md@## Needs`
- WHEN the changeset is parsed and its citations resolved
- THEN the change carries a resolved citation to that heading

#### Scenario: A bare comment change omits the field
- GIVEN a change with `op:: comment` and no `sources::`
- WHEN it is parsed
- THEN it validates with no citation and no error
