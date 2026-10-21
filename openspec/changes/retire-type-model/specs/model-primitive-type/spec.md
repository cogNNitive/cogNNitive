## REMOVED Requirements

### Requirement: Level 1 Normative Specification and Metaschema Definition

**Reason**: Declared `model` as the tenth primitive field type and `target_template` as the submodel-conformance property. `type:: model` has no behaviour of its own, and `target_template` was superseded by `target_blueprint`.
**Migration**: Use `type:: knowledge` for submodel-reference fields/concepts and `target_blueprint` for conformance. See the ADDED requirement "`type:: knowledge` is the single submodel-reference type".

### Requirement: Core Metamodel Type Definitions

**Reason**: Mandated `'model'` in `ConceptType` and `ConceptField.type`, plus `target_template` parsing and preservation. Superseded by the `knowledge` normalization seam.
**Migration**: `ConceptField.type` normalizes a `model` declaration to `knowledge` at intake; `target_blueprint` replaces `target_template`. `'knowledge'` remains the declared value.

### Requirement: Metamodel and Document Validation

**Reason**: Mandated `'model'` in `VALID_CONCEPT_TYPES` / `VALID_FIELD_TYPES` and that `model`-typed references be validated for existence and template conformance. A `model` declaration now validates as a deprecated alias of `knowledge`, and the submodel checks run on the normalized type.
**Migration**: See the ADDED requirement "`type:: model` is a deprecated alias of `type:: knowledge`".

### Requirement: `type:: model` Normative for Fields on Any Level-2 Concept

**Reason**: Declared `type:: model` normative on fields of any Level-2 concept. The normative submodel-reference type is now `type:: knowledge`.
**Migration**: Retype such fields to `type:: knowledge`. A `model` declaration left in place still normalizes to `knowledge` and is followed, so no existing workspace breaks.

## MODIFIED Requirements

### Requirement: MCP Tooling Support

`innfo-mcp` tools MUST support reading, querying, and mutating concepts and fields declared with `type:: knowledge`, including fields whose deprecated `type:: model` declaration is normalized to `knowledge` at intake. `findModelFile` MUST support recursive submodel path discovery across all workspace subdirectories.

#### Scenario: Querying submodel concepts via MCP
- GIVEN a workspace containing concepts declared with `type:: knowledge`
- WHEN `list_knowledge` or `read_knowledge` is invoked via the MCP server
- THEN `knowledge`-typed concepts and properties are returned in the response JSON payload

#### Scenario: Locating nested submodels via findModelFile
- GIVEN a nested submodel at `kNNowledge/subsystems/auth_NN.md`
- WHEN `findModelFile` searches for `auth_NN.md` or `kNNowledge/subsystems/auth_NN.md`
- THEN the file is located recursively and returned successfully

## ADDED Requirements

### Requirement: `type:: knowledge` is the single submodel-reference type

A field or concept declared with `type:: knowledge` MUST be the single normative submodel-reference type. Its value MUST be a domaiNN-relative path, a `./`-relative path, or a WikiLink wrapping either. A `knowledge`-typed field MUST be followed during domaiNN traversal, MUST be resolved for file existence, and, when `target_blueprint` is declared, MUST be checked against the referenced document's `parent_spec`.

#### Scenario: A knowledge field is traversed
- GIVEN a Level-2 bluepriNNt whose concept declares field `company_model` with `type:: knowledge`
- AND a model element with `company_model:: kNNowledge/acme_business_NN.md`
- WHEN `recursiveParse()` runs
- THEN `kNNowledge/acme_business_NN.md` is enqueued and parsed as a submodel

#### Scenario: A knowledge field is validated for target_blueprint
- GIVEN a field with `type:: knowledge` and `target_blueprint:: business`
- AND the referenced file declares `parent_spec.name: procedures`
- WHEN reference validation runs
- THEN a submodel-template-mismatch warning is emitted at the field path

#### Scenario: The extracted type is knowledge
- GIVEN a bluepriNNt declaring a field with `type:: knowledge`
- WHEN the template schema is extracted
- THEN `ConceptField.type` is `'knowledge'`

### Requirement: `type:: model` is a deprecated alias of `type:: knowledge`

A field or concept declared with the legacy token `type:: model` MUST remain syntactically valid, MUST normalize to `knowledge` at parse intake, and MUST behave exactly as a `knowledge` declaration (traversal, resolution, `target_blueprint` checks). Validation MUST report exactly one `FIELD_TYPE_MODEL_DEPRECATED` diagnostic at `warning` severity per occurrence, naming the field or concept and carrying an inline fix hint, and MUST NOT change the document's `valid` status.

#### Scenario: Legacy alias behaves as knowledge
- GIVEN a model element with a field `submodel_file:: kNNowledge/payment_NN.md` whose bluepriNNt declares `type:: model`
- WHEN `recursiveParse()` runs
- THEN `kNNowledge/payment_NN.md` is enqueued and parsed as a submodel

#### Scenario: Legacy alias warns without failing
- GIVEN a bluepriNNt declaring `type:: model` on a field or a concept
- WHEN validation runs
- THEN one `FIELD_TYPE_MODEL_DEPRECATED` warning is reported for that declaration
- AND the document's `valid` status is unchanged

#### Scenario: No duplicate retired-type diagnostic
- GIVEN a bluepriNNt declaring `type:: model`
- WHEN validation runs
- THEN no `body-type-model-retired` error is reported for that declaration
