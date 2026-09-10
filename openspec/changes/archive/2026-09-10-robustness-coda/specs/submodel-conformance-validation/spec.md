# Delta for submodel-conformance-validation

## ADDED Requirements

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

## MODIFIED Requirements

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
