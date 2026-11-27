## ADDED Requirements

### Requirement: A complete claims the current step when it was not started

`procedure_record` with `action: complete` and no `request` MUST claim the current step first when its status is `pending`, `failed` or `reopened`.
The implicit claim MUST apply the same checks as `action: start` (run not closed, not drifted, not paused, the step current) and MUST record the same claim facts: the next attempt, `claimed_at`, `timeout_ms`, the `agent` holder and the frozen input revisions.
The claim and the completion MUST be ONE `set_fields` on the step row, guarded by the row as it stood before the call, inside the one atomic changeset the completion writes.
A refused completion MUST write nothing, the claim included.
`action: wait` and `action: fail` SHALL still refuse a step that was not started with `STEP_NOT_STARTED`.
A `complete` consumed from a Step Request SHALL keep the request staleness rules and SHALL NOT claim implicitly.
`action: run` on an engine step SHALL keep its claim changeset and its completion changeset.

#### Scenario: a pending step completes in one changeset

- **WHEN** `complete` is recorded on the pending current step of a run
- **THEN** exactly one changeset is written, the step is `done` at attempt 1 and its row carries the claim facts a `start` writes

#### Scenario: a paused run refuses the implicit claim

- **WHEN** `complete` is recorded on a paused run whose current step is pending
- **THEN** it fails with `RUN_PAUSED` and nothing is written

### Requirement: A complete carries the artifacts of the step

`procedure_record` with `action: complete` MUST accept an optional `artifacts` argument, an array of `{ fact, field, value?, rev?, step? }` or its JSON text.
Each entry MUST be planned exactly as `action: artifact` plans it, against the run with the claim and the earlier entries applied, and any refusal (`UNKNOWN_ARTIFACT`, `INVALID_ARGUMENT`, `STEP_NOT_STARTED`, `ARTIFACT_NOT_RECORDED`) MUST refuse the whole call and write nothing.
The artifact rows MUST be recorded in the completion's changeset before the completion, so the `MISSING_OUTPUT` gate counts them, and they SHALL compose with the `outputs` argument.
`artifacts` given with any other action or with a `request` MUST be refused with `INVALID_ARGUMENT`.

#### Scenario: a required output recorded with the completion

- **WHEN** a step with a required output is completed with that output in `artifacts`
- **THEN** one changeset records the artifact `validated` and the step `done`, and the walk moves on

#### Scenario: an unknown artifact refuses the completion

- **WHEN** one entry of `artifacts` names a slug the procedure does not declare
- **THEN** it fails with `UNKNOWN_ARTIFACT` and nothing is written

### Requirement: The last complete can finish the run

`procedure_record` with `action: complete` MUST accept an optional `finish` argument, `true` or `completed` to close the run completed and `failed` to close it failed.
The finish MUST be planned exactly as `action: finish`, against the run as the completion leaves it, and its terminal state change and `close_model` MUST land in the completion's changeset.
When that completion does not leave the run closable, the call MUST fail with `CANNOT_COMPLETE` or `MISSING_OUTPUT` and write nothing.
Any other `finish` value, or `finish` with another action or a `request`, MUST be refused with `INVALID_ARGUMENT`.

#### Scenario: a review run in four changesets

- **WHEN** a review run is recorded as `procedure_start`, `complete` of the draft with its artifact, `complete` of the review with its outcome and `complete` of the publish step with `finish: completed`
- **THEN** the run is closed and completed and the domain holds four changesets

#### Scenario: finishing too early writes nothing

- **WHEN** `finish: completed` rides on the completion of the first step of a three-step walk
- **THEN** it fails with `CANNOT_COMPLETE` and nothing is written

### Requirement: The separate calls keep working

The sequence `start`, `artifact`, `complete` and `finish` as separate calls MUST keep writing one changeset per call and MUST end in the same run state as the compact form.

#### Scenario: the full sequence is unchanged

- **WHEN** a review run is recorded with separate `start`, `artifact`, `wait`, `complete` and `finish` calls
- **THEN** the domain holds ten changesets and the closed run state equals the state of the compact run
