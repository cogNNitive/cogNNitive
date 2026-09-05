# Editor Tag Authoring Specification

## Purpose
Define the requirements for interactive tag authoring, inspection, and reactive state synchronization in `BlockSheet.vue` across `innfo-editor`.

## Requirements

### Requirement: Element Tag Inspection in Read Mode
In read mode (`isEditing: false`), `BlockSheet.vue` MUST display a dedicated tags section (`data-testid="block-sheet-tags-read"`) when the displayed element contains one or more tags. Each tag MUST be presented as a formatted chip/badge.

#### Scenario: Element with tags renders tag badges
- GIVEN an element node with `tags: ["frontend", "core"]`
- WHEN `BlockSheet.vue` renders in read mode
- THEN the element's tags are rendered as chips displaying `#frontend` and `#core` within `block-sheet-tags-read`

#### Scenario: Element with no tags omits tag section
- GIVEN an element node with `tags: []` or undefined
- WHEN `BlockSheet.vue` renders in read mode
- THEN `data-testid="block-sheet-tags-read"` is not rendered

---

### Requirement: Element Tag Authoring in Edit Mode
In edit mode (`isEditing: true`), `BlockSheet.vue` MUST provide a `TagInput` component (`data-testid="block-sheet-tags-editor"`) bound to the element's tags. Editing tags MUST immediately update the element's node in `modelStore` and mark the node as dirty.

#### Scenario: Adding a tag updates element node in store
- GIVEN `BlockSheet.vue` editing an element with `tags: ["alpha"]`
- WHEN a new tag `"beta"` is added via `TagInput`
- THEN the element's `tags` in `modelStore` becomes `["alpha", "beta"]`
- AND the element's ID is added to `modelStore.dirtyIds`

#### Scenario: Removing a tag updates element node in store
- GIVEN `BlockSheet.vue` editing an element with `tags: ["alpha", "beta"]`
- WHEN tag `"alpha"` is removed via `TagInput`
- THEN the element's `tags` in `modelStore` becomes `["beta"]`
- AND the element's ID is marked dirty

---

### Requirement: Concept Tag Authoring and Display
`BlockSheet.vue` MUST support inspecting and editing concept-level tags stored under `rootNode.conceptTags[conceptName]`.

#### Scenario: Editing concept tags updates rootNode conceptTags
- GIVEN `BlockSheet.vue` editing a concept `"Task"` on a root model
- WHEN tags `["management", "priority"]` are added
- THEN `rootNode.conceptTags["Task"]` is updated in `modelStore`
- AND the root model is marked dirty
