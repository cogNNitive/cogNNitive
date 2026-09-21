# Tasks: Remove Template Extensions and Custom Viewers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single batch / PR on `dev` |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Remove extensions and clean core, editor, and specs | Single PR | Direct removal on `dev` |

## Phase 1: Core AST & Frontmatter Normalization

- [x] 1.1 Remove `TemplateViewer` and `viewers?: TemplateViewer[]` from `iNNfo/packages/innfo-core/src/types/parser.ts`.
- [x] 1.2 Remove `normalizeViewers` function and its call in `iNNfo/packages/innfo-core/src/parser/yaml.ts`.
- [x] 1.3 Remove `viewers` test assertion in `iNNfo/packages/innfo-core/src/types/index.spec.ts`.

## Phase 2: Editor Deletion & Clean-up

- [x] 2.1 Delete directory `iNNfo/apps/innfo-editor/src/extensions/` (`registry.ts`, `types.ts`, `workspaceAdapter.ts`, `projects/manifest.json`, `projects/useProjectGantt.ts`).
- [x] 2.2 Delete component `iNNfo/apps/innfo-editor/src/components/editor/ProjectGanttView.vue`.
- [x] 2.3 Delete test file `iNNfo/apps/innfo-editor/tests/unit/extensions-registry.test.ts`.
- [x] 2.4 Update `iNNfo/apps/innfo-editor/src/components/editor/ModelInfoPanel.vue` to remove extension UI and imports.
- [x] 2.5 Update `iNNfo/apps/innfo-editor/src/views/WorkspaceView.vue` to remove `gantt-chart` active view branch.
- [x] 2.6 Update `iNNfo/apps/innfo-editor/src/stores/uiStore.ts` to remove `'gantt-chart'` from `ActiveView`.
- [x] 2.7 Update `iNNfo/apps/innfo-editor/src/composables/useViewSync.ts` to remove `'gantt-chart'` from `VALID_VIEWS`.

## Phase 3: Template Specs & Documentation Clean-up

- [x] 3.1 Remove `viewers:` frontmatter block from `iNNfo/specs/templates/projects/spec_NN.md`.
- [x] 3.2 Remove `viewers:` frontmatter block from `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/templates/projects/spec_NN.md`.
- [x] 3.3 Update `docs/innfo/template-package-spec.md` and `docs/innfo/documentation/innfo-editor.md` to remove extension/viewer references.

## Phase 4: Verification & Integrity Gate

- [x] 4.1 Run unit and component test suites (`npm test` in `innfo-core` and `innfo-editor`).
- [x] 4.2 Run monorepo integrity gate (`node scripts/check-integrity.js`).
