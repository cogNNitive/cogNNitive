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
- GIVEN a metamodel spec declaring `type:: model` for concept `ModelRef`
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
2. `UNIFIED_WIDGET_REGISTRY` in `src/shared/widgets/registry.ts` MUST register `'model'` to support text-based path editing (via `FieldString`).
3. `FieldViewer.vue` MUST render fields of `type:: model` as interactive navigation pills that allow jumping directly to the referenced submodel file.
4. When `target_template` is defined on a field, `FieldViewer.vue` MUST render an informative badge or tooltip indicating the required template name or URL.

#### Scenario: Widget registration for model primitive
- GIVEN a form field declared with `type:: model`
- WHEN `innfo-editor` resolves the widget renderer from `UNIFIED_WIDGET_REGISTRY`
- THEN the string/path editor component is returned and mounted

#### Scenario: Target template badge in FieldViewer
- GIVEN a field with `type:: model`, value `models/payment_NN.md`, and `target_template:: procedures`
- WHEN `FieldViewer.vue` renders the field
- THEN it displays the interactive navigation pill for `models/payment_NN.md`
- AND displays a badge or tooltip displaying `Template: procedures`

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
