# Import Panel Specification

## Purpose

The Import Panel provides a UI for scanning `traNNsform/input/` for user-provided documents and presenting a copiable agent prompt that guides the agent to transform those documents into iNNfo models. The panel does NOT execute any transformation — it only detects files and provides the prompt.

## Requirements

### Requirement: File Detection

The Import Panel MUST scan `traNNsform/input/` on mount and display a list of detected files (name, size, last modified). If the directory does not exist or is empty, it MUST show a clear message indicating no files found.

#### Scenario: Files detected in input/

- GIVEN `traNNsform/input/` contains `report.docx` and `notes.md`
- WHEN ImportPanel mounts
- THEN both filenames are listed with their sizes and timestamps
- AND a total file count is shown

#### Scenario: Empty input/ directory

- GIVEN `traNNsform/input/` exists but is empty
- WHEN ImportPanel mounts
- THEN the message "No files found in input/" is displayed
- AND no file list is rendered

#### Scenario: input/ directory missing

- GIVEN `traNNsform/` does not exist or `traNNsform/input/` is missing
- WHEN ImportPanel mounts
- THEN a message is shown indicating the directory is not available
- AND guidance to create or re-init the workspace is displayed

### Requirement: Copiable Agent Prompt

The Import Panel MUST present a copiable prompt pre-filled with the detected file list and instructions referencing `traNNsform/AGENT.md`. The prompt MUST update dynamically when the file list changes.

#### Scenario: Prompt includes file names

- GIVEN files `report.docx` and `notes.md` are detected
- WHEN the user views the prompt
- THEN the prompt text includes both filenames
- AND references `traNNsform/AGENT.md` as the transformation guide

#### Scenario: Prompt is copiable

- GIVEN the prompt text is displayed
- WHEN the user clicks the copy button
- THEN the full prompt text is copied to clipboard
- AND a "Copied" confirmation appears briefly

### Requirement: Input Refresh

The Import Panel MUST provide a refresh button to re-scan `traNNsform/input/` without remounting the panel.

#### Scenario: Refresh detects new files

- GIVEN `traNNsform/input/` initially has no files
- WHEN the user adds `notes.md` and clicks refresh
- THEN the file list updates to show `notes.md`
- AND the prompt text updates to include the new file
