## Exploration: decouple-org-and-procedures

### Current State
Currently, the Procedures Template (`specs/latest/level2/procedures/procedures_NN.md` and `specs/v0.2.0/level2/procedures/procedures_V_0-2-0_NN.md`) includes human resource concepts:
* `Position` (organizational job titles)
* `Person` (named individuals)

It also defines matrices linking these concepts to each other and to functional roles:
* `positions-roles matrix` (`Position` -> `Roles` using value `Assumes`)
* `persons-positions matrix` (`Person` -> `Position` using value `Occupies`)

This mixes structural organizational mapping (human resources) with behavioral process/workflow modeling (steps, inputs, outputs, RACI assignments). 

### Affected Areas
- `specs/latest/level2/procedures/procedures_NN.md` â€” Remove `Person` and `Position` concepts, as well as `positions-roles` and `persons-positions` matrices, and update documentation.
- `specs/v0.2.0/level2/procedures/procedures_V_0-2-0_NN.md` â€” Perform the same concept and matrix removals and documentation updates.
- `models/starter/Procedures_V_1-0-0_starter_NN.md` â€” Update parent spec references to point cleanly to `procedures_V_0-2-0`.
- `apps/innfo-editor/public/starter/Procedures_V_1-0-0_starter_NN.md` â€” Mirror parent spec reference updates.
- `docs/app/starter/Procedures_V_1-0-0_starter_NN.md` â€” Mirror parent spec reference updates.
- `specs/latest/level2/procedures/samples/CodeReviewProcess_V_1-0-0_procedures_NN.md` & `specs/v0.2.0/level2/procedures/samples/CodeReviewProcess_V_1-0-0_procedures_NN.md` â€” Keep intact (already clean of Person/Position concepts).

New files to be created:
- `specs/latest/level2/organization/organization_NN.md` â€” New latest organization template.
- `specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md` â€” New v0.2.0 organization template.
- `specs/latest/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md` â€” New latest sample model.
- `specs/v0.2.0/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md` â€” New v0.2.0 sample model.

### Approaches
1. **Approach 1: Strict Decoupling (Distinct templates/files)**
   Create a completely separate `organization` template defining `Organization`, `Position`, `Person`, and the `persons-positions` matrix. The `procedures` template will focus purely on RACI workflow modeling.
   - **Pros**: Clean segregation of concerns. Highly modular. Scalable structure for both departments and process engines.
   - **Cons**: Requires mapping across different level 3 models if cross-referencing is desired, but aligns perfectly with standard iNNfo Level 3 model capabilities.
   - **Effort**: Medium.

### Recommendation
Recommend **Approach 1 (Strict Decoupling)**. This maintains a clean and modular architecture for the iNNfo specification files, keeping domain concepts decoupled (e.g. Org vs Process vs Business). The generic front-end editor handles this seamlessly since it dynamically loads and renders files based on their YAML frontmatter spec definition.

### Implementation Blueprint

#### 1. Schema for Organization Template (`specs/latest/level2/organization/organization_NN.md` and `specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md`)
```yaml
---
specification_version: "V_0-2-0"
specification_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/v0.2.0/level1/iNNfo_V_0-2-0_NN.md"
title: "Organization Template"
concepts:
  - name: "Organization"
    icon: "building"
    type: "text"
    color: "green"
    weight: 100
  - name: "Position"
    icon: "briefcase"
    type: "list"
    color: "green"
    weight: 90
  - name: "Person"
    icon: "user"
    type: "list"
    color: "green"
    weight: 80
markers:
  - name: "seniority"
    icon: "award"
    color: "green"
    weight: 50
relationship_types:
  hierarchy:
    enabled: true
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
matrices:
  - name: "persons-positions matrix"
    source: "Person"
    target: "Position"
    values: [Occupies]
  - name: "item-markers matrix"
    source: "Elements"
    target: "Markers"
---

> [!NOTE]
> This is an **iNNfo document** â€” a plain-text Markdown file that carries its own schema in the YAML frontmatter. The template definition is resolved via the parent chain and cached in the `specs/` directory.

# Organization Template

## A template for modeling organizational structure, teams, departments, positions, and person assignments

## Philosophy
The Organization Template is designed for modeling structural reporting lines and talent assignment within an organization. It decouples administrative personnel and roles/positions from workflow execution parameters, enabling clear definition of who occupies which roles, seniority markers, and organizational hierarchy.

## Objectives
- Provide a structured model for human resources mapping including organizations/teams (Organization), titles/roles (Position), and individuals (Person).
- Enable positional relationship mapping (persons-positions matrix) to trace resource capacity.
- Support organizational reporting hierarchies (e.g. managers and direct reports).

## Specification

### Concepts
| Concept | Type | Purpose |
|---|---|---|
| **Organization** | `text` | Description of the overall organization, business unit, or team |
| **Position** | `list` | Structural titles or job definitions within the team |
| **Person** | `list` | Named individuals or employees within the organization |

### Markers
| Marker | Purpose |
|---|---|
| `seniority` | Ranks or experience level of positions/individuals |

### Matrices
| Matrix | Source â†’ Target | Purpose |
|---|---|---|
| Persons-Positions | Person â†’ Position | Who occupies which structural position |

### Relationship Types
| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | âœ… | Manager-report relationships or positional reporting lines |
| Evaluable matrix | âœ… | Sourceâ†’target tables for person assignments |
| Graph edge | âŒ | Not applicable |
| Sequence | âŒ | Not applicable |

## Template

### Level 3 Model Template (Lightweight)
To create an organization model, create a level 3 FILE mode document with:

```yaml
---
specification_version: "V_0-2-0"
specification_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/v0.2.0/level1/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "organization_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md"
model_version: "V_x-y-z"
title: "<Organization Name>"
---

> [!NOTE]
> This is an **iNNfo document**...

# _NN index
* [[Organization]]
* [[Position]]
* [[Person]]

# _NN Organization
Description of the overall organization structure.

# _NN Position
* _NN Position: Job Title
  Description of the position.

# _NN Person
* _NN Person: Full Name
  Description of the individual.

# _NN matrices: persons-positions matrix
| Person \\ Position | Job Title |
| :--- | :---: |
| Full Name | Occupies |
```

## Examples
### Canonical Sample
The official sample for this template is at `specs/v0.2.0/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md`.

## Concept Guidance Documentation

## Organization
### Summary
The overall organization, department, or team structure.
### Description
Detailed overview of the group's mission, structure, and functional scope.

## Position
### Summary
Structural titles or job definitions within the team.
### Description
Job positions or functional titles (e.g. Backend Developer, Principal Engineer) that carry specific responsibilities and qualifications.

## Person
### Summary
Named individuals or employees.
### Description
Real team members occupying one or more positions.

## seniority
### Summary
Experience level or job grade.
### Description
Standardized markers for seniority levels (e.g., Junior, Senior, Lead).

## persons-positions matrix
### Summary
Assignment matrix for individuals to job roles.
### Description
Identifies who occupies which position in the organization.
```

#### 2. Schema for EngineeringTeam Sample Model (`specs/latest/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md` and `specs/v0.2.0/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md`)
```markdown
---
specification_version: "V_0-2-0"
specification_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/v0.2.0/level1/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "organization_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md"
model_version: "V_1-0-0"
title: "Acme Engineering Team"
---

> [!NOTE]
> This is an **iNNfo document** â€” a plain-text Markdown file that carries its own schema in the YAML frontmatter. The template definition is resolved via the parent chain and cached in the `specs/` directory.

# _NN index

* [[Organization]]
* [[Position]]
* [[Person]]

# _NN Organization

Structure of the core Engineering division at Acme Corp. It outlines key leadership and execution roles across frontend, backend, and quality assurance disciplines.

# _NN Position

* _NN Position: Engineering Manager
  Leads the engineering team, manages delivery, resource allocation, and line management.
* _NN Position: Tech Lead
  Responsible for technical architecture, quality standards, and mentoring developers.
* _NN Position: Senior Developer
  Responsible for core feature development, writing robust code, and code reviews.
* _NN Position: QA Engineer
  Responsible for writing test automation, manual validation, and release quality sign-off.

# _NN Person

* _NN Person: Alice Vance
  Engineering Manager with 10 years of leadership experience.
* _NN Person: Bob Miller
  Tech Lead specializing in cloud infrastructure and backend systems.
* _NN Person: Charlie Smith
  Senior Frontend Developer focusing on Vue.js and user experience.
* _NN Person: Diana Prince
  Quality Assurance Engineer specialized in Cypress and E2E automation.

# _NN matrices: persons-positions matrix

| Person \ Position | Engineering Manager | Tech Lead | Senior Developer | QA Engineer |
| :--- | :---: | :---: | :---: | :---: |
| Alice Vance | Occupies | - | - | - |
| Bob Miller | - | Occupies | - | - |
| Charlie Smith | - | - | Occupies | - |
| Diana Prince | - | - | - | Occupies |
```

### Risks
- **Test Snapshots**: Changing the procedures template to remove `Person` and `Position` concepts and their matrices will make the test model fixtures `Comprehensive_Test_Procedure_V_1-0-0_procedures_F.md` fail golden tests or require matching modifications since it is used as a test suite model.
- **Remediation**: The golden snapshot for `recursiveParser.models.golden.test.ts` will need to be re-generated or updated once the fixtures are modified.

### Ready for Proposal
Yes
