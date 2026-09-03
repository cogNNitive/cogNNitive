# Proposal: Template Ghost Concepts

## Intent

The iNNfo editor's business template defines 70+ concepts but a starter model only uses 4. The remaining 66 concepts exist only as metadata in `resolveEffectiveMetamodel()` — they never materialize in the sidebar tree, making the template's full scope invisible to users. New model authors don't know what concepts are available, what they represent, or how to add them.

## Scope

### In Scope
- Ghost concept groups in the sidebar tree (visually distinct: reduced opacity, dashed border)
- Type-aware presence detection (`text` sections, `weight`/`list`/`steps`/`sequence` elements, `category` children)
- 3-state filter toggle: "Model only" | "Template only" | "All" (mixed, ghosts differentiated)
- "Add first element" action on each ghost group via `apply_change({ op: "add_element" })`

### Out of Scope
- Ghost *instances* inside present concept groups (existing R-TN-04 covers leaf-node ghost state)
- Batch "add all" shortcut
- Drag-and-drop reordering of ghost groups
- Serializer or write-path changes beyond `apply_change` calls

## Capabilities

### New Capabilities
- `template-ghost-concepts`: expose template concepts absent from the model as actionable ghost groups in the sidebar, with type-aware presence detection and a filter toggle

### Modified Capabilities
- `tree-navigation`: R-TN-04 (ghost state) expands from leaf-node ghost to concept-group ghost; new filter toggle control added to sidebar

## Approach

1. **Ghost group data source**: `metamodelStore.concepts` minus the set of concept types that have instances in `modelStore` nodes. Compute a `ghostConcepts` property that diff's the template concepts against present concept types.
2. **Type-aware presence** (per concept type):
   - `text`: concept is present if `# _NN <Concept>` section exists in root's `rawSections`
   - `weight`/`list`/`steps`/`sequence`: present if ≥1 graph node of that `type` exists
   - `category`: present if any child concept/element exists
3. **Ghost VirtualGroupNode**: New variant or prop on `VirtualGroupNode.vue` that renders with `opacity: 0.55`, dashed `borderLeft`, italic name, and an "Add first element" button.
4. **Filter toggle**: New control in `LeftSidebar.vue` (above the model tree) cycling through 3 view modes stored in `uiStore`.
5. **Add action**: Invokes model store's `createChild` or calls the MCP `apply_change({ op: "add_element", conceptName, elementName })` — the user names the new element via an inline prompt.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/stores/metamodelStore.ts` | Modified | Add `ghostConcepts` computed (diff against modelStore) |
| `apps/innfo-editor/src/components/layout/VirtualGroupNode.vue` | Modified | Ghost variant: dashed border, add button |
| `apps/innfo-editor/src/components/layout/ConceptTreeNode.vue` | Modified | Pass ghost concept data to children |
| `apps/innfo-editor/src/components/layout/LeftSidebar.vue` | Modified | Filter toggle control + ghost rendering |
| `apps/innfo-editor/src/stores/uiStore.ts` | Modified | Add `ghostFilterMode` state |
| `packages/innfo-mcp/src/tools/mutate.ts` | Unchanged | Existing `add_element` op is sufficient |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Template concepts mismatch on rename | Low | Key by concept name (stable identifier) |
| Performance diffing 70+ concepts on every render | Low | Computed with cached Map lookups |

## Rollback Plan

Remove the filter toggle, revert `VirtualGroupNode.vue` ghost variant, and delete `ghostConcepts` computed. Restores current tree behavior exactly — no data migration needed.

## Dependencies

- `metamodelStore.concepts` already populated by `_resolveParentSpecs` (Phase H wiring)
- `uiStore` exists for the filter state

## Success Criteria

- [ ] Template-only concepts render as ghost groups with dashed borders and reduced opacity in "All" view
- [ ] Filter toggle cycles through all 3 views and renders the correct subset
- [ ] Clicking "Add" on a ghost group creates a new element and the group becomes a real group
- [ ] Type-aware presence: `text` concept with a section header is NOT shown as ghost; `list` concept with ≥1 element is NOT shown as ghost
