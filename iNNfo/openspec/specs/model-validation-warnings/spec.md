# Spec: Model Validation Warnings - Concept Documentation Validation

## Purpose
Enforce metamodel documentation completeness by warning during level-3 model validation when concepts defined in the level-2 parent template are not fully documented in the template's markdown content.

## Requirements

### Requirement: R-MVW-01: Undocumented Concept Warning
During model validation, the validator MUST parse the raw content of the level-2 template spec. If any concept declared in the template's frontmatter lacks a corresponding H2 heading (`## Concept Name`) in the template's markdown, the validator MUST emit a validation warning.

#### Scenario: Concept defined but lacks heading in template spec
- GIVEN a template spec that defines concept "Market" in its frontmatter
- AND the template spec's raw content does not contain a "## Market" heading
- WHEN the model is validated
- THEN the validation report MUST include a warning: "Concept 'Market' is undocumented in parent template"

### Requirement: R-MVW-02: Incomplete Guidance Section Warning
For each concept defined in the level-2 template spec, the template's markdown MUST contain H3 sub-headings for "Summary", "Description", "Methodologies", and "Prompts". If any of these are missing, the validator MUST emit a validation warning.

#### Scenario: Concept lacks required H3 sub-sections in template spec
- GIVEN a template spec with a concept "Market" and heading "## Market"
- AND the "## Market" section lacks a "### Methodologies" sub-heading
- WHEN the model is validated
- THEN the validation report MUST include a warning: "Concept 'Market' has incomplete documentation in parent template"

### Requirement: R-MVW-03: Parent Spec Resolution Failure Diagnostic Code

When the validator fails to load or resolve a parent specification (level-1 spec or level-2 template), the validator MUST emit a diagnostic error with the distinct error code `[PARENT_RESOLUTION_FAILED]`. It MUST NOT mask the resolution failure as downstream missing concept validation warnings.

This blocking severity applies specifically to this spec's concept-documentation-completeness validation (R-MVW-01, R-MVW-02): those checks require the resolved template's markdown content to verify headings, so an unresolvable parent spec means the check cannot run at all and must fail loudly rather than silently report "no warnings." This is distinct from `innfo-mcp`'s `validateModel()`/`validate_model_url` (see `innfo-mcp` spec's "Model without a resolvable `parent_spec.url`" scenario), which performs broader structural model validation that remains meaningful without a resolved template, and therefore downgrades the same underlying resolution failure to a non-blocking warning instead of `[PARENT_RESOLUTION_FAILED]`. Both behaviors are legitimate for their respective callers; a caller that needs concept-documentation-completeness guarantees MUST treat `[PARENT_RESOLUTION_FAILED]` as blocking.

#### Scenario: Parent spec cannot be resolved or loaded

- GIVEN a model referencing a `parent_spec.url` that cannot be resolved or loaded
- WHEN model validation is performed
- THEN the validator MUST emit a validation error containing code `[PARENT_RESOLUTION_FAILED]`
- AND downstream concept validation warnings for the unresolvable parent spec MUST be suppressed

#### Scenario: Parent spec is successfully resolved

- GIVEN a model referencing a `parent_spec.url` that is successfully resolved
- WHEN model validation is performed
- THEN no `[PARENT_RESOLUTION_FAILED]` error MUST be emitted
- AND normal structural and concept documentation validations MUST proceed
