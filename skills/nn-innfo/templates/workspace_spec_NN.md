---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/workspace_spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
title: "Workspace Specification App"
template_version: "V_0-5-1"
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
* [[Specs]]
* [[Templates]]
* [[Models]]
* [[Sources]]
* [[Procedures]]
* [[Artifacts]]
* [[Skills]]
* [[Tools]]
* [[Tag]]

# NN Concept Definition

## NN Concept Definition: Workspace
icon:: layout-dashboard
type:: text
color:: blue
weight:: 100

## NN Concept Definition: Specs
icon:: book-open
type:: model
color:: purple
weight:: 95

## NN Concept Definition: Templates
icon:: copy
type:: model
color:: indigo
weight:: 90

## NN Concept Definition: Models
icon:: file-symlink
type:: model
color:: blue
weight:: 85

## NN Concept Definition: Sources
icon:: file-input
type:: model
color:: cyan
weight:: 80

## NN Concept Definition: Procedures
icon:: workflow
type:: model
color:: emerald
weight:: 75

## NN Concept Definition: Artifacts
icon:: file-output
type:: model
color:: amber
weight:: 70

## NN Concept Definition: Skills
icon:: bot
type:: list
color:: amber
weight:: 65

## NN Concept Definition: Tools
icon:: wrench
type:: list
color:: slate
weight:: 60

## NN Concept Definition: Tag
icon:: tag
type:: category
color:: purple
weight:: 50

# NN Field Definition

<!-- Workspace fields: conventions & global config -->

## NN Field Definition: name
concept:: Workspace
type:: string
description:: Display name or title of the workspace.

## NN Field Definition: environment
concept:: Workspace
type:: select
options:: [development, staging, production]
description:: Execution context of the workspace.

## NN Field Definition: models_dir
concept:: Workspace
type:: string
description:: Base relative path for domain models in the workspace (default: models/).

## NN Field Definition: sources_dir
concept:: Workspace
type:: string
description:: Base relative path for normalized sources in the workspace (default: sources/nn/).

## NN Field Definition: templates_dir
concept:: Workspace
type:: string
description:: Base relative path for template packages in the workspace (default: templates/).

## NN Field Definition: skills_dir
concept:: Workspace
type:: string
description:: Base relative path for agent skills in the workspace (default: skills/).

<!-- Specs fields -->

## NN Field Definition: path
concept:: Specs
type:: model
description:: Workspace-relative path to the formal specification document (e.g. specs/iNNfo_V_0-2-1_NN.md).

## NN Field Definition: level
concept:: Specs
type:: select
options:: [0, 1, 2]
description:: Abstraction level of the spec (0=primitive meta-meta, 1=meta-template, 2=template spec).

<!-- Templates fields -->

## NN Field Definition: path
concept:: Templates
type:: model
description:: Workspace-relative path to the template spec_NN.md file (e.g. templates/business/spec_NN.md).

## NN Field Definition: category
concept:: Templates
type:: string
description:: Domain classification or strategic focus of the template.

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

<!-- Sources fields: link to sources catalog model -->

## NN Field Definition: path
concept:: Sources
type:: model
description:: Workspace-relative path to the sources catalog model document (e.g. sources_NN.md).

<!-- Procedures fields: link to procedures catalog model -->

## NN Field Definition: path
concept:: Procedures
type:: model
description:: Workspace-relative path to the procedures catalog model document (e.g. procedures_NN.md).

<!-- Artifacts fields: link to artifacts catalog model -->

## NN Field Definition: path
concept:: Artifacts
type:: model
description:: Workspace-relative path to the artifacts catalog model document (e.g. artifacts_NN.md).

<!-- Skills fields: link to AI agent skills -->

## NN Field Definition: path
concept:: Skills
type:: file
description:: Relative path to the agent SKILL.md file.

## NN Field Definition: role
concept:: Skills
type:: string
description:: Operational role and specialization of the skill agent.

## NN Field Definition: target_agents
concept:: Skills
type:: string
description:: Compatible agent platforms (e.g. Antigravity, Claude Code, OpenCode).

<!-- Tools fields: link to executable tools and scripts -->

## NN Field Definition: path
concept:: Tools
type:: file
description:: Relative path to the executable tool script or CLI runner.

## NN Field Definition: runtime
concept:: Tools
type:: select
options:: [node, python, bash, powershell]
description:: Execution runtime required for this tool.

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

## A level-2 unified template for the workspace root manifest — linking domain models, specs, templates, sources, procedures, artifacts, skills, tools, and taxonomy tags

## Philosophy

A workspace manifest is the single source of truth for workspace topology, execution context, and data lineage:
* **Workspace** sets directory conventions and environment parameters (`models_dir`, `sources_dir`, `templates_dir`, `skills_dir`).
* **Specs** links to formal grammar specifications via `type:: model`.
* **Templates** links to available template packages via `type:: model`.
* **Models** links to domain model files with metadata and derivation edges.
* **Sources** links to `sources_NN.md` catalog via `type:: model`.
* **Procedures** links to `procedures_NN.md` catalog via `type:: model`.
* **Artifacts** links to `artifacts_NN.md` catalog via `type:: model`.
* **Skills** links to agent capability definitions (`SKILL.md`) via `type:: file`.
* **Tools** links to executable maintenance scripts via `type:: file`.
* **Tag** provides a centralized taxonomy catalog (`color`, `icon`, `description`) used across the workspace.

## Specification

### Concepts

| Concept | Type | PROV Role | Purpose |
|---|---|---|---|
| **Workspace** | text | — | Prose description and configuration parameters of the workspace |
| **Specs** | model | Plan | Formal language specifications (Level 0 / Level 1) |
| **Templates** | model | Plan | Level 2 domain templates available for instantiation |
| **Models** | model | Entity | Domain model files in the workspace with metadata and derivation |
| **Sources** | model | Entity | Link to the Sources catalog model |
| **Procedures** | model | Activity | Link to the Procedures catalog model |
| **Artifacts** | model | Entity | Link to the Artifacts catalog model |
| **Skills** | file | Agent | Link to standard agent SKILL.md files |
| **Tools** | file | Agent | Link to executable tool scripts and runners |
| **Tag** | category | — | Centralized taxonomy tags with color, icon, and description |

## Template

### Level 3 Model Template (Lightweight)

```yaml
---
level: 3
parent_spec:
  name: "workspace"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/workspace_spec_NN.md"
model_version: "V_0-1-0"
title: "<Workspace Name>"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Workspace]]
* [[Specs]]
* [[Templates]]
* [[Models]]
* [[Sources]]
* [[Procedures]]
* [[Artifacts]]
* [[Skills]]
* [[Tools]]
* [[Tag]]

# NN Workspace
name:: "<Workspace Name>"
environment:: development
models_dir:: models/
sources_dir:: sources/nn/
templates_dir:: templates/
skills_dir:: skills/

Description of the workspace: its purpose, scope, and conventions.

# NN Specs

## NN Specs: iNNfo Metaplantilla N1
path:: specs/iNNfo_V_0-2-1_NN.md
level:: 1

# NN Templates

## NN Templates: Business Model Template
path:: templates/business/spec_NN.md
category:: Strategy

# NN Models

## NN Models: Core Business Model
path:: models/business_NN.md
template:: business
status:: active
author:: Lead Architect

# NN Sources

## NN Sources: Sources Catalog
path:: sources_NN.md

# NN Procedures

## NN Procedures: Procedures Catalog
path:: procedures_NN.md

# NN Artifacts

## NN Artifacts: Artifacts Catalog
path:: artifacts_NN.md

# NN Skills

## NN Skills: Model Creation Wizard
path:: skills/nn-innfo/SKILL.md
role:: Conversational Architecture Coach

# NN Tools

## NN Tools: Integrity Checker
path:: tools/check_integrity.mjs
runtime:: node

# NN Tag

## NN Tag: architecture
color:: #3b82f6
icon:: layers
description:: Foundational architecture and patterns.
```
