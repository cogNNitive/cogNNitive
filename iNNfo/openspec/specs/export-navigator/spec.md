# Export Navigator Specification

## Purpose

Provide a view that discovers export files in `traNNsform/output/`, reads their embedded metadata, compares export version against the current model version, and lets the user open exports or regenerate outdated ones.

## Requirements

### Requirement: Export directory scanning

The system MUST scan `traNNsform/output/` inside the workspace directory and list all `.html` files found there.

#### Scenario: Scan outputs when workspace has traNNsform/output/

- GIVEN a workspace with a `traNNsform/output/` directory containing `Ghostbusters_V0-1-2_business_visualizer.html`
- WHEN the Navigator view is active
- THEN the file is listed with its filename

#### Scenario: Empty state when no outputs exist

- GIVEN a workspace with a `traNNsform/output/` directory that is empty
- WHEN the Navigator view is active
- THEN a message is shown: "No exports found. Use AI Guide to generate one."

#### Scenario: Missing traNNsform directory

- GIVEN a workspace with NO `traNNsform/` directory
- WHEN the Navigator view is active
- THEN a message is shown: "No traNNsform directory. Use AI Guide to set up export templates."

### Requirement: Export metadata extraction

Each export HTML MUST contain a `<script id="export-meta" type="application/json">` block with `modelName`, `modelVersion`, `templateName`, and `exportedAt` fields. The system MUST read this block to determine the export's origin.

#### Scenario: Read metadata from valid export

- GIVEN an export HTML with a valid `export-meta` script block containing `{"modelName": "Ghostbusters", "modelVersion": "V_0-1-2", "templateName": "business"}`
- WHEN the Navigator view reads the file
- THEN `modelName`, `modelVersion`, and `templateName` are extracted

#### Scenario: Export without metadata

- GIVEN an export HTML with no `export-meta` script block
- WHEN the Navigator view reads the file
- THEN the version is shown as "Unknown" with a "Regenerate" action

### Requirement: Version comparison

The system MUST compare the export's `modelVersion` against the current open model's version (from `parseFormatFilename`). It MUST display a status badge: ✅ "Up to date" when matching, ⚠️ "Outdated (vX → vY)" when mismatched.

#### Scenario: Matching versions

- GIVEN the current model is `Ghostbusters_V_0-1-2_business_NN.md` and an export has `modelVersion: "V_0-1-2"`
- WHEN the Navigator view renders
- THEN the export shows ✅ "Up to date"

#### Scenario: Mismatched versions

- GIVEN the current model is `Ghostbusters_V_0-1-3_business_NN.md` and an export has `modelVersion: "V_0-1-2"`
- WHEN the Navigator view renders
- THEN the export shows ⚠️ "Outdated (V_0-1-2 → V_0-1-3)"

#### Scenario: No model open

- GIVEN no model is loaded in the editor
- WHEN the Navigator view renders
- THEN all exports show ❓ "No model open — version unknown"

### Requirement: Open export in new tab

The system MUST allow the user to open an export HTML file in a new browser tab.

#### Scenario: Click export file

- GIVEN an export file listed in the Navigator
- WHEN the user clicks on it
- THEN the file opens in a new tab

### Requirement: Regenerate prompt

When an export is outdated, the system MUST provide a button that switches to the AI Guide view with a pre-populated context for regeneration.

#### Scenario: Regenerate outdated export

- GIVEN an export with ⚠️ status
- WHEN the user clicks "Regenerate"
- THEN the active view switches to `ai-guide` and a toast suggests copying the export prompt

### Requirement: Remove legacy Copy Table MD

The "Copy Table MD" button and handler MUST be removed from MatricesGrid.vue.

#### Scenario: Button absent

- GIVEN MatricesGrid.vue is rendered
- WHEN inspecting the DOM
- THEN no element with text "Copy Table MD" exists
