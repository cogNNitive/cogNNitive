# Delta for Model Primitive Type

## MODIFIED Requirements

### Requirement: Editor Widget Registry and Field Viewer

`innfo-editor` MUST support `'model'` primitives across component renderers and interactive widgets:
1. `IconRenderer.vue` MUST map concept and field types of `'model'` to a dedicated submodel visual icon (e.g. `Boxes` / `FolderKanban`).
2. `UNIFIED_WIDGET_REGISTRY` in `src/shared/widgets/registry.ts` MUST register `'model'` to use the dedicated `FieldModel` widget (supporting model search autocomplete, pill navigation, and submodel scaffolding).
3. `FieldViewer.vue` MUST render fields of `type:: model` as interactive navigation pills that allow jumping directly to the referenced submodel file.
4. When `target_template` is defined on a field, `FieldViewer.vue` MUST render an informative badge or tooltip indicating the required template name or URL.

#### Scenario: Widget registration for model primitive
- GIVEN a form field declared with `type:: model`
- WHEN `innfo-editor` resolves the widget renderer from `UNIFIED_WIDGET_REGISTRY`
- THEN the `FieldModel` component is returned and mounted

#### Scenario: Target template badge in FieldViewer
- GIVEN a field with `type:: model`, value `models/payment_NN.md`, and `target_template:: procedures`
- WHEN `FieldViewer.vue` renders the field
- THEN it displays the interactive navigation pill for `models/payment_NN.md`
- AND displays a badge or tooltip displaying `Template: procedures`

---

## ADDED Requirements

### Requirement: Inline Submodel Creation and Scaffolding in FieldModel

`FieldModel.vue` MUST provide an inline submodel creation action allowing users to instantiate, scaffold, bind, and focus a new submodel directly from the field editor:
1. When rendered in edit mode, `FieldModel.vue` MUST display a creation trigger action (e.g., `[+ Create & bind new model]`).
2. On triggering creation, `FieldModel.vue` MUST determine the target template from the field's `target_template` metadata constraint. If `target_template` is unspecified, a fallback template or prompt MAY be provided.
3. The widget MUST resolve or prompt for a relative submodel file path (e.g., adhering to workspace conventions `<parent_stem>_<target_template>_NN.md` or a user-supplied filename).
4. `innfo-editor` (via `modelStore`) MUST scaffold starter Level-3 markdown document content containing valid frontmatter:
   - `model_version` initialized to a valid SemVer string (e.g., `"0.1.0"`).
   - `template` matching the resolved `target_template` constraint.
   - Required standard Level-3 headers (`level: 3`, `title`, and starter concept sections conforming to the target template).
5. `FieldModel.vue` MUST bind the relative path of the newly scaffolded submodel to the field value via `update:modelValue`.
6. Upon creation and binding, `innfo-editor` MUST register the new model node in `modelStore.nodes` and automatically navigate/focus the active view to the newly created submodel via `uiStore.focusModel(...)`.

#### Scenario: Rendering create and bind trigger in edit mode
- GIVEN a field declared with `type:: model` and `target_template:: business`
- AND `FieldModel.vue` is rendered in edit mode (not readonly)
- WHEN the user views the field editor
- THEN an action control labeled `Create & bind new model` (or equivalent creation trigger) is rendered and clickable

#### Scenario: Scaffolding starter frontmatter with target_template
- GIVEN a field with `target_template:: business` on element `Initiative`
- WHEN the user clicks `Create & bind new model`
- THEN a new submodel file content is scaffolded with `template: "business"`, `level: 3`, and `model_version: "0.1.0"`
- AND the relative path is bound to the field value
- AND the new submodel is loaded into `modelStore.nodes`

#### Scenario: Auto-focusing new submodel upon creation
- GIVEN a new submodel `models/Ghostbusters_V_0-2-0_business_NN.md` has been scaffolded and bound via `FieldModel.vue`
- WHEN creation completes
- THEN `uiStore.focusModel` is invoked with the new submodel node ID
- AND the editor view transitions to focus the new submodel
