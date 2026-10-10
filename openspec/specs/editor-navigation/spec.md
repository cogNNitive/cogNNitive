# Delta for Editor Navigation

## ADDED Requirements

### Requirement: Sidebar Dedicated to Model and Concept Tree Navigation

The `LeftSidebar` component MUST permanently render the model and concept tree structure for the active workspace. The `LeftSidebar` MUST NOT contain tab controls or view switchers for switching between `editor` and `graph` views.
(Previously: the view switchers excluded were `editor`, `graph`, and `consoles`.)

#### Scenario: Left sidebar displays concept tree without view switcher tabs
- GIVEN the `innfo-editor` application is open with an active workspace
- WHEN the user views the left sidebar
- THEN the concept and model tree is permanently visible
- AND no tab buttons for switching between Editor or Graph views are displayed within the sidebar

#### Scenario: Tree remains accessible across different workspace views
- GIVEN the application is in any workspace view (such as `editor` or `graph`)
- WHEN the left sidebar is visible
- THEN the user can browse, expand, collapse, and interact with the model tree nodes without leaving the sidebar

---

### Requirement: Workspace View Controls in Header

The `Header` component MUST provide interactive navigation controls for switching among the primary workspace views (`editor` and `graph`). The header view controls MUST reflect the currently active view with an active state indicator. The Header MUST NOT offer a `consoles` view control, and the `activeView` state MUST NOT accept `'consoles'`.
(Previously: the primary views were `editor`, `graph` and `consoles`, and a "Consoles" header button rendered the `ConsoleHubView`.)

#### Scenario: Navigating to Graph view from Header
- GIVEN the application is currently displaying the `editor` view
- WHEN the user clicks the "Graph" view button in the Header
- THEN the application state updates `activeView` to `'graph'`
- AND the central workspace renders the `GraphViewer`
- AND the Header's "Graph" button displays an active state indicator

#### Scenario: No Consoles control
- GIVEN the application is displaying any view
- WHEN the Header is rendered
- THEN no "Consoles" button (`header-view-consoles`) is present
- AND no component named `ConsoleHubView` is referenced by the workspace view

#### Scenario: Header visual state indicates active view
- GIVEN the application is displaying any view (`editor` or `graph`)
- WHEN the Header is rendered
- THEN the button corresponding to the current `activeView` MUST indicate active status
- AND the other view button MUST indicate inactive status

---

### Requirement: Tree Node Selection Reactivity Across Workspace Views

Selecting any node, element, or concept in the `LeftSidebar` tree MUST immediately transition the application's `activeView` to `'editor'` if the current view is `'graph'` or any other non-editor view, and display/focus the selected element in the editor.
(Previously: `'consoles'` was among the non-editor views and had its own scenario.)

#### Scenario: Selecting a concept while viewing the Graph
- GIVEN the application's `activeView` is `'graph'`
- WHEN the user clicks on a concept or element in the `LeftSidebar` tree
- THEN `activeView` is updated to `'editor'`
- AND the editor main viewport displays the selected concept or element
- AND the Header view indicator updates to reflect `'editor'` as active

#### Scenario: Selecting a node while already in Editor view
- GIVEN the application's `activeView` is `'editor'`
- WHEN the user clicks on a concept or element in the `LeftSidebar` tree
- THEN `activeView` remains `'editor'`
- AND the editor main viewport displays the newly selected concept or element
