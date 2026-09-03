# UI Components Specification: Tag Support

## Overview
This specification outlines the UI updates required to support viewing, inputting, and filtering by tags.

## TagInput.vue
- **Enhancement**: Upgrade the existing `TagInput.vue` component to support an auto-completion dropdown.
- **Data Source**: The dropdown should source its options from the globally aggregated list of unique tags (from state management).
- **Behavior**:
  - As the user types, filter the dropdown list based on the input.
  - Allow selection from the dropdown or creation of a new tag.

## Header Search Dropdown Popup
- **Enhancement**: Integrate tag-based filtering into the global search capability.
- **UI Elements**: Add a multi-select or specialized tag filter input within the search popup.
- **Behavior**:
  - Selecting tags should filter the search results to only show concepts and elements containing the selected tags.
  - The tag options should be sourced from the globally aggregated unique tags list.
