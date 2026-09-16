# Specification: Samples Workspace SSOT & Synchronization

## 1. Directory Structure

The root `_samples_nn/` directory must conform to the iNNfo Level 3 workspace structure:
```
_samples_nn/
  ├── workspace_NN.md
  ├── models/
  │   ├── Ghostbusters_analysis_NN.md
  │   ├── Ghostbusters_business_NN.md
  │   ├── Ghostbusters_business-model_NN.md
  │   ├── Ghostbusters_documentation_NN.md
  │   ├── Ghostbusters_innovation_NN.md
  │   ├── Ghostbusters_metrics_NN.md
  │   ├── Ghostbusters_organization_NN.md
  │   ├── Ghostbusters_procedures_NN.md
  │   ├── Ghostbusters_projects_NN.md
  │   ├── Ghostbusters_repository_NN.md
  │   └── Ghostbusters_video-generator_NN.md
  ├── procedures/
  │   └── compile_workspace_hub_NN.md
  └── sources/
      └── nn/
```

## 2. Workspace Hub Specification

`_samples_nn/workspace_NN.md` must:
- Declare parent spec `workspace_spec_NN.md` (Level 2).
- Define the `Workspace` entity with title, base directories (`models/`, `sources/nn/`, `procedures/`).
- Index all domain models under `# NN Models`.
- Define relevant `# NN Tag` categories for models (e.g. Strategic, Operational, Governance, Creative).
- Include execution procedures under `# NN Procedures`.

## 3. Synchronization Engine Specification

The synchronization tool `scripts/sync-samples.mjs` must:
- Map each model in `_samples_nn/models/` to its corresponding Level 2 template canonical sample file.
- Support `--check` mode which performs byte-level and semantic comparison without modifying files.
- Ensure proper directory creation if target template sample directories do not exist.
- Output clear, informative CLI logs indicating synced files and any detected drift.
