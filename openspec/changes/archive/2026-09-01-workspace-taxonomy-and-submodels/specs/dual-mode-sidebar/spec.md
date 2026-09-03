# Dual Mode Sidebar

## Purpose

Provide a dual-mode navigation sidebar in `innfo-editor` allowing users to toggle seamlessly between Workspace Mode (workspace model overview and submodel tree) and Focused Model Mode (single model concept tree and matrices).

## Requirements

### Requirement: Sidebar Mode State Management

`uiStore.ts` in `innfo-editor` MUST manage a `sidebarMode` state variable with allowed values `'workspace'` and `'focused_model'`. The default mode upon opening a workspace MUST be `'workspace'`.

#### Scenario: Default sidebar state on workspace load
- GIVEN a user opens a workspace in `innfo-editor`
- WHEN workspace loading completes
- THEN `uiStore.sidebarMode` is initialized to `'workspace'`

#### Scenario: Switching sidebar mode state
- GIVEN `uiStore.sidebarMode` is `'workspace'`
- WHEN an action to focus a model is dispatched
- THEN `uiStore.sidebarMode` updates to `'focused_model'`

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

### Requirement: Breadcrumb Back-Navigation

In Focused Model Mode, `LeftSidebar.vue` MUST display a prominent top breadcrumb banner (e.g. `<- Back to Workspace Overview`). Clicking this breadcrumb MUST transition `sidebarMode` back to `'workspace'` and restore the workspace overview tree.

#### Scenario: Breadcrumb rendering in Focused Model Mode
- GIVEN `sidebarMode` is `'focused_model'` with active model `billing_01.md`
- WHEN `LeftSidebar.vue` renders
- THEN a top breadcrumb control labeled "Back to Workspace Overview" (or equivalent back navigation control) is visible at the top of the sidebar

#### Scenario: Breadcrumb click restores Workspace Mode
- GIVEN a user is in Focused Model Mode viewing `billing_01.md`
- WHEN the user clicks the breadcrumb back button
- THEN `sidebarMode` transitions to `'workspace'`
- AND the sidebar restores the full workspace submodel hierarchy view
