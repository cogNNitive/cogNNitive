# Proposal: Hierarchical Submodel Paths

## Intent

Currently in `innfo-editor`, when clicking "+ Create & bind new model" on a field of type `model` within a concept element, `FieldModel.vue` derives a flat filename (`models/{parent_stem}_{target_template}_NN.md`). This ignores the concept and element context, causing immediate path collisions when multiple elements under the same concept instantiate submodels.

This proposal establishes a clean hierarchical directory convention for submodels created from concept elements:
`models/{parent_stem}/{concept_slug}/{element_slug}/{field_or_template}_NN.md`
This mirrors the conceptual hierarchy (Model → Concept → Element) while preserving the separation between `models/` (structured Level 3 models) and `assets/` (static binaries/media).

## Scope

### In Scope
- **Hierarchical Path Derivation**: Update `FieldModel.vue` (`deriveSuggestedPath`) to resolve parent model stem, concept slug, element slug, and field or target template name.
- **Context Awareness**: Traverse `modelStore` node ancestry (`Element` → `Concept` → `ModelRoot`) to construct the hierarchical path.
- **Fallback Handling**: Preserve sensible fallback for model-level or root-attached model fields.
- **Spec Alignment**: Update `model-primitive-type` capability in OpenSpec.

### Out of Scope
- Automatic migration or relocation of existing flat submodel files.
- Automated cascading folder moves on element renaming.
- Storing submodels in `assets/`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `model-primitive-type`: Update inline submodel creation requirements to specify hierarchical path derivation when creating submodels from concept elements.

## Approach
1. **Context Extraction**: In `FieldModel.vue`, inspect `props.nodeId` to retrieve the element node, parent concept node, and root model node from `modelStore`.
2. **Slug Formatting**: Sanitize concept and element names into URL/filesystem-safe slugs.
3. **Path Generation**: Construct `models/{parent_stem}/{concept_slug}/{element_slug}/{field_or_template}_NN.md`.
4. **Specification & Tests**: Update `openspec/specs/model-primitive-type/spec.md` and add unit tests verifying path suggestion for concept elements.

## Affected Areas
- `iNNfo/apps/innfo-editor/src/shared/widgets/FieldModel.vue`
- `openspec/specs/model-primitive-type/spec.md`
- `iNNfo/apps/innfo-editor/src/**/__tests__` (component/unit tests)

## Risks

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| Long path lengths on Windows | Low | Keep slug derivation compact; Git and modern Node support long paths. |
| Nested file discovery failures | Low | `findModelFile` and recursive workspace parsers already search directories recursively. |

## Rollback Plan
Revert changes to `FieldModel.vue` and `model-primitive-type/spec.md`. Any submodels created with hierarchical paths remain valid because iNNfo resolves relative paths transparently.

## Dependencies
- `model-primitive-type` specification and `innfo-editor` `modelStore`.

## Success Criteria
- [ ] "+ Create & bind new model" in a concept element suggests `models/{parent_stem}/{concept_slug}/{element_slug}/{field_or_template}_NN.md`.
- [ ] Multiple elements in the same concept generate distinct, non-colliding suggested paths.
- [ ] Fallback paths remain valid when invoked outside concept element context.
- [ ] `model-primitive-type` spec is updated to reflect hierarchical submodel path requirements.
