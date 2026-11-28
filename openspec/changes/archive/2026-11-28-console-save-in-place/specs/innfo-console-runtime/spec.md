## ADDED Requirements

### Requirement: A save writes the console file the person opened

The console save MUST write the file the console was opened from, so the path of a saved console does not change between saves.
When the page runs from `file:`, the save MUST propose that file's own name as the dialog's `suggestedName` instead of a title-derived name.
The save MUST remember the picked file handle and MUST overwrite that same file on every later save, with no dialog.
The remembered handle MUST be scoped per domaiNN and file name, so two consoles of one domaiNN never share a handle.
The save SHALL fall back to the picker when no handle is remembered, when writing through the handle is refused, and when the File System Access API is unavailable.

#### Scenario: the second save opens no dialog

- **WHEN** a person saves a console whose handle a previous save remembered
- **THEN** the save writes that same file with no picker and reports an in-place save

#### Scenario: the first save proposes the opened file

- **WHEN** a console opened from `file:///…/domaiNN_console.html` is saved for the first time
- **THEN** the dialog proposes `domaiNN_console.html` and reopens in the folder the picker remembered

#### Scenario: a refused handle never loses the edits

- **WHEN** the remembered handle cannot be written (permission denied or a write failure)
- **THEN** the save opens the picker instead of failing, and the edits are written
