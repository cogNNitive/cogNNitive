# Delta for feedback-verdict-ledger

## ADDED Requirements

### Requirement: sourcePath containment

`record_feedback_verdict` MUST reject any `sourcePath` that resolves outside the domain
root, using the same `isInsideRoot` guard as `apply_change`, before any read or write.

#### Scenario: Traversal attempt

- GIVEN `sourcePath` is `../../outside.md`
- WHEN `record_feedback_verdict` is called
- THEN it returns an error and touches no file
