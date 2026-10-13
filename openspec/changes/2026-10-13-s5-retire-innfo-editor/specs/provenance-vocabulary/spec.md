# Delta for provenance-vocabulary

## REMOVED Requirements

### Requirement: Per-field editor envelope is named edit attribution

(Reason: restated without the retired editor under a new name.)
(Migration: Replaced by "Per-field edit envelope is named edit attribution".)

## ADDED Requirements

### Requirement: Per-field edit envelope is named edit attribution

The `FieldValue` envelope that records who last changed a field value MUST be
named `editAttribution` (type `EditAttribution`) in `innfo-core`. The word "provenance" MUST NOT name this structure.

#### Scenario: Parser stamps edit attribution

- GIVEN a model parsed by `recursiveParse`
- WHEN a `FieldValue` is materialised
- THEN it carries `editAttribution: { author: { kind: "system", id: "parser" }, timestamp }`
- AND no property named `provenance` exists on `FieldValue`

