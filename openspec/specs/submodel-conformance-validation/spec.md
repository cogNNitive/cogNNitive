# Submodel Conformance & Reference Validation

## Purpose

Validate submodel references in `innfo-core` and `innfo-mcp`, replacing validation bypass with active checks for file existence and `target_template` conformance, and emitting `WARNING` severity diagnostics for unresolved or mismatched submodels to permit iterative draft creation without failing builds or document validation.

## Requirements

### Requirement: Submodel Resolution Contract for Validators

The reference validator `validateFieldReferences` in `innfo-core/src/validator/references.ts` and document validator `validateModel` in `innfo-core/src/validator/document.ts` / `model.ts` MUST accept an optional `SubmodelResolver` callback:
```typescript
export type SubmodelResolver = (
  refPath: string,
  referringPath?: string,
) => { exists: boolean; templateName?: string; templateUrl?: string } | null
```
When no resolver is supplied, validators MUST continue to skip external filesystem checks without error.

#### Scenario: Validating references with an active SubmodelResolver
- GIVEN a document containing a field `system_ref:: type:: model` with value `models/auth_NN.md`
- AND a `SubmodelResolver` is provided to `validateFieldReferences`
- WHEN `validateFieldReferences()` validates the field
- THEN `resolveSubmodel("models/auth_NN.md", modelPath)` is invoked to evaluate file existence and template identity

#### Scenario: Validating references in headless mode without SubmodelResolver
- GIVEN a document containing a field of `type:: model` with value `models/draft_submodel_NN.md`
- AND `SubmodelResolver` is `undefined`
- WHEN validation executes
- THEN no filesystem lookup is attempted and no unresolved submodel error is thrown

---

### Requirement: Submodel File Existence Validation with Warning Severity

When a field has `type:: model` and contains a file path, the validator MUST strip any WikiLink delimiters (`[[...]]`), normalize the path, and query the resolver for file existence. If the file does not exist (`exists === false`), the validator MUST emit a diagnostic with severity `WARNING` and path `elements.<Concept>.<Element>.fields.<field>`. It MUST NOT emit an `ERROR` diagnostic.

#### Scenario: Missing submodel reference emits warning diagnostic
- GIVEN a model element referencing submodel `models/missing_subsystem_NN.md` in a `model`-typed field
- AND the resolver reports `{ exists: false }`
- WHEN `validateFieldReferences()` executes
- THEN a diagnostic with severity `'warning'` is emitted:
  `Dangling submodel reference: field "submodel" references file "models/missing_subsystem_NN.md" which does not exist`
- AND validation succeeds with `valid: true` (non-breaking warning)

#### Scenario: Existing submodel reference passes validation
- GIVEN a model element referencing `models/auth_NN.md`
- AND the resolver reports `{ exists: true }`
- WHEN `validateFieldReferences()` executes
- THEN no dangling submodel reference diagnostic is produced

---

### Requirement: Target Template Conformance Verification

When a concept field definition declares `target_template` and the referenced submodel file exists, the validator MUST compare `target_template` against the resolved submodel's template identity (`templateName` or `templateUrl`). If the resolved submodel's template does not match `target_template` (by name or stable URL), the validator MUST emit a diagnostic with severity `WARNING`.

#### Scenario: Submodel matches declared target_template by name
- GIVEN a field definition with `type:: model` and `target_template:: procedures`
- AND the referenced submodel file exists and declares `parent_spec.name: procedures`
- WHEN validation executes
- THEN no template mismatch diagnostic is emitted

#### Scenario: Submodel matches declared target_template by URL
- GIVEN a field definition with `target_template:: https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/procedures_V_0-1-0_NN.md`
- AND the referenced submodel file declares `parent_spec.url` matching that URL
- WHEN validation executes
- THEN no template mismatch diagnostic is emitted

#### Scenario: Submodel template mismatches declared target_template
- GIVEN a field definition with `target_template:: business`
- AND the referenced submodel file declares `parent_spec.name: procedures`
- WHEN validation executes
- THEN a diagnostic with severity `'warning'` is emitted:
  `Submodel template mismatch: field "submodel" expects template "business", but referenced file "models/proc_NN.md" uses template "procedures"`

---

### Requirement: MCP Validation Tooling Integration

The `innfo-mcp` server tools (`validate_model`, `read_model`) MUST wire synchronous submodel file resolution into the validation invocation. The resolver MUST inspect target model files located anywhere in the workspace (via recursive matching `findModelFile`) and parse their YAML frontmatter to extract `parent_spec.name` and `parent_spec.url`.

#### Scenario: MCP validate_model surfaces submodel warnings
- GIVEN a user runs `innfo-mcp_validate_model` on a model referencing a missing submodel
- WHEN the tool executes validation
- THEN the response includes the non-breaking `WARNING` diagnostic identifying the missing submodel path
- AND the tool reports overall validation status as valid with warnings
