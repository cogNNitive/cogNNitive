## ADDED Requirements

### Requirement: A completion request carries the deliverables a person wrote

A `Step Request` row MAY carry `requested_outputs`, a string holding one line of JSON that maps an artifact slug to `{ "name"?: string, "text": string }`; it MUST be valid only with `action: complete`, and each `text` MUST be UTF-8 of at most 256 KiB. Duplicate reconciliation in `import_console` SHALL compare `requested_outputs` together with the other fields of the request.

#### Scenario: the same request name with another deliverable conflicts

- **WHEN** a saved console carries a request whose name the run already holds with a different `requested_outputs`
- **THEN** the import is refused with `REQUEST_CONFLICT` and nothing is written

#### Scenario: a replayed import does not rewrite the deliverable

- **WHEN** the same saved console is imported again after its complete request was consumed
- **THEN** the request is reported as `duplicate` and the output file is not written again

### Requirement: The runner validates every output before writing anything

`procedure_record` with `action: complete` MUST accept the same map from a consumed request's `requested_outputs` or from its `outputs` argument, through one code path. Before anything is written it MUST refuse with `INVALID_OUTPUT` a slug that is not an output of the step being completed, an artifact whose kind is not `file`, a text that is not a string or exceeds 256 KiB, and outputs given with any action other than `complete`. A refused request SHALL be marked `rejected` with the reason.

#### Scenario: an unknown slug writes nothing

- **WHEN** a completion carries an output for a slug the step does not produce
- **THEN** it fails with `INVALID_OUTPUT`, no file is written, the step stays active and a consumed request is marked `rejected`

### Requirement: A private output is written under its run and recorded with the completion

The runner MUST write each output to `executions/<run>/outputs/<slug>/<name>`, where `name` is a basename of `[A-Za-z0-9._-]` defaulting to `<slug>.md`, right before the atomic commit of the completion, and MUST remove the files it wrote when that commit does not apply. The same atomic changeset SHALL set the `Run Artifact` row to `validated` with `kind: file`, the domain-relative path as `value`, the sha256 of the written bytes as `rev` and the completing step as `step`, so the required-output gate counts it as recorded by that step. Nothing MUST be written outside `executions/<run>/` and `changes/`.

#### Scenario: a human step completes with its required output

- **WHEN** a person's complete request carries the text of the step's required `file` output
- **THEN** the file exists under `executions/<run>/outputs/<slug>/`, the artifact row is `validated` with its path and sha256, the step is `done`, the request is `done`, and every file outside `executions/` and `changes/` is unchanged

#### Scenario: completing without the output is still refused

- **WHEN** a step with a required output is completed with no `outputs` and no recorded artifact
- **THEN** it fails with `MISSING_OUTPUT` and writes nothing
