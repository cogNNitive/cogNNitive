---
title: "nn-innfo — Semantic Modeling & Architecture Assistant"
description: "Author, edit, validate, and audit iNNfo-compliant kNNowledge and bluepriNNts with the conversational kNNowledge Creation Wizard and Architecture Assistant."
html_url: https://cognnitive.com/skills/documentation/#/skills/nn-innfo
generator: https://cognnitive.com/skills/nn-design-presets
---

# nn-innfo

**Skill**: `nn-innfo` · **Role**: Semantic Modeling & Architecture Assistant

Guides LLMs and agents in authoring, scaffolding, editing, auditing, and validating **iNNfo-compliant files** (Level 1 Meta-template specification with unified `NN` syntax: `# NN`, `## NN`, and `key:: value`).

Resolution, validation, and mutations are deterministically delegated to the **`nn-mcp`** server wrapping `@cognnitive/nn-core`.

---

## 0. Entry Menu & kNNowledge Creation Wizard

When activated, `nn-innfo` presents the entry menu:

- **`[a]` (Recommended)** Create new kNNowledge (Conversational Wizard: Phase A Blueprint &rarr; Phase B kNNowledge)
- **`[b]`** Edit / extend existing kNNowledge
- **`[c]`** Validate kNNowledge with MCP (`nn-mcp_validate_knowledge`)
- **`[d]`** Analyze coherence & solidity (Architecture Assistant audit)
- **`[x]`** Execute a declared procedure
- **`[y]`** Cancel / help

---

## 1. iNNfo Architecture Levels

| Level | Role | Syntax & Structure |
| :--- | :--- | :--- |
| **0** | Meta-specification (`defiNNition`) | Meta-rules of the specification language. |
| **1** | Concrete Specification (`iNNfo`) | Level 1 meta-template defining the 3 root primitives: `Concept Definition`, `Field Definition`, `Matrix Definition`. |
| **2** | bluepriNNt / Specialization | Document with frontmatter `level: 2`. Body instantiates the root primitives. |
| **3** | kNNowledge | Instantiates concepts, fields, and matrices defined by its parent bluepriNNt (`parent_spec`). |

---

## 2. Core Modeling Rules

1. **Unified Syntax**: Use `# NN <Concept>`, `## NN <Concept>: <Element>`, `key:: value`.
2. **WikiLink Referential Discipline**: When a field has `type:: reference`, its value MUST be wrapped in WikiLinks (e.g. `owner:: [[Director]]`). Plain text without brackets is strictly prohibited.
3. **Element Descriptions in Prose**: The description of an element in an L3 kNNowledge document MUST NEVER be written as a `description::` field. It must always be written as Markdown prose separated from field lines by an empty line.
4. **Index Block Contains Only Concepts**: The `# NN index` block defines navigation hierarchy between Concepts only. Elements never appear in the index block.
5. **Provenance Protocol (`sources::`)**: Citations use the canonical `@` grammar with domaiNN-relative paths and stable heading anchors (e.g. `sources:: [sources/import/interview.md@## Stakeholders, sources/import/report.md@## Summary]`). A binary source is cited through its co-located sidecar (`<file>.<ext>_sidecar_NN.md@## Heading`).
