# Specification: Templates, Consoles, and Procedures Ecosystem

## ADDED Requirements

### Requirement 1: `business-model` Standalone Boundary
`iNNfo/specs/templates/business-model/spec_NN.md` SHALL be a pure standalone Level 2 template defining core business concepts without `includes`.
- The YAML frontmatter MUST NOT declare `includes:`.
- Concepts `Roles`, `Functions`, `Position`, `Person`, `Skills` SHALL remain owned by `organization/spec_NN.md`.
- Concepts `Project`, `Phases`, `Milestone`, `Deliverable`, `Task`, `Risk`, `Project roles` SHALL remain owned by `projects/spec_NN.md`.
- The composite template `business/spec_NN.md` SHALL remain the sole aggregator including `business-model`, `analysis`, `organization`, `projects`, and `metrics`.

### Requirement 2: `analysis` Template Sanitization
`iNNfo/specs/templates/analysis/spec_NN.md` SHALL contain only valid, declared strategic analysis concepts and clean documentation.
- The concept `SWOT` MUST be completely purged from tables, prose, matrix descriptions, and examples.
- The Level 3 example block in the documentation MUST NOT contain an `# NN index` section.
- The `# NN index` of the Level 2 template MUST accurately reflect only the declared Level 2 concepts:
  ```markdown
  # NN index
  * [[Analysis]]
    * [[Assumptions]]
    * [[Risks]]
    * [[Keys]]
    * [[Suggestions]]
  * [[Validation]]
    * [[Coherence]]
    * [[Experiments]]
  ```

### Requirement 3: 100% Modeler Sidebar Concept Documentation Coverage
Every `# NN Concept Definition: <Concept>` in all active Level 2 templates MUST provide rich, structured documentation for the iNNfo Modeler right-hand sidebar.
- Every concept definition MUST include:
  - `### Summary`: A concise 1-2 sentence definition of the concept's business or operational purpose.
  - `### Description`: A comprehensive explanation describing how elements of this concept should be authored, their role in the overall model, and best practices.
- Concept properties (`icon::`, `type::`, `color::`, `weight::`) MUST be valid and consistent with the design tokens.

### Requirement 4: Specification Version & Catalog Alignment
All active templates and the template catalog SHALL declare aligned, compatible versions.
- All active domain templates SHALL align to `spec_version: "V_0-2-1"` (or current stable meta-spec tip `V_0-2-1`/`V_0-2-4`) and declare valid `parent_spec.url` targeting `specs/iNNfo_V_0-2-1_NN.md`.
- `iNNfo/specs/templates/catalog.json` MUST accurately register every active template, its adopted version, and canonical repository URL.

### Requirement 5: Domain-Specific Execution Procedures
Every active template SHALL declare at least one domain-relevant executable procedure in frontmatter under `procedures:`.
- **Organization**: `procedures/audit_skill_gaps_NN.md` and `procedures/export_team_directory_NN.md`.
- **Projects**: `procedures/calculate_critical_path_NN.md` and `procedures/generate_status_report_NN.md`.
- **Analysis**: `procedures/run_coherence_audit_NN.md` and `procedures/prioritize_experiments_NN.md`.
- **Innovation**: `procedures/score_innovation_pipeline_NN.md`.
- **Documentation**: `procedures/generate_docsify_suite_NN.md`.
- All procedure files MUST be authored in valid iNNfo Level 3 Procedure syntax using `# NN Work`, `# NN Artifact`, `# NN Tools`, and `# NN Roles`.

### Requirement 6: Domain-Specific Blueprint Consoles & Visual Assets
Every domain SHALL provide an interactive HTML console layout in `assets/` adhering to the `artifact_blueprint.html` architecture.
- Consoles MUST load `console/innfo-console.bundle.js` and `console/visuals.js`.
- Consoles MUST declare modular dependencies via `needs[]` (e.g. `["concept-rail", "matrix-grids", "fulltext-search"]`).
- Consoles MUST render purely from JSON slots (`innfo-model` / `innfo-config`) and remain 100% functional when opened directly via `file://`.

### Requirement 7: Canonical Ghostbusters Inc. Level 3 Samples
Every active template MUST have a canonical Level 3 sample in `samples/` set in the unified Ghostbusters Inc. universe.
- Samples MUST NOT include `# NN index`.
- All reference fields MUST use WikiLink syntax `[[Target Element]]` (or `[[[A]], [[B]]]` for multiple targets).
- All element descriptions MUST be written in free-form Markdown prose below the key-value properties.
- Missing canonical samples (`business-model`, `repository`, `video-generator`) MUST be created, and `metrics` sample updated to the current version.
