# Workspace Directory Conventions

## Purpose

Establish the canonical top-level workspace layout for knowledge inputs and outputs: raw external inputs in `sources/import/` (deprecating `sources/original/`), generated deliverables in `export/` (deprecating `artifacts/`, while the Level-2 concept name `Artifacts` is retained), interaction transcripts in `conversations/`, and dedicated `sources/` subtrees (`import/`, `export/`, `conversations/`, `nn/`) for symmetric knowledge promotion. Tooling reads deprecated locations as backward-compatible aliases with a deprecation notice.

> Sync note: the source change (`2026-09-06-sources-conversations-lifecycle`) authored these as `## MODIFIED Requirements` against a pre-monorepo base spec that was never carried into this `openspec/specs/` tree. They are transcribed here as the current requirement state.

## Requirements

### Requirement: External Raw Inputs Reside in `sources/import/`

The primary workspace location for raw, unnormalized external inputs (documents, audio, video, transcripts, data tables) SHALL be `sources/import/`. The directory `sources/original/` is deprecated.

All cogNNitive tooling (including `nn-trannsform`, `nn-preflight`, and web import tools) MUST write newly imported files to `sources/import/`. For backward compatibility, tooling MUST continue to recognize and read from `sources/original/` as an alias if `sources/import/` does not exist in the workspace, emitting a deprecation notice.

#### Scenario: Tool reads from existing legacy original folder
- GIVEN an existing workspace containing `sources/original/data.csv` and no `sources/import/` directory
- WHEN `scanAndProcess` or `preflight-check` runs
- THEN the system detects `sources/original/` via fallback alias resolution
- AND processes `sources/original/data.csv` with a deprecation warning recommending migration to `sources/import/`

#### Scenario: New import creates files in sources/import/
- GIVEN an import command (such as `webImport` or manual file addition)
- WHEN new raw files are saved into the workspace
- THEN they are placed inside `sources/import/`

### Requirement: Deliverables and Exports Reside in `export/`

Generated deliverables (such as compiled Markdown documents, HTML presentations, diagrams, data exports, and generated site assets) MUST be written to `export/` at the workspace root. The directory `artifacts/` is deprecated.

The conceptual model in the canonical Level-2 template `workspace_V_0-3-0_spec_NN.md` SHALL use the concept name `Artifacts`, while the physical filesystem mapping MUST resolve to `export/`. The frozen legacy template `cogNNitive_V_0-2-0_NN.md` retains the same `Artifacts` concept for backward compatibility. Tooling MUST accept `artifacts/` as a backward-compatible alias when reading existing project workspaces.

#### Scenario: Deliverable generation targets export/
- GIVEN a procedure generating a client-facing proposal or site package
- WHEN the artifact generation step completes
- THEN the resulting deliverables are written to `export/` (e.g., `export/Proposal_V_1-0-0.md`, `export/site/index.html`)

#### Scenario: Backward-compatible resolution of artifacts/
- GIVEN an existing project workspace with files in `artifacts/` and no `export/` directory
- WHEN lineage generation (`buildProvenanceModel`) or artifact listing runs
- THEN the tooling discovers files within `artifacts/` via the fallback alias

### Requirement: Root Conversations Directory for Interaction Transcripts

Interactive chat and session transcripts MUST reside in `conversations/` at the workspace root. Transcripts in this directory represent active or completed raw conversation sessions between the user and agent skills, formatted as Markdown documents.

#### Scenario: Session transcript storage
- GIVEN an active interaction session
- WHEN a transcript is saved or updated
- THEN the transcript file is stored at `conversations/YYYY-MM-DD_HHmmss.md` or `conversations/YYYY-MM-DD_<slug>.md`
- AND is not mixed with raw knowledge inputs in `sources/`

### Requirement: Sub-Source Trees for Symmetric Knowledge Promotion

The `sources/` hierarchy MUST provide dedicated subdirectories for promoted knowledge artifacts:
1. `sources/import/`: External raw files imported from outside the workspace.
2. `sources/export/`: Deliverables promoted from `export/` to serve as source material for downstream models.
3. `sources/conversations/`: Transcripts (`*_source.md`) and summaries (`*_summary.md`) promoted from `conversations/` to serve as source material for models.
4. `sources/nn/`: Canonical, normalized Markdown representations generated from all active source trees.

#### Scenario: Full source tree layout
- GIVEN a populated workspace conforming to the updated conventions
- WHEN inspecting the `sources/` directory
- THEN `sources/` contains subdirectories `import/`, `export/`, `conversations/`, and `nn/`
- AND each sub-source tree is preserved independently without namespace collision
