# Delta for Workspace Directory Conventions

## MODIFIED Requirements

### Requirement: Deliverables and Exports Reside in `export/`

Generated deliverables (such as compiled Markdown documents, HTML presentations, diagrams, data exports, and generated site assets) MUST be written to `export/` at the workspace root. The directory `artifacts/` is deprecated.

The conceptual model in the canonical Level-2 template `workspace_V_0-3-0_spec_NN.md` SHALL use the concept name `Artifacts`, while the physical filesystem mapping MUST resolve to `export/`. The frozen legacy template `cogNNitive_V_0-2-0_NN.md` retains the same `Artifacts` concept for backward compatibility. Tooling MUST accept `artifacts/` as a backward-compatible alias when reading existing project workspaces.
(Previously: the `Artifacts` concept reference pointed to the then-active `cogNNitive_V_0-2-0` template.)

#### Scenario: Deliverable generation targets export/
- GIVEN a procedure generating a client-facing proposal or site package
- WHEN the artifact generation step completes
- THEN the resulting deliverables are written to `export/` (e.g., `export/Proposal_V_1-0-0.md`, `export/site/index.html`)

#### Scenario: Backward-compatible resolution of artifacts/
- GIVEN an existing project workspace with files in `artifacts/` and no `export/` directory
- WHEN lineage generation (`buildProvenanceModel`) or artifact listing runs
- THEN the tooling discovers files within `artifacts/` via the fallback alias