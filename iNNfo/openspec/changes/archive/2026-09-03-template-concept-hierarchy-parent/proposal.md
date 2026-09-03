# Proposal: Template Concept Hierarchy via `parent::` Field

**Change ID:** `template-concept-hierarchy-parent`
**Status:** In Progress
**Target Packages:** `packages/innfo-core`, `apps/innfo-editor`, `specs/templates`

## Problem & Intent

Currently, the concept hierarchy (taxonomy tree of Concepts) is defined via a Markdown list block `# NN index` with nested WikiLinks:
```markdown
# NN index
* [[ParentConcept]]
  * [[ChildConcept]]
```

This approach presents two architectural design issues:
1. **Ontology Leakage in Level 3:** Level 3 models (instance data) are permitted to declare an `# NN index` that overrides or defines the concept taxonomy. The taxonomy of concepts is purely schema (Level 2). An instance model must NOT redefine the ontology of its parent template. If an instance requires a modified taxonomy, it must declare a Level 2 specialization.
2. **Duplication and Drift in Level 2:** In Level 2 templates, concepts are declared as `# NN Concept Definition: <Name>`. Having a separate `# NN index` introduces a duplicate representation of the concept list. A concept can easily be defined in `# NN Concept Definition` but omitted from `# NN index` (or vice-versa), causing drift.

## Proposed Decisions

### 1. Single Source of Truth in `Concept Definition`
Level 2 templates define hierarchy directly on the `# NN Concept Definition` using an optional `parent::` field:
```markdown
# NN Concept Definition
## NN Concept Definition: Solutions
type:: category
weight:: 10

# NN Concept Definition
## NN Concept Definition: Offerings
parent:: [[Solutions]]
type:: text
weight:: 20
```
- If `parent::` is omitted, the concept is a root node (`parent: ''`).
- Values may be written as `[[ParentName]]` or plain string `ParentName`.
- Sibling concepts under the same parent preserve their relative order by document declaration order (with optional `weight::` as tie-breaker/priority).

### 2. Level 2 Schema Taxonomy Derivation
The schema extractor (`extractTemplateSchema`) computes the effective `TaxonomyEdge[]` automatically from the concept definitions:
- Root concepts: `{ parent: '', child: concept.name }`
- Child concepts: `{ parent: concept.parent, child: concept.name }`
- **Fallback / Backwards Compatibility:** If no concepts declare `parent::` but an `# NN index` section exists in the template, `extractTemplateSchema` falls back to parsing the `# NN index` block.

### 3. Level 3 Invariant
Level 3 models cannot mutate the concept taxonomy:
- The effective taxonomy for hierarchy and reference consistency validation is **strictly** the parent template's taxonomy.
- If a Level 3 model includes an `# NN index` block, the validator emits a warning noting that concept hierarchy is governed by Level 2 and the Level 3 index will not override the template schema.

### 4. Semantic Validation Rules for Level 2
- **Missing Parent (Dangling Reference):** Declaring `parent:: [[Unknown]]` where `Unknown` is not a defined concept in the template is a validation **ERROR**.
- **Cycle Detection:** Any cyclic parent reference (e.g. `A -> B -> A`) is a validation **ERROR**.
