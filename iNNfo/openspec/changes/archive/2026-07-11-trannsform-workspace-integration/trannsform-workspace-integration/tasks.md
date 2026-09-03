# Tasks: traNNsform Workspace Integration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~630 (impl ~280, tests ~350) |
| 400-line budget risk | Medium (exceeds default 400) |
| Project review budget | 800 lines (per AGENTS.md) |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

Not needed — single PR under project 800-line budget.

## Phase 1: Foundation

- [x] 1.1 Extend `ActiveView` type in `stores/uiStore.ts` — add `'import' | 'export'` to union (RED: type-check test)
- [x] 1.2 Register `ImportPanel` + `ExportPanel` async imports in `views/WorkspaceView.vue`; add `v-else-if` branches for `'import'` and `'export'`

## Phase 2: Core Components (RED-first)

- [x] 2.1 Write failing tests for `ImportPanel.vue` — file detection (empty/missing/with files), copiable prompt with filenames, refresh button, copy confirmation (spec: import-panel scenarios 1-4)
- [x] 2.2 Create `apps/innfo-editor/src/components/editor/ImportPanel.vue` — scan `traNNsform/input/` via workspace handle, file list with metadata, copiable prompt referencing `AGENT.md`, refresh btn
- [x] 2.3 Write failing tests for `ExportPanel.vue` — model selector (single/multiple/none), prompt updates on model change, output status list, refresh (spec: export-panel scenarios 1-5)
- [x] 2.4 Create `apps/innfo-editor/src/components/editor/ExportPanel.vue` — model selector from modelStore, copiable prompt with output path (`output/`), scan `traNNsform/output/` for previous exports, refresh btn

## Phase 3: Core Wiring

- [x] 3.1 Modify `SetupWizard.vue:initWorkspaceStructure()` — change `.traNNsform/` → `traNNsform/` (visible), `outputs/` → `output/`, create `input/`, add fetch/download from `TRANSFORM_BASE_URL`, graceful failure (design: D1, D2; spec: file-system-ops scenarios 1-3)
- [x] 3.2 Modify `Header.vue` — add [Import] and [Export] buttons after [Use AI], each calls `uiStore.setActiveView()` (design: D3; spec: format-editor scenarios 1-2)
- [x] 3.3 Modify `AIGuidePanel.vue` — remove `ensureTemplates()`, `TRANSFORM_BASE_URL`, `downloadError`, `outputs/` refs; add `getDirectoryHandle('traNNsform')` existence check only (design: AIGuidePanel simplified; spec: file-system-ops + format-editor scenarios)

## Phase 4: traNNsform Folder

- [x] 4.1 Rename `traNNsform/outputs/` → `traNNsform/output/`; create `traNNsform/input/.gitkeep`
- [x] 4.2 Update `traNNsform/AGENT.md` — add Import flow section, reference defiNNe URL for model naming (not inline), define visualizer naming convention, add PLOM incremental import note; change `outputs/` → `output/`; remove bootstrap `outputs/` creation
- [x] 4.3 Update `traNNsform/README.md` — change `outputs/` → `output/`, add Import flow documentation

## Phase 5: Verification

- [x] 5.1 Run lint + typecheck + format on all changed files
- [x] 5.2 Run unit tests — verify all spec scenarios pass (file-system-ops, import-panel, export-panel, format-editor, traNNsform-folder)
- [x] 5.3 Verify no `.traNNsform/` or `outputs/` references remain in docs or UI code
- [ ] 5.4 Write + run Playwright E2E — create workspace via SetupWizard, verify traNNsform/ structure, click Import/Export buttons, verify panels render
