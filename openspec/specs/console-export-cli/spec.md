# Console Export CLI

## Purpose
Console exports become write-once artifacts under `artifacts/`, targets come from the contract predicate, and the script builds payloads through the core builder (carried over from base-change verify W4).
## Requirements
### Requirement: Status Reporting and Staleness Detection

The CLI MUST support `--status` reporting for every model chosen by the contract discovery predicate, and for the domain console. Each model MUST be `fresh`, `stale`, `uncompiled`, or `version_mismatch`. Staleness MUST compare the model's content hash with `meta.sha256` embedded in the stable console file `artifacts/<stem>_console/<stem>_console.html`; a missing file means `uncompiled`. The domain console MUST be `fresh` when every embedded per-model `knowledge_version` and `sha256` matches the live models, `stale` otherwise, and `uncompiled` when `domaiNN_console.html` is absent. (Previously: compared against the latest member of a write-once console family.)

#### Scenario: Inspecting compilation status
- GIVEN compiled, modified, and new models
- WHEN `node scripts/export-console.mjs <workspaceRoot> --status` runs
- THEN each model prints a tag (`[fresh]`, `[stale]`, `[uncompiled]`, `[mismatch]`)
- AND no file is written

#### Scenario: Sidecars are not targets
- GIVEN a workspace with sidecars
- WHEN `--status` runs
- THEN no sidecar appears in the output

#### Scenario: Domain console status
- GIVEN a domain console built before a model changed
- WHEN `--status` runs
- THEN the domain console prints `[stale]`

### Requirement: Tree Hierarchy Visualization

`--tree` MUST render models and their stable console file under `artifacts/` and exit `0`. (Previously: rendered the console family members.)

#### Scenario: Visualizing hierarchy
- **GIVEN** models in subdirectories and compiled consoles in `artifacts/`
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --tree`
- **THEN** the CLI prints a structured tree representation showing models and their console HTML file
- **AND** exits with status code 0

### Requirement: Selective Compilation and Filtering

The CLI MUST support `--stale`, `--filter <pattern>`, `--all`, `--list`, and positional substring arguments. Every compile MUST write through the shared `writeConsole` to the stable console path. (Previously: every compile wrote through `writeOnce`.)

#### Scenario: Compiling only stale models
- **GIVEN** one modified and two unchanged models
- **WHEN** `--stale --no-open` runs
- **THEN** the modified scoped console is rewritten in place and the others are skipped with a notice

#### Scenario: Filtering by pattern
- **GIVEN** several models
- **WHEN** `--filter business` runs
- **THEN** only matching models are compiled

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

The domain payload MUST carry a `changes` collection built at export time from every
`changes/*_changes_NN.md` of the domain, whatever its status: one entry per changeset with
`{ path, title, author, status, appliedAt, resolution, changes: [{ id, op, target, author,
notes, status, resolution, sources, replaced_sources, from, to, name, concept, fields }] }`,
newest first by file stamp. A key absent from the file MUST be absent from the entry. The
collection MUST be an empty array (not absent) when the domain has no changeset, and MUST
NOT be written into any model. Per-element `history` MUST be derived from the same loaded
changesets.
(Previously: entries carried no `from`, `to`, `name`, `concept`, `fields` or `resolution`,
so the console could not show a diff, a reason or build a Revert.)

#### Scenario: Changes carried into the domain console
- GIVEN a domain with one proposed and one applied changeset
- WHEN the domain console is exported
- THEN the payload `changes` carries both with their changes
- AND no model file contains the collection

#### Scenario: Card data carried
- GIVEN an applied block with `from:: Ana`, `to:: Bea` and a conflict block with `resolution:: PRECONDITION_FAILED: x`
- WHEN the domain console is exported
- THEN the first entry carries `from` `Ana` and `to` `Bea`, and the second carries that `resolution`

#### Scenario: Empty is present, not missing
- GIVEN a domain with no `changes/` directory
- WHEN the domain console is exported
- THEN `changes` is `[]` and nothing throws

### Requirement: Console exports overwrite a stable file

A console scoped to a single model MUST be written to the stable path
`artifacts/<stem>_console/<stem>_console.html` with `innfo-console.bundle.js` and
`innfo-ui.css` beside it under fixed names; the domain console stays
`domaiNN_console.html`. Exports MUST go through the shared `writeConsole` (see
`console-regeneration`), replacing the file via a temporary file and rename. Re-running
on an unchanged model MUST write nothing. No UTC-stamped console or bundle file MUST be
produced. `--no-open` MUST disable opening the written console; scripted callers (tests,
`build-docs.mjs`, `verify.js`) MUST pass it.

#### Scenario: Changed model overwrites the stable file
- GIVEN a compiled model whose content changed
- WHEN `--stale --no-open` runs
- THEN `artifacts/<stem>_console/<stem>_console.html` holds the new console
- AND no `<stem>_console_<UTC suffix>.html` file exists

#### Scenario: Unchanged model
- GIVEN a compiled model with unchanged content
- WHEN `--all --no-open` runs
- THEN no file is written

### Requirement: Console Links Are Relative to the Console File

The export MUST rewrite every local file reference the console opens so it resolves from the written HTML file under `file://`: the values of fields declared `image`, `video`, `audio` or `file` (in addition to the image-shaped values rebased today), and an `href` added to every resolved citation entry that has a `path` and no `error`, pointing at that source file without its anchor. Each rewritten reference MUST be relative to the directory of the output HTML (a domain console at the domaiNN root, a scoped or stamped console deeper) and MUST NOT be absolute. Values that already carry a scheme (`http:`, `https:`, `data:`, `blob:`, `file:`) MUST be left unchanged. The citation entry's `path` itself MUST stay domain-relative. (S3b P1, supports "Declared Media Rendering" and "Open Original Source File".)

#### Scenario: Domain console at the root
- GIVEN a domaiNN whose element cites `sources/nn/interview.md@## Clients`
- WHEN the domain console is exported at the domaiNN root
- THEN the citation entry carries `path: "sources/nn/interview.md"` and `href: "./sources/nn/interview.md"`

#### Scenario: Console written deeper
- GIVEN the same domaiNN exported as a console under `artifacts/<stem>_console/`
- THEN the same entry carries `href: "../../sources/nn/interview.md"`

#### Scenario: Declared video is rebased
- GIVEN a field declared `video` with value `sources/demo.mp4` and a console under `artifacts/<stem>_console/`
- WHEN it is exported
- THEN the field value is `../../sources/demo.mp4` (today only image-shaped values are rebased)

#### Scenario: Remote values are untouched
- GIVEN a field declared `video` with value `https://example.com/v.mp4`
- WHEN it is exported
- THEN the value is unchanged

### Requirement: Hash Contract Change Invalidates Prior Review State Once

The export MUST emit element hashes under the markers-free contract of `console-payload-builder`. Drafts recorded against a pre-change hash MUST NOT be silently treated as current: a draft keyed to a moved target is flagged, never deleted. Exports MUST NOT carry any `markers` in the hash input or the payload. Since the console records only changes, a legacy `reviewed` map is ignored by the console (nothing renders it) and is dropped from the store on the next write.

#### Scenario: Legacy reviewed data is ignored
- GIVEN a draft store holding a legacy `reviewed` map recorded with a pre-change hash
- WHEN the re-exported console loads the store
- THEN no reviewed mark is rendered
- AND the map is dropped on the next store write

#### Scenario: Old draft is flagged, not lost
- GIVEN a draft against an element whose hash moved because of this change
- WHEN the console loads
- THEN the draft is still in the store and is flagged

#### Scenario: Hash stable afterwards
- GIVEN the same domaiNN exported twice after this change
- WHEN element hashes are compared
- THEN they are identical

### Requirement: Programmatic in-process export API and shared DOM test harness

`scripts/export-console.mjs` MUST export a programmatic in-process entry point (such as `runExportConsole(argv, options)`) that executes console compilation, `--status`, `--tree`, and `--list` workflows in-process without calling `process.exit` or mutating global state, returning `{ exitCode, stdout, stderr, writtenFiles }`. Direct CLI execution (`node scripts/export-console.mjs ...`) MUST invoke this entry point and preserve all existing stdio and exit-code semantics. Console export test suites (`scripts/export-console.test.mjs`, `test/console-export.test.mjs`, `test/console-export-view.test.mjs`, `test/console-sample-custom-view.test.mjs`) MUST invoke the programmatic API in-process and reuse shared `JSDOM` instances across read-only DOM assertions, while retaining a minimal set of CLI subprocess smoke tests.

#### Scenario: Programmatic API executes in-process without exiting the host process

- **GIVEN** a test or tool imports `runExportConsole` from `scripts/export-console.mjs`
- **WHEN** it invokes `await runExportConsole([workspaceRoot, '--no-open'])` or passes invalid flags such as `['--domain', '--all']`
- **THEN** the function SHALL resolve with `{ exitCode, stdout, stderr, writtenFiles }` matching the CLI contract
- **AND** it SHALL NOT terminate the calling Node.js process via `process.exit`.

#### Scenario: Console test suites share read-only JSDOM instances and retain CLI smoke coverage

- **GIVEN** the console export test suites execute
- **WHEN** multiple assertions inspect the same generated console HTML without mutating DOM state
- **THEN** the suite SHALL parse and boot that console HTML once in a `before()` hook and share the `JSDOM` window across read-only tests
- **AND** at least two subprocess tests SHALL still invoke `node scripts/export-console.mjs` directly to verify CLI wiring and non-zero exit codes.

