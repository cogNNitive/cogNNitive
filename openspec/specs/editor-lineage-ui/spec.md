# editor-lineage-ui Specification

## Purpose

TBD - created by archiving change 2026-10-01-lineage-single-edge. Update Purpose after archive.
## Requirements
### Requirement: Pills and modal use the core parser and resolver

`iNNfo/apps/innfo-editor/src/utils/sourceRef.ts` MUST NOT define `parseForPill`; pill rendering MUST use innfo-core `parseCitation`. `knowledgeStore.ts` `getSourceCitations` MUST resolve citations through the core resolver, not a case-insensitive basename-suffix match. The stale header comment at `sourceRef.ts:8-13` MUST be corrected.

#### Scenario: `@` citation renders a pill
- GIVEN an element with `sources:: sources/import/interview.md@## Clients`
- WHEN the editor renders the source pill
- THEN the pill shows the file and heading and opens the preview modal

#### Scenario: Ambiguous basename is not fuzzy-matched
- GIVEN `sources/import/a/report.md` and `sources/import/b/report.md`, and an element citing `sources/import/a/report.md@## Intro`
- WHEN `getSourceCitations` is called for `sources/import/b/report.md`
- THEN the element is not returned as a downstream citation of `b/report.md`
- AND when called for `sources/import/a/report.md` it is returned

#### Scenario: Unresolved ambiguous bare name
- GIVEN a bare citation `report.md@## Intro` matching two Sources
- WHEN the editor resolves it
- THEN it is shown as unresolved or ambiguous, not silently bound to one file

### Requirement: Explorer classifies files by contract role

The editor explorer (`explorerClassify.ts`) MUST classify files through the `nn-naming-contract` role function, not by folder name or locally defined patterns. Sidecars MUST NOT be offered as models, MUST NOT count toward workspace detection, and MUST NOT appear in the home view's model list.
(Previously: the note said the `<stem>_console` family and latest-of-family resolution remain governed by `console-export-cli`. Console artifacts are now the whole-domaiNN `domaiNN_console.html` and scoped `<scope>_console` family members under `artifacts/`, governed by `console-export-cli`; the editor MUST NOT assume a per-model console family.)

#### Scenario: Artifact classified by name
- GIVEN `artifacts/report_20261002T101500Z.md` without a sidecar
- WHEN the explorer classifies it
- THEN it is an artifact

#### Scenario: Scoped console classified as an artifact
- GIVEN `artifacts/a_console/a_console_20261002T101500Z.html`
- WHEN the explorer classifies it
- THEN it is an artifact and not a model

#### Scenario: Sidecar hidden from models
- GIVEN `sources/import/report.pdf_sidecar_NN.md` in a loaded workspace
- WHEN the home view and workspace detection run
- THEN the sidecar is not listed as a model and does not make the folder a workspace

### Requirement: Preview modal UI strings are English

`components/editor/FilePreviewModal.vue` MUST present all user-visible strings in English, including the replacements for "Archivo Original", "Linaje", "normalizado", and "cita".

#### Scenario: No Spanish UI strings
- GIVEN the modal component source
- WHEN user-visible template and script strings are scanned for the former Spanish labels
- THEN none remain, and the equivalent English labels render in a component test

### Requirement: Lineage tab uses the single edge

The Lineage tab upstream list MUST come from the sidecar's origin metadata and the file's `sources` citation; downstream MUST come from citations resolved with the core resolver.

#### Scenario: Upstream from artifact `sources:`
- GIVEN an artifact preview whose frontmatter has `sources: [kNNowledge/x_NN.md@## NN Concept: A]`
- WHEN the Lineage tab opens
- THEN upstream shows `kNNowledge/x_NN.md` at that heading

### Requirement: Editor reverse lookup uses canonical path equality

`getSourceCitations` MUST match citers by exact canonical `filePath` equality, as normalized by `parseCitation`. A bare name resolves only against the workspace root (no implicit prefix), so ambiguity surfaces as unresolved.

#### Scenario: Exact path only
- GIVEN citations to `sources/import/a/report.md` and `sources/import/b/report.md`
- WHEN downstream citers of `a/report.md` are requested
- THEN only citers with canonical path `sources/import/a/report.md` are returned

### Requirement: New bluepriNNt versions are registered

Every bluepriNNt version bumped by this change that is not in `frozen_blueprints` MUST be registered through the generated `SHIPPED_BLUEPRINT_VERSIONS` (`npm run sync:versions`), never by hand.

#### Scenario: Registration test passes
- GIVEN domaiNN and the artifacts catalog bumped `blueprint_version`
- WHEN `sync-versions --check` and the editor test suite run
- THEN both pass

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

