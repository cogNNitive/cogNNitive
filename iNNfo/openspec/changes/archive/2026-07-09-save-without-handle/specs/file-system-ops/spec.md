# Delta: File System Operations — Save Virtual Workspace

## MODIFIED Requirements

### Requirement: R-FS-05: Workspace Store Integration

`workspaceStore` MUST integrate the new capabilities:
- `loadFromUrl(url)` action that calls `useUrlDocLoader` and populates modelStore
- `backupEnabled` state flag (default: `true`) controllable via `enableBackup(val)` and `disableBackup()`
- `saveActiveFile()` enhanced to call the backup routine before writing (when `backupEnabled`). If the directory `handle` is null (virtual workspace), `saveActiveFile()` MUST intercept the save and trigger the guided workspace saving flow instead of attempting a direct write.

The store MUST remain backward-compatible: existing `open(handle)` and `recoverHandle()` continue to work unchanged.

(Previously: `saveActiveFile()` only saved to `handle` when present, without handle interception or prompting.)

#### Scenario: Load from URL without file handle

- GIVEN `workspaceStore.loadFromUrl("https://example.com/model.md")` succeeds
- THEN `workspaceStore.handle` is null
- AND `workspaceStore.hasParsed` is true
- AND modelStore contains the parsed graph

#### Scenario: Save virtual workspace intercepts save operation

- GIVEN a virtual workspace with a null `workspaceStore.handle` and unsaved changes
- WHEN the user triggers a save via the UI save button or Ctrl+S shortcut
- THEN `saveActiveFile()` intercepts the save
- AND triggers the guided `SaveWorkspaceModal` to pick a local folder

## ADDED Requirements

### Requirement: R-FS-07: Guided Folder Save & Transition Flow

When saving a virtual workspace, the system MUST execute a guided folder selection and transition flow:

| Step | Component | Action |
|------|-----------|--------|
| 1 | `SaveWorkspaceModal` | Displays instructions guiding the user to choose a local folder. |
| 2 | Folder Picker | Integrates `window.showDirectoryPicker()` to select the local directory. |
| 3 | Model Markdown | Saves active markdown using the original filename from the source URL. |
| 4 | Internet Shortcut | Saves `Open iNNfo Editor.url` pointing to the application origin. |
| 5 | `README.md` | Saves bilingual workspace instructions (English/Spanish). |
| 6 | Transition | Assigns handle to store, persists in IndexedDB, enables autosave. |

#### Scenario: Save and transition virtual workspace successfully

- GIVEN a workspace loaded from `https://example.com/my-model.md`
- WHEN the user triggers save, selects local directory `/users/doc/my-workspace`, and confirms
- THEN the system saves `my-model.md`, `Open iNNfo Editor.url`, and `README.md` to the directory
- AND transitions the store `handle` to the selected directory handle
- AND persists the new handle in IndexedDB
- AND enables automatic real-time autosaving
