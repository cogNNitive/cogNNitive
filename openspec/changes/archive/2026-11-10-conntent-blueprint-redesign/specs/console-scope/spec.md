# Delta for console-scope

## MODIFIED Requirements

### Requirement: Model and subset scope narrow the payload; view scope strips the explorer

A `models` scope MUST narrow the payload: `elements`, `matrices`, `meta.models` and `payload.viewData` MUST contain only the scoped models (and the view data derived from them), element ids MUST remain model-qualified, and the runtime MUST render the normal explorer (rail, search, facets) over that narrower payload. A `view` scope MUST keep its existing meaning: it mounts only that view and drops the explorer, rail and search. The two scopes MUST be independent and combinable: `{view, models}` mounts only that view over the narrowed payload, and the view's data module MUST be called with only the scoped models.
(Previously: `payload.viewData` was not named as part of the narrowing, and a combined scope did not say which models the data module receives.)

#### Scenario: Subset narrows what is rendered
- GIVEN a three-model domaiNN scoped to model A
- WHEN the console renders
- THEN only A's elements, matrices and `meta.models` entry exist, and the explorer is present

#### Scenario: View scope drops the explorer
- GIVEN a console scoped to `{ view: "timeline" }`
- WHEN it renders
- THEN only the `timeline` view is mounted and no explorer rail or search exists

#### Scenario: Combined view and subset
- GIVEN a console scoped to `{ view: "timeline", models: [A] }`
- WHEN it renders
- THEN only `timeline` is mounted and it reads only A's elements

#### Scenario: View data is narrowed with the models
- GIVEN a console scoped to `{ view: "conntent-delivery", models: [A] }` over a three-model domaiNN
- WHEN the artifact is built
- THEN the delivery data module receives only model A
- AND `payload.viewData` holds no entry derived from the other models

## ADDED Requirements

### Requirement: The runtime implements the models scope

`meta.consoleScope.models` MUST be implemented end to end: the exporter narrows the payload, and the runtime (`nn-runtime.js`) reads the descriptor, honours it when mounting a `view` scope, and shows the scope label. A suite MUST boot the runtime in jsdom on the output of `export-console.mjs` for a real fixture domaiNN scoped by `models` (and by `{view, models}`), not on a hand-built payload, and MUST fail if the runtime ignores `models`.

#### Scenario: Real export with a models scope
- GIVEN a fixture domaiNN of three models exported with `models: [A]`
- WHEN the output boots in jsdom
- THEN the runtime lists only A's elements and shows the scope label

#### Scenario: Runtime ignoring the scope goes red
- GIVEN a scratch copy of the runtime that ignores `meta.consoleScope.models`
- WHEN the suite runs
- THEN it fails

### Requirement: Episode delivery scope

A delivery console MUST be exported with `meta.consoleScope = { view: "conntent-delivery", models: [<identity of the one episode model>], readOnly: true, label }`, where the label names the episode and version (for example `ep-slug v2`). `readOnly` is an optional boolean added to the descriptor by this change; when true the runtime MUST mount no control that creates a draft, a verdict or a changeset, MUST NOT inject the changeset-export or direct-write UI, and MUST NOT open the draft store. The exporter MUST refuse the `conntent-delivery` view with zero models, with more than one model, or with a model that is not an episode of a coNNtent domaiNN, exiting non-zero naming the offending entry and writing nothing. The scope is fixed at export time like every other scope.

#### Scenario: Valid delivery descriptor
- GIVEN an export of episode `gas-pump` version 2
- WHEN `nn-model.meta` is read
- THEN `meta.consoleScope.view` is `conntent-delivery`, `readOnly` is true, `models` lists exactly the episode model, and the label names `gas-pump` and `v2`

#### Scenario: Read-only scope injects no write UI
- GIVEN a console with `readOnly: true`
- WHEN the runtime boots
- THEN no changeset-export or direct-write control exists and no draft store is opened

#### Scenario: More than one model
- GIVEN a delivery export naming two episode models
- WHEN the export runs
- THEN it exits non-zero naming the extra entry and writes nothing

#### Scenario: Not an episode
- GIVEN a delivery export naming a series document
- WHEN the export runs
- THEN it exits non-zero and writes nothing
