# Specification: Entry Job Menu & Routing Governance

## MODIFIED Requirements

### Requirement: Single Front Controller Governance (nn)
The `nn` skill (`skills/nn/SKILL.md`) SHALL be the sole front controller for the cogNNitive ecosystem. `nn-start` SHALL be removed.

#### Scenario: Workspace initialization scaffolds nn directive
- GIVEN a project bootstrapped via `nn-trannsform` (`bootstrap.js`)
- WHEN `generateAgentsMd` runs
- THEN `AGENTS.md` MUST contain `## Session Start: Load nn (MANDATORY)`
- AND MUST instruct agents to load `skills/nn/SKILL.md` or invoke `/nn`.

### Requirement: Non-Blocking Preflight Warnings
When the domain probe returns preflight exit code 1 (warnings), the front controller MUST render an actionable warning banner and immediately proceed to the Job Loop Navigation Menu (`[s][m][r][p]`). Exit code 1 MUST NOT halt the session.

#### Scenario: Non-blocking warning banner rendering
- GIVEN a domain probe returning `preflight.exitCode === 1`
- WHEN `nn` renders the session interface
- THEN it MUST present the warning items
- AND MUST render the Job Loop Menu options (`[s]`, `[m]`, `[r]`, `[p]`, `[h]`, `[x]`).
