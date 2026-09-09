# Delta for Submodel Conformance Validation

## ADDED Requirements

### Requirement: Actionable Diagnostic Severity and Clarity

Informational notices MUST use `info` severity, which MUST NEVER affect validity. Misplaced-field diagnostics MUST name the violated class — valid type in wrong location vs reserved field misused as normal — with an inline fix example per class.

#### Scenario: Info keeps validity

- GIVEN an informational-only condition
- WHEN validation runs
- THEN `info` is reported and validity holds

#### Scenario: Both misuse classes distinguished

- GIVEN a valid level-1 type in the wrong location plus a reserved level-3 field used as normal
- WHEN validation runs
- THEN each diagnostic names its class rule with a fix example

## MODIFIED Requirements

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
