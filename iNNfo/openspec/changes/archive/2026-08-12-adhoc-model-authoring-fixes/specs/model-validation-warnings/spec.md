# Delta Specification: model-validation-warnings

## ADDED Requirements

### Requirement: R-MVW-03: Parent Spec Resolution Failure Diagnostic Code

When the validator fails to load or resolve a parent specification (level-1 spec or level-2 template), the validator MUST emit a diagnostic error with the distinct error code `[PARENT_RESOLUTION_FAILED]`. It MUST NOT mask the resolution failure as downstream missing concept validation warnings.

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
