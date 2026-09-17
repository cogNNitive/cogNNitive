# Sample Workspaces

## Purpose
Standardize the documentation sample use case directories (`startup-founder`, `consulting-sales`, `freelance-designer`, `youtube-creator`) into full, self-contained, canonical Level 1-4 iNNfo workspaces with valid workspace manifests, normalized directory trees, and catalog index files.

## Requirements

### Requirement: Canonical Workspace Manifests
Each sample use case directory (`startup-founder`, `consulting-sales`, `freelance-designer`, `youtube-creator`) MUST contain a valid `workspace_NN.md` manifest file that conforms to the Level 2/3 workspace template specification (`workspace_spec_NN.md`).

1. The manifest MUST declare standard frontmatter including `level`, `parent_spec`, `model_version`, and `title`.
2. The manifest MUST declare an `# NN index` block referencing standard workspace sections.
3. The manifest MUST declare `# NN Workspace`, `# NN Specs`, `# NN Templates`, `# NN Models`, `# NN Sources`, `# NN Procedures`, and `# NN Artifacts` sections with relative paths to constituent assets.

#### Scenario: Inspecting sample workspace manifest
- GIVEN any sample use case directory under `docs/samples/use-cases/`
- WHEN the workspace manifest `workspace_NN.md` is parsed by the workspace parser
- THEN all declared models, sources, procedures, and artifacts are resolved against the local folder tree without broken paths.

---

### Requirement: Standardized Directory Hierarchy and Artifacts Migration
All sample use case workspaces MUST adhere to the standard iNNfo directory structure:
1. Deliverable output files previously located in `export/` MUST be migrated to `artifacts/`. The legacy `export/` directory MUST be removed.
2. Raw multi-modal imported files MUST reside under `sources/import/`.
3. Semantically normalized markdown sources MUST reside under `sources/nn/`.
4. Domain models MUST reside under `models/`.
5. Operating procedures and procedural models MUST reside under `procedures/`.

#### Scenario: Resolving deliverable artifacts
- GIVEN a sample workspace containing generated deliverables (such as pitch deck summary, commercial proposals, dashboard blue-prints, or script cue sheets)
- WHEN inspecting the workspace directory structure
- THEN all deliverables are located under `artifacts/`
- AND no legacy `export/` folder exists in the workspace.

---

### Requirement: Procedure Relocation to Dedicated Subdirectory
Procedural models and workflow execution definitions MUST be located in the `procedures/` subdirectory rather than `models/`.

#### Scenario: Relocating YouTube Creator production procedure
- GIVEN the `youtube-creator` sample use case
- WHEN inspecting procedural workflows for episode production
- THEN `Episode_42_Production_V_1-0-0_procedures_NN.md` is located under `procedures/`
- AND the workspace manifest `workspace_NN.md` references the procedure under the `# NN Procedures` section.

---

### Requirement: Catalog Index Declarations
Workspaces MUST provide canonical index catalog files (`sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`) where appropriate:
1. Index catalog files MUST declare valid frontmatter referencing corresponding Level 2 catalog templates (`sources_spec_NN.md`, `procedures_spec_NN.md`, `artifacts_spec_NN.md`).
2. Catalog files MUST list constituent sources, procedures, or artifacts with their format, provenance, and relative paths.

#### Scenario: Cataloging workspace sources and artifacts
- GIVEN a canonical sample workspace
- WHEN navigating workspace resources via catalog index files
- THEN `sources_NN.md`, `procedures_NN.md`, and `artifacts_NN.md` accurately enumerate all respective files with correct metadata.

---

### Requirement: Multi-Level Epistemic Coverage (Levels 1 to 4)
The sample workspaces MUST collectively demonstrate all four levels of the cogNNitive knowledge evolution framework:
1. **Level 1 (Multi-Modal Normalization)**: Raw multi-format files in `sources/import/` normalized into traceable markdown in `sources/nn/`.
2. **Level 2 (Domain Modeling)**: Template-governed domain models in `models/` with explicit semantic entity relationships.
3. **Level 3 (Workspace Composition & Cross-Model References)**: Multi-model cohesion governed by `workspace_NN.md`.
4. **Level 4 (Closed-Loop Procedures & Artifacts)**: Automated multi-step procedures producing verifiable artifacts in `artifacts/`.

#### Scenario: End-to-end provenance verification in Level 4 workspace
- GIVEN the `youtube-creator` Level 4 sample workspace
- WHEN tracing a cue sheet or B-roll checklist artifact in `artifacts/`
- THEN the artifact traces back through the procedure in `procedures/` to the script model in `models/` and original research sources in `sources/nn/` and `sources/import/`.
