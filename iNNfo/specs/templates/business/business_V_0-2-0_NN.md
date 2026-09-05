---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/business_V_0-2-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
template_version: "V_0-2-0"
title: "Business Template"
includes:
  - name: "business-model"
    url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business-model/business-model_V_0-2-0_NN.md"
  - name: "analysis"
    url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/analysis/analysis_V_0-2-0_NN.md"
  - name: "organization"
    url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/organization/organization_V_0-2-0_NN.md"
  - name: "projects"
    url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/projects/projects_V_0-2-0_NN.md"
relationship_types:
  hierarchy:
    enabled: true
    via: index block
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: true
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# Business Template

## The complete business-modeling template — the descriptive model core plus its analysis layer, reusing the shared organization and projects vocabularies

## Philosophy

A comprehensive business model is more than a description of a venture. It is that
description **plus** the evaluative work that keeps it honest — the assumptions it
rests on, the risks it runs, the coherence of its parts, the experiments that turn
belief into evidence — **plus** the reusable vocabularies for how people are
organized and how initiatives are planned and delivered.

This template is a **pure composite**. It declares no Concept, Field, Marker, or
Matrix Definitions of its own. Its entire schema is the additive union of the
templates it `includes`:

- **`business-model`** — the descriptive core: market, value propositions,
  solutions, marketing, team narrative, business idea and objectives, operations,
  finance, legal, and the cross-cutting `Procedure` and `Misc` concepts. It in
  turn `includes` `organization` and `projects`, so their concepts arrive here
  transitively.
- **`analysis`** — the strategic-review layer: `Analysis` (Assumptions, Risks,
  SWOT, Keys, Suggestions) and `Validation` (Coherence, Experiments), with the
  Assumptions-Risks and Experiments-Assumptions matrices.
- **`organization`** (via `business-model`) — `Organization`, `Roles`,
  `Functions`, `Position`, `Person`, `Skills`, plus the positions-roles,
  persons-positions, and Functions-Positions matrices and the `complexity` marker.
- **`projects`** (via `business-model`) — `Project`, `Phases`, `Milestone`,
  `Deliverable`, `Task`, `Risk`, `Project roles`, plus the task-roles,
  task-deliverables, and risks-milestones matrices and the `health` marker.

`business-model` and `analysis` each declare the same five markers — `importance`,
`completion`, `certainty`, `priority`, `rating` — with **identical bodies**. Under
iNNfo's additive-composition rule, two sources declaring a Definition whose
canonical form is identical merge silently into one entry; declaring them
differently would be a composition ERROR. That shared five-marker set is the
business vocabulary, kept in sync across the two halves.

## Objectives

1. Give business-model authors one `parent_spec` that resolves the full descriptive + analytical + organizational + project vocabulary.
2. Keep the descriptive core (`business-model`) and the review layer (`analysis`) independently reusable and independently versioned.
3. Reuse `organization` and `projects` rather than duplicating human-structure and project-planning concepts.
4. Compose without collisions — every shared Definition is declared identically across sources.

## Specification

This template instantiates none of the four root primitives directly. Resolving it
yields the union of its included templates' Definitions:

| Contributed by | Concepts | Markers | Matrices |
|---|---|---|---|
| `business-model` | Business summary, Market, Stakeholders, Segments, Profiles, Persona, Segmentation, Market trends, Market size, Competition, Problems, Value propositions, Messages, Channels, Perceptions, Emotions, Behaviors, Journey, Solutions, Offerings, Products and services, Features, Components, Roadmap, Marketing, Branding, Media plan, Communication, Pitch, Web, Storytelling, Presentations, Team, Business idea, Inspiration, Opportunity, Business objectives, Mission, Vision, Organizational values, Organizational goals, Operations, Activities, Resources, Metrics, Finance, Revenue, Costs, Unit economics, Funding sources, Shareholders, Projections, Legal, Legal issues, Contracts, Challenges, Unfair advantage, Goals, Misc, Procedure | importance, completion, certainty, priority, rating | Journey map, Segmentation-Profiles, Problems-Value propositions, Value propositions-Messages, Messages-Channels, Metrics-Organizational goals, Features-Milestone, Organizational values-Organizational goals, Activities-Resources, Problems-Competition |
| `analysis` | Analysis, Assumptions, Risks, Suggestions, SWOT, Keys, Validation, Coherence, Experiments | importance, completion, certainty, priority, rating *(identical → merged)* | Assumptions-Risks, Experiments-Assumptions |
| `organization` (transitive) | Organization, Roles, Functions, Position, Person, Skills | complexity | positions-roles, persons-positions, Functions-Positions |
| `projects` (transitive) | Project, Phases, Milestone, Deliverable, Task, Risk, Project roles | health | task-roles, task-deliverables, risks-milestones |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ✅ | Source→target tables |
| Graph edge | ❌ | Not applicable |
| Sequence | ✅ | concept type `steps` / `sequence` (`Journey`, `Roadmap`, `Phases`) |

## Template

### Level 3 Model Template (Lightweight)

To create a business model, create a level 3 FILE mode document with:

```yaml
---
level: 3
parent_spec:
  name: "business_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/business_V_0-2-0_NN.md"
model_version: "V_x-y-z"
title: "<Your Business Name>"
---

> [!NOTE]
> This is an **iNNfo document**...

# NN Business summary
Your business summary here.

# NN Stakeholders
## NN Stakeholders: Stakeholder Name
relationship_model:: Dedicated
Description and details.

# NN matrices: problems-value propositions matrix
| Problems \ Value propositions | VP1 | VP2 |
| :--- | :---: | :---: |
| Problem 1 | Max | High |
```

The application resolves the `parent` URL, downloads this template, follows its
`includes` (and their transitive `includes`), and unions every resolved
Concept / Field / Marker / Matrix Definition to validate and render the model.

## Examples

### Canonical Sample

The official sample for this template is
`specs/templates/business/samples/Ghostbusters_V_0-2-0_business_NN.md`. It is the
`business_V_0-1-0` Ghostbusters sample re-pointed at this umbrella, with concept
headings updated for the renames the decomposition introduced (`Persons` →
`Person`, `Positions` → `Position`, `Milestones` → `Milestone`).

## Parent Chain

```yaml
# From the Ghostbusters V_0-2-0 sample:
parent_spec:
  name: "business_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/business_V_0-2-0_NN.md"

# This template's parent:
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"

# This template's includes:
includes:
  - name: "business-model"   # → includes organization, projects
  - name: "analysis"
```
