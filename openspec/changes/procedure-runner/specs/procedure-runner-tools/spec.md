# Delta for procedure-runner-tools

Procedures were executed by prose instructions only: no code kept a run's state. nn-mcp now exposes three tools that drive a run of a procedure. A run is an `executions` instance model whose append-only events are the only record; its state is folded from them by nn-core `foldRun` and is never stored.

## ADDED Requirements

### Requirement: procedure_start creates a run

`procedure_start` MUST resolve the procedure with the precedence `list_blueprint_procedures` applies to a path, or by a domain-relative procedure document path.
An unknown procedure MUST be refused with `PROCEDURE_NOT_FOUND`, and a `value` slot that is required, has no default and is absent from `params` MUST be refused with `MISSING_REQUIRED_SLOT`.
The run MUST be created by one changeset holding `add_model` of a `Procedure Execution` at its `executions/{slug}/` placement, its header (`procedure`, `def_rev` set to the procedure's `knowledge_version`, `params` with slot defaults applied) and its `started` event.
A run id that is already taken MUST be refused with `RUN_EXISTS`, and a domaiNN that does not carry the executions bluepriNNt package MUST be refused with `EXECUTIONS_NOT_INSTALLED`, before anything is written.

#### Scenario: A run starts with its defaults
- GIVEN a procedure `review` with slots `doc` (required) and `format` (default `html`)
- WHEN `procedure_start` is called with `procedure: review`, `params: {"doc": "spec"}`, `run: r1`
- THEN `executions/r1/` holds the run with `def_rev`, `params` `{"doc":"spec","format":"html"}` and event `e-001` of kind `started`, written by one changeset

### Requirement: procedure_state is read-only

`procedure_state` MUST return the state `foldRun` derives from the run's events and its pinned `def_rev`, with the graph diagnostics, what the current step needs (executor, decision question and command with slots substituted, input and output artifacts), the allowed transitions and the `procedure_record` actions allowed now.
`procedure_state` MUST NOT write any file.
An engine step started with no later event MUST be reported as crashed only while the apply lock (`changes/.lock`) is free.

#### Scenario: Reading the state writes nothing
- GIVEN a run whose current step is a decision step
- WHEN `procedure_state` is called
- THEN it returns the decision question and both guarded transitions, and every file of the domaiNN is unchanged

### Requirement: procedure_record appends one fact per call

Each `procedure_record` call MUST write exactly one changeset, applied through `apply_change`, whose events are `add_element` changes carrying their fields in `to`.
A fact the fold forbids MUST be refused with a stable code and MUST write nothing: `RUN_CLOSED`, `RUN_DRIFTED`, `RUN_PAUSED`, `NOT_PAUSED`, `NOT_DRIFTED`, `UNKNOWN_STEP`, `STEP_NOT_CURRENT`, `STEP_NOT_STARTED`, `STEP_ALREADY_STARTED`, `UNKNOWN_ARTIFACT`, `INVALID_TRANSITION`, `AMBIGUOUS_TRANSITION`, `CANNOT_COMPLETE`, `NOT_ENGINE_STEP`, `INVALID_ACTION` or `INVALID_ARGUMENT`.
A `complete` without `next` MUST record the one transition whose guard holds, and MUST be refused with `AMBIGUOUS_TRANSITION` and the allowed transitions when none or several hold.
A `start` MUST record the attempt number and freeze the validated revisions of the step's input artifacts.
A terminal event (`completed`, `failed`, `cancelled`) and `close_model` MUST be written in the same changeset, and `completed` MUST be recorded only when the fold reports `canComplete`.
The changeset MUST carry `author_kind: agent`, except for `action: run`, which MUST carry `author_kind: engine`.

#### Scenario: An outcome picks the branch
- GIVEN a started decision step whose targets are guarded by `outcome == approve` and `outcome == decline`
- WHEN `procedure_record` is called with `action: complete` and `outcome: approve`
- THEN one changeset records `step_completed` with `next: publish`

#### Scenario: A drifted run refuses step facts until rebased
- GIVEN a run whose procedure's `knowledge_version` changed after it started
- WHEN `procedure_record` is called with `action: start`
- THEN it is refused with `RUN_DRIFTED`, and after `action: rebase` the same call is accepted

### Requirement: Engine steps run their command

`procedure_record` with `action: run` MUST execute the current engine step's `command` with its slots substituted, in the domaiNN root and under a timeout.
It MUST record `step_started`, an `artifact_validated` event with the sha256 of each `file:` output artifact that exists (or `artifact_rejected` when it is missing), and `step_completed` on exit code 0 or `step_failed` with the exit code otherwise, in the one changeset of the call.

#### Scenario: A failing command fails the step
- GIVEN an engine step whose command exits with code 3
- WHEN `procedure_record` is called with `action: run`
- THEN one changeset records `step_started` and `step_failed` with value `exit 3`, and the run is blocked
