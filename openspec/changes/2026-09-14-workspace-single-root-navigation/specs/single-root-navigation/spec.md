# Spec: Workspace Single-Root Navigation & Progressive Disclosure (Slice 2)

## Specification Requirements

### Requirement 1: Single-Root LeftSidebar Tree Navigation
The `innfo-editor` navigation engine MUST render:
- **Root Level**: Exclusively top-level models (In-Degree = 0, default `workspace_NN.md`).
- **Branch Expansion**: Clicking the expand chevron on concepts containing `type:: model` lazily fetches and renders child submodels.
- **Asynchronous Feedback**: A subtle spinner/skeleton is shown while the submodel is being parsed from the model driver.

### Requirement 2: 3-Tier Progressive Disclosure Protocol
AI skills (`nn-innfo`, `nn-trannsform`, `nn-dev-check-integrity`) MUST adhere to:
- **Tier 1 (Root Discovery)**: Read `workspace_NN.md` to identify submodel locations.
- **Tier 2 (Catalog Query)**: Read `sources_NN.md`, `procedures_NN.md`, or `artifacts_NN.md` to scan the `summary`, `format`, `status`, and `tags` of all items without opening individual source or procedure files.
- **Tier 3 (Targeted Inspection)**: Read the specific `source_model` or `artifact_model` only when detailed element inspection is required.
