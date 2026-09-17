# Proposal: Compact Workspace Metrics and Pure Tree Navigation

## Intent
1. **Compact Workspace Header**: Remove the bulky "Workspace Mode" card panel from `LeftSidebar.vue` and replace it with a sleek status pill next to the "WORKSPACE" header, displaying active (green) and draft (amber) model counts with a comprehensive hover tooltip.
2. **Pure Tree Navigation**: Eliminate the quick open / isolate model button (`ArrowUpRight`) from `ConceptTreeNode.vue`, enforcing submodel exploration purely via recursive inline expansion in the main tree to preserve hierarchy and context.
3. **Clean Up Obsolete Bindings**: Remove dead isolate-focus handlers, emits, and test expectations tied to the isolated model jump button.

## Scope
- **In Scope**:
  - Replace `LeftSidebar.vue` workspace header banner with compact active/draft metric badges and tooltip.
  - Remove `ArrowUpRight` action button and associated isolate event handling from `ConceptTreeNode.vue`.
  - Update component unit tests in `ConceptTreeNode.test.ts` and sidebar tests.
- **Out of Scope**:
  - Changes to underlying workspace parsing, template resolution, or graph indexing logic.
  - Tab navigation or multi-model editor state management outside the sidebar tree.

## Capabilities
### Modified Capabilities
- `sidebar-workspace-metrics`: Replaces card panel with inline status indicators showing active/draft model tallies and hover metadata next to the workspace title.
- `concept-tree-navigation`: Restricts submodel interaction in the sidebar tree exclusively to expandable/collapsible inline node branches.

## Approach
1. **Sidebar Header**: Embed active and draft count badges directly into the "WORKSPACE" sidebar section header with tooltip details (Total, Active, Draft) and remove the top card panel.
2. **Concept Tree Action Removal**: Delete the `open-model` / `ArrowUpRight` action button from `ConceptTreeNode.vue`, ensuring submodels are explored strictly through inline recursive node expansion.
3. **Event & Test Cleanup**: Clean up unused event emissions and update component tests to verify inline status pill rendering and pure tree expansion behavior.

## Affected Areas
- `iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue`
- `iNNfo/apps/innfo-editor/src/components/layout/ConceptTreeNode.vue`
- `iNNfo/apps/innfo-editor/tests/component/ConceptTreeNode.test.ts`

## Risks
- **Loss of quick root switch**: Users accustomed to isolating a submodel as a temporary root must navigate through the parent tree. *Mitigation*: Inline expansion maintains full model hierarchy and deep exploration without context loss.

## Rollback Plan
Revert the modified Vue components and test suites to restore the card banner and isolation button.

## Success Criteria
- [ ] Bulky "Workspace Mode" card is removed from sidebar top.
- [ ] Compact status pill displays active/draft counts next to "WORKSPACE" header with hover tooltip.
- [ ] `ArrowUpRight` button is removed from `ConceptTreeNode.vue`.
- [ ] All unit and component tests pass cleanly.
