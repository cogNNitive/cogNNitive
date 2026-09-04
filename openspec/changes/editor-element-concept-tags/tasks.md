# Tasks: editor-element-concept-tags

## Phase 1: Component Hardening
- [x] 1.1 Harden `TagInput.vue` with `withDefaults` to support optional/undefined `modelValue`.
- [x] 1.2 Initialize `tags: []` in `modelStore.createChild` for newly instantiated nodes.

## Phase 2: BlockSheet Integration
- [x] 2.1 Import `TagInput.vue` in `BlockSheet.vue`.
- [x] 2.2 Wire reactive `currentTags` computation and `localTags` state.
- [x] 2.3 Implement `onTagsUpdate` and `onConceptTagsUpdate` handlers updating `modelStore` and marking dirty.
- [x] 2.4 Add read mode tag badges in `BlockSheet.vue` (`data-testid="block-sheet-tags-read"`).
- [x] 2.5 Add edit mode `TagInput` in `BlockSheet.vue` (`data-testid="block-sheet-tags-editor"` and `data-testid="concept-tags-editor"`).

## Phase 3: Testing & Verification
- [x] 3.1 Add component tests in `BlockSheet.test.ts` for element tag reading, editing, and store synchronization.
- [x] 3.2 Add component tests in `BlockSheet.test.ts` for concept tag reading and editing.
- [x] 3.3 Run full `innfo-editor` test suite to ensure zero regressions.
- [x] 3.4 Verify with `gentle-ai sdd-status editor-element-concept-tags`.
