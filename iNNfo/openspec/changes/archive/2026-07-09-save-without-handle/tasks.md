# Tasks: Save Virtual Workspace Without Handle

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350-450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (size-exception approved via AGENTS.md 800-line budget) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Implement SaveWorkspaceModal UI, stores, interception, and unit tests | PR 1 | Targets main; size is within the project's 800-line budget |

## Phase 1: Foundation

- [x] 1.1 Add `showSaveWorkspaceModal` (ref) and `setShowSaveWorkspaceModal` (setter) in `apps/innfo-editor/src/stores/uiStore.ts`.

## Phase 2: Implementation of SaveWorkspaceModal

- [x] 2.1 Create `apps/innfo-editor/src/components/layout/SaveWorkspaceModal.vue` with bilingual UI (English/Spanish).
- [x] 2.2 Add Folder Picker button using `window.showDirectoryPicker()` to retrieve local directory handle.
- [x] 2.3 Call `recursiveSerialize(modelStore.nodes, modelStore.dirtyIds)` to capture serialized markdown string.
- [x] 2.4 Write the root node file to the folder using directory handle; extract filename from `workspaceStore.sourceUrl`.
- [x] 2.5 Write the `Open iNNfo Editor.url` internet shortcut pointing to `window.location.origin`.
- [x] 2.6 Write bilingual `README.md` instructions for opening the workspace locally.
- [x] 2.7 Call `workspaceStore.open(handle)` after writing files to transition app state to local directory.

## Phase 3: Integration & Event Interception

- [x] 3.1 Update `apps/innfo-editor/src/components/layout/Header.vue` to check `workspaceStore.hasHandle` in `handleSave` and `bumpVersion`. Open the modal if `hasHandle` is false.
- [x] 3.2 Update `apps/innfo-editor/src/views/WorkspaceView.vue` to render `SaveWorkspaceModal`.
- [x] 3.3 Update `onKeydown` in `apps/innfo-editor/src/views/WorkspaceView.vue` to intercept `Ctrl+S` and open the modal if `hasHandle` is false.

## Phase 4: Testing & Verification

- [x] 4.1 Write integration tests in `apps/innfo-editor/tests/unit/file-system-ops.test.ts` to mock directory handles and assert file writing and modal state updates.
- [x] 4.2 Run `npm run test` to verify all tests pass.
- [x] 4.3 Run `npm run typecheck` to check for TypeScript errors.
