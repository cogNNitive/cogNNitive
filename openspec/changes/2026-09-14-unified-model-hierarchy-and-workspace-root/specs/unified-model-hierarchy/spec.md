# Spec: Unified Model Hierarchy & Workspace Root Specification (Slice 1)

## Specification Requirements

### Requirement 1: Workspace Root Composition (`workspace_spec_NN.md`)
The `workspace_spec_NN.md` Level 2 template MUST compose workspace dimensions through first-class model references:
- **Concept `Workspace`**:
  - `name` (string): Workspace name.
  - `description` (text): Purpose and scope.
  - `version` (string): Semantic version.
  - `models` (model): Reference to `models_NN.md` (or primary domain model).
  - `sources` (model): Reference to `sources_NN.md`.
  - `procedures` (model): Reference to `procedures_NN.md`.
  - `artifacts` (model): Reference to `artifacts_NN.md`.

### Requirement 2: Sources Catalog Template (`sources_spec_NN.md`)
The sources catalog MUST be governed by an iNNfo Level 2 template (`sources_spec_NN.md`):
- **Concept `Source`**:
  - `name` (string): Unique identifier / label.
  - `type` (select): `[local_file, url_snapshot, dynamic_feed, git_repo, api_export]`.
  - `origin_uri` (string): Raw source origin URI or path.
  - `format` (select): `[pdf, docx, html, md, json, csv, audio, xlsx, repo]`.
  - `raw_path` (string): Relative path to binary/raw asset in `sources/original/`.
  - `summary` (text): Mandatory concise semantic summary for progressive disclosure.
  - `tags` (select / text): Categorization tags.
  - `status` (select): `[ready, stale, processing, error]`.
  - `source_model` (model): Relative link to normalized iNNfo model in `sources/nn/`.
- **SSOT Physical Frontmatter**:
  - Normalized files under `sources/nn/*.md` MUST contain only physical/cryptographic frontmatter: `sha256`, `raw_path`, `normalized_at`, `normalized_by`.

### Requirement 3: Procedures Catalog Template (`procedures_spec_NN.md`)
The procedures catalog MUST be governed by an iNNfo Level 2 template (`procedures_spec_NN.md`):
- **Concept `Procedure`**:
  - `name` (string): Workflow identifier.
  - `category` (select): `[ingestion, transformation, audit, reporting, custom]`.
  - `summary` (text): Mandatory concise summary of workflow intent and steps.
  - `inputs_required` (list): References to required `Source` or `Model` concepts.
  - `outputs_expected` (list): References to expected `Artifact` concepts.
  - `executed_by` (select): Reference to `Roles` / Agent.
  - `procedure_model` (model): Link to concrete procedure definition `_NN.md`.

### Requirement 4: Artifacts Catalog Template (`artifacts_spec_NN.md`)
The artifacts catalog MUST be governed by an iNNfo Level 2 template (`artifacts_spec_NN.md`):
- **Concept `Artifact`**:
  - `name` (string): Output identifier.
  - `format` (select): `[model, markdown, html, json, csv, binary]`.
  - `summary` (text): Mandatory concise summary of artifact contents.
  - `status` (select): `[draft, verified, published, deprecated]`.
  - `tags` (select / text): Categorization tags.
  - `produced_by` (select): Reference to generating `Procedure`.
  - `derived_from_inputs` (list): List of references to input `Source` and `Model` concepts.
  - `artifact_model` (model): Link to structured output model in `artifacts/models/*.md` when format is `model`.
  - `file_path` (string): Relative path to output file when format is non-model.

### Requirement 5: Core Parser Topology & Root Discovery (`innfo-core`)
- The parser MUST compute model in-degrees across all `type:: model` references.
- Top-level models (`in_degree === 0`, default `workspace_NN.md`) are identified deterministically.
- Submodels are resolvable recursively with cycle prevention and depth limit (`MAX_DEPTH = 10`).
