# Tasks: Unified Model Hierarchy & Single-Root Workspace Navigation

- [x] 1. Template Specifications & Catalog Registration
  - [x] 1.1 Create `iNNfo/specs/templates/sources/spec_NN.md` (Level 2 template with `Source` concept, `summary`, `source_model`, `raw_path`).
  - [x] 1.2 Create/Update `iNNfo/specs/templates/procedures/spec_NN.md` (Level 2 template with `Procedure` concept, `summary`, `inputs_required`, `outputs_expected`, `procedure_model`).
  - [x] 1.3 Create `iNNfo/specs/templates/artifacts/spec_NN.md` (Level 2 template with `Artifact` concept, `summary`, `produced_by`, `derived_from_inputs`, `artifact_model`).
  - [x] 1.4 Refactor `iNNfo/specs/templates/workspace_spec_NN.md` to link `Models`, `Sources`, `Procedures`, `Artifacts` via `type:: model`.
  - [x] 1.5 Update `catalog.json` and sync template versions via `scripts/template-catalog.mjs`.

- [x] 2. Core Engine: DAG Topology Scanner & Recursive Parser (`innfo-core`)
  - [x] 2.1 Implement DAG topology & root-discovery algorithm with cycle protection (`in_degree === 0`, `MAX_DEPTH = 10`) in `innfo-core`.
  - [x] 2.2 Add unit tests for DAG topology, root detection, and deep reference resolution in `innfo-core/tests/`.

- [x] 3. Canonical Sample Workspace Updates
  - [x] 3.1 Update `_samples_nn/workspace_NN.md` and create `sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`.
  - [x] 3.2 Add sample normalized source in `_samples_nn/sources/nn/` with physical frontmatter only.
  - [x] 3.3 Add sample structured artifact model in `_samples_nn/artifacts/models/` with W3C PROV frontmatter.

- [x] 4. UI Navigation & Tree Refactoring (`innfo-editor`)
  - [x] 4.1 Update `LeftSidebar.vue` to render single-root tree starting from `workspace_NN.md`.
  - [x] 4.2 Implement reactive lazy loading and spinner feedback on node expansion for `type:: model`.
  - [x] 4.3 Remove legacy ad-hoc navigation sidebars in favor of unified tree.
  - [x] 4.4 Add component unit/integration tests in `innfo-editor`.

- [x] 5. AI Skills & Progressive Disclosure Updates
  - [x] 5.1 Update `.agents/skills/nn-innfo/SKILL.md` to document and enforce 3-Tier Progressive Disclosure using `summary` fields.
  - [x] 5.2 Update `.agents/skills/nn-trannsform/SKILL.md` to register ingested sources directly into `sources_NN.md`.

- [x] 6. Verification & Integrity Gates
  - [x] 6.1 Run `npm test` on `innfo-core` and `innfo-editor`.
  - [x] 6.2 Run `node scripts/check-integrity.js` and verify manifest parity.
  - [x] 6.3 Run `node simulacro/run-all.mjs`.
