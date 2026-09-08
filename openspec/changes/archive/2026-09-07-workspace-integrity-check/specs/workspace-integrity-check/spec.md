# Delta for Workspace Integrity Check

## Purpose

Introduce one consolidated, read-mostly integrity pass over every Level-3 model in a
workspace, producing a per-model status and a workspace aggregate, callable identically
from `innfo-mcp` (`check_workspace`) and `innfo-editor` (`workspaceStore.open()`).

## ADDED Requirements

### Requirement: Single Workspace Integrity Pass

The system MUST provide one platform-neutral report builder in `innfo-core` that performs
a single read-mostly integrity pass over a workspace. Both `innfo-mcp` `check_workspace`
and `innfo-editor` `workspaceStore.open()` MUST obtain their workspace integrity report
from this one builder, supplying platform-specific ports (model discovery, template
resolution/hydration, catalog fetch, freshness) by injection. The pass MUST parse the
workspace once (a single `recursiveParse`) and reuse that graph for every model it
inspects.

#### Scenario: MCP tool uses the shared builder
- GIVEN an agent invokes `check_workspace` on a workspace with three Level-3 models
- WHEN the tool runs
- THEN it calls the `innfo-core` workspace integrity builder with Node ports
- AND returns the builder's consolidated report without recomputing classification itself

#### Scenario: Editor open uses the shared builder
- GIVEN a user opens a workspace in `innfo-editor`
- WHEN `workspaceStore.open()` completes
- THEN the same `innfo-core` builder is invoked with browser ports
- AND the resulting report is stored on the workspace store

#### Scenario: Workspace parsed once
- GIVEN a workspace with N Level-3 models
- WHEN the integrity pass runs
- THEN the workspace graph is produced by a single `recursiveParse`
- AND no model triggers an additional full workspace parse

### Requirement: Per-Model Integrity Result

For every Level-3 model discovered in the workspace, the report MUST include a result
object with: `path`, `template`, `pinnedVersion`, `versionStatus`, `gap`,
`templateResolved`, `freshness`, `errors[]`, and `warnings[]`. `versionStatus` MUST use
the shared vocabulary (`current`, `upgrade-available`, `ahead`, `unlisted`, `unpinned`,
or `unknown`); `gap` MUST be one of `major`, `minor`, `patch`, `none`, `same`, or
`null` — `none` when no meaningful comparison exists (unpinned / unlisted / offline),
`same` when the pinned version equals the adopted version, the bump kind when an
upgrade is available, and `null` when a version is unparseable. `errors[]` and
`warnings[]` MUST carry the model's validation diagnostics and its cross-model
traceability diagnostics, unfiltered.

#### Scenario: Every model produces a row
- GIVEN a workspace with models A, B, and C
- WHEN the integrity pass runs
- THEN the report contains one per-model result for A, B, and C
- AND each result carries all required fields

#### Scenario: Traceability diagnostics are not filtered to one model
- GIVEN model A holds a broken cross-model reference to model B
- WHEN the integrity pass runs at workspace scope
- THEN model A's `errors[]` or `warnings[]` includes that cross-model diagnostic
- AND the diagnostic is not dropped because another model was the primary request

#### Scenario: Version status uses the shared classifier
- GIVEN model A is pinned to `business_V_0-1-0` and the catalog adopted version is `V_0-2-0`
- WHEN the integrity pass runs
- THEN `versionStatus` is `upgrade-available` and `gap` is `minor`
- AND the value matches what `upgrade-check.js` reports for the same model

### Requirement: Workspace Aggregate

The report MUST include a workspace-level aggregate with: a count of models per
`versionStatus`, a count of models with validation errors, `catalogSource` (how the
published catalog was resolved: `remote`, `in-repo`, or `offline`), and `offline`
(boolean, true when the catalog and/or freshness remotes were unreachable).

#### Scenario: Aggregate counts per status
- GIVEN a workspace with 2 `current`, 1 `upgrade-available`, and 1 `unlisted` model
- WHEN the integrity pass runs
- THEN the aggregate reports those four counts
- AND reports how many models have validation errors

#### Scenario: Catalog source is reported
- GIVEN the published catalog resolved from its canonical remote URL
- WHEN the integrity pass runs
- THEN `catalogSource` is `remote` and `offline` is false

### Requirement: Non-Blocking and Informational on Both Surfaces

The integrity pass MUST be non-blocking and informational on both surfaces. Validation
failures, unresolved templates, and available upgrades MUST NOT prevent a workspace from
opening in `innfo-editor`, MUST NOT block editing, and MUST NOT flip `check_workspace`
into a tool error or a non-zero process/exit signal. This is consistent with the
`workspace-template-upgrade` non-blocking rule and the existing passive-notice pattern.

#### Scenario: Editor still opens with invalid models
- GIVEN a workspace whose models have validation errors
- WHEN the user opens it in `innfo-editor`
- THEN the workspace opens and is fully editable
- AND the integrity report is surfaced passively

#### Scenario: MCP tool returns success payload despite errors
- GIVEN a workspace with validation errors and an unresolved template
- WHEN `check_workspace` runs
- THEN the tool returns its report as a normal successful result
- AND does not raise a tool error or failing status

### Requirement: Silent Additive Self-Healing Hydration

During the pass the check MAY download and hydrate missing template packages and specs
into the user's workspace `specs/` without prompting, using the existing 4-tier resolver
and atomic write-once hydration (`resolveParentChainNode`, `resolveTemplatePackage`,
`hydrateTemplatePackageAtomically`, `saveSpecOnce`). Hydration MUST be strictly additive:
the check MUST NOT modify, overwrite, or delete any existing file under `specs/`. A
hydration failure MUST degrade that model's `templateResolved` to false and MUST NOT fail
the pass.

#### Scenario: Missing template package is hydrated
- GIVEN a model whose pinned template package is absent from `specs/`
- AND the template is resolvable from a remote tier
- WHEN the integrity pass runs
- THEN the package and its specs are hydrated into `specs/`
- AND the model's `templateResolved` is true

#### Scenario: Existing spec file is never overwritten
- GIVEN a template file already present under `specs/`
- WHEN the integrity pass resolves and hydrates that template family
- THEN the existing file's contents are left byte-for-byte unchanged

#### Scenario: Hydration failure does not fail the pass
- GIVEN a model whose template cannot be resolved from any tier (offline, no local copy)
- WHEN the integrity pass runs
- THEN `templateResolved` is false for that model
- AND the pass completes and returns a report

### Requirement: summary_only Flag on check_workspace

`check_workspace` MUST accept an optional `summary_only` boolean (default false). When
false, the tool MUST return the full per-model list plus the aggregate. When true, the
tool MUST return the aggregate plus only the models that have validation errors or an
unresolved template, omitting the rest of the per-model list, so large workspaces do not
flood the agent's context.

#### Scenario: Default returns the full report
- GIVEN a workspace with 40 models
- WHEN `check_workspace` runs without `summary_only`
- THEN the response includes all 40 per-model results and the aggregate

#### Scenario: summary_only trims the per-model list
- GIVEN a workspace with 40 models where 3 have validation errors
- WHEN `check_workspace` runs with `summary_only: true`
- THEN the response includes the aggregate and only those 3 models
- AND the other 37 per-model results are omitted

### Requirement: Editor Runs Catalog-Only on Open

On `workspaceStore.open()` the editor MUST perform at most a single `catalog.json` fetch
to compute `versionStatus`, and MUST NOT perform per-template byte-hash freshness fetches.
Per-template byte-hash freshness (one fetch per distinct template URL, deduplicated,
concurrency-capped) MUST be performed only by the `check_workspace` MCP tool. When either
the catalog fetch or a freshness fetch is unavailable, the corresponding field MUST
degrade (`versionStatus` → `unknown`, `freshness` → `offline`) without failing.

#### Scenario: Editor open does one catalog fetch
- GIVEN a workspace opened in `innfo-editor` with 10 models sharing 3 template URLs
- WHEN the integrity pass runs on open
- THEN at most one catalog fetch is issued
- AND no per-template byte-hash freshness fetch is issued

#### Scenario: check_workspace deduplicates freshness fetches
- GIVEN `check_workspace` runs on a workspace with 10 models sharing 3 distinct template URLs
- WHEN freshness is computed
- THEN at most 3 freshness fetches are issued, capped by a concurrency limit
- AND each model's `freshness` field reflects its template URL's result

### Requirement: Offline Degradation Preserves Local Validation

With no network, the pass MUST still run all local validation and cross-model
traceability checks and return a full report. Fields that require a remote MUST degrade:
`versionStatus` → `unknown`, `gap` → `none`, `freshness` → `offline`, aggregate `offline`
→ true. The pass MUST NOT fail because a remote was unreachable.

#### Scenario: Offline pass returns local results
- GIVEN no network connectivity
- WHEN the integrity pass runs
- THEN every model's `errors[]` / `warnings[]` reflect local validation and traceability
- AND `versionStatus` is `unknown` and `freshness` is `offline` for every model
- AND the aggregate `offline` flag is true and the pass does not fail

### Requirement: Status Orthogonal to Severity

Version status MUST be reported independently of severity. `unlisted` (e.g. a local
specialization template absent from the catalog) and `unpinned` (no resolvable pinned
version) are informational states, not failures. The workspace aggregate's failure count
MUST be derived only from models with validation errors. The report surface MUST present
"cannot determine" states (`unknown`, `unlisted`, `unpinned`) distinctly from "invalid"
(validation errors).

#### Scenario: Unlisted template is not a failure
- GIVEN a model pinned to a local specialization template not in the catalog
- WHEN the integrity pass runs
- THEN `versionStatus` is `unlisted`
- AND the model is not counted in the aggregate failure count

#### Scenario: Unpinned model is not a failure
- GIVEN a model with no resolvable pinned template version
- WHEN the integrity pass runs
- THEN `versionStatus` is `unpinned`
- AND the model is not counted as a validation failure

#### Scenario: Cannot-determine is presented distinctly from invalid
- GIVEN one model with `versionStatus: unknown` and one model with a validation error
- WHEN the report is surfaced on either surface
- THEN the `unknown` model is shown as "cannot determine", not as "invalid"
- AND only the second model contributes to the failure count
