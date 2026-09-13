---
spec_version: V_0-2-1
spec_url: https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/workspace_spec_NN.md
level: 2
parent_spec:
  name: iNNfo_V_0-2-1
  url: https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md
title: Workspace Specification App
template_version: V_0-4-0
relationship_types:
  hierarchy:
    enabled: true
    via: index block
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Workspace]]
* [[Models]]
* [[Sources]]
* [[Procedures]]
* [[Artifacts]]
* [[Tag]]

# NN Concept Definition

## NN Concept Definition: Workspace
icon:: layout-dashboard
type:: text
color:: blue
weight:: 100

## NN Concept Definition: Models
icon:: file-symlink
type:: model
color:: blue
weight:: 90

## NN Concept Definition: Sources
icon:: file-input
type:: list
color:: teal
weight:: 80

## NN Concept Definition: Procedures
icon:: workflow
type:: list
color:: teal
weight:: 70

## NN Concept Definition: Artifacts
icon:: file-output
type:: list
color:: teal
weight:: 60

## NN Concept Definition: Tag
icon:: tag
type:: category
color:: indigo
weight:: 50

# NN Field Definition

<!-- Workspace fields: conventions & global config -->

## NN Field Definition: models_dir
concept:: Workspace
type:: string
description:: Base relative path for domain models in the workspace (default: models/).

## NN Field Definition: sources_dir
concept:: Workspace
type:: string
description:: Base relative path for normalized sources in the workspace (default: sources/nn/).

<!-- Tag fields -->

## NN Field Definition: color
concept:: Tag
type:: string
description:: Hex color code (e.g. #10b981) or CSS token for tag badges and highlights.

## NN Field Definition: icon
concept:: Tag
type:: string
description:: Icon identifier (e.g. Lucide icon name) displayed with the tag badge.

## NN Field Definition: description
concept:: Tag
type:: string
description:: Semantic description, strategic intent, or scope of the tag.

<!-- Models fields: inventory + provenance -->

## NN Field Definition: path
concept:: Models
type:: model
description:: Workspace-relative path to the referenced model file.

## NN Field Definition: template
concept:: Models
type:: string
description:: The level-2 template the referenced model conforms to.

## NN Field Definition: status
concept:: Models
type:: select
options:: [draft, active, archived]
description:: Lifecycle status of the model within this workspace.

## NN Field Definition: author
concept:: Models
type:: string
description:: Author or owner of the model within this workspace (workspace-scoped; not stored in the model file).

## NN Field Definition: derived_from
concept:: Models
type:: reference
target_concepts:: [Sources]
description:: The Sources this model was derived from (PROV wasDerivedFrom).

## NN Field Definition: generated_by
concept:: Models
type:: reference
target_concepts:: [Procedures]
description:: The Procedure run that produced this model (PROV wasGeneratedBy).

<!-- Sources fields: polymorphic sources (local files, web snapshots, dynamic feeds, repos) -->

## NN Field Definition: type
concept:: Sources
type:: select
options:: [local_file, url_snapshot, dynamic_feed, git_repo, api_export]
description:: Polymorphic origin category of the primary source.

## NN Field Definition: origin_uri
concept:: Sources
type:: string
description:: Universal identifier of origin: local path, web URL (https://), or git repository URI.

## NN Field Definition: format
concept:: Sources
type:: select
options:: [txt, md, csv, json, docx, pdf, xlsx, html, audio, rss, repo]
description:: Original file or payload format.

## NN Field Definition: subpath
concept:: Sources
type:: string
description:: Relative subpath to the normalized source document inside sources/nn/.

## NN Field Definition: refresh_policy
concept:: Sources
type:: select
options:: [immutable, manual, scheduled, on_build]
description:: Lifecycle policy for re-scraping or refreshing the source content.

## NN Field Definition: status
concept:: Sources
type:: select
options:: [ready, stale, error, processing]
description:: Operational state of the source snapshot.

## NN Field Definition: tags
concept:: Sources
type:: string
description:: Categorization and domain tags for grouping sources.

<!-- Procedures fields: transformation activities -->

## NN Field Definition: procedure_ref
concept:: Procedures
type:: string
description:: Link or path to the reusable procedure spec (e.g. procedures/Document_Ingest_V_1-0-0_procedures_NN.md).

## NN Field Definition: agent
concept:: Procedures
type:: string
description:: The agent that executed the procedure (tool and/or LLM, e.g. actioNN nn-trannsform + Claude).

## NN Field Definition: run_at
concept:: Procedures
type:: string
description:: ISO-8601 timestamp of the procedure run.

<!-- Artifacts fields: derivative deliverables -->

## NN Field Definition: artifact_format
concept:: Artifacts
type:: select
options:: [document, report, board, dataset]
description:: Kind of artifact. Every generated deliverable is an Artifact.

## NN Field Definition: artifact_version
concept:: Artifacts
type:: string
description:: Version of the artifact.

## NN Field Definition: location
concept:: Artifacts
type:: string
description:: Path to the artifact within the workspace (e.g. artifacts/Executive_Summary_V_0-1-0.md).

## NN Field Definition: artifact_hash
concept:: Artifacts
type:: string
description:: Optional SHA-256 hash of the artifact for reproducibility.

## NN Field Definition: derived_from_inputs
concept:: Artifacts
type:: reference
target_concepts:: [Sources, Models]
description:: The immediate inputs this artifact was derived from — Sources and/or Models (PROV wasDerivedFrom).

## NN Field Definition: produced_by
concept:: Artifacts
type:: reference
target_concepts:: [Procedures]
description:: The Procedure run that produced this artifact (PROV wasGeneratedBy).

# NN Marker Definition

## NN Marker Definition: verified
applies_to:: [Element]
symbol:: >
icon:: shield-check
color:: green

# NN Matrix Definition

## NN Matrix Definition: Artifact-Source Lineage
source:: Artifacts
target:: Sources
values:: [X]
widget:: boolean
description:: Optional projection view of the derived_from_inputs references — which Artifact draws on which Source.

## NN Matrix Definition: Model-Source Lineage
source:: Models
target:: Sources
values:: [X]
widget:: boolean
description:: Optional projection view of the derived_from references — which Model consumes which Source.

# Workspace Specification Template

## A level-2 unified template for the workspace manifest and provenance graph — listing models, polymorphic sources, procedures, artifacts, and taxonomy tags

## Philosophy

A workspace manifest in V_0-4-0 is the single source of truth for workspace topology and data lineage, while respecting physical storage separation:
* **Workspace** sets directory conventions (models_dir, sources_dir).
* **Models** combines structural metadata (path, 	emplate, status, uthor) with lineage edges (derived_from, generated_by).
* **Sources** models polymorphic primary sources (local files, web snapshots, feeds, git repos) via relative subpaths. Physical hashes, byte sizes, and timestamps reside strictly within sources/nn/*.md frontmatter.
* **Procedures** tracks the transformation activities that produce models and artifacts.
* **Artifacts** represents derivative deliverables (documents, reports, datasets, boards).
* **Tag** provides a centralized taxonomy catalog (color, icon, description) used across the workspace.

## Specification

### Concepts

| Concept | Type | PROV Role | Purpose |
|---|---|---|---|
| **Workspace** | 	ext | — | Prose description and directory conventions of the workspace |
| **Models** | model | Entity | Domain model files in the workspace with metadata and derivation |
| **Sources** | list | Entity | Polymorphic primary sources (local files, web snapshots, feeds, repos) |
| **Procedures** | list | Activity | Transformation procedure runs |
| **Artifacts** | list | Entity | Derivative deliverables generated from sources or models |
| **Tag** | category | — | Centralized taxonomy tags with color, icon, and description |

### Fields

| Field | Concept | Type | Purpose |
|---|---|---|---|
| models_dir | Workspace | string | Base path for models (default: models/) |
| sources_dir | Workspace | string | Base path for normalized sources (default: sources/nn/) |
| path | Models | model | Workspace-relative path to the referenced model file |
| 	emplate | Models | string | The level-2 template the referenced model conforms to |
| status | Models | select | Lifecycle status within this workspace |
| uthor | Models | string | Owner of the model within this workspace |
| derived_from | Models | eference [Sources] | Sources this model was derived from |
| generated_by | Models | eference [Procedures] | Procedure run that produced this model |
| 	ype | Sources | select | local_file, url_snapshot, dynamic_feed, git_repo, api_export |
| origin_uri | Sources | string | Origin URI (file path, http URL, git URI) |
| ormat | Sources | select | pdf, docx, html, md, json, csv, audio, rss, repo |
| subpath | Sources | string | Relative subpath within sources_dir |
| efresh_policy | Sources | select | immutable, manual, scheduled, on_build |
| status | Sources | select | ready, stale, error, processing |
| 	ags | Sources | string | Grouping and domain tags |
| procedure_ref | Procedures | string | Relative path to procedure spec |
| gent | Procedures | string | Agent or tool that ran the procedure |
| un_at | Procedures | string | ISO-8601 timestamp of procedure execution |
| rtifact_format | Artifacts | select | Deliverable format (document, report, board, dataset) |
| rtifact_version | Artifacts | string | Version of the artifact |
| location | Artifacts | string | Relative path to generated deliverable |
| rtifact_hash | Artifacts | string | SHA-256 hash of deliverable |
| derived_from_inputs | Artifacts | eference [Sources, Models] | Inputs this deliverable was derived from |
| produced_by | Artifacts | eference [Procedures] | Procedure run that generated this deliverable |
| color | Tag | string | Hex color code or CSS token |
| icon | Tag | string | Lucide icon identifier |
| description | Tag | string | Semantic scope or definition of tag |

## Template

### Level 3 Model Template (Lightweight)

`yaml
---
level: 3
parent_spec:
  name: workspace_spec
  url: https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/workspace_spec_NN.md
model_version: V_0-1-0
title: <Workspace Name>
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Workspace]]
* [[Models]]
* [[Sources]]
* [[Procedures]]
* [[Artifacts]]
* [[Tag]]

# NN Workspace
models_dir:: models/
sources_dir:: sources/nn/

Description of the workspace: its purpose, scope, and conventions.

# NN Models

## NN Models: Core Business Model
path:: models/business_V_0-1-0_business_NN.md
template:: business_V_0-2-0
status:: active
author:: Lead Architect
derived_from:: [[Interview Transcript]]

# NN Sources

## NN Sources: Interview Transcript
type:: local_file
origin_uri:: sources/original/interview.docx
format:: docx
subpath:: interviews/interview.md
refresh_policy:: immutable
status:: ready
tags:: [discovery, operations]

## NN Sources: Regulatory Benchmark
type:: url_snapshot
origin_uri:: https://example.com/compliance/standard-2026.html
format:: html
subpath:: web/standard-2026.md
refresh_policy:: manual
status:: ready
tags:: [compliance, external]

# NN Procedures

## NN Procedures: Initial Ingestion Run
procedure_ref:: procedures/ingest_V_1-0-0_procedures_NN.md
agent:: actioNN + Claude 3.5 Sonnet
run_at:: 2026-09-06T10:00:00Z

# NN Artifacts

## NN Artifacts: Executive Summary
artifact_format:: report
artifact_version:: V_1-0-0
location:: artifacts/Executive_Summary.md
derived_from_inputs:: [[Core Business Model]]
produced_by:: [[Initial Ingestion Run]]

# NN Tag

## NN Tag: architecture
color:: #3b82f6
icon:: layers
description:: Foundational architecture and patterns.
`
