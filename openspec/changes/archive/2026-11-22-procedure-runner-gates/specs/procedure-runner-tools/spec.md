# Delta for procedure-runner-gates

The runner folds, decides and writes in one call. Three gaps made that window dishonest: two callers could fold the same state and both append a fact (the apply lock serializes the write, not the decision, and a colliding event slug is auto-suffixed rather than rejected); an `artifact` fact could be recorded for a step that never started, satisfying a guard on a future artifact and disabling staleness for it; and a drifted run advertised `artifact` among its allowed actions while the writer refused it. A run's write window is now single-writer, an artifact fact needs a producer that started, the advertisement matches the writer, and the crash derivation states its real reach.

## MODIFIED Requirements

### Requirement: procedure_state is read-only

`procedure_state` MUST return the state `foldRun` derives from the run's events and its pinned `def_rev`, with the graph diagnostics, what the current step needs (executor, decision question and command with slots substituted, input and output artifacts), the allowed transitions and the `procedure_record` actions allowed now.
`procedure_state` MUST NOT write any file.
A drifted run MUST advertise only `rebase`, `input`, `pause` or `resume`, `cancel` and `finish`, because `procedure_record` refuses every step action and every artifact fact until a rebase is recorded.
An engine step that started and recorded nothing else MUST be reported as crashed only while the apply lock (`changes/.lock`) is free, and that derivation MUST NOT be read as covering `action: run`, which writes the start and its terminal in one changeset.

#### Scenario: A drifted run advertises what its writer accepts
- GIVEN a run whose pinned `def_rev` no longer matches the procedure's `knowledge_version`
- WHEN `procedure_state` is called
- THEN `actions` is `["rebase","input","pause","cancel","finish"]` and a call with `artifact` is refused `RUN_DRIFTED`

### Requirement: procedure_record appends one fact per call

Each `procedure_record` call MUST write exactly one changeset, applied through `apply_change`, whose events are `add_element` changes carrying their fields in `to`.
The call MUST hold the run lock (`changes/.lock.procedure-<run>`) across the fold, the decision and the apply, so a second caller on the same run MUST be refused with `RUN_BUSY` and write nothing.
A holder older than 120 seconds, or an unreadable lock payload, MUST be broken and re-acquired, and the lock MUST be released on every return, refusals included.
An `artifact` fact MUST be refused with `STEP_NOT_STARTED` unless the step that reports it is `active`, `waiting`, `done` or `reopened`, so a guard on an artifact of a step that never started cannot hold early.
An `artifact` change that names an unknown step MUST be refused with `UNKNOWN_STEP`.
A fact the fold forbids MUST be refused with a stable code and MUST write nothing: `RUN_CLOSED`, `RUN_DRIFTED`, `RUN_PAUSED`, `NOT_PAUSED`, `NOT_DRIFTED`, `UNKNOWN_STEP`, `STEP_NOT_CURRENT`, `STEP_NOT_STARTED`, `STEP_ALREADY_STARTED`, `UNKNOWN_ARTIFACT`, `INVALID_TRANSITION`, `AMBIGUOUS_TRANSITION`, `CANNOT_COMPLETE`, `NOT_ENGINE_STEP`, `INVALID_ACTION` or `INVALID_ARGUMENT`.
A `complete` without `next` MUST record the one transition whose guard holds, and MUST be refused with `AMBIGUOUS_TRANSITION` and the allowed transitions when none or several hold.
A `start` MUST record the attempt number and freeze the validated revisions of the step's input artifacts.
A terminal event (`completed`, `failed`, `cancelled`) and `close_model` MUST be written in the same changeset, and `completed` MUST be recorded only when the fold reports `canComplete`.
The changeset MUST carry `author_kind: agent`, except for `action: run`, which MUST carry `author_kind: engine`.

#### Scenario: Two callers on one run
- GIVEN a run whose write lock is held by another caller
- WHEN `procedure_record` is called on it
- THEN the call is refused `RUN_BUSY`, no changeset is written and the holder's lock is left in place

#### Scenario: An artifact from a step that never started
- GIVEN a run whose current step is `pending` and whose procedure declares its artifact
- WHEN `procedure_record` records `artifact` `validated` for it
- THEN the call is refused `STEP_NOT_STARTED` and nothing is written
