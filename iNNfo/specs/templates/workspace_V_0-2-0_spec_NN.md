---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/workspace_V_0-2-0_spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
title: "Workspace Specification Template"
template_version: "V_0-2-0"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: false
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).

# NN index

* [[Workspace]]
* [[ModelRef]]
* [[Folder]]
* [[Asset]]

# NN Concept Definition

## NN Concept Definition: Workspace
icon:: layout-dashboard
type:: text
color:: blue
weight:: 100

## NN Concept Definition: ModelRef
icon:: file-symlink
type:: model
color:: blue
weight:: 90

## NN Concept Definition: Folder
icon:: folder
type:: category
color:: grey
weight:: 60

## NN Concept Definition: Asset
icon:: paperclip
type:: list
color:: grey
weight:: 40

# NN Field Definition

## NN Field Definition: path
concept:: ModelRef
type:: string
description:: Workspace-relative path to the referenced model file.

## NN Field Definition: template
concept:: ModelRef
type:: reference
description:: The level-2 template the referenced model conforms to.

## NN Field Definition: status
concept:: ModelRef
type:: select
options:: [draft, active, archived]
description:: Lifecycle status of the model within this workspace.

## NN Field Definition: author
concept:: ModelRef
type:: string
description:: Author or owner of the model within this workspace (workspace-scoped; not stored in the model file).

# Workspace Specification Template

## A level-2 template for the workspace manifest — the document that lists the models in a workspace and their per-workspace metadata

## Philosophy

A workspace manifest is an inventory, not a domain vocabulary. It answers "which models live in this workspace, where are their files, which template does each conform to, and who owns it here" — nothing about the subject matter the models describe. Because it is not a domain vocabulary, no domain template `includes` it; it stands alone as the schema for the `workspace_NN.md` entry-point document at a workspace root.

Each `ModelRef` names one model file. Its `path` is resolved relative to the workspace root; its `template` records the level-2 template the referenced model conforms to; its `status` tracks the model's lifecycle within this workspace; its `author` records who owns the model here. The `author` is deliberately workspace-scoped — it is recorded on the manifest entry, never written into the referenced model file, so the same model stays portable across workspaces that may attribute it differently.

`Folder` is a taxonomy-only grouping concept for organizing model references; `Asset` lists workspace-level attachments (shared images, exports, reference documents) that are not themselves iNNfo models.

## Objectives

- Give the workspace entry-point document (`workspace_NN.md`) a canonical level-2 schema in the unified `NN` syntax.
- Model each referenced model as a `ModelRef` element carrying `path`, `template`, `status`, and `author`.
- Keep per-workspace metadata (notably `author`) out of the referenced model files so models stay portable.
- Allow optional `Folder` grouping and workspace-level `Asset` listing.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Workspace** | `text` | Prose description of the workspace: its purpose, scope, and conventions |
| **ModelRef** | `model` | One reference to a model file in the workspace, with its per-workspace metadata |
| **Folder** | `category` | Taxonomy-only grouping of model references |
| **Asset** | `list` | Workspace-level attachments that are not iNNfo models |

### Fields

| Field | Concept | Type | Purpose |
|---|---|---|---|
| `path` | ModelRef | `string` | Workspace-relative path to the referenced model file |
| `template` | ModelRef | `reference` | The level-2 template the referenced model conforms to |
| `status` | ModelRef | `select` (draft / active / archived) | Lifecycle status of the model within this workspace |
| `author` | ModelRef | `string` | Author or owner of the model within this workspace (workspace-scoped) |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ❌ | Not applicable |
| Graph edge | ❌ | Not applicable |
| Sequence | ❌ | Not applicable |

## Template

### Level 3 Model Template (Lightweight)

To create a workspace manifest, place a `workspace_NN.md` at the workspace root:

```yaml
---
level: 3
parent_spec:
  name: "workspace_spec"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/workspace_V_0-2-0_spec_NN.md"
model_version: "V_x-y-z"
title: "<Workspace Name>"
---

> [!NOTE]
> This is an **iNNfo document**...

# NN index
* [[Workspace]]
* [[ModelRef]]

# NN Workspace
Description of the workspace: its purpose, scope, and conventions.

# NN ModelRef

## NN ModelRef: Business Model
path:: Acme%20Business%20Model_V_0-1-0_business_NN.md
template:: [[business_V_0-2-0]]
status:: active
author:: Ada Lovelace

## NN ModelRef: Engineering Team
path:: models/EngineeringTeam_V_0-2-0_organization_NN.md
template:: [[organization_V_0-2-0]]
status:: draft
author:: Grace Hopper
```

The application resolves the `parent_spec` URL, downloads this template, and uses its
Concept Definitions and Field Definitions to validate and render the workspace
manifest. Each `## NN ModelRef:` entry's `path` is followed to load the referenced
model; its `author` is attached to that model's node for the current workspace only.

## Examples

A minimal two-model workspace manifest:

```markdown
# NN Workspace
The Acme product workspace.

# NN ModelRef

## NN ModelRef: Product Business Model
path:: Acme_V_0-1-0_business_NN.md
template:: [[business_V_0-2-0]]
status:: active
author:: Ada Lovelace

## NN ModelRef: Release Plan
path:: models/Release_V_0-2-0_projects_NN.md
template:: [[projects_V_0-2-0]]
status:: draft
author:: Linus Torvalds
```

