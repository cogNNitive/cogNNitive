# Model Primitive Type

## Purpose

Introduce `type:: model` as a first-class primitive across `innfo-core` type definitions, schema parsers, validation rules, `innfo-mcp` tools, and `innfo-editor` interactive UI components.

## Requirements

### Requirement: Core Metamodel Type Definitions

`innfo-core` MUST declare `'model'` as a valid value in `ConceptType` (`'text' | 'list' | 'category' | 'weight' | 'steps' | 'sequence' | 'model'`) and in `ConceptField.type` (`'string' | 'select' | 'reference' | 'image' | 'file' | 'video' | 'audio' | 'markdown_inline' | 'markdown_file' | 'model'`) in `src/types.ts`.

#### Scenario: Concept definition with model primitive
- GIVEN a metamodel spec declaring `type:: model` for concept `ModelRef`
- WHEN `src/schema.ts` parses the concept schema
- THEN the concept type is extracted as `'model'` without schema parse errors

#### Scenario: Field definition with model primitive type
- GIVEN a concept field declared with `submodel:: type:: model`
- WHEN `src/schema.ts` parses the concept fields
- THEN the field type is assigned `'model'`

---

### Requirement: Metamodel and Document Validation

Validators in `innfo-core` (`src/validator/constants.ts`, `content.ts`, `document.ts`, `references.ts`) MUST include `'model'` in `VALID_CONCEPT_TYPES` and `VALID_FIELD_TYPES`. Fields and concepts declared with `type:: model` MUST pass document validation without reporting unknown-type errors.

#### Scenario: Validating concept declared with type:: model
- GIVEN a Level 2 or Level 3 document containing `type:: model`
- WHEN `validateDocument()` runs
- THEN no "Invalid concept type 'model'" or "Invalid field type 'model'" validation issue is logged

#### Scenario: Validating reference path in model-typed field
- GIVEN a field `path:: models/subsystem_01.md` with field type `'model'`
- WHEN `validateReferences()` evaluates the field value
- THEN the value is validated as a valid submodel file path or qualified node reference

---

### Requirement: Editor Icon and Interactive Field Rendering

`innfo-editor` MUST support `'model'` primitives across component renderers:
1. `IconRenderer.vue` MUST map concept and field types of `'model'` to a dedicated submodel visual icon (e.g. `Boxes` / `FolderKanban`).
2. `FieldViewer.vue` MUST render fields of `type:: model` as interactive navigation pills that allow jumping directly to the referenced submodel file.

#### Scenario: Icon rendering for model primitive
- GIVEN a concept or field with type set to `'model'`
- WHEN `IconRenderer.vue` mounts
- THEN it renders the dedicated submodel icon

#### Scenario: Navigation pill interaction in FieldViewer
- GIVEN a field with type `'model'` and value `models/user_management_01.md`
- WHEN `FieldViewer.vue` renders the field
- THEN it displays an interactive model pill containing `models/user_management_01.md`
- AND clicking the pill triggers navigation to load `models/user_management_01.md` in the editor

---

### Requirement: MCP Tooling Support

`innfo-mcp` tools (`list-read`, `mutate`) MUST support reading, querying, and mutating concepts and fields declared with `type:: model`.

#### Scenario: Querying submodel concepts via MCP
- GIVEN a workspace containing concepts declared with `type:: model`
- WHEN `list_models` or `read_model` is invoked via `innfo-mcp`
- THEN `type:: model` concepts and properties are returned in the response JSON payload

#### Scenario: Mutating a model-typed field via MCP
- GIVEN a request to add or update a field `submodel_ref:: type:: model = models/auth_01.md` via `mutate`
- WHEN `innfo-mcp` executes the mutation
- THEN the updated document preserves `type:: model` syntax and valid property formatting
