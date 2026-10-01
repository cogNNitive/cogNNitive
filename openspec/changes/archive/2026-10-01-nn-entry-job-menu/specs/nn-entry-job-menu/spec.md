# Spec: Job-Based /nn Entry Menu & Front Controller

## ADDED Requirements

### Requirement: Job-Based Navigation Menu
The entry skill (`nn` / `nn-start`) MUST present a job-oriented menu organized around the workflow loop:
- `[s]` Import / update sources
- `[m]` Work on a model (create, edit, inspect)
- `[r]` Produce / review artifacts (consoles, hub, feedback)
- `[p]` Run a procedure
- `[h]` Documentation & help
- `[x]` Exit / Cancel

The `(Recommended)` marker MUST dynamically highlight the first dirty stage of the loop based on the domain probe.
`[x]` MUST consistently mean Cancel / Exit across all prompts.

#### Scenario: Dirty sources recommend [s]
- GIVEN pending uningested sources in the workspace
- WHEN `/nn` is invoked
- THEN `[s] Import / update sources (Recommended)` is highlighted.

#### Scenario: Clean workspace recommends [m]
- GIVEN a clean workspace with no pending sources or uncompiled artifacts
- WHEN `/nn` is invoked
- THEN `[m] Work on a model (Recommended)` is highlighted.

### Requirement: Canonical Entry Distribution & Alias Preservation
The system MUST distribute `skills/nn/SKILL.md` as the canonical entry point in `manifest/source.yaml`, while maintaining `skills/nn-start/SKILL.md` as a backwards-compatible alias forwarding to `nn`.

#### Scenario: Existing workspace invoking nn-start
- GIVEN an existing workspace with `AGENTS.md` citing `nn-start`
- WHEN `nn-start` is loaded
- THEN it executes the same job menu and entry flow without error.
