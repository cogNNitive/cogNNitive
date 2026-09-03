# Workflow Definition Specification

## Purpose

Define the level-2 iNNfo template specialization for declarative multi-skill workflows. A workflow describes a sequence of stages, each executed by a skill, with typed artifacts flowing between them.

## Requirements

### Requirement: Workflow Template Structure

The workflow template MUST declare the following Concept Definitions in its body:

| Concept | Type | Description |
|---------|------|-------------|
| `Workflow` | `text` | Workflow name, version, description |
| `Stage` | `sequence` | Ordered steps in the workflow |
| `SkillRef` | `list` | Skills available for stage execution |
| `ArtifactType` | `list` | Artifact types flowing through the workflow |
| `Transformation` | `list` | Transformation rules mapping input to output |

#### Scenario: Template declares all five concepts

- GIVEN the workflow template file at `docs/templates/workflow/V_0-1-0/workflow_V_0-1-0_NN.md`
- WHEN its `# NN Concept Definition` section is inspected
- THEN it MUST contain a `## NN Concept Definition: <Name>` element for each of `Workflow`, `Stage`, `SkillRef`, `ArtifactType`, and `Transformation`
- AND each element MUST declare a `type::` property matching the table above

### Requirement: Unified `NN` Syntax

The workflow template and every workflow instance MUST use iNNfo's unified `NN` syntax exclusively. The legacy `_F`/`_FORMAT` markers and the `template.concepts`/`template.matrices` frontmatter block are removed constructs and MUST NOT appear.

| Construct | Syntax |
|---|---|
| Concept section | `# NN <Concept>` (H1) |
| Element | `## NN <Concept>: <Element>` (H2) |
| Property | `key:: value` (line immediately after the element heading) |
| Matrix block | `# NN matrices: <matrix-name>` followed by a Markdown table |

#### Scenario: No legacy markers remain

- GIVEN the workflow template or a workflow instance
- WHEN the document is scanned for `_F concepts:`, `_F markers:`, `<!-- _F`, or a `_FORMAT.md` filename
- THEN none of those are found

#### Scenario: Concepts and elements use the unified headings

- GIVEN the workflow template
- WHEN any concept section or element is inspected
- THEN concept sections use `# NN <Concept>` and elements use `## NN <Concept>: <Element>`, per `specs/iNNfo_V_0-1-0_NN.md`

### Requirement: Stage-Skill Matrix

The template MUST declare a Matrix Definition binding stages to skills. Each stage maps to exactly one skill.

#### Scenario: Matrix declared and populated

- GIVEN the workflow template
- WHEN its `# NN Matrix Definition` section is inspected
- THEN there MUST be a `## NN Matrix Definition: Stage-Skill matrix` element with `source:: Stage` and `target:: SkillRef`
- AND in a workflow instance, the `# NN matrices: Stage-Skill matrix` table MUST have Stage elements as row headers and SkillRef elements as column headers
- AND each row MUST have exactly one cell marked (e.g. `X`)

### Requirement: Stage-Artifact Matrix

The template MUST declare a Matrix Definition binding stages to their produced artifact types.

#### Scenario: Artifact matrix defined

- GIVEN the workflow template
- WHEN its `# NN Matrix Definition` section is inspected
- THEN there MUST be a `## NN Matrix Definition: Stage-Artifact matrix` element with `source:: Stage` and `target:: ArtifactType`
- AND in a workflow instance, the `# NN matrices: Stage-Artifact matrix` table MUST show what artifact type each stage produces

### Requirement: Workflow File Naming

Workflow files MUST follow the iNNfo naming convention for level-2 templates and their level-3 instances.

#### Scenario: Valid workflow instance filename

- GIVEN a workflow instance file
- WHEN its filename is validated
- THEN it MUST match the pattern `<Name>_V_<major>-<minor>-<patch>_workflow_NN.md`

#### Scenario: Valid template filename

- GIVEN the workflow template file
- WHEN its filename is validated
- THEN it MUST match the pattern `workflow_V_<major>-<minor>-<patch>_NN.md`

### Requirement: Workflow Frontmatter

Every workflow instance MUST include level-3 YAML frontmatter referencing the workflow template by URL, and MUST NOT inline the template's schema.

#### Scenario: Frontmatter references the template without inlining it

- GIVEN a workflow instance file
- WHEN the frontmatter is parsed
- THEN it MUST include `level: 3`, `model_version`, `title`, and a `parent_spec` object with `name: "workflow_V_0-1-0"` and a `url` pointing at `workflow_V_0-1-0_NN.md`
- AND it MUST NOT contain a `template.concepts`, `template.markers`, or `template.matrices` block

### Requirement: Workflow Stage Ordering

Stages are a sequence concept — their order in the document defines execution order.

#### Scenario: Sequential stage execution

- GIVEN a workflow with stages `[Normalize, Format, Transform]` written as `## NN Stage: Normalize`, `## NN Stage: Format`, `## NN Stage: Transform`
- WHEN the stage list is read from the document
- THEN the order MUST match the document order
- AND each Stage element MAY include `key:: value` properties for `skill`, `input`, and `output`
