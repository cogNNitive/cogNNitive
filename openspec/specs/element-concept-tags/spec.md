# Element and Concept Tags

## Purpose

Introduce freeform tagging capabilities (`tags::`) on Level 3 concepts and elements, aggregate workspace tags into a reactive global registry, and deliver interactive UI components including auto-completing tag inputs and global header search filtering across `innfo-core` and `innfo-editor`.
## Requirements
### Requirement: Concept and Element Tag Schema and Parsing

`innfo-core` metamodel and model schemas MUST support an optional `tags` property formatted as an array of strings on Level 3 concept and element definitions. When parsing model markdown containing `tags::`, `innfo-core` parsers MUST extract the comma-separated or list-based tags, trim leading/trailing whitespace, and normalize tags to lowercase to avoid tag fragmentation.

#### Scenario: Parsing tags from element definition
- GIVEN a Level 3 element containing `tags:: frontend, component, navigation`
- WHEN `innfo-core` parses the model file
- THEN the element's `tags` property is populated as `["frontend", "component", "navigation"]`

#### Scenario: Normalization of whitespace and casing during parsing
- GIVEN a Level 3 concept containing `tags:: Backend,  API Service , MICROSERVICE `
- WHEN `innfo-core` parses the concept definition
- THEN the extracted tags are normalized to `["backend", "api service", "microservice"]`

#### Scenario: Handling elements without tags
- GIVEN a Level 3 element with no `tags::` property block
- WHEN `innfo-core` parses the element
- THEN parsing succeeds without error and the `tags` property defaults to an empty array or undefined

---

