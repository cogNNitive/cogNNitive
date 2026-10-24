# address-field-type Specification

## Purpose

A validated structural pointer field type: the base of the address grammar, whose semantic specializations are `citation` (evidence) and `knowledge` (traversal).

## ADDED Requirements

### Requirement: The `address` field type

Level 1 MUST define the field type `address`. A value MUST be one `<target>@<unit>` address: `<target>` is a workspace-relative path or a `knowledge_slug`; `<unit>` is `## Heading` | `RowID&col` | `/json/pointer` | `element-slug` | `element-slug&field` | `matrix&row&col`. Validation MUST report a dangling address (the target or unit does not resolve) as an **error**.

#### Scenario: Valid element-field address
- GIVEN a field `target:: pricing@sku-42&precio`
- WHEN validation runs
- THEN the address resolves and no error is reported

#### Scenario: Dangling address is an error
- GIVEN a field `target:: pricing@missing&precio`
- WHEN validation runs
- THEN an error diagnostic names the unresolved address

### Requirement: One grammar, three semantics

`address`, `citation` and `knowledge` MUST share the single `<target>@<unit>` grammar and the shared parser. `citation` is an `address` that asserts derivation (evidence); a `knowledge` field is an `address` that is traversed. `reference` MUST remain the intra-model reference and MUST NOT be an address.

#### Scenario: The change target is an address
- GIVEN the `changes` blueprint
- WHEN the `target` field is read
- THEN its type is `address`

#### Scenario: Citation is an address specialization
- GIVEN a field `type:: citation`
- WHEN parsed
- THEN its value is a valid address and is additionally classified as evidence
