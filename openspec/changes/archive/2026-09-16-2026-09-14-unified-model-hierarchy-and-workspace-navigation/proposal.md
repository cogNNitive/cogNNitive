# Proposal: Unified Model Hierarchy & Workspace Single-Root Navigation

## Context & Vision

We are establishing the unified architectural foundation for iNNfo dogfooding:
1. **First-class Metamodel**: Making Sources, Procedures, and Artifacts first-class iNNfo models composed cleanly under a single root model `workspace_NN.md`.
2. **Deterministic DAG Topology**: Equipping `innfo-core` with root-model discovery (models with in-degree = 0) and deep submodel resolution (`type:: model`) with recursion guards.
3. **Single-Root UI Navigation**: Transforming `innfo-editor`'s `LeftSidebar.vue` to render a single recursive tree rooted at `workspace_NN.md` with lazy expansion.
4. **3-Tier Progressive Disclosure for AI Skills**: Enabling agent skills (`nn-innfo`, `nn-trannsform`) to navigate workspaces efficiently (Tier 1: Root topology -> Tier 2: Catalogs with zero-I/O `summary` -> Tier 3: Leaf model deep inspect).

## Proposed Changes

### 1. Template Layer (`iNNfo/specs/templates/`)
- Create `iNNfo/specs/templates/sources/spec_NN.md` defining the `Source` concept (`name`, `type`, `origin_uri`, `raw_path`, `format`, `summary`, `tags`, `status`, `source_model`).
- Create `iNNfo/specs/templates/procedures/spec_NN.md` defining the `Procedure` concept (`name`, `category`, `summary`, `inputs_required`, `outputs_expected`, `executed_by`, `procedure_model`).
- Create `iNNfo/specs/templates/artifacts/spec_NN.md` defining the `Artifact` concept (`name`, `format`, `summary`, `status`, `tags`, `produced_by`, `derived_from_inputs`, `artifact_model`, `file_path`).
- Refactor `iNNfo/specs/templates/workspace_spec_NN.md` to link `Models`, `Sources`, `Procedures`, and `Artifacts` via `type:: model`.
- Update `catalog.json` and sync template versions.

### 2. Metamodel & DAG Topology (`innfo-core`)
- Implement a DAG topology scanner to discover in-degree across models and detect root models (`in_degree === 0`, default `workspace_NN.md`).
- Enhance `recursiveParser` to resolve submodels referenced via `type:: model` anywhere in the directory hierarchy with recursion depth guards (`MAX_DEPTH = 10`).
- Ensure strict separation of physical/cryptographic frontmatter (`sha256`, `raw_path`) in `sources/nn/*.md` and semantic metadata (`summary`, `format`, `status`) in Level 3 model fields.

### 3. Canonical Sample Workspace (`_samples_nn/`)
- Update `_samples_nn/workspace_NN.md` and create canonical `sources_NN.md`, `procedures_NN.md`, and `artifacts_NN.md`.
- Add normalized sample sources under `_samples_nn/sources/nn/` and sample structured artifacts under `_samples_nn/artifacts/models/`.

### 4. UI Navigation & Tree Refactoring (`innfo-editor`)
- Refactor `LeftSidebar.vue` to render a single unified tree starting from root model(s).
- Implement reactive lazy loading and asynchronous feedback (spinner) when expanding `type:: model` child nodes.
- Deprecate flat/ad-hoc sidebars in favor of progressive hierarchy navigation.

### 5. AI Skills & Progressive Disclosure
- Update `.agents/skills/nn-innfo/` and `.agents/skills/nn-trannsform/` to leverage 3-Tier Progressive Disclosure:
  - **Tier 1 (Root Discovery)**: Read `workspace_NN.md` to resolve top-level model locations.
  - **Tier 2 (Catalog Query)**: Read `sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md` to scan `summary`, `format`, and `status` with zero file I/O overhead.
  - **Tier 3 (Deep Read)**: Inspect specific leaf models (`source_model`, `artifact_model`) on-demand only.
