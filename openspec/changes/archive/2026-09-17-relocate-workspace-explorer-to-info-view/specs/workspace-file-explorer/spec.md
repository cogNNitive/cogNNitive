# Workspace File Explorer

## Purpose
Embed a streamlined workspace file explorer into the Workspace Info view, providing direct filesystem tree navigation, search, and file preview without category filter clutter.

## Requirements

### Requirement: Workspace File Explorer Placement in Info View
The workspace file tree MUST be embedded within the Workspace Info view accessible via the header `(i)` button, rather than the left sidebar.

#### Scenario: Navigating to Info view file tree
- GIVEN a workspace is open in `innfo-editor`
- WHEN the user clicks the Header `(i)` Info button
- THEN the Info view opens
- AND the workspace file explorer component is rendered alongside workspace metadata

---

### Requirement: Streamlined Unfiltered Directory Tree
`WorkspaceExplorer.vue` MUST render a direct, unfiltered filesystem tree hierarchy supporting search filtering and tree refresh:
1. It MUST NOT display category filter buttons or chips (e.g. models, sources, artifacts filters).
2. It MUST provide a search input to filter files by filename.
3. It MUST support recursive expansion and collapsing of directories.

#### Scenario: Rendering file explorer without category filter chips
- GIVEN the user views the Workspace Info view
- WHEN `WorkspaceExplorer.vue` renders
- THEN the full directory structure is displayed
- AND category filter buttons (models, sources, artifacts) are not displayed

#### Scenario: Searching within workspace files
- GIVEN the file explorer is rendered in the Info view
- WHEN the user types a query into the search input
- THEN the tree filters visible nodes to matching files and ancestor folders

---

### Requirement: File Inspection and Opening
`WorkspaceExplorer.vue` MUST support interactive file inspection:
1. Clicking a recognized model file MUST open and focus that model in the editor.
2. Clicking a non-model or raw text/markdown file MUST open a file preview dialog showing file content.

#### Scenario: Opening a model file from explorer
- GIVEN the user is viewing the file tree in Info view
- WHEN the user clicks a model file (`*.md`)
- THEN the editor loads and focuses the selected model

#### Scenario: Previewing a raw file
- GIVEN the user is viewing the file tree in Info view
- WHEN the user clicks a non-model file (e.g. configuration or raw asset)
- THEN a preview modal opens displaying the file's content
