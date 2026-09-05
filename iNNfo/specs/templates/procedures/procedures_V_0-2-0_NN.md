---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-2-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-1_NN.md"
template_version: "V_0-2-0"
title: "Procedures Template"
relationship_types:
  hierarchy:
    enabled: false
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: true
viewers:
  - id: "guided-procedure"
    view_type: "fsm-stepper"
    target_concept: "Work"
    label: "Guided Procedure Execution"
    icon: "play-circle"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# NN Concept Definition

## NN Concept Definition: Work
icon:: list-ordered
type:: list
color:: blue
weight:: 100

## NN Concept Definition: Artifact
icon:: package
type:: list
color:: orange
weight:: 80

## NN Concept Definition: Tools
icon:: wrench
type:: list
color:: orange
weight:: 70

## NN Concept Definition: Roles
icon:: users
type:: list
color:: green
weight:: 60

# NN Field Definition

## NN Field Definition: step_type
concept:: Work
type:: select
options:: [task, decision, event]

## NN Field Definition: parent
concept:: Work
type:: reference
target_concepts:: [Work]

## NN Field Definition: next
concept:: Work
type:: reference
target_concepts:: [Work]

## NN Field Definition: condition
concept:: Work
type:: string

## NN Field Definition: input
concept:: Work
type:: reference
target_concepts:: [Artifact]

## NN Field Definition: output
concept:: Work
type:: reference
target_concepts:: [Artifact]

## NN Field Definition: output_status
concept:: Work
type:: string

## NN Field Definition: tool
concept:: Work
type:: reference
target_concepts:: [Tools]

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

## NN Matrix Definition: work-roles matrix
source:: Work
target:: Roles
values:: [Responsible, Accountable, Consulted, Informed]

## NN Matrix Definition: work-tools matrix
source:: Work
target:: Tools
values:: [Uses]

## NN Matrix Definition: work-artifacts matrix
source:: Work
target:: Artifact
values:: [Creates, Modifies, Validates, Reviews]

# Procedures Template

## A template for modeling structured workflows with sequenced steps, roles, artifacts, tools, and RACI matrices

## Philosophy

The Procedures Template is designed for modeling repeatable workflows with clear accountability. It follows the belief that any procedure can be understood as a hierarchical tree of procedures and steps, each producing or consuming artifacts, assigned to roles via a RACI matrix, and supported by tools. Work elements form a tree: root elements (no `parent`) define a procedure, child elements (`parent` set) define its steps. The template emphasizes traceability — every work step declares its inputs, outputs, parent procedure, and the roles responsible for it.

## Objectives

- Provide a complete set of concepts for workflow modeling: hierarchical procedures and steps (Work), produced artifacts (Artifact), supporting tools (Tools), and functional roles (Roles).
- Enable RACI accountability mapping via evaluable matrices (Work ↔ Roles).
- Support sequential step definitions with conditional branching, tool assignment, and artifact I/O.
- Serve as the default template for procedure and process modeling in the iNNfo ecosystem.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Work** | `list` | Hierarchical tree of procedures and steps. Root elements (no `parent`) = procedure; child elements (`parent` set) = step. Each element has fields for step_type, parent, next, condition, I/O, tool |
| **Artifact** | `list` | Documents, deliverables, or data produced or consumed by work steps |
| **Tools** | `list` | Software or hardware used to execute work steps |
| **Roles** | `list` | Functional roles with accountability scope (internal/external) |

### Markers

| Marker | Purpose |
|---|---|
| `complexity` | How complex the procedure step or element is to execute |

### Matrices

| Matrix | Source → Target | Purpose |
|---|---|---|
| Work-Roles | Work → Roles | RACI assignment (Responsible, Accountable, Consulted, Informed) |
| Work-Tools | Work → Tools | Which tools are used by each work step |
| Work-Artifacts | Work → Artifact | I/O relationships (Creates, Modifies, Validates, Reviews) |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | Implicit via Work `parent` field — root elements are procedures, children are steps |
| Evaluable matrix | ✅ | Source→target tables with RACI params |
| Graph edge | ❌ | Not applicable |
| Sequence | ✅ | Via Work `next` field — hand-linked order between siblings at same level |

## Template

### Level 3 Model Template (Lightweight)

To create a procedures model, create a level 3 FILE mode document with:

```yaml
---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-2-0_NN.md"
model_version: "V_x-y-z"
title: "<Procedure Name>"
---

> [!NOTE]
> This is an **iNNfo document**...

# NN index
* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# NN Work
## NN Work: Procedure Name
next:: "Next Procedure Name"
Procedure description.

## NN Work: Step Name
parent:: "Procedure Name"
step_type:: task
next:: "Next Step Name"
tool:: "Tool Name"
Step description.

# NN Artifact
## NN Artifact: Artifact Name
Artifact description.

# NN matrices: work-roles matrix
| Work \ Roles | Role Name |
| :--- | :---: |
| Step Name | Responsible |
```

The application will resolve the `parent` URL, download this template, and use its
Concept Definitions, Field Definitions, Marker Definitions, and Matrix Definitions to
validate and render your model.

## Examples

### Canonical Sample

The official sample for this template is at `specs/templates/procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md`. It exercises the hierarchical Work tree with two root procedures (Standard Ghost Containment Protocol → Subterranean Containment Grid Shutdown Recovery), element properties (parent, step_type, next, I/O, tool), and the RACI, tools, and artifacts matrices.

### Parent Chain

```yaml
# From the Ghostbusters procedures sample:
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-2-0_NN.md"

# This template's parent:
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-1_NN.md"
```


# Concept Guidance Documentation

## Work

### Summary
Hierarchical tree of procedures and their steps. Root elements (no `parent`) represent procedures; child elements (with `parent`) represent individual steps.

### Description
Procedures and their ordered steps form a tree: root elements describe the procedure, child elements are the steps. Root elements use `next` to order procedures, child elements use `next` to order steps within a parent. All Work items can reference artifacts as inputs and outputs (`input`, `output`), and tools as resources (`tool`).

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## Artifact

### Summary
Documents and deliverables produced or consumed by work steps.

### Description
Tangible or digital outputs that flow through the procedure (e.g. documents, forms, reports, certificates). Work items interact with artifacts via the work-artifacts matrix (Creates, Modifies, Validates, Reviews).

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## Tools

### Summary
Software and resources used to carry out work steps.

### Description
Software applications, instruments, or resources used to modify, generate, or process artifacts during a work item (e.g. IDE, spreadsheet, design tool, CI pipeline). Connected to work via the work-tools matrix.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## Roles

### Summary
The functional roles that act in the workflow.

### Description
The functional responsibilities/actors in the workflow (e.g. Developer, QA).

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*



## complexity

### Summary
Description of complexity.

### Description
Description of complexity.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## work-roles matrix

### Summary
Description of work-roles matrix.

### Description
Description of work-roles matrix.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*



## work-tools matrix

### Summary
Description of work-tools matrix.

### Description
Description of work-tools matrix.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## work-artifacts matrix

### Summary
Description of work-artifacts matrix.

### Description
Description of work-artifacts matrix.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## item-markers matrix

### Summary
Description of item-markers matrix.

### Description
Description of item-markers matrix.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*
