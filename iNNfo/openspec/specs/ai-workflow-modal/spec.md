# AiWorkflowPanel Specification

## Purpose

Give the user a single "Use AI" entry point in the workspace header that opens a dedicated AI Guide view. The view renders the AI guide content (tools, steps with copyable prompts, roles) generated from `procedure_NN.md`, so the user can copy ready-made prompts for driving an AI agent against the workspace.

> Note: the traNNsform import/export feature (and the `ImportPanel`/`ExportPanel` tabs that used to sit alongside the guide) has been removed from the app. This spec was previously written for a tabbed modal with Guide/Import/Export tabs; it has been rewritten to match the current single-view implementation.

## Requirements

### R-AWM-01: Single Header Button

The workspace header MUST show a single "Use AI" button. Clicking it switches the workspace's active view to the AI Guide view. The button label is "Use AI" with a Sparkles icon.

#### Scenario: Click opens the AI Guide view
- GIVEN the workspace is open
- WHEN the user clicks "Use AI" in the header
- THEN the main workspace area switches to the AI Guide view (`AiWorkflowPanel`)
- AND the guide content is shown

#### Scenario: Button is always enabled (no workspace dependency)
- GIVEN no model is open (no workspace handle)
- WHEN the user clicks "Use AI"
- THEN the AI Guide view opens
- AND the user sees AI setup instructions without needing a workspace

### R-AWM-02: Guide-Only Content

`AiWorkflowPanel.vue` MUST render only the guide content — there is no tab switcher and no Import/Export content. It renders `AIGuidePanel.vue`, which shows the procedure guide parsed from `procedure_NN.md`, including Tools, Steps (accordions with copyable prompts), and Roles matrix.

#### Scenario: AI Guide view shows steps with copyable prompts
- GIVEN the AI Guide view is open
- WHEN the user clicks on a step to expand it
- THEN the step description and a copyable prompt (prefixed with "innfo:") are shown
- AND the Copy button copies the full prefixed prompt to clipboard

### R-AWM-03: View State

The AI Guide view's visibility is controlled by `uiStore.activeView`. Opening it sets `activeView` to `'ai-guide'`; no tab-specific state exists since there are no tabs.

```typescript
interface UiStoreAiState {
  activeView: ActiveView   // includes 'ai-guide' as one of the workspace views
}
```

### R-AWM-04: Copy Behavior

The Copy button on each expanded step MUST copy the full prefixed prompt (starting with "innfo:") to clipboard and show a brief "Copied" confirmation.

#### Scenario: Copy shows confirmation and fades
- GIVEN a step is expanded with a copyable prompt
- WHEN the user clicks Copy
- THEN "Copied" is shown next to the button
- AND the confirmation fades after a short timeout

### R-AWM-05: AiWorkflowPanel Renders Within WorkspaceView Layout

`AiWorkflowPanel.vue` is rendered inside `WorkspaceView.vue` as one of the workspace's main-area views (alongside Editor, Graph, Matrices, Info, etc.), selected via `uiStore.activeView === 'ai-guide'`. It is not an overlay/modal — it occupies the main content area like the other views, with no backdrop and no focus trap.

## Acceptance Criteria

- [ ] Single "Use AI" button in the header opens the AI Guide view
- [ ] `AiWorkflowPanel.vue` renders only guide content — no tabs, no Import, no Export
- [ ] Copy button on each expanded step copies the "innfo:"-prefixed prompt and shows "Copied"
- [ ] `AiWorkflowPanel` is rendered as a main-area view in `WorkspaceView.vue`, gated by `uiStore.activeView === 'ai-guide'`

## File Paths Affected

| File | Notes |
|------|-------|
| `apps/innfo-editor/src/components/editor/AiWorkflowPanel.vue` | Renders `AIGuidePanel` only |
| `apps/innfo-editor/src/components/layout/Header.vue` | "Use AI" button calls `uiStore.setActiveView('ai-guide')` |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Renders `AiWorkflowPanel` when `activeView === 'ai-guide'` |
| `apps/innfo-editor/src/stores/uiStore.ts` | `activeView` includes `'ai-guide'` |
