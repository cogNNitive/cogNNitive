# Delta for Console View Registry

## MODIFIED Requirements

### Requirement: Shared mount context

`mount(ctx)` MUST receive `ctx` exposing the shared model payload, the single draft store, the shared edit modal, the single changeset of the console, and the unified builder `ctx.ui.Ku`.

All blueprint views (`organization`, `projects`, `innovation`, `metrics`, `changes`, `procedures`) and custom views MUST build knowledge units through `ctx.ui.Ku`.

The view context MUST NOT expose `ctx.modal.edit` or `ctx.modal.comment` (both are deleted). Views MUST NOT render custom, un-gated edit buttons in view mode. The custom `editButton` controls in `organization` (org-chart view) and `projects` (roadmap view), as well as row edit callbacks in timeline, are deleted; editing is initiated exclusively through `Ku` badges in review mode.

(Previously: `ctx` exposed `ctx.modal.edit` and `ctx.modal.comment`, and custom views rendered their own edit buttons without checking review mode.)

#### Scenario: Shared mount context exposes Ku and deletes modal.edit
- GIVEN an editable view mounted via `mount(ctx)`
- WHEN `ctx` is inspected
- THEN `ctx.ui.Ku` is defined
- AND `ctx.modal.edit` is undefined
- AND `ctx.modal.comment` is undefined

#### Scenario: View mode shows no edit buttons in org-chart or roadmap
- GIVEN the org-chart or roadmap custom view rendered with review mode OFF
- WHEN the view DOM is scanned for edit controls
- THEN no interactive edit button exists

#### Scenario: Blueprint view renders units via Ku
- GIVEN the `procedures` stepper or `projects` roadmap view
- WHEN it renders elements or references
- THEN all rendered units carry `data-innfo-component="ku-unit"`
