# Delta for console-view-registry

## MODIFIED Requirements

### Requirement: Shared mount context

`mount(ctx)` MUST receive `ctx` exposing the shared model payload, the single draft store, the shared edit modal, the single changeset of the console, the unified builder `ctx.ui.Ku`, and `ctx.viewData` (see "View Data Collection Hook").

All blueprint views (`organization`, `projects`, `innovation`, `metrics`, `changes`, `procedures`, `conntent`) and custom views MUST build knowledge units through `ctx.ui.Ku`.

The view context MUST NOT expose `ctx.modal.edit` or `ctx.modal.comment` (both are deleted). Views MUST NOT render custom, un-gated edit buttons in view mode. The custom `editButton` controls in `organization` (org-chart view) and `projects` (roadmap view), as well as row edit callbacks in timeline, are deleted; editing is initiated exclusively through `Ku` badges in review mode, with one declared exception: a view of `kind: editable` MAY render action controls (for example Approve, Needs change, Edit, Override here) when every such control produces its result as an operation of the console's single changeset through `ctx`, holds no private copy of the edited value, and is absent from any view of `kind: readonly`. A `kind: readonly` view MUST NOT render any control that creates a draft, a verdict or a changeset.
(Previously: editing was initiated exclusively through `Ku` badges, which made verdict controls and per-field Override here controls of the `conntent` view non-conformant; `conntent` was not in the list of blueprint views.)

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

#### Scenario: Action controls of an editable view write to the changeset
- GIVEN the `conntent` view with a scene whose gate is open
- WHEN the reviewer activates Approve
- THEN the result is an operation in the console's single changeset
- AND the view holds no private copy of the verdict

#### Scenario: Readonly view has no action controls
- GIVEN the `conntent-delivery` view of `kind: readonly`
- WHEN its DOM is scanned for controls that create drafts, verdicts or a changeset
- THEN none exists

## ADDED Requirements

### Requirement: One view module may register several views

A single view module file MAY call `registerView` for more than one view id. The exporter MUST identify the module by its file slug (`console-view-<slug>.js`) and MUST list in the artifact header every id the module registers, with the module as source. The data module of the slug (`console-view-<slug>.data.mjs`) MUST be called once, its result MUST be embedded once under `payload.viewData[<slug>]`, and every view registered by that module MUST read that same entry as `ctx.viewData`. `--view <id>` MUST accept any registered id and MUST mount only that id, while the module is included once. An id registered twice across modules MUST still fail ("Duplicate and invalid view ids"). The size of a shared module MUST be counted once.

#### Scenario: Two ids from one module
- GIVEN a module `console-view-conntent.js` registering `conntent` and `conntent-delivery`
- WHEN the console is exported whole
- THEN the header lists both ids with that module as source and the module is included once

#### Scenario: Shared data entry
- GIVEN the same module
- WHEN both views mount
- THEN both read the one `payload.viewData.conntent` entry

#### Scenario: Scoped export of the second id
- GIVEN `--view conntent-delivery`
- WHEN the artifact is built
- THEN only `conntent-delivery` is mounted and the data module ran once over the scoped models

### Requirement: Default view of a blueprint

A bluepriNNt MAY nominate exactly one of its views as the boot view. The exporter MUST embed the nomination as `meta.defaultView` (a registered view id). When the console boots with no location hash and `meta.defaultView` is set, the runtime MUST activate that view's tab; with a location hash, the hash MUST win. A nomination naming an unregistered id MUST fail the export before writing, naming the id. A console with no nomination MUST keep its present default tab. The coNNtent bluepriNNt MUST nominate `conntent`.

#### Scenario: Nominated view opens first
- GIVEN a coNNtent domaiNN console and no location hash
- WHEN it boots
- THEN the `conntent` tab is active

#### Scenario: Hash wins
- GIVEN the hash `#explorer`
- WHEN the console boots
- THEN the explorer tab is active

#### Scenario: Unknown nomination
- GIVEN a bluepriNNt nominating a view id that is not registered
- WHEN the export runs
- THEN it exits non-zero naming the id and writes no artifact

#### Scenario: No nomination keeps the default
- GIVEN a domaiNN whose bluepriNNt nominates no view
- WHEN its console boots with no hash
- THEN the same tab is active as before this change

### Requirement: Read-only media views mount natively

A view of `kind: readonly` MAY mount its content natively (without `ctx.mountHtml`) when it needs media playback, since a sandboxed `srcdoc` iframe cannot load sibling files. A natively mounted readonly view MUST still be script-free in its rendering of payload strings, MUST build all payload text as text, and MUST NOT receive the draft store, modal or changeset in its `ctx`. The `ctx.mountHtml` iframe rules, including the CSP `<meta>` of that iframe, MUST remain unchanged.

#### Scenario: Native readonly view has no write surface
- GIVEN the `conntent-delivery` view mounted natively
- WHEN its `ctx` is inspected
- THEN it carries no draft store, modal or changeset

#### Scenario: Iframe rules unchanged
- GIVEN a readonly view that uses `ctx.mountHtml`
- WHEN the iframe is inspected
- THEN its sandbox and CSP `<meta>` are exactly as specified in "Read-only HTML in sandboxed iframes"
