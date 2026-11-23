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
