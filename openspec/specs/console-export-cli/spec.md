# Console Export CLI

## Purpose
Console exports become write-once artifacts under `artifacts/`, targets come from the contract predicate, and the script builds payloads through the core builder (carried over from base-change verify W4).
## Requirements
### Requirement: Status Reporting and Staleness Detection

The CLI MUST support `--status` reporting for every model chosen by the contract discovery predicate. Each model MUST be `fresh`, `stale`, `uncompiled`, or `version_mismatch`. The basis MUST be the per-model entry in `meta.models` of the most recently generated console (by `meta.generated`) that lists the model, among `domaiNN_console.html` and the members of every scoped console family under `artifacts/`. The model's current content hash is compared with that entry's `sha256` (`fresh` when equal, otherwise `stale`); a differing recorded `modelVersion` is `version_mismatch`; no console listing the model means `uncompiled`.
(Previously: staleness compared the model's hash with `meta.sha256` of the latest member of that model's own `<stem>_console` family.)

#### Scenario: Inspecting compilation status
- GIVEN compiled, modified, and new models
- WHEN `node scripts/export-console.mjs <workspaceRoot> --status` runs
- THEN each model prints a tag (`[fresh]`, `[stale]`, `[uncompiled]`, `[mismatch]`)
- AND no file is written

#### Scenario: Status read from a scoped console
- GIVEN model A only ever exported inside a console scoped to A and B, then A edited
- WHEN `--status` runs
- THEN A is `[stale]` and B is `[fresh]`

#### Scenario: Newest console wins
- GIVEN A recorded with hash `H1` in an older console and `H2` in a newer one, and A's current hash is `H2`
- WHEN `--status` runs
- THEN A is `[fresh]`

#### Scenario: Sidecars are not targets
- GIVEN a workspace with sidecars
- WHEN `--status` runs
- THEN no sidecar appears in the output

---

### Requirement: Tree Hierarchy Visualization

`--tree` MUST render models and the console family members under `artifacts/` that list them in `meta.models`, and exit `0`.
(Previously: rendered each model with its own `<stem>_console` family.)

#### Scenario: Visualizing hierarchy
- **GIVEN** models in subdirectories and scoped consoles in `artifacts/`
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --tree`
- **THEN** the CLI prints a structured tree representation showing models and the console HTML files that include them
- **AND** exits with status code 0

---

### Requirement: Selective Compilation and Filtering

The CLI MUST support `--stale`, `--filter <pattern>`, `--all`, `--list`, and positional substring arguments. `--stale` MUST select the models whose `--status` is not `fresh` and produce one scoped console for them; when none is stale it MUST write nothing. `--all` MUST select every discovered model. Every compile MUST write through `writeOnce` into `artifacts/`.
(Previously: each selected model was compiled to its own console file.)

#### Scenario: Compiling only stale models
- **GIVEN** one modified and two unchanged models
- **WHEN** `--stale` runs
- **THEN** one new suffixed scoped console file listing only the modified model is written

#### Scenario: Nothing stale
- **GIVEN** every model `fresh`
- **WHEN** `--stale` runs
- **THEN** no file is written and a notice is printed

#### Scenario: Filtering by pattern
- **GIVEN** several models
- **WHEN** `--filter business` runs
- **THEN** only matching models are in the scoped console

### Requirement: Console exports are write-once

The scoped console HTML family key MUST be `<scope>_console` and each export MUST be a new suffixed member under `artifacts/<scope>_console/`. Re-running with an unchanged scope and unchanged models MUST write nothing (dedup). A changed model MUST add a member and leave earlier consoles byte-identical.
(Previously: the family key was `<stem>_console`, one family per model.)

#### Scenario: Unchanged scope
- GIVEN a compiled scope whose models are unchanged
- WHEN `--all` runs again
- THEN no file is written

#### Scenario: Changed model
- GIVEN a model in the scope changed
- WHEN the same scope is exported again
- THEN a new `<scope>_console_<UTC suffix>.html` exists and the previous console's SHA-256 is unchanged

### Requirement: Export uses the core payload builder

`export-console.mjs` MUST obtain payloads from innfo-core `buildConsolePayload` and MUST NOT scan models independently. Exported consoles MUST contain `innfo-model.meta.sources` when the model has citations.

#### Scenario: Meta sources present
- GIVEN a model with one citation
- WHEN its console is exported
- THEN the embedded `innfo-model.meta.sources` lists that citation

#### Scenario: No private scanner
- GIVEN `scripts/export-console.mjs`
- WHEN inspected
- THEN it contains no model-discovery regex or directory walk of its own

### Requirement: CLI Delegates to the Shared Builder and Fails Loudly

`scripts/export-console.mjs` MUST obtain its payload only from `buildConsolePayload`, loaded from `console-payload.generated.cjs` in the resolved `consoleDir`. If the mirror cannot be loaded the CLI MUST exit non-zero with an error naming the mirror path. `fallbackBuildPayload` MUST NOT exist.

#### Scenario: Mirror missing

- GIVEN a `consoleDir` without `console-payload.generated.cjs`
- WHEN the CLI runs
- THEN it exits non-zero naming the mirror and writes no console

#### Scenario: CLI output matches builder

- GIVEN a model
- WHEN the CLI compiles it
- THEN the embedded payload equals the builder output

### Requirement: Real domain identity and model-qualified element ids

`export-console` MUST NOT invent a domain version: the domain payload meta MUST carry `generated` (the build stamp) and `models`, one entry per embedded model with its `id`, `title`, real `knowledge_version` and content `sha256`. The draft store key MUST be the stable, path-scoped domain id (`<folder>-<hash of the resolved root path>`), never `basename(root)` alone and never content-derived, so drafts survive regeneration. Staleness MUST be tracked per draft (`base_hash`), not per store. Element ids in the domain console MUST be the D5 element address `<model>@<element_slug>`, where `<model>` is the model id used as the model part of changeset targets (the file stem), so two models with the same element name never collide in `elementsById` and every console key equals its lineage address. (Previously: the domain version was `V_1-0-<int>` derived from a content hash, drove a store-level stale banner, and ids were qualified as `<modelId>/<id>` with a path stem.)

#### Scenario: Real versions in the meta
- GIVEN a domain whose model `strategy` is at `V_0-1-3`
- WHEN the domain console is exported
- THEN `meta.models` lists `strategy` with `knowledge_version: "V_0-1-3"` and its `sha256`
- AND the meta has no hash-derived version

#### Scenario: Same element name in two models
- GIVEN models `org` and `crm` both define an element `Customer` with slug `customer`
- WHEN the console payload is built
- THEN their ids are `org@customer` and `crm@customer`
- AND a draft on `org@customer` never targets `crm@customer`

#### Scenario: Drafts survive a content change
- GIVEN a draft saved in a domain console
- WHEN a model changes and the console is exported again
- THEN the draft is still in the store under the same key
- AND it is flagged only if its own target element hash moved

### Requirement: Injected Citation Resolver

The CLI MUST inject a filesystem-backed citation resolver into the builder, so exported consoles carry per-field citations (single shape per `console-payload-builder`). The resolver reads files only; citation logic stays in `innfo-core`.

#### Scenario: Citations in a CLI console

- GIVEN a domaiNN whose element has a `sources` field pointing at a file
- WHEN exported
- THEN `el.citations.sources` holds a resolved entry

### Requirement: Root Ledger Input

The CLI MUST read verdicts from `<domaiNN root>/feedback-ledger.jsonl` and embed them as `meta.feedbackState`. It MUST NOT read `sources/import/feedback/ledger.jsonl` or any other candidate path. An absent ledger yields empty `feedbackState`; a malformed line is reported with its line number and the remaining entries load.

#### Scenario: Ledger read from root

- GIVEN a domaiNN with `feedback-ledger.jsonl` at its root
- WHEN exported
- THEN `meta.feedbackState` reflects the effective statuses

#### Scenario: Old location ignored

- GIVEN a ledger only under `sources/import/feedback/`
- WHEN exported
- THEN `feedbackState` is empty

### Requirement: Scoped console mode

`<ModelName>` positional arguments, `--filter <pattern>` and `--all` MUST NOT produce per-model console files. Each MUST select a set of models and produce one domain console scoped to that set (`meta.consoleScope.models`, see `console-scope`), built from the single shell. The scope label and the `<scope>` family key MUST be derived deterministically from the selected set. An explicit selection (`<ModelName>` or `--filter`) matching no model MUST exit non-zero and write nothing (`--stale` with nothing stale writes nothing and exits 0). Scope MUST be chosen only through these CLI options.

#### Scenario: One model name
- GIVEN a domaiNN with models A and B
- WHEN `export-console.mjs <root> A` runs
- THEN one console is written whose `meta.consoleScope.models` is `[A]` and whose `meta.models` has only A

#### Scenario: Filter selects a subset
- GIVEN models `business_x`, `business_y` and `metrics_z`
- WHEN `--filter business` runs
- THEN one console is written scoped to `business_x` and `business_y`

#### Scenario: Empty selection
- GIVEN a filter matching no model
- WHEN the export runs
- THEN it exits non-zero naming the filter and writes no file

#### Scenario: `--domain` cannot select models
- GIVEN models A and B
- WHEN `--domain` runs together with `A`, `--filter`, `--all` or `--stale`
- THEN the CLI exits with code 2 and writes no file

### Requirement: Scoped export never touches the domain console

A scoped export MUST write only under `artifacts/<scope>_console/` and MUST NOT create, overwrite or delete `domaiNN_console.html`. The whole-domaiNN export (`--domain` with no model selection) remains the only writer of `domaiNN_console.html`.

#### Scenario: Domain console untouched
- GIVEN an existing `domaiNN_console.html` with a known SHA-256
- WHEN a scoped export runs
- THEN `domaiNN_console.html` still has that SHA-256

#### Scenario: Scoped output location
- GIVEN a scoped export for the scope key `a`
- WHEN it completes
- THEN the new file is `artifacts/a_console/a_console_<UTC suffix>.html`

### Requirement: View scope combines with a model subset

`--view <id>` MUST be combinable with a model selection. The artifact MUST mount only that view over the selected models' payload, and its `meta.consoleScope` MUST carry both `view` and `models`. An unknown view id MUST still fail listing the available ids.

#### Scenario: View over a subset
- GIVEN models A and B
- WHEN `--view timeline` runs together with `A`
- THEN the artifact mounts only `timeline` and its payload contains only A

#### Scenario: View over a subset, unknown id
- GIVEN `--view nope` with `A`
- WHEN the export runs
- THEN it exits non-zero listing the available ids and writes nothing

### Requirement: Changes collection in the domain payload

The domain payload MUST carry a `changes` collection built at export time from every `changes/*_changes_NN.md` of the domain, whatever its status: one entry per changeset with `{ path, title, author, status, appliedAt, changes: [{ id, op, target, author, notes, status, sources, replaced_sources }] }`, newest first by file stamp. The collection MUST be an empty array (not absent) when the domain has no changeset, and MUST NOT be written into any model. Per-element `history` MUST be derived from the same loaded changesets.

#### Scenario: Changes carried into the domain console
- GIVEN a domain with one proposed and one applied changeset
- WHEN the domain console is exported
- THEN the payload `changes` carries both with their changes
- AND no model file contains the collection

#### Scenario: Empty is present, not missing
- GIVEN a domain with no `changes/` directory
- WHEN the domain console is exported
- THEN `changes` is `[]` and nothing throws

