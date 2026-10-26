## MODIFIED Requirements

### Requirement: Submodel Resolution Contract for Validators

The reference validator `validateFieldReferences` in `nn-core/src/validator/references.ts` and document validator in `nn-core/src/validator/document.ts` / `model.ts` MUST accept an optional `SubmodelResolver` callback:
```typescript
export type SubmodelResolver = (
  refPath: string,
  referringPath?: string,
) => { exists: boolean; templateName?: string; templateUrl?: string } | null
```
When no resolver is supplied, validators MUST continue to skip external filesystem checks without error. A `knowledge`-typed field and a field whose deprecated `type:: model` declaration normalized to `knowledge` MUST be treated identically.

#### Scenario: Validating references with an active SubmodelResolver
- GIVEN a document containing a field typed `knowledge` with value `models/auth_NN.md`
- AND a `SubmodelResolver` is provided to `validateFieldReferences`
- WHEN `validateFieldReferences()` validates the field
- THEN `resolveSubmodel("models/auth_NN.md", modelPath)` is invoked to evaluate file existence and template identity

#### Scenario: Validating references in headless mode without SubmodelResolver
- GIVEN a document containing a `knowledge`-typed field with value `models/draft_submodel_NN.md`
- AND `SubmodelResolver` is `undefined`
- WHEN validation executes
- THEN no filesystem lookup is attempted and no unresolved submodel error is thrown

### Requirement: Submodel File Existence Validation with Warning Severity

For `knowledge`-typed fields holding a path (including fields declared with the deprecated `type:: model`), the validator MUST strip WikiLink delimiters, normalize, and query the resolver. Missing files MUST yield `WARNING` at `elements.<Concept>.<Element>.fields.<field>` — never `ERROR` — with a stable per-rule code and inline fix hint.

#### Scenario: Missing submodel warns
- GIVEN a `knowledge` path the resolver reports missing
- WHEN `validateFieldReferences()` executes
- THEN a coded `'warning'` with a path-fix hint is emitted and `valid` stays true

#### Scenario: Existing submodel passes
- GIVEN `models/auth_NN.md` with the resolver reporting `{ exists: true }`
- WHEN `validateFieldReferences()` executes
- THEN no dangling-reference diagnostic is produced

### Requirement: Target Template Conformance Verification

With declared `target_blueprint` and an existing submodel, the validator MUST compare blueprint identity and MUST warn on mismatch, attaching a stable per-rule code and inline fix hint.

#### Scenario: Match by name passes
- GIVEN `target_blueprint:: procedures` plus a file declaring `parent_spec.name: procedures`
- WHEN validation executes
- THEN no mismatch diagnostic is emitted

#### Scenario: Match by URL passes
- GIVEN the canonical procedures `target_blueprint` URL plus a matching `parent_spec.url`
- WHEN validation executes
- THEN no mismatch diagnostic is emitted

#### Scenario: Mismatch warns with code and hint
- GIVEN `target_blueprint:: business` plus a file declaring `parent_spec.name: procedures`
- WHEN validation executes
- THEN a coded `'warning'` naming both bluepriNNts is emitted with a declaration-fix hint
