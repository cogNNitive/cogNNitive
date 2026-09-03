# Design: iNNfo Ecosystem Consolidation

## Technical Approach

Three layers, mostly isolated: (1) actioNN repo — router metadata and orchestrator mode (items 1, 11, 10); (2) iNNfo Vue/TS — prompt prefixing, workflow references, unified modal (items 2–9); (3) traNNsform files — simplified AGENT.md, new workflow files (items 8, 5, 6). Layers (1) and (3) are directly editable files. Layer (2) is the focus: replace 3 header buttons + 3 full-page panel views with a single "Use AI" button that opens a tabbed modal (Guide | Import | Export).

## Architecture Decisions

### Decision 1: Modal with tabs vs separated panels

| Option | Tradeoff |
|--------|----------|
| **Modal + tabs (chosen)** | Does not disrupt editor context; transient actions stay transient; 1 component replaces 3 full-page views |
| Keep separate full-page panels | No state isolation concerns; but breaks editing flow — full context switch for each action |
| Sectioned single page | All three sections on one scroll; overwhelming for the user since Guide is read-once but Import/Export are iterative |

**Choice**: New `AiWorkflowModal.vue` with three tabs (Guide, Import, Export). Single button in Header opens it. The three old `activeView` slots (`ai-guide`, `import`, `export`) in WorkspaceView.vue are replaced — the modal overlays instead. **Rationale**: All three actions are secondary to editing — the user copies a prompt then returns to the editor. Full-page views force an unnecessary context switch.

### Decision 2: State stays local per tab

| Option | Tradeoff |
|--------|----------|
| **Local state (chosen)** | Each tab keeps its own `ref()`s. No shared store needed. Guide has zero mutable state; Import/Export are independent (different FS dirs, different prompts) |
| Shared Pinia store | Adds ceremony for no shared concern. The only common dependency (`workspaceStore`) is already a singleton |

**Choice**: Each tab is a child component inside `AiWorkflowModal.vue` with local reactive state. No new store. **Rationale**: YAGNI. The panels have zero overlapping state — Import scans `input/`, Export scans `output/`, Guide reads static data.

### Decision 3: Shared `innfoPrompt()` utility for prefix

| Option | Tradeoff |
|--------|----------|
| **Shared utility (chosen)** | Single `innfoPrompt(content: string)` in `src/ai-guide/prompt.ts`. All prompt sites call it. Prefix changes in one place |
| Inline prefix per file | 5+ files each with `"innfo: " + ...` — error-prone, inconsistent |
| Prefix at clipboard layer | Hidden behavior — user copying a prompt doesn't expect hidden mutation |

**Choice**: Create `prompt.ts` with `innfoPrompt()`. Use in `guide.ts`'s `extractPrompt()`, ImportPanel's `agentPrompt` computed, ExportPanel's `exportPrompt` computed, and ExportNavigator's step 2. The `procedure_NN.md` instructions update inline (markdown has no runtime). **Rationale**: Single source of truth for the trigger prefix, trivially testable.

### Decision 4: SetupWizard downloads workflow files

| Option | Tradeoff |
|--------|----------|
| **SetupWizard (chosen)** | Consistent with existing pattern — wizard downloads `AGENT.md`, templates, snippets. Adding 2 workflow files to the fetch list is trivial |
| Agent creates on demand | More agent overhead; bootstrap logic leaks into runtime |
| Components create on mount | UI component should not write files to the workspace — that's a wizard/agent concern |

**Choice**: SetupWizard's `initWorkspaceStructure()` creates `traNNsform/workflows/` directory and downloads `export.workflow.md` + `import.workflow.md`. **Rationale**: Follows established pattern. Zero new infrastructure.

### Decision 5: Repo AGENT.md is the simplified version

| Option | Tradeoff |
|--------|----------|
| **Simplify repo file (chosen)** | New workspaces get the pointer automatically via SetupWizard download. Old workspaces keep the old file (no migration needed — agent still works) |
| Keep repo file, let agent simplify on first access | Complex bootstrap logic; dual maintenance |

**Choice**: Replace `traNNsform/AGENT.md` content with a short pointer to `workflows/`. **Rationale**: Workspace creation is a one-shot event — the correct file should be there from the start.

## Data Flow

```
Header.vue                      WorkspaceView.vue
 ┌──────────────────────┐       ┌────────────────────────────┐
 │ Use AI [btn]     │───clickbb──→  │  AiWorkflowModal.vue     │
 │ (was 3 buttons)  │            │  ┌──────────────────────┐  │
 └──────────────────────┘            │  │ Guide Tab  │       │  │
                                 │  │ Import Tab │→ reads  │  │
uiStore.showAiModal ──────────────→  │  │ Export Tab │→'workspaceStore  │
                                 │  └──────────────────────┘  │
                                 │  Close → uiStore.show      │
                                 │          AiModal = false    │
                                 └────────────────────────────┘

Prompt generation flow:
  guide.ts extractPrompt() ──→ innfoPrompt() ──→ "innfo: Load the..."
  ImportPanel agentPrompt    ──→ innfoPrompt() ──→ "innfo: I need to import..."
  ExportPanel exportPrompt   ──→ innfoPrompt() ──→ "innfo: I need to generate..."
  ExportNavigator step 2     ──→ innfoPrompt() ──→ "innfo: I need to generate..."
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/ai-guide/prompt.ts` | **Create** | Shared `innfoPrompt()` utility |
| `apps/innfo-editor/src/ai-guide/guide.ts` | Modify | Wrap `extractPrompt()` return values with `innfoPrompt()` |
| `apps/innfo-editor/src/ai-guide/procedure_NN.md` | Modify | Add `innfo:` prefix to instruction text (3 lines) |
| `apps/innfo-editor/src/components/editor/AIGuidePanel.vue` | Refactor | Merge content into AiWorkflowModal Guide tab |
| `apps/innfo-editor/src/components/editor/ImportPanel.vue` | Refactor | Merge content into AiWorkflowModal Import tab; ref `workflows/import.workflow.md`; wrap prompt with `innfoPrompt()` |
| `apps/innfo-editor/src/components/editor/ExportPanel.vue` | Refactor | Merge content into AiWorkflowModal Export tab; ref `source.path` + `workflows/export.workflow.md`; wrap prompt with `innfoPrompt()` |
| `apps/innfo-editor/src/components/editor/ExportNavigator.vue` | Modify | Wrap prompt in step 2 with `innfoPrompt()` |
| `apps/innfo-editor/src/components/editor/AiWorkflowModal.vue` | **Create** | Tabbed modal container — Guide, Import, Export tabs |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modify | Replace 3 buttons with 1 "Use AI" button |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modify | Remove `ai-guide`, `import`, `export` view slots and their lazy imports; remove `activeView` conditionals for those views |
| `apps/innfo-editor/src/stores/uiStore.ts` | Modify | Add `showAiModal` ref; optionally remove `'ai-guide' | 'import' | 'export'` from `ActiveView` (backward-compat) |
| `traNNsform/AGENT.md` | Modify | Simplify to short pointer referencing workflow files |
| `traNNsform/workflows/export.workflow.md` | **Create** | Export pipeline stages (from `workflow-format.md`) |
| `traNNsform/workflows/import.workflow.md` | **Create** | Import pipeline stages (from `workflow-format.md`) |
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | Modify | Add `workflows/` dir creation and 2 workflow file downloads |

## Interfaces / Contracts

```typescript
// src/ai-guide/prompt.ts
/** Prepends the "innfo:" trigger that activates the nn-router. */
export function innfoPrompt(content: string): string {
  return `innfo: ${content}`
}

// uiStore additions
export interface AiModalState {
  showAiModal: boolean
  activeAiTab: 'guide' | 'import' | 'export'
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `innfoPrompt()` prepends "innfo: " correctly | Vitest — 1 test, trivial |
| Unit | Prompt content in each panel includes prefix | Vitest — mock `innfoPrompt`, assert calls |
| Integration | Modal opens and tab switches render correct content | Playwright — click "Use AI", verify tab content |
| Integration | Copy button in modal copies prefixed prompt | Playwright — stub clipboard API, assert content starts with "innfo:" |
| Integration | SetupWizard creates workflow files | Playwright — run wizard, verify `workflows/` exists |

## Migration / Rollout

No migration required. Old workspaces:
- Keep the old `AGENT.md` (agent can still read it alongside new workflow files)
- Keep the old 3 buttons in the header (but the new code replaces them — this is a clean replacement)
- Old export/import panels in `activeView` are removed from `WorkspaceView.vue` but the `.vue` files remain importable for backward compat (remove clean-up if they're unused after 2 releases)

## Open Questions

- [ ] Should we keep `'ai-guide' | 'import' | 'export'` in `ActiveView` after removing their view slots? Removing them cleans up the union but breaks any external code or bookmarks that reference `uiStore.setActiveView('ai-guide')`. Keep them as deprecated members for 1 release, then remove.
- [ ] AIGuidePanel, ImportPanel, ExportPanel — best approach: keep them as standalone components and embed each inside the modal tab slot, or extract their content inline into the modal? Current proposal: keep as standalone components, embed each inside the modal's tab slot. This preserves their independent testability and avoids one massive file.
