# Delta for file-system-ops

## ADDED Requirements

### Requirement: Workspace Init Downloads traNNsform

`SetupWizard.initWorkspaceStructure()` MUST download traNNsform files from GitHub when creating a new workspace. The download MUST create `traNNsform/` (visible, no dot prefix) with subdirectories `input/`, `output/`, `templates/`, `snippets/` and fetch `AGENT.md`, `README.md`, templates, and snippets from the configured `TRANSFORM_BASE_URL`. The function MUST NOT overwrite an existing `traNNsform/` — it MUST check existence via `getDirectoryHandle('traNNsform')` without `create` first.

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

### Requirement: Workspace Init Uses Visible Singular Paths

`initWorkspaceStructure()` MUST create `traNNsform/` (visible), `input/`, and `output/` (singular). No `.traNNsform/` (hidden) or `outputs/` (plural) paths may be created.

(Previously: `.traNNsform/` with dot prefix and `outputs/` with plural suffix.)

#### Scenario: No hidden or plural paths

- GIVEN a workspace created by SetupWizard
- WHEN inspecting the workspace structure
- THEN `traNNsform/` is visible (no `.` prefix)
- AND `traNNsform/output/` exists (not `outputs/`)
- AND `traNNsform/input/` exists
- AND `.traNNsform/` does not exist

### Requirement: traNNsform Status Via AIGuidePanel

`AIGuidePanel.vue` MUST verify `traNNsform/` existence on mount via `getDirectoryHandle('traNNsform')` (no `create` flag) and set `templatesReady` accordingly. No fetch or download logic runs in the panel.

(Previously: `AIGuidePanel.onMounted()` called `ensureTemplates()` that fetched all traNNsform files from GitHub.)

#### Scenario: traNNsform exists — panel renders normally

- GIVEN `traNNsform/` exists in the workspace
- WHEN AIGuidePanel mounts
- THEN `templatesReady` is true
- AND Import/Export sections render
- AND no fetch occurs

#### Scenario: traNNsform missing — panel shows guidance

- GIVEN `traNNsform/` does not exist
- WHEN AIGuidePanel mounts
- THEN `templatesReady` is false
- AND an error message with a link to the traNNsform repo is displayed
- AND no download is attempted

## REMOVED Requirements

### Requirement: AIGuidePanel ensureTemplates

(The `ensureTemplates()` function previously in `AIGuidePanel.vue` that downloaded traNNsform files on panel mount. This is not in the existing spec as a formal requirement, but the proposal explicitly removes this behavior.)

(Reason: Download responsibility moves to `SetupWizard.initWorkspaceStructure()`. AIGuidePanel only checks existence.)
(Migration: All fetch/download code, `TRANSFORM_BASE_URL` constant, and `downloadError` state removed from AIGuidePanel.)
