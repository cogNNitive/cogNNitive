# Change Proposal: editor-element-concept-tags

## Intent
Enable intuitive viewing and authoring of freeform tags (`tags::`) directly inside `BlockSheet.vue` for Level 3 elements and concepts, completing the tagging user experience initiated in `add-element-concept-tags`.

## Scope
- Integrate `TagInput.vue` into `BlockSheet.vue` in edit mode for elements and concepts.
- Render tag chips in read mode in `BlockSheet.vue` for elements and concepts.
- Harden `TagInput.vue` with default prop values (`modelValue = []`) to prevent runtime exceptions on undefined tags.
- Update `modelStore.ts` to ensure newly created elements initialize `tags: []`.
- Add comprehensive component tests validating tag rendering and editing interactions in `BlockSheet.vue`.

## Approach
1. **Defensive Component Props**: Update `TagInput.vue` with `withDefaults` to safely handle optional/undefined `modelValue`.
2. **BlockSheet Read Mode**: Display a styled tag list with pill badges when an element or concept contains tags.
3. **BlockSheet Edit Mode**: Embed `TagInput.vue` allowing users to add tags (via Enter, comma, or suggestion selection) and remove tags via chip delete buttons.
4. **State Synchronization**: Reactively sync tag edits to the Pinia `modelStore` (`node.tags` for elements, `rootNode.conceptTags[conceptName]` for concepts) and mark the node/model dirty so changes persist on save.
5. **Testing**: Write unit/component tests in `BlockSheet.test.ts` covering tag display, tag input binding, and store updates.

## Risks & Tradeoffs
- **Store dirty propagation**: Ensuring `markDirty` is called so that recursive serialization writes out `tags::` cleanly upon model save.
- **Visual noise**: Keeping tag chips compact and aligned with existing design tokens.
