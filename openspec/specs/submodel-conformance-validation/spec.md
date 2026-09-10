<!--
  Sync reconciliation (PR #62): the delta specs from two archived changes were
  checked against this living spec and required no edit.
  - migrate-spec-hosting-to-monorepo (## MODIFIED "Target Template Submodel
    Matching"): already reflected here — the "Submodel matches declared
    target_template by URL" scenario below already uses the canonical
    cogNNitive/cogNNitive/main/iNNfo/specs/ URL.
  - 2026-09-02-submodels-recursive-and-spec-alignment: older delta with the same
    four requirements but the pre-monorepo raw URL; this spec is a strict
    superset and supersedes it.
-->

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

For `type:: model` fields holding a path, the validator MUST strip WikiLink delimiters, normalize, and query the resolver. Missing files MUST yield `WARNING` at `elements.<Concept>.<Element>.fields.<field>` — never `ERROR` — with a stable per-rule code and inline fix hint.
(Previously: warning with no stable code or fix hint.)

#### Scenario: Missing submodel warns
- GIVEN a `model` path the resolver reports missing
- WHEN `validateFieldReferences()` executes
- THEN a coded `'warning'` with path-fix hint is emitted and `valid` stays true

#### Scenario: Existing submodel passes
- GIVEN `models/auth_NN.md` with the resolver reporting `{ exists: true }`
- WHEN `validateFieldReferences()` executes
- THEN no dangling-reference diagnostic is produced

---

### Requirement: Target Template Conformance Verification

With declared `target_template` and an existing submodel, the validator MUST compare template identity and MUST warn on mismatch, attaching a stable per-rule code and inline fix hint.
(Previously: warning with no stable code or fix hint.)

#### Scenario: Match by name passes
- GIVEN `target_template:: procedures` plus a file declaring `parent_spec.name: procedures`
- WHEN validation executes
- THEN no mismatch diagnostic is emitted

#### Scenario: Match by URL passes
- GIVEN the canonical procedures `target_template` URL plus a matching `parent_spec.url`
- WHEN validation executes
- THEN no mismatch diagnostic is emitted

#### Scenario: Mismatch warns with code and hint
- GIVEN `target_template:: business` plus a file declaring `parent_spec.name: procedures`
- WHEN validation executes
- THEN a coded `'warning'` naming both templates is emitted with a declaration-fix hint

---

### Requirement: MCP Validation Tooling Integration

The `innfo-mcp` server tools (`validate_model`, `read_model`) MUST wire synchronous submodel file resolution into the validation invocation. The resolver MUST inspect target model files located anywhere in the workspace (via recursive matching `findModelFile`) and parse their YAML frontmatter to extract `parent_spec.name` and `parent_spec.url`.

#### Scenario: MCP validate_model surfaces submodel warnings
- GIVEN a user runs `innfo-mcp_validate_model` on a model referencing a missing submodel
- WHEN the tool executes validation
- THEN the response includes the non-breaking `WARNING` diagnostic identifying the missing submodel path
- AND the tool reports overall validation status as valid with warnings

---

### Requirement: Actionable Diagnostic Severity and Clarity

Informational notices MUST use `info` severity, which MUST NEVER affect validity. Each misuse-class diagnostic MUST carry a stable code following the established diagnostic-code convention and MUST include an inline fix example for its class — valid type in wrong location vs reserved field misused as normal.

(Previously: named the violated class with a fix example but pinned no stable code.)

#### Scenario: Info keeps validity
- GIVEN an informational-only condition
- WHEN validation runs
- THEN `info` is reported and validity holds

#### Scenario: Both misuse classes distinguished
- GIVEN a valid level-1 type in the wrong location plus a reserved level-3 field used as normal
- WHEN validation runs
- THEN each diagnostic names its class rule, carries its stable code, and shows a fix example

#### Scenario: Codes stay stable across runs
- GIVEN the same misuse condition validated twice
- WHEN both runs complete
- THEN both diagnostics carry the identical stable code

---

### Requirement: Integrity Diagnostics Severity Demotion

The workspace integrity adapter MUST demote `info` diagnostics to `warning` severity when surfacing them, and MUST preserve the diagnostic code, message, and fix hint unchanged through the demotion.

#### Scenario: Info demoted to warning
- GIVEN an `info` diagnostic from validation
- WHEN surfaced through the integrity adapter
- THEN it appears as `warning` with code, message, and fix hint intact

#### Scenario: Warnings and errors pass through untouched
- GIVEN `warning` and `error` diagnostics from validation
- WHEN surfaced through the integrity adapter
- THEN their severities are unchanged
