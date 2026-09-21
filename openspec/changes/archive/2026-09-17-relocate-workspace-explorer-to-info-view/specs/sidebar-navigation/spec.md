# Sidebar Navigation

## Purpose
Dedicate the primary left sidebar navigation to semantic model browsing and structural representations, removing raw filesystem tree toggles.

## Requirements

### Requirement: Semantic View Switching in Left Sidebar
`LeftSidebar.vue` MUST provide view switching exclusively among semantic model view modes:
- `editor`: Model tree and element navigation.
- `graph`: Visual workspace graph.
- `consoles`: Execution consoles and interactive tools.

The sidebar switcher MUST NOT render an `explorer` button or toggle file tree panels.

#### Scenario: View switcher rendering in LeftSidebar
- GIVEN a user opens the application with a loaded workspace
- WHEN `LeftSidebar.vue` renders
- THEN it displays switcher buttons for `editor`, `graph`, and `consoles`
- AND no switcher button for `explorer` is rendered

#### Scenario: Switching between semantic views
- GIVEN the user is on the `editor` view
- WHEN the user clicks the `graph` view button
- THEN the active view mode transitions to `graph`
- AND the sidebar renders the graph representation

---

### Requirement: Left Sidebar Content Isolation
`LeftSidebar.vue` MUST render only semantic concept trees, element lists, and model navigation when in `editor` view mode. It MUST NOT embed raw filesystem trees.

#### Scenario: Editor mode sidebar content
- GIVEN `activeView` is set to `'editor'`
- WHEN `LeftSidebar.vue` renders the active panel
- THEN the semantic concept and element hierarchy is displayed
- AND no filesystem hierarchy is present in the sidebar
