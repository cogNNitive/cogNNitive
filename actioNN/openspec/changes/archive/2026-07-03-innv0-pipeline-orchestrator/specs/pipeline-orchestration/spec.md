# Pipeline Orchestration Specification

## Purpose

Define the behavior of the `innv0-pipeline-orchestrator` meta-skill. The orchestrator discovers pipeline files, lets users select or create pipelines, and executes stages sequentially by loading and invoking child skills.

## Requirements

### Requirement: Pipeline Discovery

The orchestrator MUST scan user-specified locations for pipeline FORMAT files.

#### Scenario: Location with one pipeline file

- GIVEN the user provides a filesystem path
- WHEN the orchestrator scans that path
- THEN it MUST find all files matching the pattern `*_pipeline_FORMAT.md`
- AND return their parsed names and versions to the user

#### Scenario: Location with no pipeline files

- GIVEN the user provides a path with no `*_pipeline_FORMAT.md` files
- WHEN the orchestrator scans that path
- THEN it SHOULD report "No pipeline files found in [path]"
- AND offer the user the option to create a new pipeline

### Requirement: User Interaction â€” Choose or Create

The orchestrator MUST ask the user whether to use an existing pipeline or create a new one before any scanning or execution.

#### Scenario: User chooses existing pipeline

- GIVEN the user selects "use existing"
- WHEN the orchestrator completes discovery
- THEN it MUST present a numbered list of found pipelines with name and version
- AND let the user pick one by number

#### Scenario: User chooses new pipeline

- GIVEN the user selects "create new"
- WHEN the orchestrator starts the creation flow
- THEN it MUST guide the user through: pipeline name, stage list (ordered), skill assignment per stage, and artifact type per stage
- AND write the resulting pipeline file to the user's chosen location

### Requirement: Pipeline Parsing

The orchestrator MUST parse the selected pipeline FORMAT file and extract stages, skills, and artifact mappings.

#### Scenario: Valid pipeline parsed

- GIVEN a valid `pipeline_FORMAT.md` file
- WHEN the orchestrator parses it
- THEN it MUST extract the ordered list of Stage elements
- AND for each stage, extract the assigned Skill (from the Stage-Skill matrix)
- AND for each stage, extract the output Artifact type (from the Stage-Artifact matrix)

#### Scenario: Malformed pipeline file

- GIVEN a pipeline file with missing or invalid frontmatter
- WHEN the orchestrator attempts to parse it
- THEN it MUST report "Invalid pipeline file: [reason]"
- AND abort execution without loading any child skills

### Requirement: Sequential Stage Execution

The orchestrator MUST execute pipeline stages in the order defined by the document.

#### Scenario: Three-stage pipeline executes in order

- GIVEN a pipeline with stages `[Normalize â†’ Format â†’ Transform]`
- WHEN the orchestrator executes
- THEN stage Normalize runs first, stage Format runs second, stage Transform runs third
- AND no stage starts before its predecessor completes

### Requirement: Child Skill Loading

Before executing a stage, the orchestrator MUST load the corresponding skill and verify it is available.

#### Scenario: Skill loads successfully

- GIVEN a stage assigned to skill `innv0-trannsform`
- WHEN the orchestrator reaches that stage
- THEN it MUST load `skills/innv0-trannsform/SKILL.md`
- AND confirm the skill is available before proceeding

#### Scenario: Skill not found

- GIVEN a stage assigned to a skill path that does not exist
- WHEN the orchestrator attempts to load it
- THEN it MUST report "Skill [name] not found at [path]"
- AND stop pipeline execution

### Requirement: Output Passthrough

The orchestrator MUST pass each stage's output artifact as the input to the next stage.

#### Scenario: Stage output feeds next stage input

- GIVEN a two-stage pipeline where Stage A produces `markdown` and Stage B consumes `markdown`
- WHEN Stage A completes
- THEN the orchestrator MUST provide Stage A's output path to Stage B as its input
- AND Stage B MUST receive valid input to begin

#### Scenario: First stage reads from raw/ folder

- GIVEN the first stage of a pipeline
- WHEN the orchestrator begins execution
- THEN it MUST pass the pipeline's configured source directory (e.g., `raw/`) as the first stage's input

### Requirement: Error Handling

If any stage fails, the orchestrator MUST report the error and stop.

#### Scenario: Stage fails during execution

- GIVEN a pipeline where Stage 2 fails with an error
- WHEN the orchestrator detects the failure
- THEN it MUST report "Stage [name] failed: [error details]"
- AND MUST NOT execute Stage 3
- AND SHOULD report "Pipeline aborted at stage [name]"

#### Scenario: Skill loading fails mid-pipeline

- GIVEN a pipeline where Stage 3 references a missing skill
- WHEN the orchestrator attempts to load it
- THEN it MUST report the failure with the skill name and path
- AND stop execution without modifying previously completed stage outputs

### Requirement: Registry Registration

The orchestrator SKILL.md MUST include a `triggers` metadata entry and the `.cogNNitive/skill-registry.md` MUST be updated to include the orchestrator entry.

#### Scenario: Registry entry present

- GIVEN `.cogNNitive/skill-registry.md` exists
- WHEN the change is applied
- THEN the registry MUST contain a table row for `innv0-pipeline-orchestrator`
- AND the row MUST include path `skills/innv0-pipeline-orchestrator/SKILL.md`
- AND triggers MUST include `pipeline`, `orchestrate`, `run pipeline`
