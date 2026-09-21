# Specification: Repository Structure Encapsulation, Simulation Renaming, and Cleanup

## Requirements

### Requirement 1: Simulation Suite English Renaming
The end-to-end integration simulation suite MUST be located at `simulation/` and MUST use 100% English naming for files, package configuration, and runner scripts.

#### Scenario: Running the simulation suite
- **GIVEN** a clean repository checkout on branch `dev`
- **WHEN** running `node simulation/run-all.mjs`
- **THEN** all 8 integration scenarios MUST execute and pass with 0 failures
- **AND** the report MUST be generated under `simulation/results/report.md`.

### Requirement 2: Dogfooding Workspace Encapsulation
The cogNNitive monorepo dogfooding workspace MUST be encapsulated inside `workspace_NN/`, containing its entrypoint `workspace_NN.md`, `models/`, `sources/`, `procedures/`, and `artifacts/`.

#### Scenario: Workspace entrypoint resolution
- **GIVEN** the entrypoint `workspace_NN/workspace_NN.md`
- **WHEN** resolving referenced models, sources, procedures, and artifacts
- **THEN** relative links within the workspace directory MUST resolve cleanly without broken links
- **AND** external links to `../iNNfo/specs/...`, `../skills/...`, and `../scripts/...` MUST resolve validly.

### Requirement 3: Legacy and Ephemeral Cleanup
The repository root MUST NOT contain stale cache folders (`specs/`), throwaway scratch experiments in `temp/`, or unmanaged developer notes (`dev/`, `conversations/`).

#### Scenario: Clean working tree
- **GIVEN** the repository root
- **WHEN** inspecting top-level directories
- **THEN** only standard architectural folders MUST be present (`_samples_nn/`, `workspace_NN/`, `iNNfo/`, `simulation/`, `skills/`, `scripts/`, `manifest/`, `marketing/`, `docs/`, `.agents/`, `.github/`, `.atl/`, `node_modules/`, `openspec/`)
- **AND** no tests in the repository MUST fail due to missing ephemeral files.
