---
spec_version: "V_0-1-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/organization/organization_V_0-1-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-1-0_NN.md"
template_version: "V_0-1-0"
title: "Organization Template"
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
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).

# NN index

* [[Organization]]
* [[Roles]]
* [[Position]]
* [[Person]]

# NN Concept Definition

## NN Concept Definition: Organization
icon:: building
type:: text
color:: blue
weight:: 100

## NN Concept Definition: Roles
icon:: users
type:: list
color:: green
weight:: 60

## NN Concept Definition: Position
icon:: briefcase
type:: list
color:: green
weight:: 50

## NN Concept Definition: Person
icon:: user
type:: list
color:: green
weight:: 40

# NN Field Definition

## NN Field Definition: scope
concept:: Roles
type:: select
options:: [internal, external]

# NN Marker Definition

## NN Marker Definition: complexity
applies_to:: [Element, Concept]
icon:: gauge
color:: green
weight:: 50

# NN Matrix Definition

## NN Matrix Definition: positions-roles matrix
source:: Position
target:: Roles
values:: [Assumes]

## NN Matrix Definition: persons-positions matrix
source:: Person
target:: Position
values:: [Occupies]

# Organization Template

## A template for modeling organizational structures, roles, positions, and person assignments

## Philosophy

The Organization Template is designed to model the human resource structure of an enterprise or team. It separates the definitions of functional responsibilities (Roles), organizational seats (Positions), and the physical individuals who fill those seats (Persons). By decoupling organizational structure from behavioral workflows, it ensures that changes in personnel or job titles do not invalidate process descriptions.

## Objectives

- Provide a standardized structure for representing people, positions, and roles within the iNNfo ecosystem.
- Enable clear mapping of which positions assume which roles via the positions-roles matrix.
- Enable clear mapping of which persons occupy which positions via the persons-positions matrix.
- Allow organizational structures to be modeled independently of procedures and business models.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Organization** | `text` | Description of the overall organization structure and objectives |
| **Roles** | `list` | Functional responsibilities/actors with internal/external scope |
| **Position** | `list` | Job titles or seats within the organization |
| **Person** | `list` | Named individuals occupying positions |

### Markers

| Marker | Purpose |
|---|---|
| `complexity` | Indicates the complexity of a role or position |

### Matrices

| Matrix | Source → Target | Purpose |
|---|---|---|
| Positions-Roles | Position → Roles | Which positions assume which roles |
| Persons-Positions | Person → Position | Who occupies which position |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ✅ | Source→target tables |
| Graph edge | ❌ | Not applicable |
| Sequence | ❌ | Not applicable |

## Template

### Level 3 Model Template (Lightweight)

To create an organization model, create a level 3 FILE mode document with:

```yaml
---
level: 3
parent_spec:
  name: "organization_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/organization/organization_V_0-1-0_NN.md"
model_version: "V_x-y-z"
title: "<Organization Name>"
---

> [!NOTE]
> This is an **iNNfo document**...

# NN index
* [[Organization]]
  * [[Roles]]
  * [[Position]]
  * [[Person]]

# NN Organization
Description of the overall organization.

# NN Roles
## NN Roles: Role Name
Role description.

# NN Position
## NN Position: Position Name
Position description.

# NN Person
## NN Person: Person Name
Person description.

# NN matrices: positions-roles matrix
| Position \ Roles | Role Name |
| :--- | :---: |
| Position Name | Assumes |

# NN matrices: persons-positions matrix
| Person \ Position | Position Name |
| :--- | :---: |
| Person Name | Occupies |
```

The application will resolve the `parent` URL, download this template, and use its
Concept Definitions, Field Definitions, Marker Definitions, and Matrix Definitions to
validate and render your model.

## Examples

### Canonical Sample

No sample ships for this template version. The canonical sample lives with the
current template version, at `specs/templates/organization/samples/Ghostbusters_V_0-2-0_organization_NN.md`.
