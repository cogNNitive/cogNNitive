# Workspace Template Specification

## Purpose
Align Level 2 Workspace specification template (`workspace_spec_NN.md`) with modern hierarchical navigation and qualified reference semantics by reordering concepts (`Models` prioritized right after root `Workspace`), applying a focused accent color scheme (`purple` for `Models`, `grey` for supporting concepts), pluralizing `Tag` to `Tags`, and eliminating macro-level lineage matrices.

## Requirements

### Requirement: Concept Ordering and Hierarchy Weights
`workspace_spec_NN.md` MUST define workspace concepts in descending order of priority with exact weights:
1. `Workspace` (type: `text`, weight: `100`, color: `grey`)
2. `Models` (type: `model`, weight: `95`, color: `purple`)
3. `Templates` (type: `model`, weight: `90`, color: `grey`)
4. `Specs` (type: `model`, weight: `85`, color: `grey`)
5. `Sources` (type: `model`, weight: `80`, color: `grey`)
6. `Procedures` (type: `model`, weight: `75`, color: `grey`)
7. `Artifacts` (type: `model`, weight: `70`, color: `grey`)
8. `Skills` (type: `list`, weight: `65`, color: `grey`)
9. `Tools` (type: `list`, weight: `60`, color: `grey`)
10. `Tags` (type: `category`, weight: `50`, color: `grey`)

The `# NN index` and `# NN Concept Definition` sections MUST reflect this exact sequence.

#### Scenario: Index and concept declaration order
- GIVEN a parser or user reading `workspace_spec_NN.md`
- WHEN inspecting `# NN index` and concept definitions
- THEN `Models` appears immediately after `Workspace` and before `Templates` and `Specs`
- AND `Tags` appears as the final concept with weight 50

---

### Requirement: Concept Visual Styling and Accent Colors
The Level 2 Workspace specification MUST apply a focused color palette where:
- The `Models` concept definition MUST specify `color:: purple`.
- All other concept definitions (`Workspace`, `Templates`, `Specs`, `Sources`, `Procedures`, `Artifacts`, `Skills`, `Tools`, `Tags`) MUST specify `color:: grey`.

#### Scenario: Concept badge color resolution
- GIVEN the concept definitions in `workspace_spec_NN.md`
- WHEN concept badge colors are evaluated
- THEN `Models` resolves to `purple`
- AND all other workspace concept nodes resolve to `grey`

---

### Requirement: Pluralization of Taxonomy Tag Concept
The taxonomy concept MUST be named `Tags` (plural) across all workspace template definitions:
- Concept definition header MUST be `## NN Concept Definition: Tags`.
- Index entry MUST be `* [[Tags]]`.
- Associated field definitions MUST specify `concept:: Tags`.
- Sample model sections in Level 3 template snippets MUST use `# NN Tags` and `## NN Tags: <TagName>`.

#### Scenario: Parsing pluralized Tags concept and fields
- GIVEN a Level 3 workspace manifest referencing taxonomy tags
- WHEN parsed against `workspace_spec_NN.md`
- THEN the concept name is matched to `Tags`
- AND fields `color`, `icon`, and `description` bind to `concept:: Tags`

---

### Requirement: Elimination of Macro-Lineage Matrices
`workspace_spec_NN.md` MUST NOT define `Artifact-Source Lineage` or `Model-Source Lineage` matrix tables. Lineage SHALL be declared at the element level within domain models and artifact specifications via qualified references (`[[Model Title :: Element Name]]`).

#### Scenario: Workspace specification matrix section inspection
- GIVEN `workspace_spec_NN.md`
- WHEN inspecting `# NN Matrix Definition` or matrix documentation sections
- THEN no matrix definitions for `Artifact-Source Lineage` or `Model-Source Lineage` are present
- AND the template delegates lineage tracking to granular element references
