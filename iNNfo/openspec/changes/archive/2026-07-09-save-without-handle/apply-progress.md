## Implementation Progress

**Change**: save-without-handle
**Mode**: Strict TDD

### Completed Tasks
- [x] 1.1 Add `showSaveWorkspaceModal` (ref) and `setShowSaveWorkspaceModal` (setter) in `apps/innfo-editor/src/stores/uiStore.ts`.
- [x] 2.1 Create `apps/innfo-editor/src/components/layout/SaveWorkspaceModal.vue` with bilingual UI (English/Spanish).
- [x] 2.2 Add Folder Picker button using `window.showDirectoryPicker()` to retrieve local directory handle.
- [x] 2.3 Call `recursiveSerialize(modelStore.nodes, modelStore.dirtyIds)` to capture serialized markdown string.
- [x] 2.4 Write the root node file to the folder using directory handle; extract filename from `workspaceStore.sourceUrl`.
- [x] 2.5 Write the `Open iNNfo Editor.url` internet shortcut pointing to `window.location.origin`.
- [x] 2.6 Write bilingual `README.md` instructions for opening the workspace locally.
- [x] 2.7 Call `workspaceStore.open(handle)` after writing files to transition app state to local directory.
- [x] 3.1 Update `apps/innfo-editor/src/components/layout/Header.vue` to check `workspaceStore.hasHandle` in `handleSave` and `bumpVersion`. Open the modal if `hasHandle` is false.
- [x] 3.2 Update `apps/innfo-editor/src/views/WorkspaceView.vue` to render `SaveWorkspaceModal`.
- [x] 3.3 Update `onKeydown` in `apps/innfo-editor/src/views/WorkspaceView.vue` to intercept `Ctrl+S` and open the modal if `hasHandle` is false.
- [x] 4.1 Write integration tests in `apps/innfo-editor/tests/unit/file-system-ops.test.ts` to mock directory handles and assert file writing and modal state updates.
- [x] 4.2 Run `npm run test` to verify all tests pass.
- [x] 4.3 Run `npm run typecheck` to check for TypeScript errors.

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `apps/innfo-editor/src/stores/uiStore.ts` | Modified | Added `showSaveWorkspaceModal` ref, `setShowSaveWorkspaceModal` setter, and exposed them in the store return. |
| `apps/innfo-editor/src/components/layout/SaveWorkspaceModal.vue` | Created | New modal with bilingual instructions (EN/ES), directory picker, `recursiveSerialize` with custom driver writing, internet shortcut & `README.md` creation, and state transition. |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modified | Intercepted `handleSave` and `bumpVersion` to open the save workspace modal when `hasHandle` is false. |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modified | Imported and rendered `SaveWorkspaceModal` and updated the `onKeydown` listener to intercept `Ctrl+S` saving. |
| `apps/innfo-editor/tests/unit/file-system-ops.test.ts` | Modified | Added unit and integration tests mounting `SaveWorkspaceModal` and using `buildFakeTree` to mock directories and assert file writing. |

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Phase 1-4 | `file-system-ops.test.ts` | Integration / Unit | ✅ 21/21 | ✅ Written | ✅ Passed | ✅ Multiple cases | ✅ Clean typechecked |

### Test Summary
- **Total tests written**: 2 new test cases
- **Total tests passing**: 23 (all tests passing)
- **Layers used**: Integration / Unit
- **Approval tests** (refactoring): None — new implementation
- **Pure functions created**: None

### Deviations from Design
None — implementation matches design.

### Issues Found
None.

### Remaining Tasks
None.

### Workload / PR Boundary
- Mode: size:exception
- Current work unit: save-without-handle whole change
- Boundary: Starts with uiStore and SaveWorkspaceModal, ends with Header, WorkspaceView integrations, and unit tests.
- Estimated review budget impact: Within the approved 800-line budget in `AGENTS.md`.

### Status
13/13 tasks complete. Ready for verify.
