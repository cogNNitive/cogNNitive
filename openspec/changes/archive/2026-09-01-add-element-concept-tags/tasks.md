# Implementation Tasks: add-element-concept-tags

## Task 1: Parser & Data Model Updates
- **Description**: Update Level 3 schemas and parser logic to handle the `tags::` property block.
- **Actionable Steps**:
  - [x] 1. Modify Level 3 Concept and Element schemas to accept a `tags` property (Array of Strings).
  - [x] 2. Update parsing logic to extract comma-separated values from `tags::`.
  - [x] 3. Implement normalization during parsing (trim whitespace, convert to lowercase).
  - [x] 4. Write unit tests to verify parsing, validation, and normalization of tags.
- **Estimated Effort**: 1-2 hours

## Task 2: Global Tag Registry (State Management)
- **Description**: Aggregate unique tags across the workspace to power auto-completion and filtering.
- **Actionable Steps**:
  - [x] 1. Add a getter/selector to the global store that iterates over parsed Level 3 elements and concepts.
  - [x] 2. Aggregate and deduplicate tags into a single list of strings.
  - [x] 3. Ensure the getter is reactive and updates efficiently as the workspace changes.
  - [x] 4. Add state management unit tests for the aggregation logic.
- **Estimated Effort**: 1 hour

## Task 3: TagInput.vue Component Enhancements
- **Description**: Upgrade the existing `TagInput.vue` to support auto-completion from the global registry.
- **Actionable Steps**:
  - [x] 1. Connect `TagInput.vue` to the global tag registry getter from the store.
  - [x] 2. Implement an auto-complete dropdown that filters available tags as the user types.
  - [x] 3. Handle user interactions: pressing `Enter` or clicking to select an existing tag, or creating a new tag if no match exists.
  - [x] 4. Update styling to display selected tags as removable chips/badges.
- **Estimated Effort**: 2-3 hours

## Task 4: Header Search Integration
- **Description**: Incorporate tag-based filtering into the global search capability.
- **Actionable Steps**:
  - [x] 1. Update the Header search dropdown popup UI to include tag filter inputs or recognize `#tagname` syntax.
  - [x] 2. Modify search filtering logic to respect selected tags, filtering out concepts and elements that lack the selected tags.
  - [x] 3. Optimize the filtering logic (e.g., using memoization) to maintain performance on large workspaces.
- **Estimated Effort**: 2-3 hours

## Review Workload Forecast
- **Total Estimated Effort**: 6-9 hours
- **Risk Areas**: 
  - Tag aggregation performance on large workspaces.
  - UI state synchronization in `TagInput.vue` during rapid typing.
