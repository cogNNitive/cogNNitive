# Workspace Executions Provenance

## Purpose

Formally establish `# NN Executions` in the Level 2 workspace template as a first-class concept dedicated to recording append-only pipeline executions and CLI traces, keeping `# NN Procedures` strictly for declarative workflow definitions and procedure catalogs.

## Requirements

### Requirement: Executions concept definition in workspace template

The Level 2 workspace specification (`workspace_spec_NN.md`) MUST define the `# NN Concept Definition: Executions` with `type:: list` (or `type:: log`), `icon:: terminal`, and `color:: grey`.

#### Scenario: Concept definition present in spec
- GIVEN `workspace_spec_NN.md`
- WHEN parsed by `innfo-core` metamodel engine
- THEN `Executions` is a valid concept with declared fields `command`, `flags`, `run_at`, `inputs`, `outputs`.

### Requirement: Distinct fields for execution traces

The template MUST declare the following field definitions for `concept:: Executions`:
- `command` (type: string, description: CLI command executed)
- `flags` (type: string, description: Command-line options and parameters)
- `run_at` (type: string, description: ISO 8601 execution timestamp)
- `inputs` (type: string / list, description: Input files or sources consumed)
- `outputs` (type: string / list, description: Output files or models generated)

#### Scenario: Execution entry carries metadata
- GIVEN an execution entry `## NN Executions: scan @ 2026-09-24T12:00:00.000Z`
- WHEN validated against the workspace spec
- THEN fields `command`, `run_at`, `inputs`, `outputs`, and `flags` conform with zero warnings.
