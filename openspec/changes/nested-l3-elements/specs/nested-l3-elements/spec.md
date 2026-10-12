# Nested Level-3 Elements

## ADDED Requirements

### Requirement: Hierarchical Heading Parsing and Parent Tracking

The parser MUST recognize headings of levels 2 through 6 (`#{2,6} NN <Concept>: <Element>`) in Level-3 documents. The parser MUST maintain a heading depth stack and assign `parentSlug` to each child element referencing its enclosing parent.

#### Scenario: Parse nested child element

- GIVEN an L3 document with an H3 element under an H2 element
- WHEN parsed
- THEN the H3 element has `parentSlug` set to the H2 element slug

#### Scenario: Flat sections maintain backward compatibility

- GIVEN an L3 document with only H2 elements
- WHEN parsed
- THEN elements have undefined `parentSlug`

### Requirement: Blueprint Hierarchy Validation

The validator MUST check nested element parentage against the blueprint `# NN index` taxonomy. An element nested under an unpermitted parent concept MUST be rejected with a hierarchy error.

#### Scenario: Valid parentage passes validation

- GIVEN a nested element whose concept is permitted under its parent in the blueprint index
- WHEN validated
- THEN no hierarchy errors occur

#### Scenario: Invalid nesting rejected

- GIVEN an element nested under an unpermitted parent concept
- WHEN validated
- THEN validation fails with a hierarchy error

### Requirement: Round-Trip Heading Serialization

The serializer MUST emit markdown headings at depths matching element `parentSlug` hierarchy, preserving flat H2 headings when parentage is absent.

#### Scenario: Serialize nested hierarchy

- GIVEN elements with parentage relationships
- WHEN serialized
- THEN child elements emit deeper headings (`### NN`) under their parent
