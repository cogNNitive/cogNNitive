# Spec: Workspace Template & Polymorphic Sources Specification

## Specification Requirements

### Requirement 1: Polymorphic Source Concept Definition
The workspace_spec_NN.md Level 2 template MUST define the Sources concept with the following fields:
- 
ame (string): Human-readable name/label of the source.
- 	ype (select): Allowed values [local_file, url_snapshot, dynamic_feed, git_repo, api_export].
- origin_uri (string): URI representing the origin (e.g. https://..., ile:///..., or local file path).
- ormat (select): Detected format [pdf, docx, html, md, json, csv, audio, rss, repo].
- subpath (string): Subpath relative to the workspace sources root (e.g. entrevistas/director_operaciones.md).
- efresh_policy (select): Lifecycle policy [immutable, manual, scheduled, on_build].
- status (select): Current state [ready, stale, error, processing].
- 	ags (select): Ad-hoc categorization tags.

### Requirement 2: Clean Separation of Physical Metadata
The Level 3 workspace model MUST NOT store aw_hash, size_bytes, 
ormalized_at, or 
ormalized_by as element fields. These properties are the exclusive responsibility of the normalized file's YAML frontmatter in sources/nn/.

### Requirement 3: Workspace Conventions and Subsystems
The Workspace concept MUST declare workspace-level convention fields:
- 
ame (string): Name of the workspace.
- description (string): Purpose and scope.
- models_dir (string): Base directory for domain models (default models/).
- sources_dir (string): Base directory for normalized sources (default sources/nn/).
- ersion (string): Version of the workspace manifest.

### Requirement 4: Provenance and Subsystems Lineage
The template MUST retain W3C PROV lineage connections:
- Models.derived_from → references to Sources.
- Artifacts.derived_from_inputs → references to Sources and Models.
- Artifacts.produced_by → references to Procedures.
- Models × Sources and Artifacts × Sources evaluable matrices for visual cross-checking.
