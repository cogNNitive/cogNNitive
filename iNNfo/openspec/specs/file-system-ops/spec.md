# File System Ops

## Purpose

Port file system operations from the predecessor apps: a `DirectoryPickerModal` using the File System Access API (for browsers that support it), automatic backup on save, loading a model from a URL, and a folder initialization modal for creating new workspaces.

## Requirements

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
into any view or router and was deleted as dead code — confirmed via `rg
"DirectoryPickerModal"` returning no matches under `src/` or `e2e/` — the
welcome-screen/manual-entry/recent-list UI it described was never shipped through it.
Its stale "DirectoryPickerModal guard" test block in
`apps/innfo-editor/tests/unit/file-system-ops.test.ts`, which actually exercised
`useFileSystem.ts` under a misleading name, was removed rather than rewritten. See
`openspec/changes/archive/2026-08-03-refactor-editor-god-components/` for the full
change record.)

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

### R-FS-02: Auto-Backup on Save

Before every save operation in `workspaceStore.saveActiveFile()`, the system MUST create a backup copy of the current root `_F.md` file. The backup MUST be written to a `backups/` subdirectory next to the original file, with the filename format:

`YYYY-MM-DD_HHmmss_{original-basename}.md`

For example, a file named `MyModel_V_1-0-0_template.md` saved at 2025-06-15 14:30:00 creates `backups/2025-06-15_143000_MyModel_V_1-0-0_template.md`.

Backups MUST only be created when the node is dirty (has unsaved changes). If the `backups/` directory does not exist, it MUST be created. Backup failures MUST NOT block the save (logged via console.warn instead).

#### Scenario: Backup created alongside save

- GIVEN root node is `my-model_V_1-0-0_template.md` with unsaved changes
- WHEN `saveActiveFile()` runs
- THEN a backup file is created at `backups/2025-06-15_143000_my-model_V_1-0-0_template.md`
- AND the original file is updated with current content
- AND save completes normally even if backup write fails

### R-FS-03: Load Model from URL

A new `useUrlDocLoader.ts` composable MUST load a FORMAT model file from a given URL. The composable MUST:

- Fetch the URL content via `fetch()` with CORS handling
- Parse the fetched Markdown with `parseModel` from `@cognnitive/format-core`
- Insert the parsed nodes into `modelStore` as a virtual workspace (no File System handle)
- Track the URL as the node's `source.path`
- Handle errors gracefully: network errors, CORS failures, unparseable content

The `urlDocLoader` result MUST include `{ nodes, rootIds, sourceUrl, error }`.

#### Scenario: URL-loaded model appears in modelStore

- GIVEN a URL `https://example.com/model_V_1-0-0_template.md` returns valid FORMAT markdown
- WHEN `useUrlDocLoader.fetch(url)` resolves
- THEN modelStore contains the parsed nodes
- AND root node has `source.path === "https://example.com/model_V_1-0-0_template.md"`
- AND `error` is null

### R-FS-04: Folder Init Modal

A folder initialization modal MUST allow creating a new workspace from scratch. The modal MUST present:

- A template selector (dropdown of available templates â€” resolving from the peer model or documentation path)
- A model name input
- An optional description textarea
- A "Create" button that generates a minimal `_F.md` with the correct frontmatter structure and creates the directory structure

The generated file MUST include:
- `spec_version:` from the selected template
- `model_version: V_1-0-0`
- `template.name:` and `template.version:` from the selected template
- `title:` = the entered model name
- Empty `concepts: []` and `markers: []`

The modal MUST NOT create any files on disk â€” it MUST emit a `create` event with the frontmatter data for the caller to handle.

#### Scenario: Folder init generates frontmatter

- GIVEN template "AI Industry" version "V_1-0-0" with spec_version "V_0-1-1" and model name "My Model"
- WHEN "Create" is clicked
- THEN the modal emits an event with frontmatter containing `spec_version: V_0-1-1`, `model_version: V_1-0-0`, `template: { name: "AI Industry", version: "V_1-0-0" }`, `title: "My Model"`

### R-FS-05: Workspace Store Integration

`workspaceStore` MUST integrate the new capabilities:

- `loadFromUrl(url)` action that calls `useUrlDocLoader` and populates modelStore
- `backupEnabled` state flag (default: `true`) controllable via `enableBackup(val)` and `disableBackup()`
- `saveActiveFile()` enhanced to call the backup routine before writing (when `backupEnabled`). If the directory `handle` is null (virtual workspace), `saveActiveFile()` MUST intercept the save and trigger the guided workspace saving flow instead of attempting a direct write.

The store MUST remain backward-compatible: existing `open(handle)` and `recoverHandle()` continue to work unchanged.

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

### R-FS-06: Scope Guard â€” No FILEâ†”FOLDER Mode Conversion

This slice MUST NOT introduce FILEâ†”FOLDER mode conversion, index-block generation on save, or any changes to the serializer's file layout.

#### Scenario: Mode conversion not introduced

- GIVEN a FOLDER-mode workspace
- WHEN save runs
- THEN the directory structure is unchanged (no new index blocks, no schema migration)
- AND only the backup file is created alongside the normal save

### R-FS-07: Guided Folder Save & Transition Flow

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

### R-FS-08: Workspace Init Downloads traNNsform

`SetupWizard.initWorkspaceStructure()` MUST download traNNsform files from GitHub when creating a new workspace. The download MUST create `traNNsform/` (visible, no dot prefix) with subdirectories `input/`, `output/`, `templates/`, `snippets/` and fetch `AGENT.md`, `README.md`, templates, and snippets from the configured `TRANSFORM_BASE_URL`. The function MUST NOT overwrite an existing `traNNsform/` â€” it MUST check existence via `getDirectoryHandle('traNNsform')` without `create` first.

(Previously: `ensureTemplates()` in `AIGuidePanel.onMounted()` created `.traNNsform/` and `outputs/` on panel open, without `input/` and with hidden/plural paths.)

#### Scenario: traNNsform created on first workspace init

- GIVEN a new workspace with no existing `traNNsform/`
- WHEN `initWorkspaceStructure()` runs
- THEN `traNNsform/` is created with `input/`, `output/`, `templates/`, `snippets/`
- AND `AGENT.md`, `README.md`, templates, and snippets are written
- AND `templatesReady` becomes true

#### Scenario: Existing traNNsform preserved

- GIVEN a workspace with existing `traNNsform/` containing user files
- WHEN `initWorkspaceStructure()` runs
- THEN the existing `traNNsform/` is not modified
- AND `templatesReady` remains true

#### Scenario: Network failure does not block init

- GIVEN `TRANSFORM_BASE_URL` is unreachable
- WHEN `initWorkspaceStructure()` runs
- THEN the directory structure is still created
- AND a warning is logged (not thrown)
- AND `templatesReady` is false
- AND SetupWizard continues without user interruption

### R-FS-09: Workspace Init Uses Visible Singular Paths

`initWorkspaceStructure()` MUST create `traNNsform/` (visible), `input/`, and `output/` (singular). No `.traNNsform/` (hidden) or `outputs/` (plural) paths may be created.

(Previously: `.traNNsform/` with dot prefix and `outputs/` with plural suffix.)

#### Scenario: No hidden or plural paths

- GIVEN a workspace created by SetupWizard
- WHEN inspecting the workspace structure
- THEN `traNNsform/` is visible (no `.` prefix)
- AND `traNNsform/output/` exists (not `outputs/`)
- AND `traNNsform/input/` exists
- AND `.traNNsform/` does not exist

### R-FS-10: traNNsform Status Via AIGuidePanel

`AIGuidePanel.vue` MUST verify `traNNsform/` existence on mount via `getDirectoryHandle('traNNsform')` (no `create` flag) and set `templatesReady` accordingly. No fetch or download logic runs in the panel.

(Previously: `AIGuidePanel.onMounted()` called `ensureTemplates()` that fetched all traNNsform files from GitHub.)

#### Scenario: traNNsform exists â€” panel renders normally

- GIVEN `traNNsform/` exists in the workspace
- WHEN AIGuidePanel mounts
- THEN `templatesReady` is true
- AND Import/Export sections render
- AND no fetch occurs

#### Scenario: traNNsform missing â€” panel shows guidance

- GIVEN `traNNsform/` does not exist
- WHEN AIGuidePanel mounts
- THEN `templatesReady` is false
- AND an error message with a link to the traNNsform repo is displayed
- AND no download is attempted
