---
spec_version: "V_0-1-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/projects/projects_V_0-1-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-1-0_NN.md"
template_version: "V_0-1-0"
title: "Projects Template"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: true
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).

# NN index

* [[Project]]
* [[Milestone]]
* [[Deliverable]]
* [[Task]]
* [[Risk]]
* [[Roles]]

# NN Concept Definition

## NN Concept Definition: Project
icon:: folder-kanban
type:: text
color:: blue
weight:: 100

## NN Concept Definition: Milestone
icon:: flag
type:: list
color:: purple
weight:: 90

## NN Concept Definition: Deliverable
icon:: package
type:: list
color:: orange
weight:: 80

## NN Concept Definition: Task
icon:: check-square
type:: list
color:: blue
weight:: 70

## NN Concept Definition: Risk
icon:: alert-triangle
type:: list
color:: red
weight:: 60

## NN Concept Definition: Roles
icon:: users
type:: list
color:: green
weight:: 50

# NN Field Definition

## NN Field Definition: status
concept:: Task
type:: select
options:: [backlog, in_progress, blocked, done]

## NN Field Definition: priority
concept:: Task
type:: select
options:: [critical, high, medium, low]

## NN Field Definition: depends_on
concept:: Task
type:: string

## NN Field Definition: duration
concept:: Task
type:: string

## NN Field Definition: start_date
concept:: Task
type:: string

## NN Field Definition: due_date
concept:: Task
type:: string

## NN Field Definition: milestone
concept:: Task
type:: reference
target_concepts:: [Milestone]

## NN Field Definition: deliverable
concept:: Task
type:: reference
target_concepts:: [Deliverable]

## NN Field Definition: target_date
concept:: Milestone
type:: string

## NN Field Definition: milestone_status
concept:: Milestone
type:: select
options:: [planned, in_progress, achieved, delayed]

## NN Field Definition: impact
concept:: Risk
type:: select
options:: [high, medium, low]

## NN Field Definition: probability
concept:: Risk
type:: select
options:: [high, medium, low]

## NN Field Definition: mitigation
concept:: Risk
type:: string

## NN Field Definition: scope
concept:: Roles
type:: select
options:: [internal, external]

# NN Marker Definition

## NN Marker Definition: health
applies_to:: [Element, Concept]
icon:: activity
color:: green
weight:: 50

# NN Matrix Definition

## NN Matrix Definition: task-roles matrix
source:: Task
target:: Roles
values:: [Responsible, Accountable, Consulted, Informed]

## NN Matrix Definition: task-deliverables matrix
source:: Task
target:: Deliverable
values:: [Creates, Modifies, Validates]

## NN Matrix Definition: risks-milestones matrix
source:: Risk
target:: Milestone
values:: [Impacts, MitigatedIn]

# Projects Template

## A template for modeling projects, milestones, deliverables, sequential task dependency graphs (Gantt / CPM), risks, and RACI matrices

## Philosophy

The Projects Template is designed for modeling and tracking projects following PMBOK (Project Management Body of Knowledge) standards. It provides structured concepts to define overall project goals (`Project`), target milestones (`Milestone`), tangible outputs (`Deliverable`), work activities (`Task`) with sequence dependencies (`depends_on`, `duration`) for Gantt / Critical Path Analysis, risk logs (`Risk`), and team RACI accountability mapping (`Roles`).

## Objectives

- Provide PMBOK-aligned concepts for project planning, execution, and tracking.
- Support task dependency graphs (`depends_on`, `duration`) enabling Critical Path Method (CPM) calculations and Gantt chart generation.
- Decouple target milestones from physical deliverables and work activities.
- Enable RACI governance mapping via evaluable matrices (`task-roles matrix`).
- Maintain risk management with probability, impact, and mitigation fields linked to milestones (`risks-milestones matrix`).

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Project** | `text` | Project summary, goals, scope, and strategic context |
| **Milestone** | `list` | Target dates and major checkpoints throughout the project lifecycle |
| **Deliverable** | `list` | Tangible or intangible work products produced by the project |
| **Task** | `list` | Sequential work items with status, priority, duration, and dependencies |
| **Risk** | `list` | Identified risks with impact, probability, and mitigation plans |
| **Roles** | `list` | Functional project roles and stakeholders |

### Markers

| Marker | Purpose |
|---|---|
| `health` | Tracks execution health and status of project components |

### Matrices

| Matrix | Source → Target | Purpose |
|---|---|---|
| Task-Roles | Task → Roles | RACI assignment (Responsible, Accountable, Consulted, Informed) |
| Task-Deliverables | Task → Deliverable | Product creation (Creates, Modifies, Validates) |
| Risks-Milestones | Risk → Milestone | Risk impact mapping (Impacts, MitigatedIn) |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ✅ | Source→target RACI and impact tables |
| Graph edge | ❌ | Not applicable |
| Sequence | ✅ | Enabled via Task `depends_on` / `duration` fields |

## Template

### Level 3 Model Template (Lightweight)

To create a project model, create a level 3 FILE mode document with:

```yaml
---
level: 3
parent_spec:
  name: "projects_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/projects/projects_V_0-1-0_NN.md"
model_version: "V_1-0-0"
title: "<Project Title>"
---

> [!NOTE]
> This is an **iNNfo document**...

# NN index

* [[Project]]
* [[Milestone]]
* [[Deliverable]]
* [[Task]]
* [[Risk]]
* [[Roles]]

# NN Project
Overall description and scope of the project.

# NN Milestone
## NN Milestone: Milestone 1
target_date:: "2026-09-01"
milestone_status:: planned

# NN Deliverable
## NN Deliverable: Deliverable 1
Description of output deliverable.

# NN Task
## NN Task: Task 1
status:: in_progress
priority:: high
duration:: 5d
milestone:: "Milestone 1"
deliverable:: "Deliverable 1"
Task description.

## NN Task: Task 2
status:: backlog
priority:: medium
depends_on:: "Task 1"
duration:: 3d
milestone:: "Milestone 1"
deliverable:: "Deliverable 1"
Task description.

# NN Risk
## NN Risk: Risk 1
impact:: high
probability:: medium
mitigation:: "Mitigation strategy"

# NN Roles
## NN Roles: Project Manager
scope:: internal

# NN matrices: task-roles matrix
| Task \ Roles | Project Manager |
| :--- | :---: |
| Task 1 | Accountable |
| Task 2 | Responsible |
```

# Concept Guidance Documentation

## Project
Overall vision, objective, and executive summary of the project.

## Milestone
Key date checkpoints and gates marking significant progress points in the project schedule.

## Deliverable
Specific artifacts or outcomes that must be completed to achieve project goals.

## Task
Actionable work units. Use `depends_on` and `duration` to construct task dependency networks for Critical Path Method (CPM) calculations.

## Risk
Uncertain events that could negatively affect project goals, including probability, impact, and mitigation strategies.

## Roles
Functional responsibilities and team positions mapped to tasks via RACI.
