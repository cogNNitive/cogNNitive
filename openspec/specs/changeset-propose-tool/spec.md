# changeset-propose-tool Specification

## Purpose
TBD - created by archiving change 2026-10-13-s6-console-regeneration-and-propose. Update Purpose after archive.
## Requirements
### Requirement: `propose_changeset` writes a sealed proposed changeset

The MCP MUST expose `propose_changeset` taking a structured `operations` list (each item
using the changeset keys of the `changes` bluepriNNt), `title`, `author` (default
`agent`), `domain`/`root` and `open` (default `true`). The MCP MUST NOT interpret
conversations: the agent derives the operations. The tool MUST assign ids `c-01`,
`c-02`, ... in order, write `changes/<workspace_id>_<author>_<UTC stamp>_changes_NN.md`
with the Level-3 changeset frontmatter, `status: proposed` and
`proposal_sha = computeProposalSha(changes)`, and MUST NOT apply it. `workspace_id` is
the manifest `workspace_id`, or the slug of the domain folder name when the manifest
declares none. After writing, the tool MUST regenerate and open the domain console and
return `{ changeset, console, next_steps }` per `console-regeneration`.

#### Scenario: Proposal is written sealed and not applied
- GIVEN a domain with model `strategy` and one `update_field` operation from the agent
- WHEN `propose_changeset` runs with `open: false`
- THEN a `changes/*_changes_NN.md` file exists with `status: proposed`
- AND `verifyProposalSha` on it returns `true`
- AND `strategy_NN.md` is byte-identical to before

#### Scenario: Result points at both files
- GIVEN a successful proposal
- WHEN the result is read
- THEN `changeset` is the workspace-relative changeset path
- AND `console.path` is the domain console path
- AND `next_steps.approve.changeset` equals `changeset`

#### Scenario: The proposal applies unchanged
- GIVEN a proposal written by `propose_changeset`
- WHEN `apply_change` runs on it
- THEN it is not rejected with `PROPOSAL_TAMPERED`

### Requirement: Proposal validation before write

`propose_changeset` MUST validate before writing anything and MUST write nothing when
validation fails, returning the errors. It MUST check that: every `op` is a known
`ChangeOp` carrying the keys that op requires; every non-`add_model` target names an
existing model or one created by an earlier `add_model` in the same proposal; every
`add_model` target does not exist and is created only once; the serialized document
parses back to the same changes with a matching seal; and the document validates as a
Level-3 `changes` document. Concept conformance of `add_element` is enforced at apply
time, not by this tool.

#### Scenario: Unknown model rejected
- GIVEN an `update_field` operation targeting `ghost@vision&statement` and no model `ghost`
- WHEN `propose_changeset` runs
- THEN it returns an error naming `ghost`
- AND no file is written under `changes/`

#### Scenario: Target created earlier in the proposal is accepted
- GIVEN operations `add_model` for `acme` followed by `add_element` targeting `acme`
- WHEN `propose_changeset` runs
- THEN the proposal is written

#### Scenario: Existing model cannot be added
- GIVEN an `add_model` operation for the existing model `strategy`
- WHEN `propose_changeset` runs
- THEN it returns a `MODEL_EXISTS` error and writes nothing

### Requirement: Single proposed-changeset writer

Every code path that writes a proposed changeset MUST use one writer
(`writeProposedChangeset`): `propose_changeset`, the `init_knowledge` wrapper and the
single-op synthesis used by `apply_change` for bare intent calls. The written frontmatter
MUST be the Level-3 changeset frontmatter in every case.

#### Scenario: Bare intent call uses the shared writer
- GIVEN `apply_change` called with `id`, `op: update_field` and `args`
- WHEN the synthesized changeset is written
- THEN its frontmatter has `level: 3` and `parent_spec.name: changes`
- AND it is sealed by the same writer used by `propose_changeset`

### Requirement: Model-level maintenance operations in a proposal

`propose_changeset` MUST accept `freeze_slugs` and `bump_version` operations. Both target a bare model id (no `@` or `&`). `bump_version` MUST carry `to` set to `patch`, `minor` or `major`; any other value MUST be reported as an `INVALID_OPERATION` error and nothing is written. The `sources` key of an operation is a single citation string, never an array.

#### Scenario: Valid maintenance proposal
- GIVEN operations `bump_version` (`to:: minor`) and `freeze_slugs` targeting an existing model
- WHEN `propose_changeset` runs
- THEN a sealed changeset is written

#### Scenario: Bad bump level
- GIVEN a `bump_version` operation with `to:: huge`
- WHEN `propose_changeset` runs
- THEN it returns an error and writes nothing
