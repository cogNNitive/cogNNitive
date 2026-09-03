# Delta for file-system-ops

Structural refactor only: `DirectoryPickerModal.vue` is confirmed dead code (no view or
router imports it) and is deleted. R-FS-01 is re-pointed to the directory-open behavior
that is actually live today — inline `window.showDirectoryPicker()` call sites in
`HomeView.vue`, `SetupWizard.vue`, and `SaveWorkspaceModal.vue`, backed by the
`useFileSystem.ts` composable for post-handle scanning, reading, and permission checks.
No other requirement in this domain changes; no user-visible behavior changes.

## MODIFIED Requirements

### R-FS-01: Directory Picker via File System Access API

Opening a workspace directory MUST be provided via the File System Access API
(`window.showDirectoryPicker`). The capability MUST:

- Be reachable from the app's entry flow (`HomeView.vue`'s "Open Local Folder" action)
  and from the workspace-creation flow (`SetupWizard.vue`'s folder picker/create steps)
- Call `window.showDirectoryPicker()` and, on success, use the returned
  `FileSystemDirectoryHandle` to open or create the workspace
- Surface an error message when the File System Access API is not available (non-Chrome
  browsers, insecure context), instead of throwing
- Treat `AbortError` (user cancels the native picker) as a no-op, not an error
- Use `useFileSystem.ts` (`isFileSystemAccessSupported`, `scanDirectory`,
  `readFileContent`, `connectDirectory`) for capability detection and all post-handle
  directory scanning, file reading, and permission verification, so this logic is not
  duplicated per call site

There is no dedicated `DirectoryPickerModal.vue` component. The directory-open UI is
owned by the consuming views/components listed above, each invoking the browser API
directly and delegating post-handle work to `useFileSystem.ts`.

(Previously: required a dedicated `DirectoryPickerModal.vue` component, with a welcome
screen offering "Open Local Folder" / "Load from URL", a manual-entry fallback input,
and a recent-directories list loaded from IndexedDB. That component was never wired
into any view or router and is deleted as dead code; the welcome-screen/manual-entry/
recent-list UI it described was never shipped through it.)

#### Scenario: HomeView opens a workspace via the native picker

- GIVEN the browser supports the File System Access API
- WHEN the user triggers "Open Local Folder" on `HomeView.vue`
- THEN `window.showDirectoryPicker()` is called
- AND the returned handle is passed to `workspace.open(handle)`
- AND the opened workspace is added to history

#### Scenario: SetupWizard opens a folder via the native picker

- GIVEN the browser supports the File System Access API
- WHEN the user triggers the folder picker step in `SetupWizard.vue`
- THEN `window.showDirectoryPicker()` is called
- AND the returned handle populates `folderHandle` and `folderPath`

#### Scenario: File System Access API unavailable

- GIVEN the browser does not expose `window.showDirectoryPicker`
- WHEN the user attempts to open or create a workspace folder
- THEN an error message stating the API is unavailable is shown
- AND no exception propagates uncaught

#### Scenario: User cancels the native picker

- GIVEN the browser supports the File System Access API
- WHEN the user dismisses the native directory picker dialog
- THEN the resulting `AbortError` is swallowed
- AND no error message is shown

## REMOVED Requirements

### Requirement: DirectoryPickerModal.vue Component

(Reason: `DirectoryPickerModal.vue` is dead code — not imported by any view, route, or
other component. Its intended behavior — opening a workspace directory via the File
System Access API — is already live through `HomeView.vue`, `SetupWizard.vue`, and
`SaveWorkspaceModal.vue`, superseding the R-FS-01 component-name binding above.)
(Migration: Delete `apps/innfo-editor/src/components/layout/DirectoryPickerModal.vue`.
Remove the "DirectoryPickerModal guard" describe block in
`apps/innfo-editor/tests/unit/file-system-ops.test.ts` — it exercises the
`useFileSystem.ts` composable, not the component, and its name is misleading; do not
rewrite it to test the component, delete the stale block. Update
`docs/code-quality-review-guide.md` to remove references to `DirectoryPickerModal.vue`.
After deletion, `rg "DirectoryPickerModal"` MUST return no matches under `src/` or
`e2e/`.)
