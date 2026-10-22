# Relationships and Connections in iNNfo

The iNNfo data model is not limited to storing hierarchical blocks or independent pages: it forms a **Knowledge Graph** where entities interact with each other.

In iNNfo, relationships between elements and concepts are classified into **5 formal levels** (aligned with the Level 1 Specification `iNNfo_V_0-5-0_NN.md`), depending on their origin and degree of structuring.

---

## The 5 Levels of Relationships

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │                  KNOWLEDGE GRAPH                        │
                                  └────────────────────────────┬────────────────────────────┘
                                                               │
         ┌───────────────────────────────┬─────────────────────┼─────────────────────────────┬───────────────────────────────┐
         ▼                               ▼                     ▼                             ▼                               ▼
┌───────────────────┐         ┌───────────────────┐ ┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│ 1. HIERARCHICAL   │         │ 2. STRUCTURAL     │ │ 3. ATTRIBUTE      │         │ 4. CONTEXTUAL     │         │ 5. SUBMODEL       │
│    (Taxonomy)     │         │    (Matrix)       │ │    (Field)        │         │    (Mention)      │         │  (type:: knowledge) │
└────────┬──────────┘         └────────┬──────────┘ └────────┬──────────┘         └────────┬──────────┘         └────────┬──────────┘
         │                             │                     │                             │                             │
   Tree nesting               Domain Matrix            Referential field            Free wikilink                Modular composition
   (# NN index)               (e.g. WORK → ROLES)      (key:: [[target]])           ([[Target Element]])          (field:: [[sub_NN.md]])
```

### 1. Hierarchical / Taxonomic Relationships (`hierarchy`)

- **Origin**: The `# NN index` block at the start of a Level 3 document.
- **Syntax**: Nested Markdown lists using WikiLink syntax (`* [[Parent]]` → `  * [[Child]]`).
- **Visual Icon**: 🌳 `FolderTree` / sidebar tree
- **Example**: `Living-Room` nested inside `House`.

### 2. Structural Relationships (`evaluable_matrix`)

- **Origin**: Intersection cells declared in formal metamodel matrices (e.g. `WORK → ROLES` or `WORK → ARTIFACT`).
- **Syntax**: The matrix is declared as a Level 2 `# NN Matrix Definition`, and each instance is a Level 3 `# NN Matrix: <Name>` block whose scales and cycles live directly on the definition. There is no frontmatter `matrices` key and no `# NN matrices:` heading.
- **Visual Icon**: 📊 `LayoutGrid`
- **Example**: A procedure `Visa Application` assigned the role `Responsible` toward `Inés (traveler)`.

### 3. Attribute Relationships (Referential Fields)

- **Origin**: Structured fields in blocks whose values explicitly reference another element through WikiLink brackets.
- **Syntax**: `field:: [[element_name]]` (fields with `type:: reference` in their definition).
- **Visual Icon**: 🏷️ `Tag`
- **Example**: `location:: [[Living-Room]]` or `depends_on:: [[Passport Check]]`.
- **Important note**: Referential fields must NEVER be written as plain text (`location:: Living-Room`); `[[...]]` is mandatory so the iNNfo engine can resolve the connection in the graph.

### 4. Contextual Relationships (Mentions & Wikilinks)

- **Origin**: Informal mentions and hypertext links written freely in the Markdown body of a block's description.
- **Syntax**: `[[Element Name]]` inside the explanatory text.
- **Visual Icon**: 📝 `FileText`
- **Example**: _"...to complete this step it is necessary to review the [[DS-2019 Form]] issued by the sponsor."_

### 5. Submodel Composition (`type:: knowledge`)

Submodel composition decouples complex architectures by subdividing a domain into multiple physical Level 3 documents (`*_NN.md`), keeping a formal relationship of belonging and navigation between a parent element and a specialized child document.

- **Origin**: A formal definition in the metamodel with `type:: knowledge` and an optional constraint `target_blueprint:: <bluepriNNt>`.
- **Field Syntax**: `field:: [[path/to/submodel_NN.md]]` or `field:: path/to/submodel_NN.md`.
- **Visual Icon**: 📦 `Boxes` / interactive submodel pill with a blueprint badge.
- **Tree Behavior**: The submodel does not float as an independent root in the console; it nests under the element that declares it and is excluded from the global roots.

#### Canonical Example: Ghostbusters Innovation → Business Model

An innovation-portfolio document (`Ghostbusters_innovation_NN.md`) contains a municipal-expansion initiative that instantiates its own dedicated business model (`Ghostbusters_business_NN.md`):

##### 1. Definition in the Metamodel (`specs/bluepriNNts/innovation/spec_NN.md`)

```markdown
## NN Field Definition: business_model

concept:: Initiative
type:: knowledge
target_blueprint:: business
```

##### 2. Instantiation in the Parent Document (`Ghostbusters_innovation_NN.md`)

```markdown
# NN Initiative

## NN Initiative: Ghostbusters Municipal Franchise Expansion

initiativeName:: "Ghostbusters Municipal Franchise Expansion"
initiativeType:: "Commercial Service Expansion"
business_model:: [[kNNowledge/Ghostbusters_business_NN.md]]
tags:: [initiative, franchise, commercial, expansion]
```

##### 3. Scaffolded Child Submodel (`Ghostbusters_business_NN.md`)

```markdown
---
level: 3
parent_spec:
  name: "business"
knowledge_version: "V_0-1-0"
title: "Ghostbusters Inc. Municipal Franchise Business Model"
---

# NN Business Model
```

#### Visual and Interactive Experience

1. **Rendering**: In the Domain Console, a knowledge field renders its `type:: knowledge` values as interactive pills through `InnfoUI.FieldValue` / `renderFieldKnowledge`. Creating and binding the child document is an agent-driven changeset (`add_element`), not an in-editor button.
2. **Clean Hierarchy**: In the console, the submodel is excluded from unattached roots and is shown nested directly under the element that declares it, rendered with `InnfoUI.Ku` unit pills and the 📦 `Boxes` icon plus the blueprint label.
3. **Fluid Navigation**: Clicking the submodel child (in the field pill or in the tree) navigates the console to the child document and shows the breadcrumb path (`Ghostbusters Innovation > Ghostbusters Business`).

---

## Directionality of Connections

All relationships in the console are presented with a clear direction indicator based on the position of the current element:

### Outgoing Connection (`outgoing`)

Indicates that the current element **initiates or points** the relationship toward a target element:
$$\text{> ( Role / Field ) > [Target Pill]}$$

- **Example**: `> ( 🏷️ location ) > [Living-Room]`

### Incoming Connection (`incoming`)

Indicates that another source element **points at or references** the current element (Backlinks / Participation as a target):
$$\text{[Source Pill] < ( Role / Field ) <}$$

- **Example**: `[Living-room sofas] < ( 🏷️ location ) <`

### Full Connection (`full`)

In global views, validation reports, or full tables:
$$\text{[Source Pill] — ( Role / Field ) → [Target Pill]}$$

---

## How the Domain Console Renders Relations

The Domain Console standardizes all these relationships through the console UI kit (`ui-kit.js`):

1. **`InnfoUI.RelList`** renders the list of references for a unit, with the **relationship icon** (📊 Matrix, 🏷️ Field, 📝 Mention) and the **role or field name** in a highlighted badge.
2. **`InnfoUI.Ku`** renders the connected node as an interactive unit pill (concept, element, field value, matrix, document, or source) with its concept icon and navigation on click.
3. **`InnfoUI.SankeyFlow`** visualizes matrix relationships as flows across the graph.
4. **`AnnotationPopover`** surfaces citation targets when a cited value is inspected.
