# Sample Workspaces (Delta)

## Purpose

Sample workspaces follow the new layout and naming. Content covered by the frozen carve-out in `nn-naming-contract` is exempt.

## MODIFIED Requirements

### Requirement: Canonical Workspace Manifests

Each non-frozen sample workspace MUST contain a valid `workspace_NN.md` manifest declaring `level`, `parent_spec`, `model_version`, and `title`, an `# NN index` block, and sections `# NN Workspace`, `# NN Specs`, `# NN Templates`, `# NN Models`, `# NN Sources`, `# NN Procedures`, and `# NN Artifacts`. `# NN Models` MUST list only models per the contract predicate and MUST NOT list sidecars.
(Previously: did not exclude sidecars.)

#### Scenario: Inspecting a sample manifest
- GIVEN a non-frozen sample workspace
- WHEN `workspace_NN.md` is parsed
- THEN all declared paths resolve and `# NN Models` has zero sidecars

### Requirement: Standardized Directory Hierarchy and Artifacts Migration

Non-frozen sample workspaces MUST use the canonical layout from `workspace-directory-conventions`:
1. Producer outputs under `artifacts/`; no `export/` directory.
2. Raw files under `sources/import/` (and `sources/conversations/`), each with a co-located sidecar; no `sources/nn/`.
3. kNNowledge under `kNNowledge/` with names satisfying the `nn-naming-contract` invariant and carrying no `_V_`.
4. Procedures under `procedures/`, named `<verb>_<noun>_procedures_NN.md`.
(Previously: `models/`, `sources/nn/`, and `export/`-to-`artifacts/` wording.)

#### Scenario: Resolving deliverables
- GIVEN a sample with generated deliverables
- WHEN the tree is inspected
- THEN deliverables are under `artifacts/` and no `export/` exists

#### Scenario: Sidecars co-located
- GIVEN a sample with a PDF in `sources/import/`
- WHEN the tree is inspected
- THEN `<file>.pdf_sidecar_NN.md` sits beside it and no mirror tree exists

#### Scenario: Frozen samples are untouched
- GIVEN `docs/innfo/samples/lifecycle-ghostbusters/workspace`
- WHEN the repository check runs
- THEN it is reported as carved out and not required to satisfy this requirement

### Requirement: Procedure Relocation to Dedicated Subdirectory

Procedural models MUST be located in `procedures/` and named `<verb>_<noun>_procedures_NN.md`.
(Previously: example named `Episode_42_Production_V_1-0-0_procedures_NN.md`.)

#### Scenario: Relocating a production procedure
- GIVEN a non-frozen `youtube-creator`-style sample
- WHEN inspecting episode production procedures
- THEN `Episode_42_Production_procedures_NN.md` is under `procedures/`
- AND the manifest `# NN Procedures` section references it

### Requirement: Multi-Level Epistemic Coverage (Levels 1 to 4)

The sample workspaces MUST collectively demonstrate:
1. **Level 1**: raw multi-format files in `sources/import/` made citable by co-located sidecars.
2. **Level 2**: bluepriNNt-governed kNNowledge in `kNNowledge/`.
3. **Level 3**: multi-model cohesion governed by `workspace_NN.md`.
4. **Level 4**: procedures producing write-once artifacts in `artifacts/`.
(Previously: normalized markdown in `sources/nn/` and models in `models/`.)

#### Scenario: End-to-end provenance
- GIVEN a Level 4 sample
- WHEN tracing a cue sheet in `artifacts/`
- THEN it traces through its `sources` citation to a kNNowledge document and to raw files in `sources/import/` (or their sidecars for binaries)

#### Scenario: Zero sidecars as models
- GIVEN each non-frozen sample
- WHEN models are listed by `list_knowledge`, `## NN Models`, and `export-console` targets
- THEN no sidecar appears
