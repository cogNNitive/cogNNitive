# innfo-console-runtime Delta Spec

## MODIFIED Requirements

### Requirement: Files Tab Registration and Navbar Ordering

The runtime (`nn-runtime.js`) MUST register a core view tab for workspace file inspection:
- `id`: `'files'`
- `title`: `'Files'`
- `icon`: `'folder'` (or `'files'`)
- `tone`: `'core'`
- `panelId`: `'nn-tab-files'`

Navbar Positioning:
The Files tab MUST be positioned in the navbar immediately after Knowledge and Changes (`Domain` -> `Knowledge` -> `Changes` -> `Files` -> `Matrices` -> ...).

Conditional Rendering:
The runtime MUST create and display the Files tab button only when `model.files` is present in the console payload and contains at least one inventory entry or origin. When `model.files` is omitted or empty, the Files tab and its panel MUST NOT be rendered.

View Scoping:
When the console is exported with a view scope targeting files (`meta.consoleScope.view === 'files'`), the runtime MUST mount the `#nn-tab-files` panel as the sole active view, suppressing other view tabs and the default explorer sidebar.
(Previously: the condition was an inventory entry or watch root.)

#### Scenario: Files tab registered after Changes in navbar
- GIVEN a domain payload with elements, changes, and `model.files`
- WHEN `nnConsole` boots
- THEN the navbar contains tab buttons for Domain, Knowledge, Changes, and Files in that sequential order
- AND the Files tab button carries class `tone-core`

#### Scenario: Files tab omitted when files payload is absent
- GIVEN a payload where `model.files` is undefined
- WHEN `nnConsole` mounts the view tabs
- THEN no "Files" tab button and no `#nn-tab-files` panel are created

#### Scenario: Files tab shown for origins only
- GIVEN a payload whose `model.files` has an empty inventory and one origin
- WHEN `nnConsole` mounts the view tabs
- THEN the Files tab and its panel are created

#### Scenario: Scoped console for files view
- GIVEN a console payload with `meta.consoleScope = { view: "files", label: "Files" }`
- WHEN `nnConsole` boots
- THEN only the Files view panel is mounted
- AND the concept rail and default search bar are dropped
