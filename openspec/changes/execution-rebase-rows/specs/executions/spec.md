## ADDED Requirements

### Requirement: A rebase accepts a definition that grew

`action=rebase` MUST accept a `def_rev` newer than the one the run was pinned to, and SHALL write a `Step Run` row for every step and a `Run Artifact` row for every artifact the grown definition names that the run has no row for, in the same changeset that records the new `def_rev`. A row the run already has MUST NOT be touched.

#### Scenario: rows a grown definition needs exist before the next action

- **WHEN** a procedure gains a step while a run is open, and the run accepts the new `def_rev` with `action=rebase`
- **THEN** the new step has a `Step Run` row in that same changeset, so the next `procedure_record` call on it addresses an existing row instead of nothing

#### Scenario: an existing row survives a rebase

- **WHEN** the run already has a `Step Run` row for a step the grown definition still declares
- **THEN** the rebase leaves that row unchanged

### Requirement: A busy run reports the run it conflicts with

A runner changeset whose guarded change is the run header's `seq` MUST be refused with `RUN_BUSY` naming the run, so the caller re-reads that run and retries instead of treating the conflict as generic.

#### Scenario: a concurrent write names its run

- **WHEN** two runner calls write the same run and the second loses the guarded `seq` compare
- **THEN** the second fails with `RUN_BUSY` naming the run, and a caller that re-reads and retries succeeds

### Requirement: A template seed is not a recorded input

An `Input` row whose `rev` is a template placeholder MUST NOT be read as an input the run recorded. A run created from a scaffold therefore starts with no recorded inputs, and only the inputs its own changesets add are folded.

#### Scenario: a scaffolded run has no phantom inputs

- **WHEN** a run is created from the executions template and no input was ever recorded
- **THEN** the fold reports no inputs and no stale inputs
