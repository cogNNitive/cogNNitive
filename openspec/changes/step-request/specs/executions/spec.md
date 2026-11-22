## ADDED Requirements

### Requirement: A run records requests, never their outcome

A `Procedure Execution` model MUST be able to hold `Step Request` rows. Each row SHALL carry `action` (one of `wait`, `complete`, `fail`), the `seq` of the run when the request was made, an optional `outcome` and an optional `value`. A request MUST remain intent, never state: it MUST NOT move a `Step Run` row, and a run's derived status SHALL be the same whether or not any `Step Request` row exists.

#### Scenario: a request leaves the run unchanged

- **WHEN** a person records a `Step Request` asking to complete a step
- **THEN** the run's derived status, `Step Run` rows and `Run Artifact` rows are unchanged until a runner call consumes the request

### Requirement: A request carries the seq it was made against

Every `Step Request` row MUST record the header `seq` of its run at creation time in a `base_seq` field. A consumer MUST compare `base_seq` with the run's current `seq` before acting, and MUST refuse the request when they differ.

#### Scenario: a request made before the run advanced is stale

- **WHEN** a request was recorded at `seq` 4 and the run now stands at `seq` 7
- **THEN** consuming the request fails with `REQUEST_STALE` and the request is marked `stale` rather than executed

### Requirement: Only the runner consumes a request

`procedure_record` MUST be the only consumer of a `Step Request`. It SHALL read the request by id, plan the action it names exactly as it would plan the same `action` passed directly, and mark the request `done` in the same changeset that records the action. A request that the planner refuses MUST be marked `rejected` with the planner's reason, and a stale one MUST be marked `stale`. A `Step Request` row MUST NOT be deleted.

#### Scenario: one request, one action

- **WHEN** `procedure_record` consumes a request for `complete` on the current step
- **THEN** one atomic changeset records the step completion and marks that request `done`, and consuming the same request again fails because it is no longer `pending`

### Requirement: Step Request status is a declared lifecycle

The `status` of a `Step Request` row MUST be a `select` field with the options `pending`, `done`, `stale` and `rejected`, entering from `""` and moving only along the declared edges `pending -> done`, `pending -> stale` and `pending -> rejected`. A resolved request MUST NOT return to `pending`.

#### Scenario: a resolved request stays resolved

- **WHEN** a change attempts to move a `done` request back to `pending`
- **THEN** the change is refused with `TRANSITION_NOT_ALLOWED`

### Requirement: procedure_pending lists the open queue

`procedure_pending` MUST be a read-only tool that lists the `Step Request` rows of one run, or of every run in the domaiNN when no run is named. It SHALL report each request's step, action, `base_seq`, status and reason, and MUST write nothing.

#### Scenario: the pending list is the queue an agent drains

- **WHEN** an agent calls `procedure_pending` with a run id
- **THEN** it receives every request of that run with its status, and the `pending` ones are the work it may consume
