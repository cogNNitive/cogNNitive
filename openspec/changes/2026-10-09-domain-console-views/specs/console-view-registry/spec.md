# Delta for console-view-registry

New capability. All requirements are ADDED.

## ADDED Requirements

### Requirement: registerView contract

The console runtime MUST expose `registerView(def)` where `def` carries `id` (slug: lowercase alphanumerics and hyphens), `title`, `icon`, `order` (number), `kind` (`editable` | `readonly`) and `mount(ctx)`. A definition missing any field, or with a `kind` outside the two values, MUST be rejected with an error naming the field and the view id.

#### Scenario: Valid registration
- GIVEN a definition with all six fields and `kind: editable`
- WHEN `registerView(def)` is called
- THEN the view is listed by the runtime and `mount` is not called until its tab is first activated

#### Scenario: Invalid definition rejected
- GIVEN a definition with `kind: "draft"` or without `mount`
- WHEN `registerView(def)` is called
- THEN it throws an error naming the offending field and id
- AND no tab is created

### Requirement: Shared mount context

`mount(ctx)` MUST receive `ctx` exposing the shared model payload, the single draft store, the shared edit modal and the single changeset of the console. All editable views in one console MUST share these same instances (D8/D13/D15). A draft or proposed change made from any view MUST land in the one changeset of that export.

#### Scenario: Two views, one changeset
- GIVEN two editable views mounted in one console
- WHEN each proposes a change through `ctx`
- THEN both drafts appear in the same draft store and in a single exported changeset

#### Scenario: Shared modal
- GIVEN an editable view
- WHEN it opens the edit modal through `ctx`
- THEN the same modal instance used by the Model Explorer opens

### Requirement: Tabs mounted from the registry

Each registered view MUST appear as a tab ordered by `order`, with its `title` and `icon`. Switching tabs MUST preserve the state of the other views (no remount).

#### Scenario: Order and preservation
- GIVEN views with `order` 20 and 10
- WHEN the console boots
- THEN the order-10 tab precedes the order-20 tab
- AND a value typed in one view survives switching away and back

### Requirement: Discovery of bluepriNNt and custom views

`export-console.mjs` MUST include the views declared by the domaiNN's bluepriNNt and every `consoles/views/<slug>.js` in the domaiNN. The slug MUST be the file name without extension. No manifest MUST be required.

#### Scenario: Convention discovery
- GIVEN a domaiNN containing `consoles/views/pipeline.js`
- WHEN `export-console.mjs` runs
- THEN the artifact includes a view sourced from that file with slug `pipeline`

#### Scenario: No custom views
- GIVEN a domaiNN without a `consoles/views/` directory
- WHEN the export runs
- THEN it succeeds with only the bluepriNNt views

### Requirement: Trust model and header listing

Custom views MUST be treated as trusted domain-owner code with no sandbox. The exporter MUST list every included view (id and source) in the artifact header.

#### Scenario: Header lists views
- GIVEN an export including `timeline` and a custom view `pipeline`
- WHEN the artifact header is read
- THEN it lists both ids with their sources

### Requirement: Read-only HTML in sandboxed iframes

A view with `kind: readonly` MAY mount static HTML in an `iframe` using `srcdoc` and a `sandbox` attribute, with no access to the draft store, the modal or the changeset. A view with `kind: editable` MUST NOT mount any `iframe`.

#### Scenario: Readonly iframe is isolated
- GIVEN a readonly view mounting HTML in an iframe
- WHEN the iframe is inspected
- THEN it has `srcdoc` and a `sandbox` attribute without `allow-same-origin`
- AND its `ctx` carries no draft store or changeset

#### Scenario: Editable iframe refused
- GIVEN an editable view that appends an iframe to its container
- WHEN it mounts
- THEN the runtime reports an error naming the view id

### Requirement: Standalone view export

`export-console.mjs --view <id>` MUST produce an artifact containing the bundle plus only that view, with a changeset scoped to it. An unknown id MUST fail with an error listing the available ids.

#### Scenario: Scoped export
- GIVEN a domaiNN with views `timeline` and `procedure`
- WHEN run with `--view timeline`
- THEN the artifact mounts only `timeline`
- AND drafts from it export in a changeset scoped to that view

#### Scenario: Unknown view id
- GIVEN no view with id `nope`
- WHEN run with `--view nope`
- THEN the exporter exits non-zero listing the available ids and writes nothing

### Requirement: Size budget

The exporter MUST measure the final HTML. Above 5 MB it MUST warn; above 15 MB it MUST fail with a breakdown of bundle, models and views sizes. Both thresholds MUST live in one constant. Views MUST NOT be lazily split.

#### Scenario: Warn
- GIVEN a final artifact of 6 MB
- WHEN the export finishes
- THEN it succeeds and prints a warning with the three-part breakdown

#### Scenario: Fail
- GIVEN a final artifact of 16 MB
- WHEN the export runs
- THEN it exits non-zero with the breakdown and writes no artifact

### Requirement: Duplicate and invalid view ids

A second registration of an existing id MUST be rejected. The exporter MUST fail before writing when two discovered views share an id, or when a discovered id is not slug-shaped, naming the id and both sources.

#### Scenario: Duplicate at runtime
- GIVEN a registered view `timeline`
- WHEN another definition with id `timeline` is registered
- THEN `registerView` throws and the first view stays mounted

#### Scenario: Duplicate at export
- GIVEN a bluepriNNt view and a custom `consoles/views/timeline.js` both resolving to `timeline`
- WHEN the export runs
- THEN it fails naming `timeline` and both sources

### Requirement: Timeline and procedure as first views

The `timeline` and `procedure` consoles MUST be registered views mounted as tabs of `domaiNN_console.html`, with their drafts in the single changeset. Each MUST remain deliverable standalone via `--view`.

#### Scenario: Tabs in the domain console
- GIVEN a domaiNN with timeline and procedure capabilities
- WHEN `domaiNN_console.html` opens
- THEN both appear as tabs and a draft from each exports in one changeset

### Requirement: Sample custom view

`_samples_nn` MUST include a custom view at `consoles/views/<slug>.js` that is registered, included in the sample export, and able to propose a change into the changeset.

#### Scenario: Sample proposes a change
- GIVEN the sample domaiNN exported
- WHEN the sample view proposes a change
- THEN the exported changeset contains that change and the header lists the view
