# Delta for console-scope

## Purpose

Defines the domain-console scope descriptor (`meta.consoleScope`): how a console is narrowed to a view, a model, or a subset of models while remaining the single domain console.

New capability. All requirements are ADDED.

## ADDED Requirements

### Requirement: Console scope descriptor

A domain console MUST be able to carry `meta.consoleScope = { view?, models?, label }`. `label` is a required, non-empty, human-readable string. `view` is a registered view id. `models` is a non-empty list of model identities from the domaiNN. When `meta.consoleScope` is absent the console covers the whole domaiNN. Scope MUST be fixed at export time; the console UI MUST NOT offer a control that changes it (reviewers narrow further with the existing `model:` facet only).

#### Scenario: Whole-domaiNN console has no scope
- GIVEN an export with no scope option
- WHEN `innfo-model.meta` is read
- THEN `meta.consoleScope` is absent and every discovered model is present in `meta.models`

#### Scenario: Model subset descriptor
- GIVEN an export scoped to models A and B
- WHEN `innfo-model.meta` is read
- THEN `meta.consoleScope.models` lists exactly A and B and `meta.consoleScope.label` is non-empty

#### Scenario: Invalid descriptor rejected
- GIVEN a scope naming a model that does not exist in the domaiNN, or an empty `models` list
- WHEN the export runs
- THEN it exits non-zero naming the offending entry and writes nothing

#### Scenario: No scope control in the UI
- GIVEN a scoped console rendered in jsdom
- WHEN the DOM is scanned for a control that changes the console scope
- THEN none exists

### Requirement: Model and subset scope narrow the payload; view scope strips the explorer

A `models` scope MUST narrow the payload: `elements`, `matrices` and `meta.models` MUST contain only the scoped models, element ids MUST remain model-qualified, and the runtime MUST render the normal explorer (rail, search, facets) over that narrower payload. A `view` scope MUST keep its existing meaning: it mounts only that view and drops the explorer, rail and search. The two scopes MUST be independent and combinable: `{view, models}` mounts only that view over the narrowed payload.

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

### Requirement: Scope labelling

A scoped console MUST display `meta.consoleScope.label` in the navbar next to the title so a reviewer can tell it is not the whole domaiNN. A single-model scope MUST default its label to the model title. The label MUST be rendered as text, never as markup.

#### Scenario: Label visible
- GIVEN a console scoped with label `Pricing review`
- WHEN it renders
- THEN the navbar shows `Pricing review`

#### Scenario: Hostile label inert
- GIVEN a label `<img src=x onerror=alert(1)>`
- WHEN the console renders
- THEN the string appears literally as text and no `img` element is created

### Requirement: Scoped draft identity

The draft-store identity (`domainId`) of a model or subset scoped console MUST include a suffix derived deterministically from the **sorted scoped model identities only** (`::scope:<hash8>`). The view id is appended by the runtime as `::view:<id>` (see `innfo-console-runtime`), never carried in the exporter suffix. Two consoles with different scopes, or one scoped and one whole-domaiNN console, MUST NOT read or write the same draft store. Re-exporting the same scope MUST yield the same identity, so drafts survive a re-export.

#### Scenario: Scoped and full consoles do not share drafts
- GIVEN a draft saved in the whole-domaiNN console
- WHEN a console scoped to one model is opened in the same browser origin
- THEN that draft is not present in the scoped console

#### Scenario: Same scope, same drafts
- GIVEN a draft saved in a console scoped to models A and B
- WHEN the same scope is re-exported and opened
- THEN the draft is restored, regardless of the order in which A and B were listed

### Requirement: Tabs are unchanged by scope

A scoped console MUST mount the same tabs (registered views) as the whole-domaiNN console would for the same models, narrowed only by the scoped payload. Scope MUST NOT add, remove or reorder tabs, except that a `view` scope mounts only the named view.

#### Scenario: Same tabs, narrower data
- GIVEN a domaiNN whose whole-domaiNN console mounts N tabs in a given order
- WHEN exported scoped to one model
- THEN the same N tabs appear in the same order, populated from that model only
