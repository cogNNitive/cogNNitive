# Editor Lineage UI Specification (delta)

## ADDED Requirements

### Requirement: Read-Only Guard for Level 3 kNNowledge Models (D18)

In accordance with architectural decision D18, the Vue editor (`innfo-editor`) MUST guard all mutating operations against Level 3 kNNowledge models. The workspace store (`iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts`) MUST intercept calls to `saveActiveFile`, `saveActiveFileWithVersionBump`, and mutation execution handlers. If the active document is a Level 3 kNNowledge document (identified by contract role `'knowledge'` or frontmatter `level === 3`), the store MUST reject the save or mutation and report the error message:

`"kNNowledge models are read-only in the Vue editor per architectural decision D18. Please use agent-assisted changesets."`

The editor UI MUST render a persistent read-only indicator (badge or banner) in the navigation toolbar or document header whenever a Level 3 document is active. Level 1 normative specifications and Level 2 bluepriNNt template schemas MUST NOT be blocked by this guard and MUST remain fully editable and persistable.

#### Scenario: Level 3 save attempt is rejected with D18 notice
- GIVEN an active document in the editor with `role: "knowledge"` and `level: 3`
- WHEN the user attempts to trigger `saveActiveFile` or `saveActiveFileWithVersionBump`
- THEN the save operation is aborted without writing to disk
- AND the editor displays the error message: `"kNNowledge models are read-only in the Vue editor per architectural decision D18. Please use agent-assisted changesets."`

#### Scenario: Level 3 document displays read-only badge
- GIVEN a user opens a Level 3 kNNowledge document in the editor
- WHEN the document view renders
- THEN a read-only indicator is displayed in the header toolbar
- AND direct text mutation controls are disabled

#### Scenario: Level 2 template documents remain editable
- GIVEN an active document in the editor with `level: 2` (bluepriNNt template)
- WHEN `saveActiveFile` is executed
- THEN the file is saved to disk without read-only obstruction

#### Scenario: Level 1 specifications remain editable
- GIVEN an active document in the editor with `level: 1` (normative spec)
- WHEN `saveActiveFile` is executed
- THEN the file is saved to disk without read-only obstruction
