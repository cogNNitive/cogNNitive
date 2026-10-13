# Delta for console-view-registry

## MODIFIED Requirements

### Requirement: Standalone view export

`export-console.mjs --view <id>` MUST produce an artifact containing the bundle plus only that view, with a changeset scoped to it. The artifact MUST declare its scope through the shared descriptor `meta.consoleScope = { view, label }` (see `console-scope`), with `models` added when the export also selects a model subset. An unknown id MUST fail with an error listing the available ids.
(Previously: the scope was implicit in the exporter and not described by a shared descriptor.)

#### Scenario: Scoped export
- GIVEN a domaiNN with views `timeline` and `procedure`
- WHEN run with `--view timeline`
- THEN the artifact mounts only `timeline`
- AND drafts from it export in a changeset scoped to that view
- AND `meta.consoleScope.view` is `timeline`

#### Scenario: View over a model subset
- GIVEN models A and B
- WHEN run with `--view timeline` and model A selected
- THEN `meta.consoleScope` carries `view: "timeline"` and `models: [A]`

#### Scenario: Unknown view id
- GIVEN no view with id `nope`
- WHEN run with `--view nope`
- THEN the exporter exits non-zero listing the available ids and writes nothing
