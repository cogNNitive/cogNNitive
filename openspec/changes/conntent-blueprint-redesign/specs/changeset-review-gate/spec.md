# changeset-review-gate Delta Spec

Slice 3, PR 3a (nn-core and nn-mcp). Generic capability: nothing here names coNNtent, scenes, episodes or any other blueprint concept. The coNNtent use of it is specified in `conntent-review-gates`. This capability is the single owner of the `review_gate` schema, its provenance markers and its error codes; `changeset-document-model`, `changeset-apply-engine`, `changeset-propose-tool`, `innfo-console-feedback`, `console-changes-direct-write` and `conntent-domain-console` reference it and do not restate it.

## ADDED Requirements

### Requirement: `review_gate` is a changeset operation with a fixed schema

The closed `op` set of the `changes` bluepriNNt MUST include `review_gate`. A `review_gate` change MUST carry the keys `gate`, `verdict` and `reviewed_hash`, MAY carry `plan_hash`, and MAY carry `notes`. Its `target` MUST be a canonical unit address: either a bare model id (`<model_id>`) or an element (`<model_id>@<element_slug>`). Key rules:

| Key | Rule |
|---|---|
| `gate` | A gate name declared by the bluepriNNt of the target model (see "Gates are declared by the bluepriNNt"). |
| `verdict` | Exactly `approved` or `needs-change`. |
| `reviewed_hash` | Lowercase hex sha256 (64 characters). Opaque to nn-core. Required for both verdicts. |
| `plan_hash` | Optional lowercase hex sha256, opaque to nn-core, stored and sealed as given. |
| `notes` | Free text (the existing change key). Carries the reason for `needs-change`. |

A `review_gate` change MUST NOT require an evidence citation. Any other key, an unknown `verdict`, a hash that is not 64 hex characters, or a missing required key MUST fail validation with a named diagnostic and write nothing.

#### Scenario: Valid verdict change parses

- GIVEN a human console changeset with one change `op:: review_gate`, `target:: acme@scene-1`, `gate:: script`, `verdict:: approved` and a 64-hex `reviewed_hash`
- WHEN the changeset is parsed and validated against the `changes` bluepriNNt
- THEN no diagnostic is reported
- AND serializing the parsed changes yields the same document

#### Scenario: Missing required key

- GIVEN a `review_gate` change without `reviewed_hash`
- WHEN the changeset is validated
- THEN validation fails naming the missing key `reviewed_hash` and the change id

#### Scenario: Bad verdict value

- GIVEN a `review_gate` change with `verdict:: maybe`
- WHEN the changeset is validated
- THEN validation fails naming `verdict` and the allowed values `approved`, `needs-change`

#### Scenario: Malformed hash

- GIVEN a `review_gate` change with `reviewed_hash:: abc123`
- WHEN the changeset is validated
- THEN validation fails naming `reviewed_hash`

#### Scenario: Verdict change on a model target

- GIVEN a `review_gate` change whose `target` is the bare model id `acme`
- WHEN the changeset is validated
- THEN it is valid

#### Scenario: Unknown operation key

- GIVEN a `review_gate` change carrying an undeclared key `status`
- WHEN the changeset is validated
- THEN validation fails naming the key

### Requirement: Human provenance lives in the changeset frontmatter

A changeset MAY carry the frontmatter keys `author_kind` (exactly `human`, `agent` or `engine`), `origin` (a token naming the writer, for example `console`) and `reviewer` (non-empty text naming a person). These markers apply to every change in the file. A changeset containing at least one `review_gate` change MUST carry all three, with `author_kind: human` and `origin: console`. An unknown `author_kind` MUST fail validation naming the key. The markers MUST NOT be per-change keys.

#### Scenario: Verdict changeset without markers

- GIVEN a changeset with a `review_gate` change and no `author_kind`, `origin` or `reviewer` frontmatter
- WHEN it is validated
- THEN validation fails naming the missing frontmatter keys

#### Scenario: Markers on a non-verdict changeset

- GIVEN a changeset with only `update_field` changes and `author_kind: human`, `origin: console`, `reviewer: Ana`
- WHEN it is validated
- THEN it is valid and the markers are readable

#### Scenario: Per-change marker rejected

- GIVEN a `review_gate` change carrying `author_kind:: human` as a change key
- WHEN it is validated
- THEN validation fails naming `author_kind` as an undeclared change key

### Requirement: Gates are declared by the bluepriNNt

nn-core MUST accept a `review_gate` change only when the Level-2 bluepriNNt of the target model declares, in its frontmatter `gates`, a gate with the change's `gate` name and the target unit it accepts (model or element). nn-core MUST NOT hold any built-in gate name. A change naming an undeclared gate, or targeting a unit the declaration does not allow for that gate, MUST be rejected with `GATE_UNDECLARED` or `GATE_TARGET_INVALID` respectively.

#### Scenario: Declared gate accepted

- GIVEN a bluepriNNt declaring a gate `sign-off` and a model of that bluepriNNt
- WHEN a human `review_gate` change with `gate:: sign-off` is applied
- THEN it is applied

#### Scenario: Undeclared gate rejected

- GIVEN a bluepriNNt that declares no gate named `publish`
- WHEN a `review_gate` change with `gate:: publish` is applied
- THEN the changeset is rejected with `GATE_UNDECLARED` and the model is byte-identical

#### Scenario: nn-core holds no blueprint knowledge

- GIVEN the nn-core changeset sources
- WHEN they are searched for `conntent`, `scene`, `preview`, `script` as gate names
- THEN no gate name literal is found

### Requirement: Applying a verdict requires a human console changeset

The apply engine MUST apply a changeset containing `review_gate` changes only when its frontmatter carries `author_kind: human`, `origin: console` and a non-empty `reviewer`. Otherwise the changeset MUST be refused as a whole with `GATE_NOT_HUMAN` (wrong or missing `author_kind` or `origin`) or `GATE_REVIEWER_REQUIRED` (empty or missing `reviewer`), and nothing in it MUST be applied (a forged verdict is a policy failure, not a per-change conflict). The refused changeset MUST be persisted as rejected like any rejected changeset.

#### Scenario: Agent-authored verdict refused

- GIVEN a changeset with `author_kind: agent` holding one `review_gate` change
- WHEN it is applied
- THEN it is refused with `GATE_NOT_HUMAN`
- AND no verdict is recorded as applied

#### Scenario: Engine-authored verdict refused

- GIVEN a changeset with `author_kind: engine` holding a `review_gate` change
- WHEN it is applied
- THEN it is refused with `GATE_NOT_HUMAN`

#### Scenario: Human but not from a console

- GIVEN a changeset with `author_kind: human`, `origin: mcp` and a `review_gate` change
- WHEN it is applied
- THEN it is refused with `GATE_NOT_HUMAN`

#### Scenario: Empty reviewer refused

- GIVEN a human console changeset with `reviewer:` empty holding a `review_gate` change
- WHEN it is applied
- THEN it is refused with `GATE_REVIEWER_REQUIRED`

#### Scenario: Mixed agent changeset refused whole

- GIVEN an agent changeset with an `update_field` change and a `review_gate` change
- WHEN it is applied
- THEN it is refused with `GATE_NOT_HUMAN` and the `update_field` is not applied

#### Scenario: Human verdict applied

- GIVEN a human console changeset with a `review_gate` change and a reviewer
- WHEN it is applied
- THEN its change is annotated applied and the verdict is readable (see "The latest applied verdict is readable")

### Requirement: A verdict-only changeset does not touch the model

A changeset whose changes are all `review_gate` changes (a verdict-only changeset) MUST be applied without writing the target model file, without bumping its `knowledge_version`, and without the `base_hash` precondition. In a changeset that mixes `review_gate` with content changes, the `review_gate` changes MUST NOT count as touching a model for the single version bump. A `review_gate` change MUST NOT mutate any field, element or matrix. Replaying an applied verdict-only changeset MUST change nothing.

#### Scenario: All-good review

- GIVEN a model at `knowledge_version: V_0-1-0` and a human console changeset of three `review_gate` approvals
- WHEN the changeset is applied
- THEN the model file is byte-identical and its version is still `V_0-1-0`
- AND the changeset is recorded as applied under `changes/`

#### Scenario: Stale model hash does not block a verdict

- GIVEN a verdict-only changeset sealed against an older model hash
- WHEN it is applied after the model changed
- THEN it is applied (the staleness of the verdict is judged by `reviewed_hash`, not by `base_hash`)

#### Scenario: Mixed changeset bumps once

- GIVEN a human console changeset with one `update_field` and two `review_gate` changes on the same model
- WHEN it is applied
- THEN the model version is bumped exactly once, by patch

#### Scenario: Replay is idempotent

- GIVEN an applied verdict-only changeset
- WHEN it is applied again
- THEN nothing changes and no second record of the verdict exists

### Requirement: Conflicts on a verdict are per change

A `review_gate` change whose target unit does not exist MUST be partitioned as a conflict by the rules of `changeset-conflicts` (clean subset applied, the change annotated), not as a hard failure. Two `review_gate` changes for the same `(target, gate)` in one changeset MUST be rejected as a whole with `DUPLICATE_GATE_VERDICT`.

#### Scenario: Missing target is a conflict

- GIVEN a changeset with an approved `review_gate` for `acme@deleted-element` and an approved one for an existing element
- WHEN it is applied
- THEN the existing element's verdict is applied
- AND the other change is annotated as a conflict and the status is `partially_applied`

#### Scenario: Duplicate in one changeset

- GIVEN a changeset with two `review_gate` changes for `acme@scene-1` and `gate:: script`
- WHEN it is applied
- THEN it is rejected with `DUPLICATE_GATE_VERDICT` and nothing is applied

### Requirement: Verdict error codes are one closed set

The codes for verdict failures MUST be exactly: `GATE_UNDECLARED`, `GATE_TARGET_INVALID`, `GATE_NOT_HUMAN`, `GATE_REVIEWER_REQUIRED`, `DUPLICATE_GATE_VERDICT` (apply engine) and `GATE_VERDICT_REFUSED` (agent-facing tools, see `changeset-propose-tool` and `changeset-apply-engine`). No other spelling of these failures MAY exist in nn-core, nn-mcp or the console runtime.

#### Scenario: Codes are returned as named

- GIVEN a changeset that fails each rule in turn
- WHEN it is applied or proposed
- THEN the returned error code equals the one named for that rule

### Requirement: The latest applied verdict is readable

nn-core MUST expose a read function that, given a model id, a target and a gate, returns the latest applied `review_gate` change for that triple with its `verdict`, `reviewed_hash`, `plan_hash`, `notes`, the frontmatter `reviewer`, `author_kind` and `origin`, and the id and applied time of its changeset, or nothing when none exists. "Latest" MUST be decided by applied order, so a later applied verdict supersedes an earlier one for the same triple. A rejected or proposed changeset MUST NOT be returned. nn-core MUST NOT compare `reviewed_hash` or `plan_hash` with anything; the caller owns hash comparison.

#### Scenario: Later verdict supersedes

- GIVEN an applied `needs-change` and a later applied `approved` for the same `(acme@scene-1, script)`
- WHEN the latest verdict is read
- THEN it is the `approved` one

#### Scenario: Proposed changeset is invisible

- GIVEN a proposed (not applied) human console changeset with an `approved` verdict
- WHEN the latest verdict is read
- THEN nothing is returned

#### Scenario: Rejected changeset is invisible

- GIVEN a changeset refused with `GATE_NOT_HUMAN`
- WHEN the latest verdict is read for its target
- THEN nothing is returned

#### Scenario: No hash comparison in nn-core

- GIVEN an applied verdict with any `reviewed_hash`
- WHEN the latest verdict is read
- THEN it is returned regardless of the current content of the target

### Requirement: The seal covers verdict keys and provenance

`computeProposalSha` MUST include every `review_gate` key (`gate`, `verdict`, `reviewed_hash`, `plan_hash`, `notes`) and the frontmatter provenance keys `author_kind`, `origin` and `reviewer`, so that editing any of them after proposal fails `verifyProposalSha` and the apply is refused with `PROPOSAL_TAMPERED`.

#### Scenario: Tampered reviewer

- GIVEN a sealed proposed changeset with a `review_gate` change
- WHEN the frontmatter `reviewer` is edited by hand and the changeset is applied
- THEN it is refused with `PROPOSAL_TAMPERED`

#### Scenario: Tampered verdict

- GIVEN a sealed `needs-change` verdict
- WHEN `verdict` is edited to `approved` by hand and the changeset is applied
- THEN it is refused with `PROPOSAL_TAMPERED`
