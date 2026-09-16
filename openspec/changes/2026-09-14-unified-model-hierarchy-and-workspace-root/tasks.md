# Tasks: Unified Model Hierarchy & Workspace Root (Slice 1)

- [ ] 1. Template Specifications & Catalog Registration
  - [ ] 1.1 Create `iNNfo/specs/templates/sources/spec_NN.md` (Level 2 template with `Source` concept, `summary`, `source_model`, `raw_path`).
  - [ ] 1.2 Create/Update `iNNfo/specs/templates/procedures/spec_NN.md` (Level 2 template with `Procedure` concept, `summary`, `inputs_required`, `outputs_expected`, `procedure_model`).
  - [ ] 1.3 Create `iNNfo/specs/templates/artifacts/spec_NN.md` (Level 2 template with `Artifact` concept, `summary`, `produced_by`, `derived_from_inputs`, `artifact_model`).
  - [ ] 1.4 Refactor `iNNfo/specs/templates/workspace_spec_NN.md` to link `Models`, `Sources`, `Procedures`, `Artifacts` via `type:: model`.
  - [ ] 1.5 Update `catalog.json` and sync template versions via `scripts/template-catalog.mjs`.

- [ ] 2. Canonical Sample Workspace Updates
  - [ ] 2.1 Update `_samples_nn/workspace_NN.md` and create `sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`.
  - [ ] 2.2 Add sample normalized source in `_samples_nn/sources/nn/` with physical frontmatter only.
  - [ ] 2.3 Add sample structured artifact model in `_samples_nn/artifacts/models/` with W3C PROV frontmatter.

- [ ] 3. Core Engine: Topology Scanner & Recursive Parser (`innfo-core`)
  - [ ] 3.1 Implement DAG topology & root-discovery algorithm with cycle protection in `innfo-core`.
  - [ ] 3.2 Add unit tests for DAG topology, root detection, and deep reference resolution in `innfo-core/tests/`.

- [ ] 4. Verification & Integrity Gate
  - [ ] 4.1 Run `npm test` on `innfo-core`.
  - [ ] 4.2 Run `node scripts/check-integrity.js` and verify manifest parity.
