# Pipeline Definition Specification

## Purpose

Define the FORMAT template specialization for declarative multi-skill pipelines. A pipeline describes a sequence of stages, each executed by a skill, with typed artifacts flowing between them.

## Requirements

### Requirement: Pipeline Template Structure

The pipeline template MUST define the following concepts in its frontmatter and body:

| Concept | Type | Description |
|---------|------|-------------|
| `Pipeline` | `text` | Pipeline name, version, description |
| `Stage` | `sequence` | Ordered steps in the pipeline |
| `Skill` | `list` | Skills available for stage execution |
| `Artifact` | `list` | Artifact types flowing through the pipeline |
| `Transformation` | `list` | Transformation rules mapping input to output |

#### Scenario: Template declares all five concepts

- GIVEN a pipeline FORMAT template file at `docs/templates/pipeline/V_0-1-0/`
- WHEN the template frontmatter is inspected
- THEN it MUST list `Pipeline`, `Stage`, `Skill`, `Artifact`, and `Transformation` in `template.concepts`
- AND each concept MUST have a declared `type` matching the table above

### Requirement: _F Structural Marker Syntax

The pipeline template MUST use `_F` structural markers in both visible and hidden forms as defined by the FORMAT specification.

| Form | Syntax |
|------|--------|
| Visible heading | `# _F concepts: ConceptName` |
| Hidden heading | `# <!-- _F concepts: --> ConceptName` |
| Visible element | `* _F ConceptName: Element Name` |
| Hidden element | `* <!-- _F ConceptName: --> Element Name` |

#### Scenario: Markers follow FORMAT spec

- GIVEN the pipeline template is a valid FORMAT document
- WHEN any concept block or element line is inspected
- THEN it MUST use `_F` prefix markers (never the legacy `<!-- block: ... -->` syntax)
- AND the hidden form MUST wrap the marker in an HTML comment

### Requirement: Stage-Skill Matrix

The template MUST declare a matrix binding stages to skills. Each stage maps to exactly one skill.

#### Scenario: Matrix defined in frontmatter

- GIVEN the pipeline template
- WHEN reading `template.matrices`
- THEN there MUST be a matrix entry with `source: "Stage"` and `target: "Skill"`
- AND the matrix table in the body MUST have Stage elements as row headers and Skill elements as column headers
- AND each row MUST have exactly one cell set to the matching skill (e.g., `Max`, `Yes`)

### Requirement: Stage-Artifact Matrix

The template MUST declare a matrix binding stages to their produced artifact types.

#### Scenario: Artifact matrix defined

- GIVEN the pipeline template
- WHEN reading `template.matrices`
- THEN there MUST be a matrix entry with `source: "Stage"` and `target: "Artifact"`
- AND the matrix table MUST show what artifact type each stage produces

### Requirement: Pipeline File Naming

Pipeline files MUST follow the FORMAT naming convention for specializations.

#### Scenario: Valid pipeline filename

- GIVEN a pipeline instance file
- WHEN its filename is validated
- THEN it MUST match the pattern `<Name>_V_<major>-<minor>-<patch>_pipeline_FORMAT.md`
- AND the file extension MUST be `.md`

### Requirement: Pipeline Frontmatter

Every pipeline instance MUST include YAML frontmatter referencing the pipeline template.

#### Scenario: Frontmatter validates against template

- GIVEN a pipeline instance file
- WHEN the frontmatter is parsed
- THEN it MUST include `specification_version`, `title`, `model_version`, and a `template` block with `name: "pipeline"`, `version: "V_0-1-0"`, and the full `concepts`, `markers`, `matrices` arrays
- AND `documentation_location` MUST point to `docs/templates/pipeline/V_0-1-0/`

### Requirement: Pipeline Stage Ordering

Stages are a sequence concept — their order in the document defines execution order.

#### Scenario: Sequential stage execution

- GIVEN a pipeline with stages `[Normalize, Format, Transform]`
- WHEN the stage list is read from the document
- THEN the order MUST match the document order
- AND each Stage element MAY include YAML fields for `skill`, `input_artifact`, and `output_artifact`
