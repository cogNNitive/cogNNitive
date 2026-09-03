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

### Requirement: Global Tag Registry and Reactive State Aggregation

The global state store (`uiStore` / workspace store) in `innfo-editor` MUST provide a selector or reactive getter that aggregates and deduplicates all unique normalized tags across all parsed Level 3 models in the active workspace. The global tag registry MUST update reactively whenever models are loaded, modified, or removed.

#### Scenario: Tag aggregation across multiple models
- GIVEN a workspace containing Model A with tags `["auth", "security"]` and Model B with tags `["security", "database"]`
- WHEN the global tag registry selector is evaluated
- THEN the registry returns a deduplicated list `["auth", "database", "security"]`

#### Scenario: Reactive update on model content change
- GIVEN an active workspace with aggregated tags `["frontend", "ui"]`
- WHEN a new tag `["analytics"]` is added to a model element
- THEN the global tag registry reactively updates to include `["analytics", "frontend", "ui"]`

---

### Requirement: TagInput Autocompletion UI Component

`innfo-editor` MUST provide an enhanced `TagInput.vue` component that displays selected tags as removable chips/badges and provides an input field with an auto-completion dropdown. The dropdown MUST query suggestions from the global tag registry, filter options dynamically based on user keystrokes, and allow selecting existing tags or creating new tags on `Enter`.

#### Scenario: Autocompletion dropdown displays matching suggestions
- GIVEN the global tag registry contains `["authentication", "authorization", "audit"]`
- WHEN a user types `"auth"` into `TagInput.vue`
- THEN the dropdown suggests `"authentication"` and `"authorization"`

#### Scenario: Selecting suggestion adds tag
- GIVEN an open autocompletion dropdown with suggestion `"authentication"`
- WHEN the user clicks or presses `Enter` on the suggestion
- THEN `"authentication"` is added to the element's tags list and displayed as a removable chip

#### Scenario: Creating a novel tag
- GIVEN a user types `"new-feature"` which does not exist in the global tag registry
- WHEN the user presses `Enter`
- THEN `"new-feature"` is normalized and added to the element's tags list

#### Scenario: Removing an existing tag chip
- GIVEN an element with tags `["frontend", "vue"]` rendered in `TagInput.vue`
- WHEN the user clicks the remove icon on the `"frontend"` chip
- THEN `"frontend"` is removed from the element's tag list

---

### Requirement: Header Search Tag Filtering Integration

The global Header search dropdown popup in `innfo-editor` MUST integrate tag-based filtering. The search UI MUST expose tag selection sourced from the global tag registry and filter workspace search results so that only concepts and elements matching the selected tags are presented.

#### Scenario: Filtering search results by selected tag
- GIVEN a workspace with multiple concepts and elements across models
- WHEN a user selects the tag `"security"` in the Header search filter
- THEN search results are restricted to concepts and elements containing the `"security"` tag

#### Scenario: Multi-tag search intersection
- GIVEN search results containing elements tagged with various combinations
- WHEN a user selects both `"api"` and `"v2"` tags
- THEN only elements containing both `"api"` and `"v2"` tags are returned in the filtered search results

#### Scenario: Tag search suggestions sourced from global registry
- GIVEN a loaded workspace with active tags
- WHEN the user opens the Header search dropdown
- THEN available filter tags in the dropdown match the global tag registry
