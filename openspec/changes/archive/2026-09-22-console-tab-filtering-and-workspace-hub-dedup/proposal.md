# Proposal: Console Tab Filtering and Workspace Hub Deduplication

## Intent

Prevent `ConsoleHubView.vue` from exposing internal schema nodes (`spec:*`, `template:*`) and duplicating the workspace root manifest as generic model console tabs, ensuring the console navigation bar cleanly displays only the "Workspace Hub" and concrete domain model consoles.

## Scope

### In Scope
- Filter `discoveredModels` in `ConsoleHubView.vue` to exclude internal specs (`spec:*`, `template:*`) and workspace manifest root models.
- Ensure the "Workspace Hub" tab remains the single canonical entrypoint for workspace aggregation deliverables.
- Add component tests asserting exclusion of internal spec nodes and workspace root models from console switcher tabs.

### Out of Scope
- Modifying how `modelStore.rootIds` stores internal nodes for graph/editor views.
- Changing `compile_workspace_hub_NN.md` or template compiler scripts.

## Capabilities

### Modified Capabilities
- `innfo-console-runtime`: Exclude metamodels and workspace roots from the interactive console model switcher.

## Approach

Update the `discoveredModels` computed property in `iNNfo/apps/innfo-editor/src/components/editor/ConsoleHubView.vue` with a clean filter predicate:
1. Ignore IDs starting with `spec:` or `template:`.
2. Ignore nodes whose type or template is `workspace` or whose source path matches `workspace_NN.md` / `index.md`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/src/components/editor/ConsoleHubView.vue` | Modified | Filter out internal specs and workspace root from discovered console tabs |
| `iNNfo/apps/innfo-editor/tests/component/ConsoleHubView-open-external.test.ts` | Modified | Add test coverage for filtered console tab discovery |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legitimate domain models unintentionally excluded | Low | Predicate strictly matches `spec:`/`template:` prefix and explicit workspace template/path conventions |

## Rollback Plan

Revert changes to `ConsoleHubView.vue` and associated component tests via git.

## Dependencies

- None

## Success Criteria

- [ ] Internal specs (e.g. `spec:workspace`) do not generate tabs in `ConsoleHubView`.
- [ ] Workspace manifest models (e.g. `INNTrevistas Workspace`) do not generate duplicate model tabs alongside `Workspace Hub`.
- [ ] Concrete domain models (e.g. `INNTrevistas - Innovaciones Y Creadores De La Historia`) render their console tabs properly.
- [ ] All unit and component tests pass.
