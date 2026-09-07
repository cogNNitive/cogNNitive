# Delta for Model Primitive Type

## MODIFIED Requirements

### Requirement: Inline Submodel Creation and Scaffolding in FieldModel

`FieldModel.vue` MUST provide an inline submodel creation action allowing users to instantiate, scaffold, bind, and focus a new submodel directly from the field editor:
1. When rendered in edit mode, `FieldModel.vue` MUST display a creation trigger action (e.g., `[+ Create & bind new model]`).
2. On triggering creation, `FieldModel.vue` MUST determine the target template from the field's `target_template` metadata constraint. If `target_template` is unspecified, a fallback template or prompt MAY be provided.
3. The widget MUST resolve or prompt for a relative submodel file path:
   - When the field belongs to an element of a concept, the path MUST follow the hierarchical convention `models/{parent_stem}/{concept_slug}/{element_slug}/{field_or_template}_NN.md`, where `parent_stem` is the parent model filename without extension, `concept_slug` and `element_slug` are filesystem-safe slugs derived from the concept and element names, `field_or_template` is the field name or target template constraint, and `_NN` is a sequential numeric collision index (e.g., `_01`).
   - When the field is top-level or concept-less, the path MUST fall back to `models/{parent_stem}_{field_or_template}_NN.md`.
4. `innfo-editor` (via `modelStore`) MUST scaffold starter Level-3 markdown document content containing valid frontmatter:
   - `model_version` initialized to a valid SemVer string (e.g., `"0.1.0"`).
   - `template` matching the resolved `target_template` constraint.
   - Required standard Level-3 headers (`level: 3`, `title`, and starter concept sections conforming to the target template).
5. `FieldModel.vue` MUST bind the relative path of the newly scaffolded submodel to the field value via `update:modelValue`.
6. Upon creation and binding, `innfo-editor` MUST register the new model node in `modelStore.nodes` and automatically navigate/focus the active view to the newly created submodel via `uiStore.focusModel(...)`.

(Previously: Submodel path resolution suggested a flat path `models/<parent_stem>_<target_template>_NN.md` without hierarchy or concept and element slug segmentation.)

#### Scenario: Rendering create and bind trigger in edit mode
- GIVEN a field declared with `type:: model` and `target_template:: business`
- AND `FieldModel.vue` is rendered in edit mode (not readonly)
- WHEN the user views the field editor
- THEN an action control labeled `Create & bind new model` (or equivalent creation trigger) is rendered and clickable

#### Scenario: Hierarchical submodel path derivation for concept element
- GIVEN a field `submodel` with `target_template:: business` on element `Alpha` of concept `Projects` in parent model `models/Company_V_0-1-0_NN.md`
- WHEN the user clicks `Create & bind new model`
- THEN the suggested path resolves to `models/Company_V_0-1-0/projects/alpha/business_01.md`
- AND starter frontmatter with `template: "business"`, `level: 3`, and `model_version: "0.1.0"` is scaffolded
- AND the relative path is bound to the field value

#### Scenario: Distinct non-colliding paths for sibling elements
- GIVEN elements `Alpha` and `Beta` under concept `Projects` in parent model `models/Company_NN.md`
- WHEN submodel creation is triggered on element `Beta`'s model field with target template `business`
- THEN the suggested path resolves under `models/Company_NN/projects/beta/business_01.md`
- AND does not collide with element `Alpha`'s submodel path

#### Scenario: Fallback path derivation for concept-less field
- GIVEN a model field `top_model` with target template `architecture` not belonging to a concept element in parent `models/System_NN.md`
- WHEN the user triggers submodel creation
- THEN the suggested path falls back to `models/System_architecture_01.md`

#### Scenario: Auto-focusing new submodel upon creation
- GIVEN a new submodel `models/Company_V_0-1-0/projects/alpha/business_01.md` has been scaffolded and bound via `FieldModel.vue`
- WHEN creation completes
- THEN `uiStore.focusModel` is invoked with the new submodel node ID
- AND the editor view transitions to focus the new submodel
