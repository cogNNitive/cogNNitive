# Proposal: Save Virtual Workspace Without Handle

## Intent

Address 'No workspace handle' error when saving virtual/dynamically loaded models by offering a guided local folder selection.

## Scope

### In Scope
- Guided modal when saving a handle-less virtual workspace.
- Folder selection using browser folder picker.
- Save model markdown, `.url` shortcut, and `README.md` instructions to selected folder.
- Transition workspace state to local directory (sets store handle, hasHandle, and enables auto-save).
- Add folder to recent folders list.

### Out of Scope
- Direct cloud storage syncing.
- Auto-creating folder on local disk without user confirmation.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `file-system-ops`: Allow saving a virtual (URL-loaded) workspace by choosing a local folder and writing workspace files.

## Approach

- **UI Trigger**: Detect missing handle in `saveActiveFile()`. Intercept error and present a `SaveWorkspaceModal`.
- **File Writing**:
  - Serialize active model to target folder.
  - Write `{model-name}.url` containing `[InternetShortcut]\nURL={sourceUrl}`.
  - Write `README.md` with instructions on using the local workspace.
- **Store Transition**: Assign chosen `FileSystemDirectoryHandle` to `workspaceStore.handle` and set `hasHandle = true`. Call `workspaceStore.repository.storeHandle()` to persist it.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/stores/workspaceStore.ts` | Modified | Intercept saving, support folder transition. |
| `apps/innfo-editor/src/components/SaveWorkspaceModal.vue` | New | Guided directory picker modal. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Browser blocks showDirectoryPicker without user gesture | Low | Trigger picker directly from modal button click. |
| Overwriting existing files silently | Med | Check if files exist and prompt user. |

## Rollback Plan

Revert workspaceStore modifications and remove the new modal.

## Dependencies

- Browser support for File System Access API.

## Success Criteria

- [ ] User can load model from URL, edit it, and click save.
- [ ] Folder picker opens, user selects folder.
- [ ] Model `.md`, `.url`, and `README.md` are written to folder.
- [ ] Subsequent saves write directly to folder without prompting.
- [ ] Folder is added to recent folders.
