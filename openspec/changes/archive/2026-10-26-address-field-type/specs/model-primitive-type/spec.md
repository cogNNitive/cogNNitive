# model-primitive-type Specification

## MODIFIED Requirements

### Requirement: Field types

The Level-1 field-type list MUST include `address` alongside `string`, `number`, `boolean`, `select`, `reference`, `knowledge`, `citation`, `markdown`, and the others. `address` is the base structural pointer; `citation` and `knowledge` are documented as its semantic specializations over the same `<target>@<unit>` grammar.

(Previously: `address` did not exist; a cross-model structural pointer had no dedicated type.)

#### Scenario: Address is a recognized field type
- GIVEN a Level-2 blueprint declaring a field `type:: address`
- WHEN the blueprint validates
- THEN `address` is accepted as a valid field type
- AND an unknown-type warning is not emitted
