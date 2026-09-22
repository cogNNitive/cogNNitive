# Design: Console Tab Filtering and Workspace Hub Deduplication

## Technical Approach

`ConsoleHubView.vue` discovers model console tabs by mapping over `modelStore.rootIds`. We introduce a clean filtering step before mapping to ensure only concrete domain models produce console tabs:
1. Filter out all root IDs that start with `spec:` or `template:`.
2. Filter out root nodes representing the workspace manifest itself (where `node.type === 'workspace'`, the template evaluates to `workspace`, or the source path points to `workspace_NN.md` / `index.md`).

## Architecture Decisions

### Decision: Filter at View Level (`ConsoleHubView.vue`) vs Modifying `modelStore.rootIds`

**Choice**: Filter inside `ConsoleHubView.vue`'s `discoveredModels` computed property.
**Alternatives considered**: Filtering `modelStore.rootIds` directly in `modelStore.ts` or `useUrlDocLoader.ts`.
**Rationale**: `modelStore.rootIds` is the core graph state containing all loaded root entities, including specs and workspace manifests needed by the Editor, Graph View, and Metamodel Explorer. Filtering at the presentation layer (`ConsoleHubView.vue`) preserves the complete store integrity while solving the deliverable presentation concern.

### Decision: Dedicated "Workspace Hub" Tab vs Dynamic Workspace Tab

**Choice**: Keep "Workspace Hub" as the single fixed workspace portal tab and exclude workspace manifest from `discoveredModels`.
**Alternatives considered**: Removing "Workspace Hub" and letting the workspace manifest generate a dynamic tab.
**Rationale**: The Workspace Hub is a distinct deliverable format with built-in batch prompt generation, iframe embedding, and aggregation across all models. Having a static "Workspace Hub" tab aligns with the canonical `compile_workspace_hub_NN.md` procedure and avoids confusion.

## File Changes

| File | Change | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/src/components/editor/ConsoleHubView.vue` | Modify | Add exclusion predicate for `spec:*`, `template:*`, and workspace manifest nodes |
| `iNNfo/apps/innfo-editor/tests/component/ConsoleHubView-open-external.test.ts` | Modify | Add component test validating that spec and workspace nodes do not produce tabs |

## Verification Plan

### Automated Tests
- Run `npm test -- tests/component/ConsoleHubView-open-external.test.ts` in `iNNfo/apps/innfo-editor`
- Run `npm run test` across `innfo-editor` and `innfo-core`
- Run `node scripts/check-integrity.js`
