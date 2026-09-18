# AI Workflow Navigation

## Purpose
Provide intuitive, non-locking navigation between the AI workflow guide panel and the core model editor across the header, panel actions, and sidebar tree interactions.

## Requirements

### Requirement: Close and Back Navigation in AI Workflow Panel
`AiWorkflowPanel.vue` MUST provide an explicit navigation control in its header allowing the user to dismiss the AI Workflow view and return directly to the editor.

- The panel header MUST render a "Back to editor" / close action button.
- Clicking the back action MUST transition `uiStore.activeView` to `'editor'`.

#### Scenario: Rendering back button in AI Workflow Panel header
- GIVEN `activeView` is set to `'ai-guide'`
- WHEN `AiWorkflowPanel.vue` renders
- THEN it displays a return/close button (such as an arrow or X icon with "Back to editor" tooltip) in the panel header
- AND the button is accessible and interactive

#### Scenario: Dismissing AI Workflow panel via back button
- GIVEN the user is viewing `AiWorkflowPanel` (`activeView === 'ai-guide'`)
- WHEN the user clicks the "Back to editor" button
- THEN `uiStore.activeView` transitions to `'editor'`
- AND the main view area renders the model editor

---

### Requirement: Auto-reset of activeView to Editor on LeftSidebar Tree Node Selection
Selecting any concept or element node in the `LeftSidebar` tree MUST automatically transition `activeView` to `'editor'` when the AI Workflow guide is active.

- `uiStore.selectNode()` MUST check if `activeView.value === 'ai-guide'` and reset it to `'editor'`.
- This ensures immediate focus and display of the selected concept or element in the editor workspace without requiring manual panel closure.

#### Scenario: Selecting a sidebar tree node while AI guide is open
- GIVEN `activeView` is `'ai-guide'`
- WHEN the user clicks any concept or element node in `LeftSidebar`
- THEN `uiStore.selectNode(nodeId)` sets `selectedNodeId` to the clicked node ID
- AND `activeView` is automatically updated to `'editor'`
- AND the editor displays the selected node details

#### Scenario: Selecting a sidebar tree node while already in editor
- GIVEN `activeView` is `'editor'`
- WHEN the user clicks any node in `LeftSidebar`
- THEN `selectedNodeId` is updated to the clicked node ID
- AND `activeView` remains `'editor'`

---

### Requirement: Header "Use AI" Button Toggle Behavior
The "Use AI" button in `Header.vue` MUST toggle the active view between `'ai-guide'` and `'editor'`.

- If `activeView` is currently `'ai-guide'`, clicking the button MUST set `activeView` to `'editor'`.
- If `activeView` is not `'ai-guide'` (e.g. `'editor'`), clicking the button MUST set `activeView` to `'ai-guide'`.
- The button MUST visually indicate its active/toggled state when `activeView === 'ai-guide'`.

#### Scenario: Toggling AI guide open from editor
- GIVEN `activeView` is `'editor'`
- WHEN the user clicks the "Use AI" button in the header
- THEN `activeView` transitions to `'ai-guide'`
- AND the header button displays active styling

#### Scenario: Toggling AI guide closed from AI guide view
- GIVEN `activeView` is `'ai-guide'`
- WHEN the user clicks the "Use AI" button in the header
- THEN `activeView` transitions to `'editor'`
- AND the AI guide panel is replaced by the editor view
