# Delta for changeset-apply-engine

## ADDED Requirements

### Requirement: base_hash precondition

A change MAY carry `base_hash`. When present and it differs from the current hash of the
target element, `apply_change` MUST reject that change as a precondition failure using
the existing partial-apply path, leaving the model untouched for that change. When
absent, behavior is unchanged.

#### Scenario: Stale base_hash

- GIVEN an `update_field` change with `base_hash:: H1` and the element's current hash is H2
- WHEN the changeset is applied
- THEN that change is reported as a precondition failure and the field is not written

#### Scenario: Matching base_hash

- GIVEN `base_hash` equals the element's current hash
- WHEN the changeset is applied
- THEN the change applies normally

### Requirement: Crash-safe persist

Persisting a model MUST never leave the live file absent: the live file MUST be copied
to the archive, and the staged file then renamed over the live path.

#### Scenario: Failure after archiving

- GIVEN the archive copy succeeded
- WHEN the final rename fails
- THEN the original live model file still exists unchanged
