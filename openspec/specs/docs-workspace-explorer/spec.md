# Documentation and Workspace Explorer

## Purpose
Synchronize documentation pages, modal workspace explorers, catalog models, and web application presets with canonical Level 1-4 workspace structures, ensuring path accuracy and navigation consistency across static docs and the live web app.

## Requirements

### Requirement: Documentation Quick Actions and Resource Synchronization
Documentation in `docs/use-cases.md` MUST reflect the canonical workspace paths for all use cases:
1. Quick Action links pointing to deliverables MUST target `artifacts/` instead of legacy `export/`.
2. Workspace links MUST reference valid canonical workspace directories.
3. Model deep links MUST target active canonical models in `models/` or procedures in `procedures/`.

#### Scenario: Navigating from documentation to deliverables
- GIVEN a user browsing `docs/use-cases.md`
- WHEN clicking the "View Deliverable" link for any use case
- THEN the link navigates to the corresponding deliverable located in `cognitive_nn/use-cases/{slug}/artifacts/`.

---

### Requirement: Interactive Workspace Explorer Modal Data Integrity
The interactive workspace explorer modal in `docs/use-cases.html` MUST accurately represent canonical workspaces:
1. Modal tab categories MUST include `sources-import`, `sources-nn`, `models`, `procedures`, and `artifacts` (replacing legacy `export`).
2. The `WORKSPACE_DATA` javascript object MUST enumerate all actual files present in each use case directory (`workspace_NN.md`, `sources/import/*`, `sources/nn/*`, `models/*`, `procedures/*`, `artifacts/*`).
3. File categories, icon mappings, formats, and relative paths MUST strictly correspond to the filesystem tree.

#### Scenario: Filtering workspace files by category in modal
- GIVEN a user opens the Local Workspace Explorer modal for any use case in `docs/use-cases.html`
- WHEN the user clicks the "Deliverables" or "Procedures" tab
- THEN only files residing in `artifacts/` or `procedures/` are displayed in the modal file list
- AND file counts and summaries reflect the updated filtered dataset.

#### Scenario: Opening workspace manifest from modal explorer
- GIVEN a user inspecting the file table in the modal explorer
- WHEN the user views the workspace file list
- THEN `workspace_NN.md` is listed with the Workspace Manifest format and icon.

---

### Requirement: Monorepo Use Cases Catalog Alignment
The master portfolio catalog model `workspace_NN/models/UseCases_Catalog_V_1-0-0_use-cases_NN.md` MUST reference canonical workspace artifacts and models:
1. `model_ref` attributes for each archetype MUST point to valid canonical model paths.
2. Deliverable and procedure references MUST align with standard `artifacts/` and `procedures/` paths.

#### Scenario: Validating Use Cases Catalog cross-references
- GIVEN `workspace_NN/models/UseCases_Catalog_V_1-0-0_use-cases_NN.md`
- WHEN cross-model reference validation runs across `workspace_NN`
- THEN all archetype `model_ref` paths resolve to existing files on disk.

---

### Requirement: Web Application Preset Deep-Links
`iNNfo/apps/innfo-editor/src/config/workspaces.ts` MUST configure presets pointing to canonical model and procedure locations for each use case:
1. Model URLs in `WORKSPACE_PRESETS` MUST resolve to active files in `models/` or `procedures/`.
2. Preset slugs (`startup-founder`, `consulting-sales`, `freelance-designer`, `youtube-creator`) MUST accurately match workspace directory slugs.

#### Scenario: Launching preconfigured workspace preset in editor
- GIVEN a user accesses the web editor with `?workspace=youtube-creator`
- WHEN the editor resolves the workspace preset configuration
- THEN both the video script model and production procedure are fetched from their canonical paths without 404 errors.
