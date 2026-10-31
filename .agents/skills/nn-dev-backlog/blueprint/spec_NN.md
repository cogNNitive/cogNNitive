---
spec_version: "V_0-5-0"
spec_url: ".agents/skills/nn-dev-backlog/blueprint/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md"
blueprint_name: "backlog"
blueprint_version: "V_0-1-0"
title: "Backlog Blueprint (private)"
nature:
  structure: catalog
  ownership: derived
---

# NN index

* [[Idea]]
* [[Item]]
* [[Batch]]

# NN Concept Definition

## NN Concept Definition: Idea
icon:: lightbulb
type:: list
color:: amber
weight:: 50

## NN Concept Definition: Item
icon:: list-checks
type:: list
color:: blue
weight:: 100

## NN Concept Definition: Batch
icon:: package
type:: list
color:: green
weight:: 100

# NN Field Definition

## NN Field Definition: captured
concept:: Idea
type:: string
description:: Capture date, YYYY-MM-DD.

## NN Field Definition: value
concept:: Item
type:: select
options:: [L, M, H]
description:: Expected value.

## NN Field Definition: effort
concept:: Item
type:: select
options:: [S, M, L]
description:: Expected effort.

## NN Field Definition: risk
concept:: [Item, Batch]
type:: select
options:: [L, M, H]
description:: Risk to code continuity.

## NN Field Definition: status
concept:: Item
type:: select
options:: [open, in-progress, partial, shipped, retired]
description:: Item lifecycle state.

## NN Field Definition: lane
concept:: [Item, Batch]
type:: select
options:: [light, heavy]
description:: Delivery lane.

## NN Field Definition: verdict
concept:: Item
type:: select
options:: [current, obsolete, unverifiable]
description:: Result of checking the item against the code.

## NN Field Definition: evidence
concept:: Item
type:: string
description:: Citation (file:line, test, or commit). Required when verdict is current or obsolete.

## NN Field Definition: merged_from
concept:: Item
type:: string
description:: Comma-separated ids of items absorbed by this one.

## NN Field Definition: done_when
concept:: Item
type:: string
description:: Observable completion criteria.

## NN Field Definition: ref
concept:: Item
type:: string
description:: Optional GitHub issue, PR, or openspec change slug.

## NN Field Definition: batch
concept:: Item
type:: string
description:: Optional id of the batch that contains this item.

## NN Field Definition: order
concept:: Batch
type:: number
description:: Execution order of the batch.

## NN Field Definition: items
concept:: Batch
type:: string
description:: Comma-separated ids of the items in the batch.

## NN Field Definition: state
concept:: Batch
type:: select
options:: [planned, in-progress, done]
description:: Batch lifecycle state.

# Backlog Blueprint

## Private blueprint structuring the repository backlog as kNNowledge.

# Concept Guidance Documentation

## Idea

### Summary

A captured, untriaged backlog entry: one line of text and its capture date.

### Description

An `Idea` is the inbox. It carries only the text (the element name) and `captured`. It has no scoring; triage turns it into an `Item`.

### Methodologies

- Keep it to one line.
- Triage by creating an `Item` and removing the `Idea`.

### Prompts

- "Capture the idea `<text>` with today's date."
- "Triage every `Idea` into an `Item`."

## Item

### Summary

A triaged backlog entry with value, effort, risk, lane, status, and a verdict backed by evidence.

### Description

An `Item` records the checked state of one unit of work. `verdict` says whether it still applies; `evidence` is required when the verdict is `current` or `obsolete`. `done_when` states observable criteria. `merged_from` lists absorbed ids; `ref` and `batch` link outward.

### Methodologies

- Verify against the code before setting `verdict`.
- Write `done_when` as something a reader can observe.

### Prompts

- "Triage `<idea>` into an `Item` and cite the evidence."
- "List open `Item` elements with verdict `current`, ordered by value."

## Batch

### Summary

An approved plan: an ordered group of items delivered together in one lane.

### Description

A `Batch` has an `order`, a `lane`, the `items` it contains, its aggregate `risk`, and a `state`.

### Methodologies

- Group items of the same lane.
- Every id in `items` must name an existing `Item`.

### Prompts

- "Propose a `Batch` from the open `Item` elements of lane `light`."
- "Mark `Batch` `<id>` as done."
