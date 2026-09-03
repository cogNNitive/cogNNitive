# Design: add-element-concept-tags

## Overview
This document outlines the technical design for adding freeform tagging (`tags::`) to concepts and elements within Level 3 models, including UI enhancements for tag input and global search integration.

## 1. Store / Parser Updates (`tags::`)
- **Parser modifications**: Update the parser for Level 3 models to recognize the `tags::` property block. It should parse a comma-separated list of strings into an array of strings.
- **Normalization**: All parsed tags will be trimmed and converted to lowercase (or standardized case) to avoid fragmentation (e.g., treating "Backend", "backend", and " backEnd " as identical).
- **Global Tag Registry (Store)**: 
  - Add a new getter/computed property in the global state/store that aggregates all unique tags across all parsed Level 3 elements.
  - This registry will be used by UI components to offer auto-completion.

## 2. TagInput.vue Component Design
- **Auto-completion Dropdown**: Enhance `TagInput.vue` to display a dropdown of suggested tags as the user types.
- **Data Source**: Connect `TagInput.vue` to the global tag registry (from the store) to fetch available tags.
- **Interaction Model**: 
  - Typing filters the available tags in the dropdown.
  - Pressing `Enter` or clicking a suggestion adds the tag.
  - If a typed tag is not in the list, `Enter` creates a new tag.
- **Visuals**: Display selected tags as removable chips/badges.

## 3. Header Search Integration
- **Tag Filtering in Search**: Update the main Header search dropdown popup to incorporate tag-based filtering.
- **Search Logic**:
  - The search input can interpret special syntax (e.g., `#tagname`) or provide a separate filter UI for tags.
  - When a tag is selected in the search, the displayed results (concepts/elements) are filtered down to those possessing the specified tag.
- **Performance Considerations**: Ensure the aggregation and filtering logic is optimized (e.g., using memoization or computed properties) to prevent lag in large workspaces.

## Next Steps
- Implement parser changes and unit tests for `tags::` syntax.
- Update global state to maintain the tag registry.
- Refactor `TagInput.vue` for auto-complete.
- Implement tag filtering in the Header component.
