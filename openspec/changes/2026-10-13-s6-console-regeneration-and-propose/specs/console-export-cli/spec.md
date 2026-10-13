# Delta for console-export-cli

## ADDED Requirements

### Requirement: Console exports overwrite a stable file

A model console MUST be written to the stable path
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

## MODIFIED Requirements

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
- **THEN** the modified model console is rewritten in place and the others are skipped with a notice

#### Scenario: Filtering by pattern
- **GIVEN** several models
- **WHEN** `--filter business` runs
- **THEN** only matching models are compiled

## REMOVED Requirements

### Requirement: Console exports are write-once

**Reason**: The console is the live view of the domain (preview is a file). A stable
path lets the agent, the console regeneration tool and the user name one file; a stamped family
made the reported path wrong and left a trail of obsolete consoles.

**Migration**: None in code. Existing stamped files under `artifacts/<stem>_console/`
are inert leftovers; the CLI does not read or delete them.

#### Scenario: No stamped member is written
- GIVEN any export
- WHEN it completes
- THEN no `<stem>_console_<UTC suffix>.html` or `innfo-console.bundle_<UTC suffix>.js` file was created
