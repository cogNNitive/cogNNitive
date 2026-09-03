# Delta for format-editor

## ADDED Requirements

### Requirement: Header Import/Export Buttons

`Header.vue` MUST render [Import] and [Export] buttons after [Use AI]. [Import] MUST set `uiStore.activeView` to `'import'`. [Export] MUST set `uiStore.activeView` to `'export'`. Both buttons MUST be visible regardless of workspace state.

#### Scenario: Import button activates import view

- GIVEN the editor is open with Header visible
- WHEN the user clicks [Import]
- THEN `uiStore.activeView` equals `'import'`
- AND ImportPanel is displayed

#### Scenario: Export button activates export view

- GIVEN the editor is open with Header visible
- WHEN the user clicks [Export]
- THEN `uiStore.activeView` equals `'export'`
- AND ExportPanel is displayed

### Requirement: AIGuidePanel Separates Import and Export Sections

`AIGuidePanel.vue` MUST render distinct Import and Export sections with headings. Each section provides a copiable agent prompt. The Import section MUST list detected files from `traNNsform/input/`. The Export section MUST include a model selector. The panel no longer performs downloads or contains download-related state.

#### Scenario: Import section shows input file list

- GIVEN `traNNsform/input/` contains `notes.docx`
- WHEN AIGuidePanel is opened and Import section is visible
- THEN `notes.docx` is listed in the Import section
- AND a prompt referencing `traNNsform/AGENT.md` is displayed

#### Scenario: Export section shows model selector

- GIVEN the workspace has model `MyModel_V_1-0-0`
- WHEN AIGuidePanel is opened and Export section is visible
- THEN `MyModel_V_1-0-0` is available in the model selector
- AND an export prompt referencing `traNNsform/output/` is displayed

## REMOVED Requirements

### Requirement: AIGuidePanel Template Download

(The `ensureTemplates()` fetch/download logic, `TRANSFORM_BASE_URL`, and `downloadError` state previously in AIGuidePanel.vue.)

(Reason: Responsibility moves to `SetupWizard.initWorkspaceStructure()`. The panel only checks existence.)
(Migration: All download code removed from AIGuidePanel. The component uses `getDirectoryHandle('traNNsform')` for existence check.)
