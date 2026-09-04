# Design: editor-element-concept-tags

## Overview
This design specifies the user experience, component architecture, and reactive state bindings for viewing and authoring tags on elements and concepts in `BlockSheet.vue`.

## 1. UI Integration in `BlockSheet.vue`

### Edit Mode (`isEditing === true`)
- **Element Editing**:
  - Below the fields grid and above description editor, add a dedicated Tags authoring section with `data-testid="block-sheet-tags-editor"`.
  - Render `<TagInput :model-value="localTags" @update:model-value="onTagsUpdate" />`.
- **Concept Editing**:
  - In concept edit view, provide `<TagInput :model-value="localTags" @update:model-value="onConceptTagsUpdate" />` with `data-testid="concept-tags-editor"`.

### Read Mode (`isEditing === false`)
- **Element View**:
  - When `currentTags` contains items, render a tags row featuring `#<tag>` badges.
  - Test identifier: `data-testid="block-sheet-tags-read"`.
- **Concept View**:
  - When concept tags exist on the root model, render the same badge row in the concept overview.

## 2. Component Hardening: `TagInput.vue`
- Change `defineProps<{ modelValue: string[] }>()` to `withDefaults(defineProps<{ modelValue?: string[] }>(), { modelValue: () => [] })`.
- Ensure internal operations (`props.modelValue.includes(...)`, `[...props.modelValue]`) never fail when `modelValue` is initially omitted or undefined.

## 3. Store and Serialization Contract
- When `onTagsUpdate(tags)` executes on an element:
  - Updates `node.tags = tags`.
  - Calls `modelStore.upsertNode(updatedNode)`.
  - Marks the node dirty via `modelStore.markDirty(node.id)`.
  - Emits `change` event.
- When `onConceptTagsUpdate(tags)` executes on a concept:
  - Updates `rootNode.conceptTags[conceptName] = tags` (or deletes the key if empty).
  - Calls `modelStore.upsertNode(updatedRoot)`.
  - Marks root dirty via `modelStore.markDirty(rootNode.id)`.
  - Emits `change` event.
- When `modelStore.createChild(...)` is called:
  - Ensure new element nodes initialize `tags: []`.

## 4. Testing Plan
- `tests/component/BlockSheet.test.ts`:
  - Assert that element tags are rendered as chips in read mode.
  - Assert that entering edit mode renders `TagInput` bound to the element's tags.
  - Assert that updating tags through `TagInput` updates the store node and triggers `markDirty`.
  - Assert that concept tags work symmetrically on concept nodes.
