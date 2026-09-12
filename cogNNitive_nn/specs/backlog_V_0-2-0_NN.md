---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
template_version: "V_0-1-1"
title: "Backlog Template"
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

* [[Backlog]]
  * [[WorkItem]]

# NN Concept Definition

## NN Concept Definition: Backlog
icon:: layers
type:: list
color:: blue
weight:: 100

## NN Concept Definition: WorkItem
icon:: circle-check-big
type:: weight
color:: green
weight:: 90

# NN Field Definition

## NN Field Definition: title
concept:: Backlog
type:: string
description:: Title of the backlog document.

## NN Field Definition: description
concept:: Backlog
type:: markdown_inline
description:: Short description of the backlog scope.

## NN Field Definition: number
concept:: WorkItem
type:: string
description:: Backlog index of the work item (1..N).

## NN Field Definition: slug
concept:: WorkItem
type:: string
description:: Machine-readable identifier, e.g. refactor/split-types.

## NN Field Definition: title
concept:: WorkItem
type:: string
description:: Short human title of the work item.

## NN Field Definition: type
concept:: WorkItem
type:: select
options:: [functional, refactor, chore, feat, ci, fix]
description:: Category of the work item.

## NN Field Definition: size
concept:: WorkItem
type:: select
options:: [small, small-medium, medium, medium-high, large]
description:: Relative effort estimate of the work item.

## NN Field Definition: why
concept:: WorkItem
type:: markdown_inline
description:: Motivation behind the work item.

## NN Field Definition: approach
concept:: WorkItem
type:: markdown_inline
description:: Technical approach or implementation direction.

## NN Field Definition: behaviour
concept:: WorkItem
type:: markdown_inline
description:: Requested behaviour (when present).

## NN Field Definition: also_consider
concept:: WorkItem
type:: markdown_inline
description:: Related considerations worth reviewing.

## NN Field Definition: risks
concept:: WorkItem
type:: markdown_inline
description:: Open risks or decisions.

## NN Field Definition: suggested_trigger
concept:: WorkItem
type:: string
description:: Suggested command to start or explore the work item.

## NN Field Definition: status
concept:: WorkItem
type:: select
options:: [backlog, deferred, in-progress]
description:: Current lifecycle state of the work item.

# NN Marker Definition

## NN Marker Definition: ready
applies_to:: [Element]
widget:: boolean
symbol:: ✓
icon:: circle-check
color:: green

# NN Matrix Definition

## NN Matrix Definition: work-item relations
source:: WorkItem
target:: WorkItem
widget:: set
widget_config:: {"max_selections": 2}
values:: [related, depends_on]
description:: Relations between work items. `depends_on` is directional (row depends on column); `related` marks affinity/shared scope (symmetric).

# Backlog Template

## A schema for modelling a prioritized work backlog with related work items

## Philosophy

The Backlog Template models a prioritized backlog document made of individually trackable work items. Each work item carries the metadata a triage workflow needs — category, size, motivation, approach, optional requested behaviour, risks and a suggested trigger — while a single relation matrix captures how items depend on and relate to each other.

The schema mirrors the structure of a canonical backlog document so a raw backlog can be ingested as a source and re-expressed semantically.

## Objectives

- Provide a valid Level 2 template usable as `parent_spec` for backlog models.
- Model a backlog as a container (`Backlog`) holding one or more `WorkItem` elements.
- Express inter-item relationships (dependency and affinity) as an evaluable matrix.
- Keep the body valid against the `iNNfo_V_0-2-0` meta-template.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Backlog** | `list` | The backlog container document |
| **WorkItem** | `weight` | A single trackable unit of work |

### Fields

| Concept | Field | Type | Purpose |
|---|---|---|---|
| Backlog | `title` | string | Backlog title |
| Backlog | `description` | markdown_inline | Backlog scope description |
| WorkItem | `number` | string | Backlog index |
| WorkItem | `slug` | string | Machine-readable identifier |
| WorkItem | `title` | string | Human title |
| WorkItem | `type` | select | Category (functional/refactor/chore/feat/ci/fix) |
| WorkItem | `size` | select | Effort estimate (small…large) |
| WorkItem | `why` | markdown_inline | Motivation |
| WorkItem | `approach` | markdown_inline | Technical direction |
| WorkItem | `behaviour` | markdown_inline | Requested behaviour (optional) |
| WorkItem | `also_consider` | markdown_inline | Alternatives (optional) |
| WorkItem | `risks` | markdown_inline | Risks/open decisions (optional) |
| WorkItem | `suggested_trigger` | string | Suggested trigger command (optional) |
| WorkItem | `.status` | select | State: backlog/deferred/in-progress |

### Markers

| Marker | Applies to | Widget | Meaning |
|---|---|---|---|
| `ready` | Element | boolean | Binary readiness flag: `X` when the element is ready to start, empty otherwise |

### Matrices

| Matrix | Source | Target | Values | Meaning |
|---|---|---|---|---|
| `work-item relations` | WorkItem | WorkItem | `[related, depends_on]` | `depends_on`: row depends on column (directional). `related`: affinity/shared scope (symmetric). |

Each cell can mark up to 2 selections (`set`, `max_selections: 2`); an empty cell means "no relation".

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ✅ | `work-item relations` |
| Graph edge | ❌ | Not applicable |
| Sequence | ❌ | Not applicable |

### Concept Guidance Documentation

## Backlog

### Summary

A single backlog document, described by `title` and `description`, that groups its `WorkItem` elements.

### Description

The `Backlog` concept models the container: one `## NN Backlog: <name>` element per backlog. Its fields hold the title and a short description of the backlog scope. Work items live under the `WorkItem` concept.

### Methodologies

- One `Backlog` element per backlog document, kept as the single entry point of the model.
- Keep the `description` short and stable; it names the scope, not the item list.

### Prompts

- "Create a `Backlog` named `<name>` describing `<scope>`."
- "List every `WorkItem` that belongs to this `Backlog`."

## WorkItem

### Summary

A prioritized unit of work with typed metadata and inter-item relations.

### Description

Each `WorkItem` element carries the operational fields (number, slug, title, type, size, why, approach, behaviour, also_consider, risks, suggested_trigger, status) so a downstream task can be actioned from the model alone. Relationships between items are stored in the `work-item relations` matrix: `depends_on` is directional (a row item depends on its column neighbor), `related` marks affinity or shared scope.

### Methodologies

- One `WorkItem` per backlog entry; keep `number` and `slug` aligned with the source item.
- Use `status` to separate active items from deferred or in-progress ones.
- Record dependency and affinity only through the `work-item relations` matrix, never as free text.

### Prompts

- "Add a `WorkItem` for `<slug>` with type `<type>` and size `<size>`."
- "Mark that `<WorkItem A>` depends on `<WorkItem B>`."
- "Which `WorkItem` elements are related to `<WorkItem>`?"