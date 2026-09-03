# Delta: File System Operations â€” Directory Picker, Auto-Backup, URL Loading, Folder Init

## Purpose

Port file system operations from the predecessor apps: a `DirectoryPickerModal` using the File System Access API (for browsers that support it), automatic backup on save, loading a model from a URL, and a folder initialization modal for creating new workspaces.

## Requirements

### R-FS-01: DirectoryPickerModal

A new `DirectoryPickerModal.vue` component MUST provide a UI for opening a workspace directory via the File System Access API (`window.showDirectoryPicker`). The modal MUST:

- Show a welcome screen with two options: "Open Local Folder" and "Load from URL"
- "Open Local Folder" triggers `window.showDirectoryPicker()` and emits `open-handle` with the returned `FileSystemDirectoryHandle`
- Show an error message if the File System Access API is not available (non-Chrome browsers, insecure context)
- Provide a fallback text input for manual directory name entry (for development/testing)
- Display a list of recently opened directories (loaded from IndexedDB via the session-persistence store)
- Allow closing the modal via a cancel button or Escape key

#### Scenario: DirectoryPickerModal opens native folder picker

- GIVEN the browser supports the File System Access API
- WHEN the user clicks "Open Local Folder"
- THEN `window.showDirectoryPicker()` is called
- AND the modal emits `open-handle` with the handle
- AND the modal closes

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
- `saveActiveFile()` enhanced to call the backup routine before writing (when `backupEnabled`)

The store MUST remain backward-compatible: existing `open(handle)` and `recoverHandle()` continue to work unchanged.

#### Scenario: Load from URL without file handle

- GIVEN `workspaceStore.loadFromUrl("https://example.com/model.md")` succeeds
- THEN `workspaceStore.handle` is null
- AND `workspaceStore.hasParsed` is true
- AND modelStore contains the parsed graph

### R-FS-06: Scope Guard â€” No FILEâ†”FOLDER Mode Conversion

This slice MUST NOT introduce FILEâ†”FOLDER mode conversion, index-block generation on save, or any changes to the serializer's file layout.

#### Scenario: Mode conversion not introduced

- GIVEN a FOLDER-mode workspace
- WHEN save runs
- THEN the directory structure is unchanged (no new index blocks, no schema migration)
- AND only the backup file is created alongside the normal save
