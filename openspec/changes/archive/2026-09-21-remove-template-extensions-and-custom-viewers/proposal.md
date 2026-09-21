# Proposal: Remove Template Extensions and Custom Viewers

## Intent

Eliminate the deprecated template extensions and custom viewers subsystem from `@cognnitive/innfo-editor`, `@cognnitive/innfo-core`, and template specifications. Specialized domain presentation is now handled exclusively via standalone interactive console artifacts (`assets/*.html` and `ConsoleHubView.vue`), removing tight UI coupling, dead extension adapters, and redundant schema declarations.

## Scope

### In Scope
- Remove `iNNfo/apps/innfo-editor/src/extensions/` directory and all associated registry/adapter code (`registry.ts`, `types.ts`, `workspaceAdapter.ts`, `manifest.json`, `useProjectGantt.ts`).
- Remove `ProjectGanttView.vue` and its unit tests.
- Clean up `ModelInfoPanel.vue` (remove "Template Extensions & Custom Viewers" UI section and computed properties).
- Clean up `WorkspaceView.vue`, `uiStore.ts`, and `useViewSync.ts` (remove `gantt-chart` from `ActiveView` and `VALID_VIEWS`).
- Remove `TemplateViewer` interface and `viewers?: TemplateViewer[]` from `SpecFrontmatter` in `innfo-core`.
- Remove `normalizeViewers` function from `innfo-core/src/parser/yaml.ts`.
- Clean up `viewers:` definitions from `iNNfo/specs/templates/projects/spec_NN.md` and test fixtures.
- Update documentation in `docs/innfo/`.

### Out of Scope
- Modifying existing console compilation procedures or adding new custom console generators.
- Adding backwards compatibility shims or fallback warnings for legacy `viewers:` blocks.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. **Delete obsolete extensions module & component**: Delete `iNNfo/apps/innfo-editor/src/extensions/` and `src/components/editor/ProjectGanttView.vue`.
2. **Refactor Editor Views & Stores**: Strip `gantt-chart` view route and UI extension inspection panels from `innfo-editor`.
3. **Clean Core AST & Parser**: Remove `TemplateViewer` type and `normalizeViewers` from `@cognnitive/innfo-core`.
4. **Update Specs & Documentation**: Remove `viewers:` blocks from template files and documentation.
5. **Verify**: Ensure all unit/component tests and repo integrity scripts pass.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/src/extensions/` | Removed | Deleted entire extensions subsystem |
| `iNNfo/apps/innfo-editor/src/components/editor/ProjectGanttView.vue` | Removed | Deleted legacy Gantt view component |
| `iNNfo/apps/innfo-editor/src/components/editor/ModelInfoPanel.vue` | Modified | Removed extension inspection cards |
| `iNNfo/apps/innfo-editor/src/views/WorkspaceView.vue` | Modified | Removed gantt-chart template block |
| `iNNfo/apps/innfo-editor/src/stores/uiStore.ts` | Modified | Removed `gantt-chart` from `ActiveView` |
| `iNNfo/apps/innfo-editor/src/composables/useViewSync.ts` | Modified | Removed `gantt-chart` from `VALID_VIEWS` |
| `iNNfo/apps/innfo-editor/tests/unit/extensions-registry.test.ts` | Removed | Deleted obsolete tests |
| `iNNfo/packages/innfo-core/src/types/parser.ts` | Modified | Removed `TemplateViewer` and `viewers` field |
| `iNNfo/packages/innfo-core/src/parser/yaml.ts` | Modified | Removed `normalizeViewers` |
| `iNNfo/packages/innfo-core/src/types/index.spec.ts` | Modified | Removed `viewers` assertions |
| `iNNfo/specs/templates/projects/spec_NN.md` | Modified | Removed `viewers:` frontmatter |
| `docs/innfo/template-package-spec.md` | Modified | Removed Semantic View Intent section |
| `docs/innfo/documentation/innfo-editor.md` | Modified | Removed extension registry docs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Broken imports in `innfo-editor` | Low | TypeScript compilation and Vitest suite verify all imports |
| Broken integrity check | Low | Run `node scripts/check-integrity.js` before completion |

## Rollback Plan

Revert git changes on `dev` via `git checkout HEAD -- <paths>`.

## Dependencies

- None

## Success Criteria

- [ ] `iNNfo/apps/innfo-editor/src/extensions/` is completely removed.
- [ ] `@cognnitive/innfo-core` typecheck and tests pass without `TemplateViewer`.
- [ ] `@cognnitive/innfo-editor` typecheck, component tests, and unit tests pass.
- [ ] Monorepo integrity check (`npm run check:integrity`) passes cleanly.
