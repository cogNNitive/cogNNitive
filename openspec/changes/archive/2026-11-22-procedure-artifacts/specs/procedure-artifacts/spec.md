# Delta for procedure-artifacts

A procedure artifact was a file or nothing: `Work.produces` named where an output landed and every artifact was verified by a path. A multi-element output such as coNNtent's sealed scene draft has no single element address, and an element output's revision is a property of the change log, never something the agent should pass.

This change gives an artifact a `kind` and an `at`, moves the location to the declaration, computes an element's revision in the runner, and makes the coNNtent procedure runnable.

## ADDED Requirements

### Requirement: An artifact declares its kind and its location

An `Artifact` MAY declare `kind` as `file`, `element` or `changeset` (default `file`) and `at` as its location, and `verify` MUST default from `kind`.

`Work.produces` MUST NOT be required: a step names its outputs with `output`.
An `at` MUST be a path, a `model@element` address, or a changeset path, and MAY carry `{slot}` placeholders and the built-in `{run}`.
A `file` verify names its path, an `element` verify names its element, and a `changeset` is satisfied by being applied.

#### Scenario: A file artifact needs no verify
- GIVEN an artifact declaring `kind:: file` and `at:: out/report.md`
- WHEN the engine step that produces it succeeds and the file exists
- THEN the artifact is validated with the file's sha256

### Requirement: An element artifact's revision is computed

When an `element` artifact is recorded, the runner MUST compute its `rev` as the element's last applied change id and MUST NOT take a revision from the agent.
Recording an element artifact whose element no applied change records MUST fail.

#### Scenario: An unrecorded element cannot be an artifact
- GIVEN an element artifact naming an element that no applied change wrote
- WHEN the artifact is recorded
- THEN it fails naming the element as not recorded

### Requirement: A changeset artifact is a multi-element output

A `changeset` artifact's value MUST be the changeset path, and its status MUST follow the changeset: `produced` while it is proposed, `validated` when it is applied, and `rejected` when it is rejected.

#### Scenario: Applying the changeset validates the artifact
- GIVEN a changeset artifact whose changeset applied
- WHEN the artifact is recorded as validated
- THEN the row is validated with the changeset path as its value

### Requirement: The coNNtent procedure is runnable

`Video.status` MUST declare its transitions, derived from the writers.

A procedure file that holds several sub-procedures MUST be addressable as `<doc>@<container-slug>`, with its starts computed among that container's descendants.
A `tool` literal `engine`, `agent`, `human` or `console` MUST be read as the executor when `executor` is absent, and `console` MUST map to `human`.
Every `<name>` placeholder in a procedure MUST become `{name}`, and `procedure_start` MUST refuse an unresolved declared slot.

#### Scenario: One sub-procedure has one start
- GIVEN a file whose six sub-procedures each have a step with no incoming next
- WHEN the file is addressed as `<doc>@produce-an-episode`
- THEN the graph reports exactly one start and no `MULTIPLE_STARTS`

#### Scenario: A gate stop is a wait
- GIVEN the `produce` step declaring `exit_codes` `{"10": "waiting", "11": "waiting", "12": "failed"}`
- WHEN the command exits 10
- THEN the step becomes waiting instead of failed
