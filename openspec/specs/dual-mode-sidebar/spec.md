# Dual Mode Sidebar

## Purpose

Provide a dual-mode navigation sidebar in `innfo-editor` allowing users to toggle seamlessly between Workspace Mode (workspace model overview and submodel tree) and Focused Model Mode (single model concept tree and matrices), enriched with multi-level hierarchical breadcrumb ancestry (`Workspace > Parent Model > Submodel`).

## Requirements

### Requirement: Sidebar Mode and Ancestry State Management

`uiStore.ts` in `innfo-editor` MUST manage `sidebarMode` state variable (`'workspace'` | `'focused_model'`), `focusedModelId`, and an ancestry tracking state or computed chain representing the model lineage from the workspace root down through any intermediate parent models to the active submodel. Default mode upon opening a workspace MUST be `'workspace'`.

#### Scenario: Default sidebar state on workspace load
- GIVEN a user opens a workspace in `innfo-editor`
- WHEN workspace loading completes
- THEN `uiStore.sidebarMode` is initialized to `'workspace'`
- AND `uiStore.focusedModelId` is `null`

#### Scenario: Submodel focus records ancestry chain
- GIVEN `workspace_NN.md` references `models/system_NN.md` which references `models/subsystems/auth_NN.md`
- WHEN the user navigates to focus `auth_NN.md`
- THEN `uiStore.sidebarMode` transitions to `'focused_model'`
- AND the ancestry lineage reflects `[Workspace, system_NN, auth_NN]`

---

### Requirement: Workspace Mode View Rendering

When `sidebarMode` is `'workspace'`, `LeftSidebar.vue` MUST render the workspace entrypoint (`workspace_NN.md`) as the root node and display the submodel graph tree (`Workspace Root` -> `Submodels` (`type:: model` nodes) -> `Child Models`). It MUST display workspace-level summary metrics and submodel status indicators.

#### Scenario: Submodel tree rendering in Workspace Mode
- GIVEN `sidebarMode` is set to `'workspace'`
- AND the workspace contains `workspace_01.md` referencing submodels `auth_01.md` and `billing_01.md`
- WHEN `LeftSidebar.vue` renders
- THEN the sidebar presents a workspace hierarchy showing `workspace_01.md` as root with subnodes `auth_01.md` and `billing_01.md`

#### Scenario: Workspace metrics display
- GIVEN a loaded workspace with multiple submodels
- WHEN `LeftSidebar.vue` renders in Workspace Mode
- THEN total model count, submodel completion status, and cross-model link counts are rendered in the workspace header panel

---

### Requirement: Focused Model Mode View Rendering

When `sidebarMode` is `'focused_model'`, `LeftSidebar.vue` MUST isolate and render only the selected model's concept tree, element hierarchy, and model-specific matrices.

#### Scenario: Model selection enters Focused Model Mode
- GIVEN a user clicks on submodel node `billing_01.md` in the workspace tree or opens `billing_01.md`
- WHEN the model file opens
- THEN `sidebarMode` transitions to `'focused_model'`
- AND `LeftSidebar.vue` renders only the concept groups, elements, and matrices belonging to `billing_01.md`

---

### Requirement: Multi-Level Breadcrumb Ancestry Navigation

In Focused Model Mode, the editor navigation MUST display a multi-level hierarchical breadcrumb path displaying the full lineage:
`Workspace > Parent Model > Submodel`.
Each ancestor segment in the breadcrumb MUST be an interactive clickable control:
1. Clicking `Workspace` MUST transition `sidebarMode` back to `'workspace'` and restore the workspace overview tree.
2. Clicking any intermediate `Parent Model` MUST refocus that parent model in Focused Model Mode, updating the breadcrumb trail accordingly.
3. The active leaf submodel MUST be indicated as the terminal breadcrumb segment.

#### Scenario: Multi-level breadcrumb rendering for nested submodel
- GIVEN a nested submodel `auth_NN.md` child of `system_NN.md` within workspace `acme`
- WHEN `LeftSidebar.vue` or header breadcrumb renders in Focused Model Mode
- THEN the breadcrumb displays `Workspace > system_NN > auth_NN`

#### Scenario: Clicking intermediate parent model in breadcrumb
- GIVEN the user is viewing `auth_NN.md` with breadcrumb `Workspace > system_NN > auth_NN`
- WHEN the user clicks on the `system_NN` breadcrumb segment
- THEN `uiStore.focusModel('system_NN')` is invoked
- AND `LeftSidebar.vue` renders the concepts and elements of `system_NN`
- AND the breadcrumb updates to `Workspace > system_NN`

#### Scenario: Clicking Workspace returns to Workspace Overview
- GIVEN the user is viewing a submodel in Focused Model Mode
- WHEN the user clicks `Workspace` in the breadcrumb
- THEN `sidebarMode` transitions to `'workspace'`
- AND the sidebar restores the workspace submodel hierarchy view
