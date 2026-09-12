---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/workspace_spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
title: "Workspace Specification App"
template_version: "V_0-3-0"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
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

<!-- Sources fields: raw inputs and normalized markdown -->

## NN Field Definition: raw_filename
concept:: Sources
type:: string
description:: Original file name of the raw source, relative to the workspace (e.g. sources/nn/report.docx).

## NN Field Definition: raw_hash
concept:: Sources
type:: string
description:: SHA-256 content hash of the raw file (sha256:...). Stable identity for the source.

## NN Field Definition: size
concept:: Sources
type:: string
description:: Raw file size in bytes.

## NN Field Definition: source_format
concept:: Sources
type:: select
options:: [txt, md, csv, json, docx, pdf, xlsx]
description:: Detected format of the raw source file.

## NN Field Definition: normalized_at
concept:: Sources
type:: string
description:: ISO-8601 timestamp when the source was normalized to Markdown.

## NN Field Definition: normalized_by
concept:: Sources
type:: string
description:: Tool and version that produced the normalized content (e.g. traNNsform v1.5).

## NN Field Definition: normalized_content
concept:: Sources
type:: markdown_file
description:: The normalized Markdown extracted from the raw file (stored under sources/nn/). File-backed asset.

## NN Field Definition: raw_file
concept:: Sources
type:: file
description:: Optional copy of the original raw binary, retained for full reproducibility.

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
description:: Optional projection view of the derived_from_inputs references — which Artifact draws on which Source. The reference fields remain the single source of truth; this matrix is a convenience visualization.

# Workspace Specification Template

## A level-2 unified template for the workspace manifest and provenance graph — listing models, sources, procedures, artifacts, and taxonomy tags

## Philosophy

A workspace manifest in `V_0-3-0` is the single source of truth for both workspace inventory and data lineage. It unifies structural model cataloging with the W3C PROV provenance model:
* **Models** is the single concept for domain models in the workspace, combining structural metadata (`path`, `template`, `status`, `author`) with lineage edges (`derived_from`, `generated_by`).
* **Sources** represents raw and normalized input documents.
* **Procedures** tracks the transformation activities that produce models and artifacts.
* **Artifacts** represents derivative deliverables (documents, reports, datasets, boards).
* **Tag** provides a centralized taxonomy catalog (color, icon, description) used across the workspace.

Legacy taxonomy-only grouping (`Folder`) and unstructured attachment listings (`Asset`) are retired in favor of first-class typed entities.

## Objectives

- Provide a single, canonical level-2 schema for the workspace root entry-point (`workspace_NN.md`).
- Eliminate collision risks between inventory and provenance by unifying them under cohesive concepts.
- Retain per-workspace ownership (`author`) on the manifest without polluting individual model files.
- Enable full W3C PROV graph auditability (`Sources` → `Procedures` → `Models` → `Artifacts`) directly from the workspace entrypoint.
- Centralize `Tag` styling and open taxonomy across all submodels.

## Specification

### Concepts

| Concept | Type | PROV Role | Purpose |
|---|---|---|---|
| **Workspace** | `text` | — | Prose description of the workspace: purpose, scope, and guidelines |
| **Models** | `model` | Entity | Domain model files in the workspace with metadata and derivation |
| **Sources** | `list` | Entity | Raw and normalized input source documents |
| **Procedures** | `list` | Activity | Transformation procedure runs |
| **Artifacts** | `list` | Entity | Derivative deliverables generated from sources or models |
| **Tag** | `category` | — | Centralized taxonomy tags with color, icon, and description |

### Fields

| Field | Concept | Type | Purpose |
|---|---|---|---|
| `path` | Models | `model` | Workspace-relative path to the referenced model file |
| `template` | Models | `string` | The level-2 template the referenced model conforms to |
| `status` | Models | `select` (draft / active / archived) | Lifecycle status within this workspace |
| `author` | Models | `string` | Owner of the model within this workspace |
| `derived_from` | Models | `reference` [Sources] | Sources this model was derived from |
| `generated_by` | Models | `reference` [Procedures] | Procedure run that produced this model |
| `raw_filename` | Sources | `string` | Original file path of the raw source |
| `raw_hash` | Sources | `string` | SHA-256 hash of the raw source |
| `size` | Sources | `string` | Raw file size in bytes |
| `source_format` | Sources | `select` | Detected format (txt, md, csv, json, docx, pdf, xlsx) |
| `normalized_at` | Sources | `string` | ISO-8601 timestamp of Markdown normalization |
| `normalized_by` | Sources | `string` | Tool or agent that normalized the source |
| `normalized_content` | Sources | `markdown_file` | Relative path to normalized Markdown in sources/nn/ |
| `raw_file` | Sources | `file` | Original binary copy in sources/original/ |
| `procedure_ref` | Procedures | `string` | Relative path to procedure spec |
| `agent` | Procedures | `string` | Agent or tool that ran the procedure |
| `run_at` | Procedures | `string` | ISO-8601 timestamp of procedure execution |
| `artifact_format` | Artifacts | `select` | Deliverable format (document, report, board, dataset) |
| `artifact_version` | Artifacts | `string` | Version of the artifact |
| `location` | Artifacts | `string` | Relative path to generated deliverable |
| `artifact_hash` | Artifacts | `string` | SHA-256 hash of deliverable |
| `derived_from_inputs` | Artifacts | `reference` [Sources, Models] | Inputs this deliverable was derived from |
| `produced_by` | Artifacts | `reference` [Procedures] | Procedure run that generated this deliverable |
| `color` | Tag | `string` | Hex color code or CSS token |
| `icon` | Tag | `string` | Lucide icon identifier |
| `description` | Tag | `string` | Semantic scope or definition of tag |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ✅ | Artifact-Source Lineage matrix |
| Graph edge | ❌ | Not applicable |
| Sequence | ❌ | Not applicable |

## Template

### Level 3 Model Template (Lightweight)

```yaml
---
level: 3
parent_spec:
  name: "workspace_spec"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/workspace_spec_NN.md"
model_version: "V_0-1-0"
title: "<Workspace Name>"
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
raw_filename:: sources/original/interview.docx
raw_hash:: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
size:: 14280
source_format:: docx
normalized_at:: 2026-09-06T10:00:00Z
normalized_by:: traNNsform v1.5
normalized_content:: sources/nn/interview.md

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
```
