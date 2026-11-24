## ADDED Requirements

### Requirement: procedure_record advertises request consumption

The `procedure_record` MCP tool schema MUST declare a `request` argument naming the id of a pending Step Request, and MUST require only `run`.
An `action` given together with a `request` SHALL be refused with `INVALID_ARGUMENT`.
The `procedure_pending` description SHALL name every action a request can carry: `start`, `wait`, `complete` and `fail`.

#### Scenario: an agent consumes a console request over MCP

- **WHEN** an MCP client calls `procedure_record` with `run` and `request` and no `action`
- **THEN** the request's action is recorded, the request is marked `done` in the same changeset, and `procedure_pending` reports no pending request

### Requirement: A new run carries no placeholder rows

A run created by `procedure_start` MUST hold only its root element and the `Step Run` and `Run Artifact` rows of its procedure.
It MUST NOT hold any schema placeholder element, such as an `Example Step Request` or an `Example Run Artifact`.

#### Scenario: a fresh run has an empty request queue

- **WHEN** a run is started
- **THEN** its model contains no `Example` element and `procedure_pending` reports zero pending requests for it

### Requirement: import_console turns a saved console into a changeset

The `import_console` MCP tool MUST read a console HTML saved with Save Snapshot and compose the changeset of its `nn-drafts` drafts with the console runtime's own export function, loaded from the trusted console bundle.
It MUST refuse a console whose `meta.domainId` is not the domaiNN's own with `DOMAIN_MISMATCH`, and every refusal SHALL write nothing.
Without `apply` it SHALL write the changeset under `changes/` and report the runs the file asks for without starting them.
With `apply` it SHALL apply the changeset through the `apply_change` engine and start each `run_start` draft through `procedure_start` with the reviewer as actor.
With `apply` and `consume` it SHALL consume every Step Request the changeset added through `procedure_record` and report each as `done`, `stale`, `rejected` or `failed`.

#### Scenario: the owner imports a recipient's saved console

- **WHEN** the agent calls `import_console` with `apply` and `consume` on a saved console of the same domaiNN carrying a Step Request and a `run_start` draft
- **THEN** the changeset is applied, the request is reported `done`, the requested run exists, and the domain console is regenerated once

#### Scenario: a console of another domaiNN is refused

- **WHEN** the saved console's `meta.domainId` names another domaiNN
- **THEN** the call fails with `DOMAIN_MISMATCH` and no file of the domaiNN changes

### Requirement: A guarded loop is runnable

`procedureGraph` MUST accept a loop when one of its edges leaves a step with several `next` targets for a target that carries a `condition`, and MUST report every other loop as a `CYCLE` error.
The back-edge of an accepted loop SHALL NOT count as an incoming edge when the start step is computed.
A step MAY declare `max_attempts` as a positive integer; a step that declares none SHALL be bounded by 3 attempts.

#### Scenario: a send-back loop starts and an unguarded loop does not

- **WHEN** a decision step lists `[@publish, @redraft]`, `redraft` carries `condition:: outcome == send-back` and its `next` is the decision step
- **THEN** the graph reports no diagnostic and `procedure_start` starts the run, while a loop with no guarded branch is refused with `PROCEDURE_NOT_RUNNABLE` and `CYCLE`

### Requirement: Taking a loop's back-edge reopens its span

When `procedure_record` completes a step, by `complete` or by `run`, with a `next` that the walk already passed before that step, it MUST write in one atomic changeset every step walked from that `next` up to the completing step back to `pending` with its `attempt` kept and its `outcome`, `next`, `waiting_on` and `failure` cleared.
The same changeset MUST put every `validated` output of those steps back to `produced`, and the fold SHALL report an output as `stale` while its producer is `pending` after an attempt.
The next `start` of a reopened step SHALL record the attempt after the kept one.

#### Scenario: a scene is sent back

- **WHEN** a redraft step whose `next` is the decision step completes
- **THEN** the decision and the redraft are `pending` at their previous attempts, the current step is the decision, the redraft's output is `stale`, and starting the decision records attempt 2

### Requirement: A loop is bounded by its target's attempts

A back-edge to a step whose `attempt` already reached its `max_attempts` MUST be refused with `LOOP_LIMIT` naming the step, its attempt and its `max_attempts`, and the refusal SHALL write nothing.
An engine step whose transition is such a back-edge SHALL be recorded `failed` with a `LOOP_LIMIT` failure, because its claim has already landed.

#### Scenario: the third send-back of a two-attempt review

- **WHEN** the review declares `max_attempts:: 2`, already ran twice and its redraft completes again
- **THEN** `procedure_record` returns `LOOP_LIMIT`, the domaiNN is byte-identical, and the redraft can still be recorded `failed`

### Requirement: The run slot resolves to the run id

Every `{run}` placeholder in a step's `decision`, `command` or `produces`, and in an artifact's `at` or `verify`, MUST resolve to the run id in `procedure_state`, in an engine `run` and in an artifact fact.
The run id MUST NOT be stored in the run's `params`.

#### Scenario: an engine command writes a file named after its run

- **WHEN** an engine step runs `command:: ... stamp-{run}.txt` with an artifact `verify:: file:stamp-{run}.txt` in run `rs1`
- **THEN** the command writes `stamp-rs1.txt`, the artifact is `validated` with value `stamp-rs1.txt`, and the run's `params` stay empty
