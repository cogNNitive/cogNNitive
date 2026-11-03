# Delta for console-view-registry

Change `2026-11-02-video-script-v1`, design.md A12. A generic, small addition so that a view can receive data the model payload does not carry (the ledger and timing facts). It is not video-specific. Accepted as designed by the maintainer (2026-11-02).

## ADDED Requirements

### Requirement: View Data Collection Hook

A bluepriNNt view MAY ship a data module `console-view-<slug>.data.mjs` beside its view file, exporting `collect({ rootDir, models })` that returns JSON-serializable data. At export time `export-console.mjs` MUST call it for every included view that has one, embed the result under `payload.viewData[<slug>]`, and expose it to that view as `ctx.viewData`. A view without a data module MUST receive an empty `ctx.viewData`. A data module that throws or returns non-serializable data MUST fail the export before writing, naming the view id.

#### Scenario: Data reaches the view

- GIVEN a view `series` with a data module returning `{ runs: 3 }`
- WHEN the console is exported and the view mounts
- THEN `ctx.viewData` equals `{ runs: 3 }` for that view

#### Scenario: View without a data module

- GIVEN a view with no data module
- WHEN it mounts
- THEN `ctx.viewData` is an empty object and the export succeeds

#### Scenario: Failing collector stops the export

- GIVEN a data module that throws
- WHEN the export runs
- THEN it exits non-zero naming the view id and writes no artifact

#### Scenario: Data is scoped to the exported view

- GIVEN `--view series`
- WHEN the artifact is built
- THEN `payload.viewData` holds only the `series` entry

### Requirement: View Data Is Read-Only Input

`ctx.viewData` MUST be treated as a read-only snapshot taken at export time. A view MUST NOT write to it, and edits MUST continue to flow only through the changeset.

#### Scenario: Snapshot is frozen

- GIVEN a mounted view with data
- WHEN it attempts to assign to `ctx.viewData`
- THEN the assignment has no effect on the embedded payload

## MODIFIED Requirements

### Requirement: Shared mount context

`mount(ctx)` MUST receive `ctx` exposing the shared model payload, the single draft store, the shared edit modal, the single changeset of the console, the unified builder `ctx.ui.Ku`, and `ctx.viewData` (see "View Data Collection Hook").

All blueprint views (`organization`, `projects`, `innovation`, `metrics`, `changes`, `procedures`) and custom views MUST build knowledge units through `ctx.ui.Ku`.

The view context MUST NOT expose `ctx.modal.edit` or `ctx.modal.comment` (both are deleted). Views MUST NOT render custom, un-gated edit buttons in view mode. The custom `editButton` controls in `organization` (org-chart view) and `projects` (roadmap view), as well as row edit callbacks in timeline, are deleted; editing is initiated exclusively through `Ku` badges in review mode.

(Previously: `ctx` did not expose `viewData`.)

#### Scenario: Shared mount context exposes Ku and deletes modal.edit
- GIVEN an editable view mounted via `mount(ctx)`
- WHEN `ctx` is inspected
- THEN `ctx.ui.Ku` is defined
- AND `ctx.modal.edit` is undefined
- AND `ctx.modal.comment` is undefined

#### Scenario: View data is exposed
- GIVEN a mounted view
- WHEN `ctx` is inspected
- THEN `ctx.viewData` is defined

#### Scenario: View mode shows no edit buttons in org-chart or roadmap
- GIVEN the org-chart or roadmap custom view rendered with review mode OFF
- WHEN the view DOM is scanned for edit controls
- THEN no interactive edit button exists

#### Scenario: Blueprint view renders units via Ku
- GIVEN the `procedures` stepper or `projects` roadmap view
- WHEN it renders elements or references
- THEN all rendered units carry `data-nn-component="ku-unit"`
