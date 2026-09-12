---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
template_version: "V_0-1-0"
title: "Use Cases & Value Proposition Template"
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

* [[Archetype]]
* [[PainPoint]]
* [[Pipeline]]
* [[Deliverable]]
* [[ValueMetric]]

# NN Concept Definition

## NN Concept Definition: Archetype
icon:: user
type:: list
color:: purple
weight:: 100

## NN Concept Definition: PainPoint
icon:: alert-triangle
type:: list
color:: red
weight:: 90

## NN Concept Definition: Pipeline
icon:: git-merge
type:: list
color:: blue
weight:: 80

## NN Concept Definition: Deliverable
icon:: package
type:: list
color:: green
weight:: 70

## NN Concept Definition: ValueMetric
icon:: trending-up
type:: list
color:: amber
weight:: 60

# NN Field Definition

## NN Field Definition: industry
concept:: Archetype
type:: string
description:: Industry vertical or domain of the archetype.

## NN Field Definition: core_focus
concept:: Archetype
type:: string
description:: Primary objective and focus area.

## NN Field Definition: target_archetype
concept:: PainPoint
type:: reference
description:: The archetype experiencing this pain point.

## NN Field Definition: symptom
concept:: PainPoint
type:: markdown_inline
description:: Concrete day-to-day documentation or alignment friction.

## NN Field Definition: severity
concept:: PainPoint
type:: string
description:: Qualitative friction level (Critical, High, Medium).

## NN Field Definition: phase
concept:: Pipeline
type:: string
description:: Lifecycle stage (Import, Manage, Export).

## NN Field Definition: action_summary
concept:: Pipeline
type:: markdown_inline
description:: What cogNNitive executes during this phase.

## NN Field Definition: format
concept:: Deliverable
type:: string
description:: Output medium (PDF, HTML Dashboard, Markdown, BibTeX).

## NN Field Definition: stakeholder
concept:: Deliverable
type:: string
description:: Primary audience or consumer of this deliverable.

## NN Field Definition: time_reduction
concept:: ValueMetric
type:: string
description:: Measurable speedup or time saved.

## NN Field Definition: strategic_roi
concept:: ValueMetric
type:: markdown_inline
description:: Qualitative strategic and business outcome.

# NN Marker Definition

## NN Marker Definition: ImpactLevel
applies_to:: [Element]
widget:: cycle
values:: [High, Medium, Low]
description:: Degree of impact or relevance.

# NN Matrix Definition

## NN Matrix Definition: ArchetypeDeliverablesMatrix
row_concept:: Archetype
col_concept:: Deliverable
widget:: boolean
description:: Maps which deliverables are generated for each archetype.

## NN Matrix Definition: PainMitigationMatrix
row_concept:: PainPoint
col_concept:: Pipeline
widget:: boolean
description:: Maps how pipeline phases eliminate specific operational pains.
