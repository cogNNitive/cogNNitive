# Delta Specification: iNNfo Console Runtime (Model Console Tab Discovery)

## ADDED Requirements

### Requirement: Exclude Internal Specs and Workspace Root from Model Console Tabs

`ConsoleHubView` MUST filter `modelStore.rootIds` so that only level-3 domain models appear as switchable model console tabs. It MUST NOT render tabs for internal schema/spec nodes (`spec:*`, `template:*`) or the workspace manifest root node (whose console is accessed via the dedicated "Workspace Hub" tab).

#### Scenario: Internal spec node excluded from console tabs

- GIVEN a workspace containing resolved spec roots such as `spec:workspace` or `spec:business`
- WHEN `ConsoleHubView` evaluates `discoveredModels`
- THEN no tab is rendered for `spec:workspace` or `spec:business`

#### Scenario: Workspace manifest root excluded from model console tabs

- GIVEN a workspace containing a root node with `type: 'workspace'`, template `workspace`, or source `workspace_NN.md`
- WHEN `ConsoleHubView` evaluates `discoveredModels`
- THEN no separate model tab is rendered for the workspace root manifest
- AND the "Workspace Hub" tab provides the single canonical entrypoint for workspace aggregation deliverables

#### Scenario: Domain model tabs rendered correctly

- GIVEN a workspace containing domain model roots (e.g. `business`, `metrics`, `innovation`)
- WHEN `ConsoleHubView` evaluates `discoveredModels`
- THEN a tab is rendered for each concrete domain model allowing the user to view its compiled console
