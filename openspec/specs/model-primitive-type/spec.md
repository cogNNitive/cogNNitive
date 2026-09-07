# Model Primitive Type

## Purpose

Formalize `type:: model` as a normative Level 1 primitive across the canonical iNNfo specification, self-describing Metaschema, `innfo-core` metamodel definitions, schema parsers with `target_template` support, `innfo-mcp` tooling, and `innfo-editor` interactive widget components.

## Requirements

### Requirement: Level 1 Normative Specification and Metaschema Definition

The Level 1 normative specification (`iNNfo/specs/iNNfo_V_0-1-0_NN.md`) MUST define `model` as the 10th primitive field type in the Field Definition types table:
`string | select | reference | markdown_inline | markdown_file | image | file | video | audio | model`.
It MUST include `model` as a valid concept type in Concept Definition:
`text | category | weight | list | steps | sequence | model`.
It MUST define `target_template` as an optional string property of `Field Definition`.
The self-describing Metaschema within `iNNfo_V_0-1-0_NN.md` MUST include `'model'` in `## NN Field Definition: type` options for both `Concept Definition` and `Field Definition`, and MUST declare `## NN Field Definition: target_template`.

#### Scenario: Level 1 metaschema self-conformance
- GIVEN the normative specification file `iNNfo_V_0-1-0_NN.md`
- WHEN bootstrap metamodel validation evaluates the specification
- THEN the Metaschema definitions for `model` and `target_template` are valid without syntax or schema errors

#### Scenario: Declaring model field with target_template in Level 2 template
- GIVEN a Level 2 template defining a field `subsystem_model:: type:: model` with `target_template:: procedures`
- WHEN `innfo-core` parses and validates the template
- THEN the field is accepted as a valid field definition with target template constraint

---

### Requirement: Core Metamodel Type Definitions

`innfo-core` MUST declare `'model'` as a valid value in `ConceptType` (`'text' | 'list' | 'category' | 'weight' | 'steps' | 'sequence' | 'model'`) and in `ConceptField.type` (`'string' | 'select' | 'reference' | 'image' | 'file' | 'video' | 'audio' | 'markdown_inline' | 'markdown_file' | 'model'`) in `src/types.ts`.
In addition, `ConceptField` in `src/types.ts` MUST include an optional `target_template?: string` property. Schema extraction in `src/schema.ts` (`extractTemplateSchema`) MUST parse `target_template` from `el.fields['target_template']`, and template aliasing (`applyAliasToSchema`) and canonical hashing (`canonicalValue`) MUST preserve `target_template`.

#### Scenario: Concept definition with model primitive
- GIVEN a metamodel spec declaring `type:: model` for concept `Models`
- WHEN `src/schema.ts` parses the concept schema
- THEN the concept type is extracted as `'model'` without schema parse errors

#### Scenario: Field definition with model primitive and target_template
- GIVEN a concept field declared with `submodel:: type:: model` and `target_template:: business`
- WHEN `src/schema.ts` extracts the template schema
- THEN the field type is assigned `'model'`
- AND `field.target_template` is parsed as `'business'`

#### Scenario: Preserving target_template during template aliasing
- GIVEN an included template with field `billing:: type:: model` and `target_template:: finance`
- WHEN `applyAliasToSchema` is called for template composition
- THEN the aliased field retains `target_template: 'finance'`

---

### Requirement: Metamodel and Document Validation

Validators in `innfo-core` (`src/validator/constants.ts`, `content.ts`, `document.ts`, `references.ts`) MUST include `'model'` in `VALID_CONCEPT_TYPES` and `VALID_FIELD_TYPES`. Fields and concepts declared with `type:: model` MUST pass document validation without reporting unknown-type errors. References in `model`-typed fields MUST be validated for submodel file existence and `target_template` conformance rather than being bypassed.

#### Scenario: Validating concept declared with type:: model
- GIVEN a Level 2 or Level 3 document containing `type:: model`
- WHEN `validateDocument()` runs
- THEN no "Invalid concept type 'model'" or "Invalid field type 'model'" validation issue is logged

#### Scenario: Validating model field with valid target submodel
- GIVEN a field `system:: models/billing_NN.md` with field type `'model'` and `target_template:: business`
- AND `models/billing_NN.md` exists and declares template `business`
- WHEN reference validation executes
- THEN validation succeeds with no errors or warnings

---

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

---

### Requirement: MCP Tooling Support

`innfo-mcp` tools (`list-read`, `mutate`, `spec`) MUST support reading, querying, and mutating concepts and fields declared with `type:: model`. In addition, `findModelFile` MUST support recursive submodel path discovery across all workspace subdirectories.

#### Scenario: Querying submodel concepts via MCP
- GIVEN a workspace containing concepts declared with `type:: model`
- WHEN `list_models` or `read_model` is invoked via `innfo-mcp`
- THEN `type:: model` concepts and properties are returned in the response JSON payload

#### Scenario: Locating nested submodels via findModelFile
- GIVEN a nested submodel at `models/subsystems/auth/tokens_NN.md`
- WHEN `findModelFile` searches for `tokens_NN.md` or `models/subsystems/auth/tokens_NN.md`
- THEN the file is located recursively and returned successfully

---

### Requirement: Composed Schema Caching on Parsed Model Nodes

`ModelNode` MUST expose an optional `schema?: TemplateSchema` field holding the composed (`includes`-merged) Level-2 template schema resolved for that node. `recursiveParse` MUST populate this field when a `resolveTemplateSchema` callback is supplied and MUST leave it unset when no callback is supplied.

#### Scenario: Composed schema is stashed on a freshly parsed node
- GIVEN a node parsed via `recursiveParse` with a supplied `resolveTemplateSchema` callback returning template `startup`'s composed schema
- WHEN the node is parsed and added to `ctx.nodes`
- THEN `node.schema` holds the composed `startup` `TemplateSchema`, including fields inherited via `includes`

#### Scenario: Schema field absent without a resolver
- GIVEN `recursiveParse` is invoked without a `resolveTemplateSchema` callback
- WHEN nodes are parsed
- THEN `node.schema` is `undefined` on every parsed node

---

### Requirement: `type:: model` Normative for Fields on Any Level-2 Concept

The `model` field type MUST be valid on fields declared within any Level-2 template's concept, not limited to the `workspace.Models` concept. Schema extraction, per-file reference validation, and traversal support for `type:: model` fields MUST apply uniformly regardless of which domain concept declares them.

#### Scenario: Domain concept declares a type:: model field
- GIVEN a domain Level-2 template `startup` whose `Startup` concept declares field `business_model` with `type:: model` and `target_template:: business_V_0-2-0`
- WHEN `src/schema.ts` extracts the template schema
- THEN `business_model` is recognized as a valid `model`-typed field on the `Startup` concept
- AND per-file reference validation (`references.ts`) applies the same dangling-file and `target_template` checks used for `workspace.Models`

