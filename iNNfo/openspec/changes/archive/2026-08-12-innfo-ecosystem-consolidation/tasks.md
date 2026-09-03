# Tasks: iNNfo Ecosystem Consolidation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650-700 (total across 3 PRs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (prompt foundation) → PR 2 (workflow + skills) → PR 3 (unified modal) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending — ask user before apply |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Prompt prefix foundation | PR 1 | `innfoPrompt()` utility + all 5 prompt sites wired; base = main |
| 2 | Workflow files + skills | PR 2 | 2 workflow files, AGENT.md pointer, router + orchestrator updates, SetupWizard; base = main |
| 3 | Unified modal | PR 3 | AiWorkflowModal.vue, uiStore, Header button, WorkspaceView slot removal, Playwright tests; base = main |

## Phase 1: Foundation — prompt.ts Utility

- [x] 1.1 Create `apps/innfo-editor/src/ai-guide/prompt.ts` with `export function innfoPrompt(content: string): string`
- [x] 1.2 Write Vitest unit test: `innfoPrompt()` prepends `"innfo: "` to any string
- [x] 1.3 Run `npm run lint` + `npm run typecheck` on `apps/innfo-editor`

## Phase 2: Workflow Files + AGENT.md Pointer

- [x] 2.1 Create `traNNsform/workflows/export.workflow.md` — 7-stage export pipeline (scan → read template → generate → chart → write → embed → confirm)
- [x] 2.2 Create `traNNsform/workflows/import.workflow.md` — 7-stage import pipeline (scan → classify → normalize → detect → generate → validate → confirm)
- [x] 2.3 Replace `traNNsform/AGENT.md` content with short pointer referencing `workflows/export.workflow.md` and `workflows/import.workflow.md`

## Phase 3: Prompt Updates (apps/innfo-editor)

- [x] 3.1 Wrap `guide.ts` `extractPrompt()` 3 return values with `innfoPrompt()`
- [x] 3.2 Add `innfo:` prefix to 3 instruction lines in `procedure_NN.md` (lines 48, 57, 75)
- [x] 3.3 Update `ExportPanel.vue` — use `innfoPrompt()`, change model ref to `source.path`, change workflow ref to `workflows/export.workflow.md`
- [x] 3.4 Update `ImportPanel.vue` — use `innfoPrompt()`, change workflow ref to `workflows/import.workflow.md`, remove skill/MCP sentences
- [x] 3.5 Update `ExportNavigator.vue` — wrap step 2 prompt with `innfoPrompt()`
- [x] 3.6 Write Vitest unit test: each panel's prompt starts with `"innfo:"`
- [x] 3.7 Run `npm run lint` + `npm run typecheck` + `npm run test` on `apps/innfo-editor`

## Phase 4: Skills (actioNN repo)

- [x] 4.1 Update `skills/nn-router/SKILL.md` — remove `disable-model-invocation: true`, add model-invoked trigger for "innfo"
- [x] 4.2 Update `skills/nn-workflow-orchestrator/SKILL.md` — add direct-execution mode branch (load workflow file → run stages sequentially without asking user for each step)

## Phase 5: Unified Modal

- [x] 5.1 Add `showAiModal: boolean` and `activeAiTab: 'guide' | 'import' | 'export'` to `uiStore.ts`
- [x] 5.2 Create `AiWorkflowModal.vue` — tabbed modal with Guide, Import, Export tabs; close on Escape/backdrop/X; focus trap
- [x] 5.3 Replace 3 header buttons (Guide, Import, Export) with single "Use AI" button in `Header.vue`; wire to `uiStore.showAiModal`
- [x] 5.4 Remove `ai-guide`, `import`, `export` view slots from `WorkspaceView.vue`; render AiWorkflowModal; keep `'ai-guide' | 'import' | 'export'` in `ActiveView` union as deprecated
- [x] 5.5 Write Playwright integration test: modal opens on "Use AI" click; tab switch renders correct content; Escape closes modal
- [x] 5.6 Write Playwright test: Copy button in each tab copies `"innfo:"`-prefixed prompt; "Copied" confirmation shows/hides
- [x] 5.7 Run `npm run test` (399/402 pass, 3 pre-existing unrelated failures in AIGuidePanel-steps.test.ts) + `npm run lint` (no errors in apps/innfo-editor) + `npm run typecheck` (pass)

## Phase 6: SetupWizard

- [x] 6.1 Add `traNNsform/workflows/` dir creation and `export.workflow.md` + `import.workflow.md` downloads to `SetupWizard.vue` `initWorkspaceStructure()`
- [x] 6.2 Write integration test: new workspace includes workflow files with valid content
- [x] 6.3 Run full verification suite: `npm run lint` + `npm run typecheck` + `npm run test -- --coverage`
