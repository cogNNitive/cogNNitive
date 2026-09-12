# Element-Vocabulary Audit — L2 Concept Definition names

Change: `2026-09-12-vocabulary-simplification` · Task 3.1 · Audit-only (no code change)

Scope: L2 **Concept Definition** names (`## NN Concept Definition: <Name>`) in the 13
active apps (`iNNfo/specs/templates/*/spec_NN.md`, incl. `workspace_spec_NN.md`) and the
Ghostbusters Inc. canonical samples. The purpose is to **propose** a simpler, more
consistent surface; nothing here is applied in this change.

## Current inventory (active apps only)

| App | Concept Definitions |
|-----|---------------------|
| analysis | Analysis, Assumptions, Risks, Suggestions, Keys, Validation, Coherence, Experiments |
| blank | Content |
| business-model | Business summary, Market, Stakeholders, Stakeholder roles, Segments, Profiles, Persona, Segmentation, Market trends, Market size, Competition, Problems, Value propositions, Messages, Channels, Perceptions, Emotions, Behaviors, Journey, Solutions, Offerings, Products and services, Features, Components, Roadmap, Marketing, Branding, Media plan, Communication, Pitch, Web, Storytelling, Presentations, Team, Contributions, Compensations, Business idea, Inspiration, Opportunity, Business objectives, Mission, Vision, Organizational values, Organizational goals, Operations, Activities, Resources, Goals, Finance, Revenue, Costs, Unit economics, Funding sources, Shareholders, Projections, Legal, Legal issues, Contracts, Challenges, Unfair advantage, Misc, Procedure |
| documentation | DocSite, Section, Page, NavbarItem, Asset |
| innovation | Program, Person, Opportunity, Initiative |
| metrics | Metrics, Variables, Evolution, Scenario |
| organization | Organization, Roles, Functions, Position, Person, Skills |
| procedures | Work, Artifact, Tools, Roles |
| projects | Project, Milestone, Phases, Deliverable, Task, Risk, Project roles |
| repository | Repository, State, Releases, Changes |
| video-generator | VideoProject, Source, Script, Storyboard, Asset |
| workspace | Workspace, Models, Sources, Procedures, Artifacts, Tag |

`business` is a pure composite (`includes: business-model + analysis`) and declares no
own Concept Definitions.

## Findings

### F1 — Casing is inconsistent
- **PascalCase / single-token**: `VideoProject`, `DocSite`, `NavbarItem`, `ModelRecords`,
  `Repository`, `Storyboard`, `Web`, `Misc`.
- **Sentence / title case (multi-word)**: `Business summary`, `Market trends`,
  `Stakeholder roles`, `Value propositions`, `Products and services`, `Media plan`,
  `Business idea`, `Business objectives`, `Organizational values`, `Unit economics`,
  `Funding sources`, `Legal issues`, `Unfair advantage`, `Market size`, `Project roles`.

There is no single convention. Editors render mixed labels (e.g. `VideoProject` next to
`Market trends`) in the same tree.

### F2 — Singular vs plural is inconsistent
- **Collection concepts are plural**: `Stakeholders`, `Segments`, `Profiles`, `Skills`,
  `Tools`, `Roles`, `Functions`, `Releases`, `Changes`, `Models`, `Sources`, `Artifacts`,
  `Procedures`, `Metrics`, `Variables`, `Channels`, `Perceptions`, `Emotions`,
  `Behaviors`, `Presentations`, `Contributions`, `Compensations`, `Activities`,
  `Resources`, `Goals`, `Contracts`, `Components`, `Features`, `Offerings`, `Solutions`,
  `Problems`, `Challenges`, `Suggestions`, `Keys`, `Experiments`.
- **Entity concepts are singular**: `Person`, `Persona`, `Position`, `Opportunity`,
  `Initiative`, `Program`, `Project`, `Risk`, `Work`, `Artifact`.
- **Outliers break the pattern**: `Risk` (projects, singular) vs `Risks` (analysis,
  plural) for the same concept; `Deliverable` / `Task` / `Milestone` / `Artifact`
  (procedures) are singular while sibling collections are plural; `Tools` (procedures,
  plural) vs `Artifact` (procedures, singular) in the same app.

### F3 — Same name, different meaning across apps (cross-app collisions)
`includes` composition treats a name collision between two sources as an **ERROR**, so
collisions today block additive composition:
- `Person` — organization (org member) vs innovation (portfolio actor).
- `Asset` — documentation (doc asset) vs video-generator (media asset).
- `Artifact` / `Artifacts` — workspace/cogNNitive (lineage records) vs procedures
  (procedural outputs).
- `Roles` — organization vs procedures vs business-model (`Stakeholder roles`) vs
  projects (`Project roles`).

### F4 — Synonyms for the same concept
- `Roles` / `Stakeholder roles` / `Project roles` — the same concept under three names.
- `Risk` (projects) / `Risks` (analysis).
- `Models` (workspace) / `ModelRecords` (cogNNitive).

## Proposed simpler surface (recommendation, not applied)

1. **One casing convention**: Title Case for multi-token concepts (`Market Trends`,
   `Business Summary`, `Value Propositions`, `Unit Economics`, `Funding Sources`,
   `Legal Issues`, `Unfair Advantage`) and keep single-token names (`Repository`,
   `Person`, `Persona`). Retire the PascalCase compound tokens (`VideoProject` →
   `Video Project`, `DocSite` → `Doc Site`, `NavbarItem` → `Navbar Item`) only where
   they are user-facing; keep the identifier/`id` fields stable.

2. **Plural = collection, singular = entity**: normalize the outliers —
   `Risks` (projects) → `Risk` to match analysis, or align both to `Risks`; keep
   `Deliverable`, `Task`, `Milestone`, `Artifact` singular (they are entities) and
   `Tools`, `Roles`, `Skills` plural (they are collections). Document the rule in
   `vocabulary.json` so new apps follow it.

3. **De-collide shared names before `includes` composition**: `Person`, `Asset`,
   `Artifact`, `Roles` need per-app disambiguation (e.g. `OrgPerson` / `InnovationPerson`)
   or a deliberate composition rule, because the current collisions make additive
   `includes` between those apps an ERROR. This is a prerequisite for composing
   `organization + projects` (both declare `Roles`).

4. **Kill synonyms**: pick `Roles` as canonical (drop `Stakeholder roles`, `Project
   roles`, or scope-prefix consistently); pick one of `Risk`/`Risks` and one of
   `Models`/`ModelRecords`.

## Out of scope for this audit
- Field Definition names, Marker Definition names, Matrix Definition names.
- MCP tool names, manifest keys, catalog identifiers — these stay stable per the change's
  out-of-scope list.
- Applying any of the above renames (mechanical identifier migration is tracked as a
  separate backlog work item).

## Follow-up
Create an SDD change scoped to "element-vocabulary normalization" once `canonical
vocabulary` ships, gated on the `includes` de-collision decision (F3).