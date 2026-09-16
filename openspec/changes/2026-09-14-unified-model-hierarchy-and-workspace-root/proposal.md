# Proposal: Unified Model Hierarchy & Workspace Root (Slice 1 / Core Foundation)

## Context & Vision

We are establishing the foundational layer of the dogfooding architecture: making Sources, Procedures, and Artifacts first-class iNNfo models composed cleanly under a unified root model `workspace_NN.md`.

## Proposed Changes in Slice 1

1. **Templates Layer**:
   - Create `iNNfo/specs/templates/sources/spec_NN.md` defining the `Source` concept (`name`, `format`, `origin_uri`, `raw_path`, `summary`, `tags`, `status`, `source_model`).
   - Create `iNNfo/specs/templates/procedures/spec_NN.md` defining the `Procedure` concept (`name`, `category`, `summary`, `inputs_required`, `outputs_expected`, `executed_by`, `procedure_model`).
   - Create `iNNfo/specs/templates/artifacts/spec_NN.md` defining the `Artifact` concept (`name`, `format`, `summary`, `status`, `produced_by`, `derived_from_inputs`, `artifact_model`, `file_path`).
   - Refactor `iNNfo/specs/templates/workspace_spec_NN.md` to link `Models`, `Sources`, `Procedures`, and `Artifacts` via `type:: model`.
   - Update `catalog.json` and sync template versions.

2. **Core Metamodel & Parsing Layer (`innfo-core`)**:
   - Implement DAG topology scanner to discover in-degree of all models and detect root models (In-Degree = 0, default `workspace_NN.md`).
   - Enhance `recursiveParser/workspace.ts` to resolve submodels referenced via `type:: model` anywhere in the concept graph with recursion depth guards (`MAX_DEPTH = 10`).

3. **Strict SSOT Separation**:
   - Physical/cryptographic frontmatter (`sha256`, `raw_path`, `normalized_at`, `normalized_by`) is strictly maintained in `sources/nn/*.md` and `artifacts/models/*.md`.
   - Semantic metadata (`summary`, `format`, `tags`, `status`) lives exclusively in Level 3 model fields.

4. **Canonical Sample Workspace**:
   - Update `_samples_nn/workspace_NN.md` and create canonical `sources_NN.md`, `procedures_NN.md`, and `artifacts_NN.md`.

## Future Potential Work Items (Evolving Backlog)
- Virtual Query Models (`type:: computed_model`)
- Workspace Slicing & Ephemeral Projection
- Model-Driven Executable CLI & Dynamic MCP Tools
- Event-Driven Reactive Triggers (`model_triggers`)
- Semantic Time-Travel & Merkle Snapshots
