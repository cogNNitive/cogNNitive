# Proposal: iNNfo Ecosystem Consolidation

## Intent

Unify the iNNfo skill ecosystem after a major refactoring session that applied the "writing-great-skills" framework. Already-implemented skills changes (router creation, skill splits, merges, refactors) now need the UI, prompts, workflow files, and agent entry points to match — so the whole system works as a coherent whole triggered by the single keyword "innfo".

## Scope

### In Scope

- Make `nn-router` model-invoked (triggers on "innfo")
- Add "innfo:" prefix to all generated prompts (4 Vue files + guide.ts + procedure_NN.md)
- Fix ExportPanel prompt to use `source.path` + workflow reference
- Fix ImportPanel prompt to reference `workflows/import.workflow.md` instead of `AGENT.md`
- Create `traNNsform/workflows/{export,import}.workflow.md`
- Add direct-execution mode to `nn-workflow-orchestrator`
- Update SetupWizard to download workflow files
- Simplify `traNNsform/AGENT.md` to a pointer
- Unify Import/Export/UseAI into single modal (replace 3 buttons + 3 panels)
- Update `nn-router/SKILL.md` metadata (remove `disable-model-invocation`)

### Out of Scope

- Vue component implementation for unified modal (design phase)
- Changes to `nn-trannsform` or `nn-innfo` skills
- Modifications to workflow-orchestrator reference files
- Skills outside actioNN repo

## Capabilities

### New Capabilities

- `ai-workflow-modal`: Single entry point that replaces 3 separate panels (AIGuidePanel, ImportPanel, ExportPanel) with a unified tabbed/modaled UI
- `workflow-definitions`: Standardized workflow files (`export.workflow.md`, `import.workflow.md`) that define staged pipelines consumable by agent and orchestrator

### Modified Capabilities

- `export-panel`: Copiable prompt changes — uses `innfo:` prefix, references `source.path` and `workflows/export.workflow.md` instead of `AGENT.md` + skill name
- `import-panel`: Copiable prompt changes — references `workflows/import.workflow.md` instead of `AGENT.md`
- `traNNsform-folder`: AGENT.md simplified to pointer; adds `workflows/` subdirectory containing pipeline definitions

## Approach

Apply changes across 3 layers in parallel: (1) actioNN router metadata, (2) iNNfo Vue/TS prompt sources, (3) traNNsform workflow + AGENT.md files. No structural refactors needed — each affected file has a targeted string replacement or addition.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-router/SKILL.md` | Modified | Model-invoked, remove `disable-model-invocation` |
| `apps/innfo-editor/src/components/editor/ExportPanel.vue` | Modified | Prompt uses `innfo:` + workflow reference |
| `apps/innfo-editor/src/components/editor/ImportPanel.vue` | Modified | Prompt references workflow file |
| `apps/innfo-editor/src/components/editor/ExportNavigator.vue` | Modified | Prefixed prompt in step 2 |
| `apps/innfo-editor/src/ai-guide/guide.ts` | Modified | 3 prompt templates use `innfo:` prefix |
| `apps/innfo-editor/src/ai-guide/procedure_NN.md` | Modified | Instruction text updated |
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | Modified | Downloads workflow files |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modified | 3 buttons → 1 button + new modal |
| `apps/innfo-editor/src/components/editor/AIGuidePanel.vue` | Modified | Extends into unified modal |
| `traNNsform/AGENT.md` | Modified | Simplified to pointer |
| `traNNsform/workflows/export.workflow.md` | New | Export pipeline stages |
| `traNNsform/workflows/import.workflow.md` | New | Import pipeline stages |
| `skills/nn-workflow-orchestrator/SKILL.md` | Modified | Add direct-execution mode |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unified modal breaks workspace view navigation | Med | Keep old views importable behind feature flag; test workspace view first |
| AGENT.md pointer breaks existing agent workflows | Low | Old content is moved into workflow files, not deleted |

## Rollback Plan

Revert in reverse order: (1) Restore AGENT.md from git, (2) revert workflow files, (3) revert prompt changes per file, (4) restore router metadata.

## Dependencies

- actioNN repo accessible for router change
- Workflow format (`_NN` format) already defined in `nn-workflow-orchestrator/reference/workflow-format.md`

## Success Criteria

- [ ] Router auto-loads when user types "innfo"
- [ ] All generated prompts start with "innfo:"
- [ ] ExportPanel prompt uses `source.path` + `workflows/export.workflow.md`
- [ ] ImportPanel prompt uses `workflows/import.workflow.md`
- [ ] Workflow files exist in `traNNsform/workflows/` and pass template validation
- [ ] AGENT.md is a simple pointer
- [ ] SetupWizard downloads workflow files on init
- [ ] Single "Use AI" button replaces 3 separate controls in workspace header
