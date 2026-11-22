# Delta for executions-state-model

A run stores two ledgers today: its `Execution Event` elements (append-only) repeat the actor and the timestamp of the change that wrote them, and the runner's own event kinds duplicate changes the engine already records (`produce_artifact`, `review_gate`). The house rule is the reverse: a unit stores its value, and its history is derived from the change log.

This change makes a run a model with state (design D2, Piece B): the header, one `Step Run` row per step and one `Run Artifact` row per artifact, folded by nn-core and written by the runner tools over atomic changesets. The `Execution Event` concept and the runner's run lock are removed.

## ADDED Requirements

### Requirement: A run stores state, not a second ledger

The `executions` bluepriNNt MUST declare `Procedure Execution` (distributed), `Step Run`, `Run Artifact` and `Input` concepts, and MUST NOT declare `Execution Event`.

A `Procedure Execution` header MUST carry `procedure`, `def_rev`, `params`, `seq` and `state`.
A `Step Run` row MUST carry `status`, `attempt`, `outcome`, `next`, `inputs`, `waiting_on`, `failure`, `claimed_at`, `timeout_ms`, `holder` and `evidence`.
A `Run Artifact` row MUST carry `kind`, `value`, `rev` and `status`.
The run's history MUST be the change log of the run model: who moved which row, when and from what.

#### Scenario: A run is created whole
- GIVEN a procedure whose graph has no error diagnostic and whose declared slots are resolved
- WHEN `procedure_start` runs
- THEN one atomic changeset writes the model, the header and one row per step and per artifact
- AND no `Execution Event` element exists

### Requirement: Start refuses an unrunnable graph

`procedure_start` MUST refuse, before writing anything, a procedure graph with an error-severity diagnostic (`NO_START`, `MULTIPLE_STARTS`, `MISSING_SLUG`, `CYCLE`, `UNKNOWN_NEXT`) or an unresolved declared slot.

#### Scenario: A graph with several starts is refused
- GIVEN a procedure document whose graph reports `MULTIPLE_STARTS`
- WHEN `procedure_start` runs
- THEN it fails with a code naming the graph as not runnable
- AND no file is written

### Requirement: Concurrency is optimistic, not a run lock

Every runner changeset MUST be atomic AND MUST guard the header's `seq` with `from`.
A step claim and a step completion MUST also guard the step's `status` and `attempt`.
A write that loses the guard MUST conflict the whole changeset and be reported as `RUN_BUSY`.
The runner MUST NOT acquire a run lock.

#### Scenario: A competing write conflicts the whole changeset
- GIVEN a run whose header `seq` is `n` at read time
- WHEN another writer advanced `seq` before this changeset applied
- THEN the changeset is recorded as `conflict` and no change of it is written

#### Scenario: A late completion from an older attempt does not land
- GIVEN a step claimed at attempt 1 that failed, and a later claim at attempt 2
- WHEN a completion guarded on attempt 1 is applied
- THEN it conflicts and the attempt-2 row is untouched

### Requirement: A crash is derived from the holder

`procedure_state` MUST derive a crashed step from an `active` engine row: the holder names this host and its pid is not alive, or the holder is another host (or names none) and `now` is past `claimed_at + timeout_ms + grace`.

The derivation MUST NOT read the apply lock.
A step timeout MUST be bounded by 300 seconds.

#### Scenario: A dead holder is a crash
- GIVEN an `active` engine step whose `holder` names a pid that is not running on this host
- WHEN `procedure_state` reads the run
- THEN the step reports crashed and the run is blocked

#### Scenario: A live holder is not a crash
- GIVEN an `active` engine step whose `holder` names a running pid on this host
- WHEN `procedure_state` reads the run
- THEN the step stays active and the run stays open

### Requirement: An engine step maps its exit code

An engine step's exit code MUST be mapped to an outcome: 0 is `done`, an unmapped nonzero is `failed`, and a declared `exit_codes` entry overrides either.

#### Scenario: A declared gate stop waits
- GIVEN an engine step declaring `exit_codes` `{"10": "waiting"}`
- WHEN the command exits 10
- THEN the step becomes waiting and is not reported as failed

## REMOVED Requirements

### Requirement: The run lock

The run lock (`procedure-lock.ts`) and its readers MUST be removed; concurrency is the atomic `seq` guard and the step `from` fence.

### Requirement: Append-only execution events

`Execution Event` MUST be removed from the `executions` bluepriNNt together with `runRecordOf`, the event writers and the artifact/input event facts.
