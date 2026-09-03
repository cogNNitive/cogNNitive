# Change Proposal: add-element-concept-tags

## Intent
Add support for freeform tagging on concepts and elements within Level 3 models to enhance categorization, searchability, and filtering of architectural elements.

## Scope
- Extend Level 3 model schemas and parsers to include a `tags:: [tag1, tag2]` property.
- Update the UI component `TagInput.vue` to support an auto-completion dropdown for tags.
- Implement global tag filtering within the Header search dropdown popup.

## Approach
1. **Data Model / Schema**: Modify the data structures and parsing logic for concepts and elements to support extracting and storing `tags` as an array of strings.
2. **UI Updates (TagInput.vue)**: Enhance the `TagInput` component to feature an auto-complete dropdown, sourcing existing tags from the global state.
3. **Global Search (Header)**: Update the Header search dropdown popup to include tag-based filtering capabilities, allowing users to filter the workspace by specific tags.
4. **State Management**: Ensure that tags are aggregated effectively across all Level 3 models to populate the global tag registry for auto-completion and filtering.

## Risks
- **Performance**: Aggregating tags globally could impact performance on very large workspaces.
- **Normalization**: Tags should be normalized (e.g., trimmed, standardized case) to prevent fragmentation (e.g., "Tag1" vs "tag1 ").
