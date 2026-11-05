# Delta for innfo-console-runtime

Scope: register the "Files" view tab in the Domain Console navbar immediately following Changes (`Knowledge -> Changes -> Files`), coordinate tab switching and URL hash routing, and integrate canonical `nnUI.KuBadge` elements with cross-tab navigation.

## ADDED Requirements

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
The runtime MUST create and display the Files tab button only when `model.files` is present in the console payload and contains at least one inventory entry or watch root. When `model.files` is omitted or empty, the Files tab and its panel MUST NOT be rendered.

View Scoping:
When the console is exported with a view scope targeting files (`meta.consoleScope.view === 'files'`), the runtime MUST mount the `#nn-tab-files` panel as the sole active view, suppressing other view tabs and the default explorer sidebar.

#### Scenario: Files tab registered after Changes in navbar
- GIVEN a domain payload with elements, changes, and `model.files`
- WHEN `nnConsole` boots
- THEN the navbar contains tab buttons for Domain, Knowledge, Changes, and Files in that sequential order
- AND the Files tab button carries class `tone-core`

#### Scenario: Files tab omitted when files payload is absent
- GIVEN a payload where `model.files` is undefined
- WHEN `nnConsole` mounts the view tabs
- THEN no "Files" tab button and no `#nn-tab-files` panel are created

#### Scenario: Scoped console for files view
- GIVEN a console payload with `meta.consoleScope = { view: "files", label: "Files" }`
- WHEN `nnConsole` boots
- THEN only the Files view panel is mounted
- AND the concept rail and default search bar are dropped

### Requirement: Files Tab Switching and URL Hash Navigation

The runtime MUST coordinate view activation for the Files tab:
1. Activating the Files tab (via click or hash navigation) MUST add the active class / show `#nn-tab-files` and hide all other view panels (`#nn-tab-explorer`, `#nn-tab-matrices`, etc.).
2. State Preservation: Switching to another tab and returning to Files MUST NOT reset the state of the Files view (including tree category expansion, selected file, scroll position, or toggled Pipeline Flow mode).
3. URL Hash Navigation:
   - Selecting the Files tab MUST update the URL hash to `#files`.
   - Selecting a specific file in the explorer MUST update the hash to `#files&path=<encoded-path>`.
   - Booting the console with `#files` in the URL hash MUST activate the Files tab by default.
   - Booting with `#files&path=<encoded-path>` MUST activate the Files tab and pre-select the file corresponding to `<encoded-path>`.

#### Scenario: Clicking Files tab updates URL hash
- GIVEN the Knowledge tab is currently active
- WHEN the reviewer clicks the "Files" tab in the navbar
- THEN `#nn-tab-files` becomes the visible panel
- AND the URL hash changes to `#files`

#### Scenario: Deep link to specific file on load
- GIVEN the console URL contains `#files&path=sources%2Fresearch%2Fnotes.md`
- WHEN `nnConsole` boots
- THEN the Files tab is selected
- AND file `sources/research/notes.md` is selected in the tree and detail card

#### Scenario: State survives switching between tabs
- GIVEN the Files tab has the "Assets & Evidence" category expanded and Pipeline Flow toggled on
- WHEN the reviewer clicks the "Knowledge" tab and then clicks the "Files" tab again
- THEN the Pipeline Flow mode remains active
- AND the "Assets & Evidence" category remains expanded

### Requirement: KuBadge Integration and Cross-Tab Navigation

All knowledge units rendered within the Files view (including in reverse lineage traces, gap diagnostic panels, and pipeline stages) MUST be rendered using the canonical `ctx.ui.Ku` (`.nn-ku`) component:
1. Every unit badge MUST carry the unit label, concept-specific icon, and the '+' flyout button (`.nn-ku-more`).
2. All unit actions (`reveal`, `copy`, `info`) MUST delegate through `onAction(action, descriptor)`.
3. Activating the `reveal` action on a KuBadge in the Files view MUST:
   - Switch the active console tab to Knowledge (`#explorer`).
   - Clear any concept or search filters that would conceal the target element.
   - Scroll the element's card into view and expand it (`#el-<id>`).

#### Scenario: Reverse lineage displays canonical KuBadge
- GIVEN an artifact detail card displaying upstream units
- WHEN the reverse lineage section renders
- THEN each unit is wrapped in `.nn-ku-wrap` with `.nn-ku`
- AND carries `data-nn-component="ku-unit"` and the '+' flyout button

#### Scenario: KuBadge reveal action switches to Knowledge tab
- GIVEN an artifact reverse lineage section showing unit badge for `Goal: Global Growth`
- WHEN the reviewer clicks the `reveal` action on the unit badge
- THEN the console switches to the Knowledge tab
- AND scrolls to `#el-goal-global-growth`
- AND the card is expanded and highlighted
