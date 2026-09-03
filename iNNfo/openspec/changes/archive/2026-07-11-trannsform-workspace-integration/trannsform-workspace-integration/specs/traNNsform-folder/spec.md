# traNNsform Folder Specification

## Purpose

The `traNNsform/` folder at the workspace root defines the contract between the editor UI and the agent for document transformation (Import) and model visualization (Export). It replaces the previous `.traNNsform/` (hidden) and `outputs/` (plural) conventions.

## Requirements

### Requirement: Folder Structure

The workspace MUST contain `traNNsform/` (visible, no dot) with subdirectories `input/` (empty, for raw documents), `output/` (singular, for generated visualizers), `templates/`, and `snippets/`, plus `AGENT.md` and `README.md`.

#### Scenario: Structure created on workspace init

- GIVEN SetupWizard creates a new workspace
- WHEN `initWorkspaceStructure()` completes
- THEN `traNNsform/` and all subdirectories exist
- AND `input/` and `output/` contain `.gitkeep`
- AND `AGENT.md` and `README.md` are present

### Requirement: AGENT.md References defiNNe for Model Naming

`traNNsform/AGENT.md` MUST NOT duplicate the iNNfo model naming convention. It MUST reference the canonical defiNNe specification (`defiNNe_NN.md` §File Naming Convention) for naming imported models.

(Previously: the naming convention was inlined in AGENT.md, risking divergence from defiNNe.)

#### Scenario: defiNNe reference in AGENT.md

- GIVEN `traNNsform/AGENT.md` is read
- WHEN inspecting the Import naming section
- THEN a URL to `defiNNe_NN.md` is present
- AND the full naming pattern is NOT duplicated inline

### Requirement: Export Naming Convention in AGENT.md

`traNNsform/AGENT.md` MUST define the visualizer export naming convention: `<ModelBaseName>_V<version>_<templateName>_visualizer.html`. This is specific to traNNsform outputs and is NOT referenced from defiNNe.

#### Scenario: Visualizer naming defined

- GIVEN `traNNsform/AGENT.md` is read
- WHEN inspecting the Export naming section
- THEN the `_visualizer.html` pattern is defined
- AND the output path references `traNNsform/output/` (singular)

### Requirement: AGENT.md Documents Incremental Import (PLOM)

`traNNsform/AGENT.md` MUST include a "FUTURO — no implementado" section documenting the planned behavior for incremental imports: read existing model, cross-reference new documents, produce updated version with bump.

#### Scenario: PLOM section present

- GIVEN `traNNsform/AGENT.md` is read
- WHEN inspecting the Import section
- THEN a "FUTURO — no implementado" subsection exists
- AND it describes the intended merge behavior
- AND it does not contain implementation-ready instructions

### Requirement: No Hidden or Plural Paths

No references to `.traNNsform/` (hidden) or `outputs/` (plural) SHALL exist in `traNNsform/AGENT.md` or `traNNsform/README.md`. All path references MUST use `traNNsform/`, `input/`, and `output/`.

#### Scenario: README uses new paths

- GIVEN `traNNsform/README.md` is read
- WHEN searching for path references
- THEN no `.traNNsform/` or `outputs/` references exist
- AND all paths use `traNNsform/`, `input/`, `output/`
