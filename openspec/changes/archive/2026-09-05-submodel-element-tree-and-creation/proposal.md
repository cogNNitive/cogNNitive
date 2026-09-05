# Proposal: submodel-element-tree-and-creation

## Intent
Submodel composition via `type:: model` (Level 1) allows domain elements (e.g. `Initiative`) to instantiate and link dedicated submodels (e.g. `Business Model`). The UI must support scaffolding/binding new submodels directly (`FieldModel.vue`), nesting submodels hierarchically under their owning element in the left sidebar (`LeftSidebar.vue` / `ConceptTreeNode.vue`), and documenting the pattern in `docs/innfo/documentation/relationships.md`.

## Scope
- **In Scope**:
  1. `FieldModel.vue` "Create & bind new model" action: prompt/generate submodel file, scaffold Level 3 frontmatter using `target_template`, bind the relative path, and focus the new model.
  2. `LeftSidebar.vue` and `ConceptTreeNode.vue`: filter submodels out of top-level `visibleRootIds` and render them nested under the specific element that owns the `type:: model` field.
  3. `docs/innfo/documentation/relationships.md`: document "5. Composición de Submodelos (`type:: model`)" with the canonical `Ghostbusters_V_0-2-0_innovation_NN.md` -> `Ghostbusters_V_0-2-0_business_NN.md` sample.
- **Out of Scope**:
  - Arbitrary file system managers or explorer trees.
  - Automatic multi-file Git branching or version control operations.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `model-primitive-type`: Extend UI contract to include inline submodel creation and starter frontmatter scaffolding via `target_template`.
- `dual-mode-sidebar`: Update tree navigation so submodels are filtered from top-level root models and nested hierarchically under their declaring domain element node.

## Approach
1. **Creation Action**: Add `[+ Create & bind new model]` in `FieldModel.vue`. On click, determine target file path and template from `target_template` constraint, scaffold initial Level 3 file content via `modelStore`, update field reference, and trigger focus navigation.
2. **Sidebar Hierarchy**: In `LeftSidebar.vue`, compute submodel references owned by element nodes. Exclude referenced submodels from top-level `visibleRootIds` when owned by an element. In `ConceptTreeNode.vue`, render nested submodel child items under the owning element item.
3. **Documentation**: Add section "5. Composición de Submodelos (`type:: model`)" in `docs/innfo/documentation/relationships.md`, detailing architecture, metadata conventions, and the Ghostbusters sample.
4. **Testing**: Add component and store tests for submodel scaffolding, field binding, and tree nesting.

## Affected Areas
- `iNNfo/packages/innfo-editor/src/components/fields/FieldModel.vue`
- `iNNfo/packages/innfo-editor/src/components/sidebar/LeftSidebar.vue`
- `iNNfo/packages/innfo-editor/src/components/sidebar/ConceptTreeNode.vue`
- `docs/innfo/documentation/relationships.md`
- `openspec/specs/model-primitive-type/spec.md`
- `openspec/specs/dual-mode-sidebar/spec.md`

## Risks & Tradeoffs
- **Circular or Multi-parent Submodels**: Submodels referenced by multiple elements could appear under multiple nodes; sidebar hierarchy must handle or deduplicate gracefully.
- **Unsaved Newly Created Files**: Newly created submodels must be safely registered in `modelStore` to prevent state desynchronization before disk persistence.

## Rollback Plan
Revert UI component changes in `innfo-editor` and spec updates; models continue to function with manual path entry in `FieldModel.vue` and flat sidebar listing.

## Dependencies
- `innfo-core` template schema resolver and `target_template` parsing support.
- `innfo-editor` `modelStore` and `uiStore`.

## Success Criteria
- Users can create and bind a new submodel from `FieldModel.vue` with one click.
- Element-owned submodels appear indented under the owning element in the sidebar rather than polluting top-level roots.
- Canonical documentation reflects submodel composition with the Ghostbusters sample.
