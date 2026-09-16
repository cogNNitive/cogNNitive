---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
template_version: "V_0-2-1"
title: "Procedures App"
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

* [[Procedure]]
* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# NN Concept Definition

## NN Concept Definition: Procedure
icon:: workflow
type:: list
color:: teal
weight:: 110

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

## NN Field Definition: category
concept:: Procedure
type:: select
options:: [ingestion, transformation, audit, reporting, custom]
description:: Functional classification of the procedure workflow.

## NN Field Definition: summary
concept:: Procedure
type:: string
description:: Mandatory concise summary of the workflow intent and transformation steps.

## NN Field Definition: inputs_required
concept:: Procedure
type:: string
description:: References to required Source or Model concepts consumed as inputs.

## NN Field Definition: outputs_expected
concept:: Procedure
type:: string
description:: References to expected Artifact concepts produced by the procedure.

## NN Field Definition: executed_by
concept:: Procedure
type:: string
description:: Reference to responsible agent or functional role executing the procedure.

## NN Field Definition: procedure_model
concept:: Procedure
type:: model
description:: Link to concrete procedure definition or executable stepper model _NN.md.

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

## A template for modeling procedure catalogs and structured workflows with sequenced steps, roles, artifacts, tools, and RACI matrices

## Philosophy

The Procedures Template operates on two complementary tiers:
1. **Catalog Tier (Procedure)**: Enables progressive disclosure of all workspace procedures, capturing concise summaries, categorization, expected I/O, and links to detailed execution models (`procedure_model`).
2. **Execution Tier (Work, Artifact, Tools, Roles)**: Defines granular FSM step sequences, accountability matrices (RACI), and tool bindings for step-by-step procedure execution.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Procedure** | `list` | Catalog entry declaring procedure metadata, summary, required inputs, expected outputs, and model links |
| **Work** | `list` | Hierarchical tree of procedures and steps. Root elements (no `parent`) = procedure; child elements (`parent` set) = step |
| **Artifact** | `list` | Documents, deliverables, or data produced or consumed by work steps |
| **Tools** | `list` | Software or hardware used to execute work steps |
| **Roles** | `list` | Functional roles with accountability scope (internal/external) |

## Template

### Level 3 Catalog Template

```yaml
---
level: 3
parent_spec:
  name: "procedures"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/spec_NN.md"
model_version: "V_0-1-0"
title: "<Procedures Catalog Name>"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Procedure]]

# NN Procedure

## NN Procedure: Workflow Name
category:: transformation
summary:: Concise summary of workflow intent and steps.
inputs_required:: [[Source or Model Name]]
outputs_expected:: [[Artifact Name]]
executed_by:: Lead Engineer
procedure_model:: procedures/workflow_NN.md
```
