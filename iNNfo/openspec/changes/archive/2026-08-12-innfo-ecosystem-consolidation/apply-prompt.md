# Apply Prompt: iNNfo Ecosystem Consolidation

Copy and paste this entire prompt into a **new** conversation to run the implementation.

---

## System: SDD Apply — iNNfo Ecosystem Consolidation

### 0. Load the skill

Load the `sdd-apply` skill now.

### 1. Change Overview

**Name**: `innfo-ecosystem-consolidation`
**Project**: iNNfo (`D:\Users\lucas\Documents\GitHub\innV0\iNNfo`)
**Goal**: Unify the iNNfo skill ecosystem so everything triggers from the single keyword "innfo". Three layers:

1. **Prompt prefix** — all generated prompts start with `innfo:` to activate the `nn-router`
2. **Workflow files** — split `traNNsform/AGENT.md` into structured pipeline workflow files in a new `workflows/` subdirectory
3. **Unified modal** — replace 3 full-page panel views (Guide, Import, Export) + 3 header buttons with a single "Use AI" button and a tabbed modal

### 2. Read All Artifacts

Read these files for full context before starting implementation:

- `openspec/changes/innfo-ecosystem-consolidation/proposal.md` — intent, scope, affected areas
- `openspec/changes/innfo-ecosystem-consolidation/design.md` — architecture decisions, file changes, data flow
- `openspec/changes/innfo-ecosystem-consolidation/tasks.md` — full task breakdown across 6 phases

**Spec/delta files** (detailed requirements per component):

| File | What it specifies |
|------|------------------|
| `openspec/specs/ai-workflow-modal/spec.md` | Modal requirements — tabs, state, close behaviour, focus trap, copy |
| `openspec/specs/workflow-definitions/spec.md` | Both workflow pipeline files — stages, scenarios, frontmatter |
| `openspec/changes/innfo-ecosystem-consolidation/specs/export-prompt-delta.md` | ExportPanel + ExportNavigator prompt changes (exact prompt text) |
| `openspec/changes/innfo-ecosystem-consolidation/specs/import-prompt-delta.md` | ImportPanel prompt changes (exact prompt text) |
| `openspec/changes/innfo-ecosystem-consolidation/specs/guide-prompts-delta.md` | guide.ts + procedure_NN.md prefix changes (exact old/new text) |
| `openspec/changes/innfo-ecosystem-consolidation/specs/trannsform-folder-delta.md` | AGENT.md pointer, workflow file creation, SetupWizard changes |

### 3. Execution Order

Execute tasks **in phase order** following `tasks.md`. Dependencies:

- **Phase 1** (prompt.ts utility) must come before Phases 3 and 5
- **Phase 2** (workflow files) must come before Phase 6 (SetupWizard)
- **Phases 4** (skills) and **2** (workflow files) are independent — can run in parallel with 3 and 5
- **Phase 6** (SetupWizard) depends on Phase 2

### 4. Key Technical Details

**Two repos are affected:**

| Repo | Path | Files |
|------|------|-------|
| iNNfo | `D:\Users\lucas\Documents\GitHub\innV0\iNNfo` | Everything in `apps/innfo-editor/` and `traNNsform/` |
| actioNN | `D:\Users\lucas\Documents\GitHub\innV0\actioNN` | `skills/nn-router/SKILL.md`, `skills/nn-workflow-orchestrator/SKILL.md` |

**Shared utility** (`apps/innfo-editor/src/ai-guide/prompt.ts`):
```typescript
export function innfoPrompt(content: string): string {
  return `innfo: ${content}`
}
```

**Router change** (`actioNN/skills/nn-router/SKILL.md`):
- Remove `disable-model-invocation: true` from frontmatter
- Add `innfo` as a model-invoked trigger (it already has a model-invoked section — add the trigger text there)

**Orchestrator change** (`actioNN/skills/nn-workflow-orchestrator/SKILL.md`):
- Add a "direct-execution" branch: loads a workflow file and runs stages sequentially without interactive prompts

**`uiStore.ts` additions**:
```typescript
showAiModal: boolean
activeAiTab: 'guide' | 'import' | 'export'
```

### 5. Verification

After each phase, run:
- `npm run lint` — linter check
- `npm run typecheck` — TypeScript type checking
- Tests relevant to the changed files

After Phase 6 (all done):
- `npm run test -- --coverage` — full test suite with coverage
- `npm run format` — formatting pass

### 6. Chained PR Strategy

The change is estimated at ~650-700 lines — it exceeds the 400-line review budget.

**Split into 3 stacked PRs to main:**

| PR | Phases | Est. lines | Contents |
|----|--------|-----------|----------|
| PR 1 | Phase 1 + 3 | ~180 | prompt.ts utility + all 5 prompt updates + tests |
| PR 2 | Phase 2 + 4 + 6 | ~250 | workflow files, AGENT.md pointer, router + orchestrator, SetupWizard |
| PR 3 | Phase 5 | ~260 | AiWorkflowModal, uiStore, Header, WorkspaceView, Playwright tests |

Each PR merges to `main`. Create them sequentially — PR 1 first, then PR 2, then PR 3 after PR 1 and 2 are merged.

### 7. Files Summary

| File | Action | Repo |
|------|--------|------|
| `apps/innfo-editor/src/ai-guide/prompt.ts` | **Create** | iNNfo |
| `apps/innfo-editor/src/ai-guide/guide.ts` | Modify | iNNfo |
| `apps/innfo-editor/src/ai-guide/procedure_NN.md` | Modify | iNNfo |
| `apps/innfo-editor/src/components/editor/ExportPanel.vue` | Modify | iNNfo |
| `apps/innfo-editor/src/components/editor/ImportPanel.vue` | Modify | iNNfo |
| `apps/innfo-editor/src/components/editor/ExportNavigator.vue` | Modify | iNNfo |
| `apps/innfo-editor/src/components/editor/AiWorkflowModal.vue` | **Create** | iNNfo |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modify | iNNfo |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modify | iNNfo |
| `apps/innfo-editor/src/stores/uiStore.ts` | Modify | iNNfo |
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | Modify | iNNfo |
| `traNNsform/AGENT.md` | Modify | iNNfo |
| `traNNsform/workflows/export.workflow.md` | **Create** | iNNfo |
| `traNNsform/workflows/import.workflow.md` | **Create** | iNNfo |
| `skills/nn-router/SKILL.md` | Modify | actioNN |
| `skills/nn-workflow-orchestrator/SKILL.md` | Modify | actioNN |

---

Go ahead and execute Phase 1 first. Read each spec/delta file for the detailed requirements of each task.
